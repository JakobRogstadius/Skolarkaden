/* High-DPI native labels over a cached, illustrated world. */
(function(root){
'use strict';
const SC=root.Starlight,worldW=1536,worldH=1024,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function polygon(c,q){c.beginPath();q.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function pointInside(x,y,q){let inside=false;for(let i=0,j=3;i<4;j=i++){const a=q[i],b=q[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}return inside;}
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function element(tag,cls,parent){const el=document.createElement(tag);el.className=cls;parent.append(el);return el;}
  function perspective(q,width,height){
    const [p0,p1,p2,p3]=q;
    const dx1=p1[0]-p2[0],dx2=p3[0]-p2[0],dx3=p0[0]-p1[0]+p2[0]-p3[0];
    const dy1=p1[1]-p2[1],dy2=p3[1]-p2[1],dy3=p0[1]-p1[1]+p2[1]-p3[1];
    const det=dx1*dy2-dx2*dy1;
    const g=Math.abs(det)<1e-8?0:(dx3*dy2-dx2*dy3)/det;
    const j=Math.abs(det)<1e-8?0:(dx1*dy3-dx3*dy1)/det;
    const a=p1[0]-p0[0]+g*p1[0],b=p3[0]-p0[0]+j*p3[0];
    const d=p1[1]-p0[1]+g*p1[1],e=p3[1]-p0[1]+j*p3[1];
    return [a/width,d/width,0,g/width,b/height,e/height,0,j/height,0,0,1,0,p0[0],p0[1],0,1];
  }
  function paperColor(surface,pixels){
    if(surface.paper)return surface.paper;
    const samples=[];
    // Sample inside the paper margin, excluding the frame and the central illustration.
    for(const v of [.055,.11,.89,.945])for(const u of [.12,.25,.38,.62,.75,.88]){
      const [a,b,c,d]=surface.q;
      const x=Math.round((1-u)*(1-v)*a[0]+u*(1-v)*b[0]+u*v*c[0]+(1-u)*v*d[0]);
      const y=Math.round((1-u)*(1-v)*a[1]+u*(1-v)*b[1]+u*v*c[1]+(1-u)*v*d[1]);
      const k=(clamp(y,0,worldH-1)*worldW+clamp(x,0,worldW-1))*4;
      samples.push([pixels[k],pixels[k+1],pixels[k+2]]);
    }
    samples.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));
    const clean=samples.slice(Math.floor(samples.length*.58),Math.floor(samples.length*.9));
    return clean.reduce((acc,c)=>acc.map((n,i)=>n+c[i]/clean.length),[0,0,0]).map(Math.round);
  }
  function paintPlate(c,s,q,isDark){
    const color=s.color;
    polygon(c,q);
    if(isDark){const v=3+Math.max(0,.2126*color[0]+.7152*color[1]+.0722*color[2]-35)*.115;c.fillStyle='rgb('+v+','+v+','+v+')';}
    else {
      const gradient=c.createLinearGradient(q[0][0],q[0][1],q[2][0],q[2][1]);
      const rgb=f=>'rgb('+color.map(n=>clamp(Math.round(n*f),0,255)).join(',')+')';
      gradient.addColorStop(0,rgb(1.025));gradient.addColorStop(.48,rgb(1));gradient.addColorStop(1,rgb(.96));c.fillStyle=gradient;
    }
    c.fill();
  }
function FicklampanRenderer(canvas,g){
  this.game=g;this.canvas=canvas;
  const host=canvas.parentElement||document.getElementById('arena'),ctx=canvas.getContext('2d',{alpha:false});
  const layer=element('div','fm-answers',host),collection=element('div','fm-collection',host);
  collection.setAttribute('aria-label','Samlade par');
  const full=element('button','fm-fullscreen',host);full.type='button';full.setAttribute('aria-label','Helskärm');
  const status=element('div','fm-status',host);status.setAttribute('role','status');
  canvas.setAttribute('aria-label','Lys med muspekaren eller dra med fingret. Välj två föremål som hör ihop.');
  canvas.setAttribute('tabindex','0');
  const bright=makeCanvas(worldW,worldH),dark=makeCanvas(worldW,worldH),darkBase=makeCanvas(worldW,worldH);
  const light=makeCanvas(1,1),mask=makeCanvas(1,1),measure=makeCanvas(1,1).getContext('2d');
  const bc=bright.getContext('2d'),dc=dark.getContext('2d'),dbc=darkBase.getContext('2d',{willReadFrequently:true}),lc=light.getContext('2d'),mc=mask.getContext('2d');
  let loaded=false,destroyed=false,dirty=true,w=736,h=560,scale=2,dpr=1,cameraX=0,cameraY=0,beamX=w/2,beamY=h/2,radius=150;
  let pointer=null,lastPointerType='mouse',last=0,raf=0,revision=-1,collectedCount=0;
  const reduced=!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cleanup=[];
  const listen=(el,type,handler)=>{el.addEventListener(type,handler);cleanup.push(()=>el.removeEventListener(type,handler));};
  function content(parent,tile){
    if(tile.item.diagram){const diagram=element('canvas','fm-diagram',parent);diagram.setAttribute('aria-hidden','true');return diagram;}
    const span=element('span','fm-label',parent);span.textContent=tile.item.label;return span;
  }
  const buttons=g.tiles.map(tile=>{
    const b=element('button','fm-answer',layer);b.type='button';b.disabled=true;b.setAttribute('aria-label',tile.item.label);b.setAttribute('aria-pressed','false');
    b.label=content(b,tile);
    listen(b,'click',()=>{if(lightingAt(tile))g.select(tile.id);});
    listen(b,'focus',()=>{if(g.state==='playing'){aimAtWorld(tile.surface.x,tile.surface.y);dirty=true;}});
    return b;
  });
  function bake(){
    dc.drawImage(darkBase,0,0);
    for(const tile of g.tiles)if(!tile.found)paintPlate(dc,tile.surface,tile.surface.q,true);
  }
  function prepare(image){
    bc.drawImage(image,0,0,worldW,worldH);dbc.drawImage(image,0,0,worldW,worldH);
    const source=dbc.getImageData(0,0,worldW,worldH),pixels=source.data;
    for(const s of g.surfaces){
      s.color=paperColor(s,pixels);const rgb=s.color.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});
      const lum=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];s.ink=s.ink||((lum+.05)/.059>.94/(lum+.05)?'#20160a':'#fff2d5');
    }
    for(let i=0;i<pixels.length;i+=4){const lum=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2],v=Math.round(3+Math.max(0,lum-35)*.115);pixels[i]=pixels[i+1]=pixels[i+2]=v;}
    dbc.putImageData(source,0,0);
    const emissions=makeCanvas(worldW,worldH),emissionMask=makeCanvas(worldW,worldH),ec=emissions.getContext('2d'),em=emissionMask.getContext('2d');
    for(const [x,y,rx,ry,strength=.46] of g.scene.glows){
      em.save();em.translate(x,y);em.scale(rx,ry);const gradient=em.createRadialGradient(0,0,0,0,0,1);
      gradient.addColorStop(0,'rgba(255,255,255,'+strength+')');gradient.addColorStop(.35,'rgba(255,255,255,'+strength*.8+')');gradient.addColorStop(.72,'rgba(255,255,255,'+strength*.2+')');gradient.addColorStop(1,'transparent');
      em.fillStyle=gradient;em.fillRect(-1,-1,2,2);em.restore();
    }
    ec.drawImage(image,0,0,worldW,worldH);ec.globalCompositeOperation='destination-in';ec.drawImage(emissionMask,0,0);dbc.drawImage(emissions,0,0);
    loaded=true;bake();g.sceneReady();resize();const opening=g.surfaces[g.scene.opening||0];aimAtWorld(opening.x,opening.y);
  }
  function camera(){
    const ix=Math.min(64,w*.18),top=Math.min(60,h*.17),bottom=Math.min(70,h*.2);
    cameraX=clamp((beamX-ix)/(w-ix*2),0,1)*(worldW*scale-w);
    cameraY=clamp((beamY-top)/(h-top-bottom),0,1)*(worldH*scale-h);
  }
  function aimAtWorld(x,y){
    const ix=Math.min(64,w*.18),top=Math.min(60,h*.17),bottom=Math.min(70,h*.2);
    beamX=ix+clamp((x*scale-ix)/(worldW*scale-ix*2),0,1)*(w-ix*2);
    beamY=top+clamp((y*scale-top)/(worldH*scale-top-bottom),0,1)*(h-top-bottom);camera();dirty=true;
  }
  function toScreen(x,y){return {x:x*scale-cameraX,y:y*scale-cameraY};}
  function lightingAt(tile){const p=toScreen(tile.surface.x,tile.surface.y);return Math.hypot(p.x-beamX,p.y-beamY)<=radius*.79||g.held===tile.id;}
  function selectedLight(){
    if(g.held===null)return null;const s=g.tiles[g.held].surface,p=toScreen(s.x,s.y);
    const reach=Math.max(...s.q.map(q=>Math.hypot(q[0]-s.x,q[1]-s.y)))*scale;
    return {...p,r:Math.max(48,reach+15)};
  }
  function addLight(c,x,y,r){const gradient=c.createRadialGradient(x,y,r*.7,x,y,r);gradient.addColorStop(0,'#fff');gradient.addColorStop(.5,'rgba(255,255,255,.84)');gradient.addColorStop(1,'transparent');c.fillStyle=gradient;c.fillRect(x-r,y-r,r*2,r*2);}
  function outline(tile,color){ctx.save();polygon(ctx,tile.surface.q.map(([x,y])=>[x*scale-cameraX,y*scale-cameraY]));ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,scale*1.5);ctx.shadowColor=color;ctx.shadowBlur=7;ctx.stroke();ctx.restore();}
  function wrapped(text,font,width){
    measure.font='600 '+font+'px Georgia, serif';let line='',lines=[];
    // Split by glyph when needed, so Hanzi and long homework words can wrap too.
    for(const glyph of Array.from(text)){if(line&&measure.measureText(line+glyph).width>width){lines.push(line.trim());line='';}line+=glyph;}if(line)lines.push(line.trim());return lines;
  }
  function fitText(label,tile,width,height){
    let font=Math.max(18,Math.floor(Math.min(34,height*.65))),lines;
    do{lines=wrapped(tile.item.label,font,width-8);if(lines.length*font*1.12<=height-6)break;font-=1;}while(font>12);
    label.textContent=lines.join('\n');label.style.fontSize=font+'px';
  }
  function drawDiagram(canvas,tile,width,height){
    const fit=Math.min((width-8)/112,(height-6)/80),cw=Math.max(1,112*fit),ch=Math.max(1,80*fit);
    const pw=Math.ceil(cw*dpr),ph=Math.ceil(ch*dpr);canvas.style.width=cw+'px';canvas.style.height=ch+'px';
    if(canvas.width===pw&&canvas.height===ph)return;
    canvas.width=pw;canvas.height=ph;const c=canvas.getContext('2d');c.scale(pw/112,ph/80);SC.drawMathDiagram(c,tile.item.diagram,{x:0,y:0,w:112,h:80},{textColor:tile.surface.ink});
  }
  function sync(){
    bake();
    while(collectedCount<g.collected.length){
      const pair=element('div','fm-pair',collection);
      for(const tile of g.collected[collectedCount]){const half=element('span','fm-half',pair),label=content(half,tile);if(tile.item.diagram)drawDiagram(label,tile,54,34);}
      collectedCount++;
    }
    collection.scrollLeft=collection.scrollWidth;revision=g.revision;dirty=true;
  }
  function draw(){
    if(!loaded||destroyed)return;
    camera();ctx.clearRect(0,0,w,h);ctx.drawImage(dark,-cameraX,-cameraY,worldW*scale,worldH*scale);
    lc.globalCompositeOperation='source-over';lc.clearRect(0,0,w,h);lc.drawImage(bright,-cameraX,-cameraY,worldW*scale,worldH*scale);
    for(const tile of g.tiles)if(!tile.found){const q=tile.surface.q.map(([x,y])=>[x*scale-cameraX,y*scale-cameraY]);paintPlate(lc,tile.surface,q,false);}
    const complete=['celebrating','won'].includes(g.state),selected=selectedLight();
    if(!complete){mc.clearRect(0,0,w,h);addLight(mc,beamX,beamY,radius);if(selected)addLight(mc,selected.x,selected.y,selected.r);lc.globalCompositeOperation='destination-in';lc.drawImage(mask,0,0,mask.width,mask.height,0,0,w,h);lc.globalCompositeOperation='source-over';}
    ctx.drawImage(light,0,0,light.width,light.height,0,0,w,h);
    if(g.held!==null)outline(g.tiles[g.held],'#f3d99a');
    if(g.feedback&&!g.feedback.matched)outline(g.tiles[g.feedback.id],'#d7987f');
    if(g.feedback?.matched&&!reduced){
      const p=toScreen(g.tiles[g.feedback.id].surface.x,g.tiles[g.feedback.id].surface.y),t=1-(g.feedback.until-g.clock)/.65;
      ctx.save();ctx.globalAlpha=1-t;ctx.fillStyle='#f5dfa5';for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*(14+t*42),p.y+Math.sin(a)*(14+t*42),2.2*(1-t)+.5,0,Math.PI*2);ctx.fill();}ctx.restore();
    }
    const cssLight=(x,y,r)=>'radial-gradient(circle '+r+'px at '+x+'px '+y+'px, #000 70%, rgba(0,0,0,.84) 85%, transparent 100%)';
    const cssMask=complete?'none':[cssLight(beamX,beamY,radius),...(selected?[cssLight(selected.x,selected.y,selected.r)]:[])].join(',');
    layer.style.maskImage=layer.style.webkitMaskImage=cssMask;layer.style.maskComposite='add';layer.style.webkitMaskComposite='source-over';
    g.tiles.forEach((tile,i)=>{
      const s=tile.surface,b=buttons[i],width=s.width*scale,height=s.height*scale;
      b.hidden=tile.found||s.maxX*scale-cameraX<0||s.minX*scale-cameraX>w||s.maxY*scale-cameraY<0||s.minY*scale-cameraY>h;
      // Unlit targets stay keyboard reachable; focusing one aims the flashlight.
      b.disabled=g.state!=='playing'||tile.found;b.setAttribute('aria-pressed',String(g.held===tile.id));if(b.hidden)return;
      b.style.width=width+'px';b.style.height=height+'px';b.style.color=s.ink;
      b.style.transform='matrix3d('+perspective(s.q.map(([x,y])=>[x*scale-cameraX,y*scale-cameraY]),width,height).join(',')+')';
      if(b.layoutScale!==scale||b.layoutDpr!==dpr){if(tile.item.diagram)drawDiagram(b.label,tile,width,height);else fitText(b.label,tile,width,height);b.layoutScale=scale;b.layoutDpr=dpr;}
    });
    dirty=false;
  }
  function resize(){
    const previous={x:(cameraX+beamX)/scale,y:(cameraY+beamY)/scale},rect=canvas.getBoundingClientRect();w=rect.width;h=rect.height;if(!w||!h)return;
    g.resize(w,h);scale=Math.max(2,w/480,h/360);
    // Enlarge the world for longer exercises rather than rasterizing or
    // shrinking answers below 18 CSS pixels. Wrapping handles Hanzi too.
    for(const tile of g.tiles){
      const s=tile.surface;
      while(tile.item.diagram?s.width*scale<100||s.height*scale<72:
        wrapped(tile.item.label,18,s.width*scale-8).length*18*1.12>s.height*scale-6)scale*=1.08;
    }
    dpr=Math.min(root.devicePixelRatio||1,2);radius=Math.max(96,Math.min(75*scale,w*.34,h*.32));
    for(const c of [canvas,light,mask]){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}
    aimAtWorld(previous.x,previous.y);draw();
  }
  function pick(x,y){
    const wx=(x+cameraX)/scale,wy=(y+cameraY)/scale;
    return g.tiles.find(tile=>{
      if(tile.found||!lightingAt(tile))return false;if(pointInside(wx,wy,tile.surface.q))return true;
      if(lastPointerType==='touch'){const s=tile.surface,p=toScreen(s.x,s.y);return Math.abs(p.x-x)<=Math.max(22,(s.maxX-s.minX)*scale/2)&&Math.abs(p.y-y)<=Math.max(22,(s.maxY-s.minY)*scale/2);}return false;
    });
  }
  function coordinates(e){const r=canvas.getBoundingClientRect();return {x:clamp(e.clientX-r.left,0,w),y:clamp(e.clientY-r.top,0,h)};}
  function aim(e,offset=0){const p=coordinates(e);beamX=p.x;beamY=clamp(p.y-offset,0,h);camera();dirty=true;}
  listen(canvas,'pointermove',e=>{if(g.state!=='playing')return;lastPointerType=e.pointerType;if(e.pointerType==='mouse'){if(!pointer)aim(e);}else if(pointer?.id===e.pointerId){const p=coordinates(e);if(Math.hypot(p.x-pointer.x,p.y-pointer.y)>7)pointer.moved=true;if(pointer.moved)aim(e,38);}});
  listen(canvas,'pointerdown',e=>{if(e.button>0||!loaded||g.state!=='playing')return;e.preventDefault();lastPointerType=e.pointerType;const p=coordinates(e);pointer={id:e.pointerId,...p,moved:false,item:pick(p.x,p.y)};canvas.setPointerCapture?.(e.pointerId);if(e.pointerType!=='mouse'&&!pointer.item)aim(e,38);});
  listen(canvas,'pointerup',e=>{if(pointer?.id!==e.pointerId)return;const p=coordinates(e),down=pointer;pointer=null;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!down.moved&&Math.hypot(p.x-down.x,p.y-down.y)<8&&down.item)g.select(down.item.id);});
  listen(canvas,'pointercancel',()=>{pointer=null;});listen(canvas,'lostpointercapture',()=>{pointer=null;});
  listen(host,'keydown',e=>{if(g.state!=='playing'||e.target.closest?.('dialog,.overlay'))return;const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(directions[e.key]){e.preventDefault();beamX=clamp(beamX+directions[e.key][0]*14,0,w);beamY=clamp(beamY+directions[e.key][1]*14,0,h);dirty=true;}});
  function fullscreenChanged(){
    const active=(document.fullscreenElement||document.webkitFullscreenElement)===host;host.dataset.fullscreen=String(active);
    full.setAttribute('aria-label',active?'Lämna helskärm':'Helskärm');full.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(active?'M3 9h6V3m6 0v6h6M3 15h6v6m6 0v-6h6':'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6')+'"/></svg>';resize();
  }
  listen(full,'click',async()=>{
    try{if((document.fullscreenElement||document.webkitFullscreenElement)===host){if(document.exitFullscreen)await document.exitFullscreen();else document.webkitExitFullscreen?.();}
      else if(host.requestFullscreen)await host.requestFullscreen();else if(host.webkitRequestFullscreen)host.webkitRequestFullscreen();else status.textContent='Helskärm stöds inte av webbläsaren.';
    }catch{status.textContent='Helskärm är inte tillgänglig i den här vyn.';}
  });
  listen(document,'fullscreenchange',fullscreenChanged);listen(document,'webkitfullscreenchange',fullscreenChanged);
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  this.resize=resize;
  this.scoreEvent=e=>{dirty=true;if(['pause','resume'].includes(e.type))last=0;if(['pause','end'].includes(e.type))pointer=null;if(e.type==='klossar-select')status.textContent=e.tile.item.label;if(e.type==='hit')status.textContent=g.hits+' av '+g.total+' par.';};
  this.destroy=()=>{destroyed=true;cancelAnimationFrame(raf);observer.disconnect();cleanup.forEach(fn=>fn());for(const el of [layer,collection,full,status])el.remove();if(document.fullscreenElement===host)document.exitFullscreen?.().catch(()=>{});else if(document.webkitFullscreenElement===host)document.webkitExitFullscreen?.();delete host.dataset.fullscreen;};
  // The image is fetched only when this game starts, never on the menu.
  const image=new Image();image.onload=()=>{if(!destroyed)prepare(image);};image.onerror=()=>{if(destroyed)return;status.textContent='Bilden kunde inte laddas.';status.classList.add('fm-error');};image.src=g.scene.src;
  const frame=now=>{if(destroyed)return;const dt=last?Math.max(0,(now-last)/1000):0;last=now;g.update(dt);if(loaded&&revision!==g.revision)sync();if(dirty||g.state==='playing'&&g.feedback&&!reduced)draw();raf=requestAnimationFrame(frame);};
  fullscreenChanged();raf=requestAnimationFrame(frame);
}
Object.assign(SC,{FicklampanRenderer,ficklampanPerspective:perspective});
})(globalThis);
