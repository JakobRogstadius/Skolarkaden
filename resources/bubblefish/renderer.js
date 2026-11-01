/* Layered storybook reef. Cached scenery, lively vector characters, no asset downloads. */
(function(root){
'use strict';
const SC=root.Starlight,TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function ellipse(c,x,y,rx,ry,fill,stroke){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function path(c,points,fill,stroke){c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
const boostLabels={agility:'Nimma fenor',growth:'Stor fisk',armor:'Pansarfjäll',magnet:'Magnet',refill:'Liv +25 %',senses:'Skarpa sinnen'};
function fishArt(c,{x=0,y=0,size=25,time=0,player=false,armor=false,growth=false,gulp=0,spin=0,direction=1,tilt=0,alpha=1}={}){
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(spin||clamp(tilt,-.18,.18));c.scale(size/25*(direction<0?-1:1),size/25);
  const wag=Math.sin(time*(player?13:8))*.14;
  const main=player?(growth?'#ffbd59':'#ffc75c'):'#83b8c4',dark=player?'#cf683f':'#487c96',light=player?'#ffe9a1':'#d7e8d8';
  c.lineWidth=1.4;c.lineJoin='round';
  c.save();c.translate(-25,1);c.rotate(wag);
  c.beginPath();c.moveTo(2,-5);c.bezierCurveTo(-11,-19,-23,-24,-21,-14);c.quadraticCurveTo(-13,0,-23,16);c.quadraticCurveTo(-27,27,2,7);c.closePath();c.fillStyle=dark;c.fill();
  c.strokeStyle=player?'#f69b52':'#a7d3d4';c.beginPath();c.moveTo(-19,-14);c.lineTo(-3,0);c.lineTo(-20,16);c.stroke();c.restore();
  c.beginPath();c.moveTo(-15,-12);c.quadraticCurveTo(-6,-37,12,-17);c.lineTo(15,-12);c.closePath();c.fillStyle=dark;c.fill();
  const body=c.createLinearGradient(0,-23,0,24);body.addColorStop(0,light);body.addColorStop(.42,main);body.addColorStop(1,dark);
  c.beginPath();c.moveTo(-27,0);c.bezierCurveTo(-25,-24,18,-29,32,-5);c.bezierCurveTo(40,12,11,29,-13,16);c.quadraticCurveTo(-23,11,-27,0);c.fillStyle=body;c.fill();
  ellipse(c,5,11,20,7,light);c.globalAlpha*=.5;ellipse(c,-5,-12,17,5,'#fff4d1');c.globalAlpha/= .5;
  if(armor){
    for(let row=0;row<3;row++)for(let col=0;col<4;col++){
      const sx=-20+col*9+(row%2?4:0),sy=-11+row*9;
      c.beginPath();c.moveTo(sx,sy-5);c.quadraticCurveTo(sx+12,sy-6,sx+11,sy+2);c.quadraticCurveTo(sx+7,sy+10,sx,sy+2);c.closePath();
      c.fillStyle=['#bfd7d1','#85aeb5','#6b94a3'][row];c.fill();c.strokeStyle='#406879';c.lineWidth=1;c.stroke();
      c.strokeStyle='#e5f5db';c.beginPath();c.moveTo(sx+2,sy-3);c.lineTo(sx+8,sy-3);c.stroke();
    }
    c.beginPath();c.moveTo(4,-17);c.quadraticCurveTo(18,-31,33,-12);c.lineTo(29,-10);c.quadraticCurveTo(17,-23,7,-12);c.closePath();c.fillStyle='#aacbce';c.fill();
    ellipse(c,8,-15,2,2,'#f2d082');
  }
  c.save();c.translate(-1,7);c.rotate(Math.sin(time*14)*.22);
  c.beginPath();c.moveTo(-4,-4);c.quadraticCurveTo(-10,23,7,14);c.quadraticCurveTo(10,9,6,-2);c.fillStyle=armor?'#8daeb1':dark;c.fill();
  c.strokeStyle=light;c.lineWidth=.8;c.beginPath();c.moveTo(0,1);c.lineTo(1,13);c.stroke();c.restore();
  const blink=Math.sin(time*.65)>.997;
  if(blink){c.strokeStyle='#24434b';c.lineWidth=2;c.beginPath();c.arc(22,-6,5,.2,Math.PI-.2);c.stroke();}
  else{
    ellipse(c,22,-6,7,8,'#fff9e0');ellipse(c,24,-5,3.7,5,'#183d50');ellipse(c,25,-7,1.5,1.8,'#fff');
  }
  if(!player){c.strokeStyle='#315c75';c.lineWidth=2;c.beginPath();c.moveTo(15,-16);c.lineTo(28,-11);c.stroke();}
  const mouth=clamp(gulp*3,0,1);
  if(mouth>0||growth){
    const open=mouth*12+(growth?3:0);ellipse(c,31,7,8+mouth*4,3+open,'#824c4c');
    if(growth){path(c,[[25,3],[30,3],[28,8]],'#fff5dc');path(c,[[32,2],[36,2],[34,7]],'#fff5dc');}
  }else{c.strokeStyle='#9d5c43';c.lineWidth=1.5;c.beginPath();c.moveTo(27,8);c.quadraticCurveTo(31,11,34,5);c.stroke();}
  if(player)ellipse(c,17,6,4,2.5,'#f29d71');
  c.restore();
}
function boostIcon(c,kind,x,y,size=20){
  c.save();c.translate(x,y);c.scale(size/20,size/20);c.lineCap='round';c.lineJoin='round';c.lineWidth=3;
  if(kind==='refill'){
    c.beginPath();c.moveTo(0,12);c.bezierCurveTo(-26,-4,-7,-20,0,-7);c.bezierCurveTo(7,-20,26,-4,0,12);c.fillStyle='#f09092';c.fill();
    c.strokeStyle='#fff6de';c.beginPath();c.moveTo(-4,0);c.lineTo(4,0);c.moveTo(0,-4);c.lineTo(0,4);c.stroke();
  }else if(kind==='armor'){
    path(c,[[-12,-11],[0,-15],[12,-11],[10,7],[0,15],[-10,7]],'#accbd0','#547f91');
    c.strokeStyle='#f6e3aa';c.beginPath();c.moveTo(0,-8);c.lineTo(0,9);c.moveTo(-6,-2);c.lineTo(6,-2);c.stroke();
  }else if(kind==='growth'){
    fishArt(c,{size:13,x:-1,y:0,time:0,player:true,growth:true,gulp:.3});
  }else if(kind==='magnet'){
    c.strokeStyle='#ed8f94';c.lineWidth=8;c.beginPath();c.moveTo(-9,-11);c.lineTo(-9,3);c.bezierCurveTo(-9,17,9,17,9,3);c.lineTo(9,-11);c.stroke();
    c.strokeStyle='#f7ebca';c.lineWidth=8;c.beginPath();c.moveTo(-9,-11);c.lineTo(-9,-5);c.moveTo(9,-11);c.lineTo(9,-5);c.stroke();
  }else if(kind==='senses'){
    ellipse(c,0,0,12,8,'#f4f5c9');ellipse(c,2,0,4,6,'#366e81');
    c.strokeStyle='#c2eee0';c.lineWidth=2;for(const r of [15,20]){c.beginPath();c.arc(0,0,r,-.65,.65);c.stroke();}
  }else{
    path(c,[[-13,9],[1,-16],[1,-3],[12,-7],[-2,16],[-1,3]],'#fff1a0','#d4a968');
    c.strokeStyle='#b0ece5';c.lineWidth=2;c.beginPath();c.moveTo(-18,-3);c.lineTo(-12,-3);c.moveTo(-21,4);c.lineTo(-15,4);c.stroke();
  }
  c.restore();
}
class BubblefishRenderer{
  constructor(canvas,game){
    Object.assign(this,{canvas,game,ctx:canvas.getContext('2d'),last:0,pointer:null,heldKeys:new Set(),destroyed:false});
    this.reduced=!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.host=canvas.parentElement||document.getElementById('arena');
    this.inkCanvas=document.createElement('canvas');this.inkCanvas.className='bubblefish-ink';this.inkCanvas.setAttribute('aria-hidden','true');this.host.append(this.inkCanvas);this.inkCtx=this.inkCanvas.getContext('2d');
    canvas.setAttribute('aria-label','Bubbelfisken. Styr med piltangenter eller håll och dra. Fånga en uppgift och dess rätta svar.');
    this.resize=()=>{
      const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
      this.dpr=Math.min(root.devicePixelRatio||1,2);canvas.width=this.inkCanvas.width=Math.round(r.width*this.dpr);canvas.height=this.inkCanvas.height=Math.round(r.height*this.dpr);
      game.resize(r.width,r.height);this.makeScenery();this.draw();
    };
    this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);
    this.down=e=>{if(e.button!==undefined&&e.button!==0||game.state!=='playing'||this.pointer!==null)return;e.preventDefault();this.pointer=e.pointerId;canvas.setPointerCapture?.(e.pointerId);this.setPointer(e);};
    this.move=e=>{if(e.pointerId===this.pointer){e.preventDefault();this.setPointer(e);}};
    this.up=e=>{if(e.pointerId!==this.pointer)return;this.pointer=null;game.release();};
    this.keyDown=e=>{
      if(game.state!=='playing'||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||'')||e.target?.closest?.('dialog'))return;
      const key=e.key.toLowerCase();if(!['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key))return;
      e.preventDefault();this.heldKeys.add(key);this.keyVector();
    };
    this.keyUp=e=>{const key=e.key.toLowerCase();if(this.heldKeys.delete(key)){e.preventDefault();this.keyVector();}};
    this.blur=()=>{this.heldKeys.clear();this.pointer=null;game.clearInput();};
    canvas.addEventListener('pointerdown',this.down);canvas.addEventListener('pointermove',this.move);canvas.addEventListener('pointerup',this.up);canvas.addEventListener('pointercancel',this.up);canvas.addEventListener('lostpointercapture',this.up);
    root.addEventListener('keydown',this.keyDown);root.addEventListener('keyup',this.keyUp);root.addEventListener('blur',this.blur);
    if(SC.isChinese(game.mode)){
      this.toggle=document.createElement('div');this.toggle.className='bubblefish-language';
      for(const [value,label] of [['pinyin','Pinyin'],['translation','Översättningar']]){
        const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=value==='translation'&&!game.canTranslate();b.setAttribute('aria-pressed',String(value===game.chineseDisplay));
        b.addEventListener('click',()=>{game.setChineseDisplay(value);for(const el of this.toggle.children)el.setAttribute('aria-pressed',String(el===b));});this.toggle.append(b);
      }
      this.host.append(this.toggle);
    }
    this.resize();
    const frame=now=>{if(this.destroyed)return;const dt=this.last?Math.min(.2,(now-this.last)/1000):0;this.last=now;game.update(dt);this.draw();this.raf=requestAnimationFrame(frame);};
    this.raf=requestAnimationFrame(frame);
  }
  setPointer(e){const rect=this.canvas.getBoundingClientRect();this.game.moveTo((e.clientX-rect.left)*this.game.width/rect.width,(e.clientY-rect.top)*this.game.height/rect.height);}
  keyVector(){const k=this.heldKeys;this.game.steer(Number(k.has('arrowright')||k.has('d'))-Number(k.has('arrowleft')||k.has('a')),Number(k.has('arrowdown')||k.has('s'))-Number(k.has('arrowup')||k.has('w')));}
  scoreEvent(e){if(['pause','end','start'].includes(e.type))this.blur();}
  makeScenery(){
    const g=this.game,w=g.width,h=g.height,u=g.unit();this.layers=[];
    const sky=document.createElement('canvas');sky.width=w;sky.height=h;const c=sky.getContext('2d');
    const water=c.createLinearGradient(0,0,0,h);water.addColorStop(0,'#b5e0d7');water.addColorStop(.13,'#73bec5');water.addColorStop(.5,'#438ea6');water.addColorStop(1,'#25536f');c.fillStyle=water;c.fillRect(0,0,w,h);
    c.fillStyle='#eff7dc';c.globalAlpha=.09;for(let i=0;i<5;i++)path(c,[[w*(i*.24-.12),0],[w*(i*.24+.035),0],[w*(i*.24+.45),h],[w*(i*.24+.04),h]],'#eff7dc');c.globalAlpha=1;
    this.sky=sky;
    const configs=[{speed:.12,color:'#70a5ac',alpha:.34,base:.83},{speed:.30,color:'#3d8197',alpha:.43,base:.9},{speed:.57,color:'#26677d',alpha:.7,base:1}];
    for(let layer=0;layer<configs.length;layer++){
      const cfg=configs[layer],tile=document.createElement('canvas');tile.width=Math.ceil(Math.max(700,w));tile.height=Math.ceil(h);const c=tile.getContext('2d'),tw=tile.width;
      c.globalAlpha=cfg.alpha;
      // Paint wrapped copies so plants and rocks join cleanly at the tile seam.
      for(const offset of [-tw,0,tw]){
      c.save();c.translate(offset,0);
      // Rounded reef shelves have painterly tonal bands rather than black outlines.
      for(let i=0;i<10;i++){
        const x=(i*.137*tw)%tw,y=h*cfg.base+(i%3)*13*u,rx=(52+i%4*26)*u,ry=(42+i%5*24)*u;
        ellipse(c,x,y,rx,ry,cfg.color);ellipse(c,x-6*u,y-ry*.15,rx*.82,ry*.65,layer===0?'#8eb9b6':layer===1?'#5b98a3':'#3f7c8a');
      }
      for(let i=0;i<13;i++){
        const x=((i*157+layer*61)%tw),height=(50+(i*37)%175)*u,y=h+8*u;
        this.kelp(c,x,y,height,layer===0?'#76abae':layer===1?'#568e91':'#347e80',i*.9,layer===2?4:3);
      }
      if(layer===2){
        for(let i=0;i<5;i++)this.coral(c,(i*241+43)%tw,h-5*u,35*u+(i%3)*18*u,i%2?'#a68498':'#bd9f92');
        for(let i=0;i<12;i++)ellipse(c,(i*97)%tw,h-4*u-(i%3)*8*u,(16+i%4*8)*u,(7+i%3*4)*u,'#6a9698');
      }
      c.restore();
      }
      this.layers.push({canvas:tile,...cfg});
    }
  }
  kelp(c,x,y,height,color,phase,leaves=4){
    c.save();c.strokeStyle=color;c.lineWidth=Math.max(2,height/35);c.lineCap='round';
    c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+20*Math.sin(phase),y-height*.35,x-16,y-height*.7,x+8,y-height);c.stroke();
    for(let j=1;j<=leaves;j++){
      const py=y-height*j/(leaves+1),side=j%2?1:-1,xx=x+Math.sin(j+phase)*7;
      c.beginPath();c.moveTo(xx,py);c.bezierCurveTo(xx+side*40,py-3,xx+side*23,py-30,xx+side*8,py-30);c.quadraticCurveTo(xx,py-15,xx,py);c.fillStyle=color;c.fill();
    }c.restore();
  }
  coral(c,x,y,size,color){
    c.save();c.strokeStyle=color;c.lineWidth=size*.16;c.lineCap='round';
    for(let i=0;i<5;i++){const angle=(i-2)*.32,dx=Math.sin(angle)*size,dy=-Math.cos(angle)*size;
      c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx*.3,y+dy*.3,x+dx,y+dy);c.stroke();
      for(const t of [.5,.75]){c.beginPath();c.moveTo(x+dx*t,y+dy*t);c.lineTo(x+dx*t+(i%2?-1:1)*size*.25,y+dy*t-size*.2);c.stroke();}
    }c.restore();
  }
  background(){
    const c=this.ctx,g=this.game,w=g.width,h=g.height;if(!this.sky)return;
    c.drawImage(this.sky,0,0);
    for(const layer of this.layers){const shift=(g.distance*g.pixelsPerMetre()*layer.speed)%layer.canvas.width;c.drawImage(layer.canvas,-shift,0);c.drawImage(layer.canvas,layer.canvas.width-shift,0);}
    const u=g.unit();c.save();c.globalAlpha=.22;c.strokeStyle='#d5f2e4';c.lineWidth=1;
    for(let i=0;i<24;i++){const x=((i*143.29-g.distance*g.pixelsPerMetre()*.2)%(w+60)+w+60)%(w+60)-30,y=h-((i*93.7+g.clock*(10+i%4*3))%(h+30));ellipse(c,x,y,(2+i%3)*u,(2.5+i%3)*u,null,'#d5f2e4');}
    c.restore();
    // Tiny distant fish move as one faded school, well behind the play objects.
    c.save();c.globalAlpha=.17;
    for(let i=0;i<9;i++){const x=((w+120-((g.distance*1.9+i*29)%(w+180)))),y=h*.34+Math.sin(i*.7)*24*u;fishArt(c,{x,y,size:6*u,direction:-1,time:this.reduced?0:g.clock+i});}c.restore();
  }
  rock(c,x,y,r,seed=0){
    c.save();c.translate(x,y);c.lineWidth=2;
    const grad=c.createLinearGradient(-r,-r,r,r);grad.addColorStop(0,'#aac5be');grad.addColorStop(.35,'#73969b');grad.addColorStop(1,'#355971');
    c.beginPath();for(let i=0;i<9;i++){const a=i*TAU/9,rr=r*(.88+.13*Math.sin(i*4+seed));const px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fillStyle=grad;c.fill();c.strokeStyle='#477487';c.stroke();
    c.beginPath();c.moveTo(-r*.65,-r*.31);c.lineTo(-r*.15,-r*.68);c.lineTo(r*.35,-r*.49);c.strokeStyle='#c3d4c8';c.lineWidth=2;c.stroke();
    c.beginPath();c.moveTo(-r*.15,-r*.68);c.lineTo(r*.05,-r*.05);c.lineTo(r*.57,r*.4);c.strokeStyle='#567f89';c.stroke();
    for(let i=0;i<3;i++)ellipse(c,-r*.55+i*r*.5,r*.65,6,3,'#699d8a');c.restore();
  }
  obstacle(o){
    const c=this.ctx,g=this.game,u=g.unit(),t=this.reduced?0:g.clock;
    if(o.kind==='rock')this.rock(c,o.x,o.y,o.r,o.phase);
    else if(o.kind==='wall'){
      const top=o.gapY-o.gap/2,bottom=o.gapY+o.gap/2;
      c.fillStyle='#648c94';c.fillRect(o.x-o.w/2,0,o.w,top);c.fillRect(o.x-o.w/2,bottom,o.w,g.height-bottom);
      for(let y=-15;y<g.height+25;y+=42*u)if(y<top-12*u||y>bottom+12*u)this.rock(c,o.x+(Math.floor(y/(42*u))%2?8:-8)*u,y,36*u,o.phase+y);
      this.rock(c,o.x,top-18*u,30*u,o.phase);this.rock(c,o.x,bottom+18*u,30*u,o.phase+1);
    }else if(o.kind==='urchin'){
      c.save();c.translate(o.x,o.y);c.rotate(Math.sin(t+o.phase)*.07);c.strokeStyle='#bf9eb4';c.lineWidth=2.3;
      for(let i=0;i<18;i++){const a=i*TAU/18;c.beginPath();c.moveTo(Math.cos(a)*o.r*.42,Math.sin(a)*o.r*.42);c.lineTo(Math.cos(a)*o.r,Math.sin(a)*o.r);c.stroke();}
      ellipse(c,0,0,o.r*.65,o.r*.65,'#886f9b');ellipse(c,-4*u,-3*u,3.5*u,4*u,'#f7eddf');ellipse(c,5*u,-3*u,3.5*u,4*u,'#f7eddf');ellipse(c,-3*u,-2*u,1.8*u,2*u,'#343d60');ellipse(c,6*u,-2*u,1.8*u,2*u,'#343d60');c.restore();
    }else if(o.kind==='predator')fishArt(c,{x:o.x,y:o.y,size:o.r,time:t+o.phase,direction:o.speed<0?1:-1,tilt:Math.cos(t*o.frequency+o.phase)*.12});
    else if(o.kind==='octopus'){
      c.save();c.translate(o.x,o.y);c.lineCap='round';
      for(let i=0;i<7;i++){
        c.beginPath();c.moveTo((i-3)*o.r*.2,o.r*.25);c.bezierCurveTo((i-3)*o.r*.42,o.r*.7,(i-3)*o.r*.48+Math.sin(t*2+i)*12*u,o.r*1.2,(i-3)*o.r*.49+Math.cos(t*2+i)*12*u,o.r*.86);
        c.strokeStyle=i%2?'#b490b5':'#c9a4bf';c.lineWidth=10*u;c.stroke();c.strokeStyle='#e3c8cf';c.lineWidth=3*u;c.stroke();
      }
      const grad=c.createLinearGradient(0,-o.r,0,o.r);grad.addColorStop(0,'#e0b9cd');grad.addColorStop(1,'#a07eaf');
      ellipse(c,0,-o.r*.15,o.r*.83,o.r*.78,grad);ellipse(c,-o.r*.25,-o.r*.12,6*u,8*u,'#fff2df');ellipse(c,o.r*.26,-o.r*.12,6*u,8*u,'#fff2df');ellipse(c,-o.r*.29,-o.r*.08,2.5*u,4*u,'#42415e');ellipse(c,o.r*.22,-o.r*.08,2.5*u,4*u,'#42415e');
      ellipse(c,0,o.r*.25,3*u,4*u,'#7a5e83');c.restore();
    }else if(o.kind==='current'){
      c.save();const alpha=.10+.03*Math.sin(t*3);c.fillStyle=`rgba(188,235,226,${alpha})`;c.fillRect(o.x-o.w/2,62*u,o.w,g.height-112*u);
      c.strokeStyle='#b8dfdb';c.globalAlpha=.4;c.lineWidth=2;
      for(let i=0;i<9;i++){const y=82*u+((i*59*u+t*55*u*o.direction)%(g.height-145*u)+(g.height-145*u))%(g.height-145*u),x=o.x+(i%3-1)*o.w*.23;
        c.beginPath();c.moveTo(x-4*u,y);c.quadraticCurveTo(x+9*u,y+14*u*o.direction,x,y+30*u*o.direction);c.lineTo(x-5*u,y+24*u*o.direction);c.moveTo(x,y+30*u*o.direction);c.lineTo(x+5*u,y+24*u*o.direction);c.stroke();}
      c.restore();
    }else if(o.kind==='bird'){
      c.save();c.translate(o.x,o.y);c.rotate(o.vy>0?1.15:-1.15);c.fillStyle='#e2e6d8';
      c.beginPath();c.moveTo(-8*u,0);c.quadraticCurveTo(-30*u,-35*u,10*u,-15*u);c.quadraticCurveTo(28*u,-42*u,29*u,-22*u);c.lineTo(12*u,9*u);c.closePath();c.fill();
      ellipse(c,9*u,3*u,20*u,11*u,'#f8edcc');path(c,[[25*u,1*u],[43*u,8*u],[24*u,10*u]],'#e8b265');ellipse(c,21*u,1*u,2*u,2*u,'#284759');c.restore();
    }
  }
  label(item,x,y,w,h,{alpha=1,small=false}={}){
    const c=this.ctx,u=this.game.unit();c.save();c.globalAlpha*=alpha;
    if(item.diagram){SC.drawMathDiagram(c,item.diagram,{x:x-w/2+6*u,y:y-h/2+6*u,w:w-12*u,h:h-12*u});c.restore();return;}
    const text=String(item.label??''),max=w-19*u;let size=small?12:clamp(21*u,15,23);
    c.font='600 '+size+'px "Trebuchet MS", system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#163e54';
    // Keep a vocabulary word intact whenever a modest font adjustment can fit it.
    if(!text.includes(' ')&&c.measureText(text).width>max){size=Math.max(small?8:12,size*max/c.measureText(text).width);c.font='600 '+size+'px "Trebuchet MS", system-ui, sans-serif';}
    const words=text.includes(' ')?text.split(' '):[...text],join=text.includes(' ')?' ':'';let line='',lines=[];
    for(const word of words){const next=line?line+join+word:word;if(c.measureText(next).width>max&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    const spacing=size*1.12;
    if(lines.length*spacing>h-12*u){const scale=Math.max(.64,(h-12*u)/(lines.length*spacing));c.font='600 '+size*scale+'px "Trebuchet MS", system-ui, sans-serif';}
    const finalSize=Number(c.font.match(/([\d.]+)px/)?.[1]||size),step=finalSize*1.12;
    for(let i=0;i<lines.length;i++)c.fillText(lines[i],x,y+(i-(lines.length-1)/2)*step,max);
    c.restore();
  }
  bubble(b,{held=false,alpha=1,small=false}={}){
    const c=this.ctx,g=this.game;c.save();c.globalAlpha*=alpha;
    const gradient=c.createRadialGradient(b.x-b.w*.18,b.y-b.h*.25,2,b.x,b.y,b.w*.55);gradient.addColorStop(0,'rgba(249,252,231,.95)');gradient.addColorStop(.65,'rgba(226,246,232,.86)');gradient.addColorStop(1,'rgba(162,220,223,.74)');
    c.lineWidth=held?2.6:1.6;ellipse(c,b.x,b.y,b.w/2,b.h/2,gradient,held?'#ffe398':'#d8f2e9');
    c.strokeStyle='rgba(255,255,235,.88)';c.lineWidth=3*g.unit();c.beginPath();c.ellipse(b.x,b.y,b.w/2-5*g.unit(),b.h/2-5*g.unit(),0,Math.PI*1.1,Math.PI*1.52);c.stroke();
    this.label(b.item,b.x,b.y,b.w,b.h,{small});c.restore();
  }
  pickup(p){
    const c=this.ctx;c.save();const grad=c.createRadialGradient(p.x-p.r*.3,p.y-p.r*.4,1,p.x,p.y,p.r);grad.addColorStop(0,'#f5efce');grad.addColorStop(1,'#94cfd0');
    c.lineWidth=2;ellipse(c,p.x,p.y,p.r,p.r,grad,'#e5f1d8');boostIcon(c,p.kind,p.x,p.y,p.r*.68);c.restore();
  }
  achievements(){
    const g=this.game,c=this.ctx,u=g.unit(),n=g.collected.length;if(!n)return;
    const pairW=103*u,margin=13*u,step=Math.min(pairW+5,(g.width-margin*2-pairW)/Math.max(1,n-1)),baseY=g.height-25*u;
    for(let i=0;i<n;i++){
      const p=g.collected[i],t=clamp(p.age/.75,0,1),ease=1-(1-t)**3,tx=margin+pairW/2+i*step,ty=baseY+(i%3-1)*2*u;
      const x=p.x+(tx-p.x)*ease,y=p.y+(ty-p.y)*ease,scale=(1-ease)*.55+1,w=49*u*scale,h=31*u*scale;
      c.save();c.globalAlpha=.78+.22*t;
      this.bubble({x:x-w/2-1,y,w,h,item:p.question},{small:true});this.bubble({x:x+w/2+1,y,w,h,item:p.answer},{small:true});c.restore();
    }
  }
  effects(){
    const c=this.ctx,g=this.game,u=g.unit();
    for(const e of g.effects){
      const t=e.age/e.duration;c.save();c.globalAlpha=1-t;
      if(e.kind==='pop'){
        c.strokeStyle='#e1f5ea';c.lineWidth=1.8*u;
        for(let i=0;i<7;i++){const a=i*TAU/7+e.phase,r=(e.w*.4+14*u*t);c.beginPath();c.moveTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r*.65);c.lineTo(e.x+Math.cos(a)*(r+6*u),e.y+Math.sin(a)*(r+6*u)*.65);c.stroke();}
        this.label(e.item,e.x,e.y-10*u*t,e.w,e.h,{alpha:1-t});
      }else if(e.kind==='eaten'){
        const x=e.fromX+(g.fish.x+g.radius()-e.fromX)*t,y=e.fromY+(g.fish.y-e.fromY)*t;
        fishArt(c,{x,y,size:e.r*(1-t),time:g.clock,direction:-1});
      }else if(e.kind==='reward'){
        c.font='600 '+20*u+'px "Trebuchet MS",sans-serif';c.textAlign='center';c.fillStyle='#fff3b9';c.fillText('+'+e.points,e.x,e.y-38*u-30*u*t);
      }else if(e.kind==='rubble'){
        c.translate(e.x,e.y);c.rotate(e.age*7);path(c,[[-e.r,-e.r],[e.r*.8,-e.r*.6],[e.r,e.r*.5],[-e.r*.5,e.r]],'#91b3b1');
      }else{
        const color={gold:'#ffdc78',spark:'#e7f1b7',crumb:'#b9e3df',dizzy:'#fff0b1'}[e.kind]||'#c7e8e1';ellipse(c,e.x,e.y,e.r*(1-t*.4),e.r*(1-t*.4),color);
      }c.restore();
    }
  }
  player(){
    const g=this.game,c=this.ctx,u=g.unit(),f=g.fish;if(!f)return;
    const time=this.reduced?0:g.clock;
    if(g.has('magnet')){c.save();c.strokeStyle='#f2dd9d';c.globalAlpha=.18;c.lineWidth=1.5;for(const r of [62,94,130]){c.beginPath();c.arc(f.x,f.y,(r+Math.sin(time*3)*4)*u,-1.05,1.05);c.stroke();}c.restore();}
    if(g.has('agility')){c.save();c.strokeStyle='#c7f4ed';c.globalAlpha=.55;c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.moveTo(f.x-g.radius()-12*u,f.y+(i-1)*12*u);c.lineTo(f.x-g.radius()-40*u,f.y+(i-1)*12*u+3);c.stroke();}c.restore();}
    fishArt(c,{x:f.x,y:f.y,size:g.radius()*1.25,time,player:true,armor:g.has('armor'),growth:g.has('growth'),gulp:g.gulp,spin:g.stun&&!this.reduced?(2-g.stun)*TAU*1.4:0,tilt:f.vy/1500,alpha:g.stun?.62+.23*Math.sin(g.clock*18):1});
    if(g.stun){
      for(let i=0;i<3;i++){const a=time*5+i*TAU/3;ellipse(c,f.x+Math.cos(a)*34*u,f.y-33*u+Math.sin(a)*7*u,3*u,3*u,'#ffed9b');}
    }
  }
  boostStatus(){
    const g=this.game,c=this.ctx,u=g.unit(),active=Object.entries(g.active).filter(([,left])=>left>0);
    let x=g.width/2-(active.length-1)*17*u;
    for(const [kind,left] of active){
      c.save();c.globalAlpha=left<2?.5+.5*Math.abs(Math.sin(g.clock*7)):1;
      boostIcon(c,kind,x,61*u,10*u);c.strokeStyle='#e0e9c3';c.lineWidth=2;c.beginPath();c.arc(x,61*u,15*u,-Math.PI/2,-Math.PI/2+TAU*left/SC.bubblefishBoosts[kind]);c.stroke();c.restore();x+=34*u;
    }
    for(const warning of g.warnings){
      c.save();c.globalAlpha=.55+.4*Math.sin(g.clock*8);c.translate(warning.x,warning.y);c.rotate(warning.direction==='down'?Math.PI/2:warning.direction==='left'?Math.PI:0);path(c,[[-10*u,-8*u],[2*u,-8*u],[2*u,-15*u],[16*u,0],[2*u,15*u],[2*u,8*u],[-10*u,8*u]],'#fff0ad','#8b947b');c.restore();
    }
  }
  ink(){
    const c=this.inkCtx,g=this.game;if(!c)return;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,g.width,g.height);
    for(const ink of g.ink){
      const t=ink.age/ink.duration,r=ink.r*(1+3.2*(1-Math.exp(-t*5)));
      c.save();c.globalAlpha=.92*(1-t)**1.35;
      const grad=c.createRadialGradient(ink.x,ink.y,r*.15,ink.x,ink.y,r);grad.addColorStop(0,'#263243');grad.addColorStop(.55,'#283547');grad.addColorStop(1,'rgba(39,51,70,0)');
      ellipse(c,ink.x,ink.y,r,r*.86,grad);
      for(let i=0;i<6;i++){const a=i*TAU/6+ink.seed,x=ink.x+Math.cos(a)*r*.42,y=ink.y+Math.sin(a)*r*.35;const puff=c.createRadialGradient(x,y,0,x,y,r*.58);puff.addColorStop(0,'rgba(31,42,61,.7)');puff.addColorStop(1,'rgba(31,42,61,0)');ellipse(c,x,y,r*.58,r*.58,puff);}
      c.restore();
    }
  }
  draw(){
    const c=this.ctx,g=this.game;if(!g.fish||!this.dpr)return;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,g.width,g.height);this.background();
    for(const o of g.obstacles)if(o.kind==='current')this.obstacle(o);
    for(const b of g.balls){ellipse(c,b.x,b.y,b.r,b.r,'#f5ca58','#d8ac42');ellipse(c,b.x-b.r*.3,b.y-b.r*.35,b.r*.26,b.r*.22,'#ffed9a');}
    for(const o of g.obstacles)if(o.kind!=='current')this.obstacle(o);
    for(const p of g.pickups)this.pickup(p);
    for(const b of [...g.questions,...g.answers])this.bubble(b);
    if(g.held){
      c.save();c.strokeStyle='rgba(242,231,178,.6)';c.lineWidth=1.3;const b=g.held;c.beginPath();c.moveTo(g.fish.x,g.fish.y);c.quadraticCurveTo(b.x,g.fish.y+18*g.unit(),b.x,b.y);c.stroke();c.restore();this.bubble(b,{held:true});
    }
    this.player();this.effects();this.achievements();this.boostStatus();this.ink();
  }
  destroy(){
    this.destroyed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.blur();this.game.audio?.destroy();
    for(const [type,fn] of [['pointerdown',this.down],['pointermove',this.move],['pointerup',this.up],['pointercancel',this.up],['lostpointercapture',this.up]])this.canvas.removeEventListener(type,fn);
    root.removeEventListener('keydown',this.keyDown);root.removeEventListener('keyup',this.keyUp);root.removeEventListener('blur',this.blur);this.inkCanvas.remove();this.toggle?.remove();
  }
}
Object.assign(SC,{BubblefishRenderer,bubblefishArt:{fish:fishArt,boost:boostIcon},bubblefishBoostLabels:boostLabels});
})(globalThis);
