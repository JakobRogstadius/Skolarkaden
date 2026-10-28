/* SVG hexes and paths, HTML exercise faces, captured mouse/pen/touch strokes. */
(function(root){
'use strict';const SC=root.Starlight,E=SC.TrasselEngine;
const element=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const svg=(tag,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
class TrasselRenderer{
  constructor(canvas,game){
    Object.assign(this,{canvas,game,pointer:null,lastTime:performance.now(),lastRevision:-1,board:null,destroyed:false});
    this.reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.host=element('section','trassel-scene');this.host.setAttribute('aria-label','Trassel');
    this.caption=element('div','trassel-caption');this.caption.append(element('span','trassel-exercise',SC.modes[game.mode].name));
    this.preview=element('div','trassel-preview','Koppla ihop rött och blått. Tomma rutor får vara kvar.');
    if(game.pairs.some(p=>p.problem.diagram)){this.preview.classList.add('with-diagrams');this.preview.textContent='Tryck på en uppgift för att se den större.';}
    this.viewport=element('div','trassel-viewport');this.surface=element('div','trassel-board');this.surface.tabIndex=0;
    this.surface.setAttribute('role','group');this.surface.setAttribute('aria-label','Spelplan. Dra mellan matchande uppgifter. Med tangentbord: välj en uppgift med Enter, gå med Q W E A S D, avsluta med Enter.');
    this.svg=svg('svg',{'aria-hidden':'true'});this.grid=svg('g');this.routes=svg('g');this.walls=svg('g');this.ghosts=svg('g');this.caps=svg('g');
    this.svg.append(this.grid,this.routes,this.ghosts,this.caps,this.walls);this.faces=element('div','trassel-faces');this.surface.append(this.svg,this.faces);this.viewport.append(this.surface);
    this.scissors=element('button','trassel-scissors','✂');this.scissors.type='button';this.scissors.title='Klipp linjen';this.scissors.setAttribute('aria-label','Klipp den markerade linjen');this.scissors.hidden=true;
    this.scissors.addEventListener('pointerdown',e=>e.stopPropagation());this.scissors.addEventListener('click',e=>{e.stopPropagation();this.advance(performance.now());game.cutLine();this.draw();});this.surface.append(this.scissors);
    this.hintButton=element('button','trassel-hint','Ledtråd −'+game.profile.max*.05);this.hintButton.type='button';
    this.hintButton.addEventListener('click',()=>{this.advance(performance.now());game.requestHint();this.draw();});
    this.message=element('p','trassel-message');this.message.setAttribute('role','status');this.message.setAttribute('aria-live','polite');
    const footer=element('div','trassel-footer');footer.append(this.message,this.hintButton);
    this.help=element('p','trassel-instructions','Dra bakåt från en linjes ände för att ändra den. Tryck på linjen och sedan ✂ för att klippa.');
    this.cover=element('div','trassel-cover');this.cover.hidden=true;this.viewport.append(this.cover);
    this.host.append(this.caption,this.preview,this.viewport,footer,this.help);canvas.parentElement.append(this.host);
    this.pathNodes=new Map();this.faceNodes=new Map();this.capNodes=new Map();
    this.surface.addEventListener('pointerdown',e=>this.down(e));this.surface.addEventListener('pointermove',e=>this.drag(e));
    this.surface.addEventListener('pointerup',e=>this.up(e));this.surface.addEventListener('pointercancel',()=>this.cancel());
    this.surface.addEventListener('lostpointercapture',()=>{if(this.pointer!==null)this.cancel();});
    this.surface.addEventListener('keydown',e=>this.key(e));
    this.resize=()=>this.layout();this.observer=new ResizeObserver(this.resize);this.observer.observe(this.viewport);
    const frame=now=>{if(this.destroyed)return;this.advance(now);this.draw();this.raf=requestAnimationFrame(frame);};this.raf=requestAnimationFrame(frame);
    document.fonts?.ready.then(()=>{if(!this.destroyed)this.layout();});this.layout();
  }
  advance(now){const dt=Math.max(0,(now-this.lastTime)/1000);this.lastTime=now;this.game.update(dt);}
  layout(){
    const board=this.game.board;if(!board)return;
    const width=this.viewport.clientWidth,height=this.viewport.clientHeight;if(!width||!height)return;
    const rotate=this.game.shape==='tall'&&width>height*1.25||this.game.shape==='wide'&&height>width*1.25;
    this.units=board.cells.map(c=>{const x=Math.sqrt(3)*(c.q+c.r/2),y=1.5*c.r;return rotate?{x:-y,y:x}:{x,y};});
    const rx=rotate?1:Math.sqrt(3)/2,ry=rotate?Math.sqrt(3)/2:1;
    const minX=Math.min(...this.units.map(c=>c.x))-rx-.22,minY=Math.min(...this.units.map(c=>c.y))-ry-.22;
    const spanX=Math.max(...this.units.map(c=>c.x))+rx+.22-minX,spanY=Math.max(...this.units.map(c=>c.y))+ry+.22-minY;
    this.scale=Math.min((width-12)/spanX,(height-12)/spanY,64);
    this.points=this.units.map(c=>({x:(c.x-minX)*this.scale,y:(c.y-minY)*this.scale}));
    const w=spanX*this.scale,h=spanY*this.scale;this.surface.style.width=w+'px';this.surface.style.height=h+'px';
    this.svg.setAttribute('viewBox',`0 0 ${w} ${h}`);this.svg.setAttribute('width',w);this.svg.setAttribute('height',h);
    this.surface.style.setProperty('--hex-size',this.scale+'px');
    this.grid.replaceChildren();this.walls.replaceChildren();this.faces.replaceChildren();this.faceNodes.clear();this.caps.replaceChildren();this.capNodes.clear();
    for(const cell of board.cells){
      const p=this.points[cell.id],tile=this.game.tiles.find(t=>t.id===cell.id);
      const vertices=Array.from({length:6},(_,i)=>{const a=(i*60-30+(rotate?90:0))*Math.PI/180;return [p.x+Math.cos(a)*this.scale*.96,p.y+Math.sin(a)*this.scale*.96].join(',');}).join(' ');
      this.grid.append(svg('polygon',{points:vertices,class:tile?'trassel-hex is-endpoint':'trassel-hex'}));
      if(!tile)continue;
      const cap=svg('polygon',{points:vertices,class:'trassel-hex is-endpoint trassel-cap'});this.caps.append(cap);this.capNodes.set(tile.id,cap);
      const button=element('button','trassel-item');button.type='button';button.dataset.tile=tile.id;
      button.style.left=p.x+'px';button.style.top=p.y+'px';button.style.setProperty('--tile-ink',tile.side==='problem'?'#742f36':'#243f75');
      const face=element('span','klossar-face');face.dataset.font=tile.id%2?'serif':'sans';
      if(tile.item.diagram){
        const diagram=document.createElement('canvas');diagram.width=224;diagram.height=160;diagram.setAttribute('aria-hidden','true');
        const ctx=diagram.getContext('2d');ctx.scale(2,2);SC.drawMathDiagram(ctx,tile.item.diagram,{x:0,y:0,w:112,h:80},{textColor:'#742f36'});face.append(diagram);
      }else face.textContent=tile.item.label;
      button.setAttribute('aria-label',tile.item.diagram&&tile.item.label==='?'?'Matteuppgift':tile.item.label);button.title=tile.item.tooltip||tile.item.label;
      button.append(face);this.faces.append(button);this.faceNodes.set(tile.id,button);
      let size=Math.min(23,this.scale*.54);face.style.fontSize=size+'px';
      while(size>8&&(face.scrollWidth>face.clientWidth||face.scrollHeight>face.clientHeight)){size=Math.max(8,size-.5);face.style.fontSize=size+'px';}
      button.addEventListener('click',e=>{if(e.detail===0&&this.game.ready()){this.keyboard=true;this.game.begin(tile.id);this.focusTile(tile.id);this.draw();}});
    }
    for(const wall of board.walls){
      const [a,b]=wall.split(':').map(Number),p=this.points[a],q=this.points[b],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),x=(p.x+q.x)/2,y=(p.y+q.y)/2;
      this.walls.append(svg('line',{x1:x-dy/d*this.scale*.52,y1:y+dx/d*this.scale*.52,x2:x+dy/d*this.scale*.52,y2:y-dx/d*this.scale*.52,class:'trassel-wall'}));
    }
    this.board=board;this.lastRevision=-1;this.draw();
  }
  locate(x,y){
    if(!this.points)return null;let best=null,distance=Infinity;
    for(let i=0;i<this.points.length;i++){const p=this.points[i],d=Math.hypot(x-p.x,y-p.y);if(d<distance){distance=d;best=i;}}
    return distance<=this.scale?best:null;
  }
  position(e){const r=this.surface.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  focusTile(id){
    const tile=this.game.tileById?.get(id);if(!tile)return;
    this.preview.replaceChildren();const label=element('span','',tile.item.label||'Matteuppgift');label.style.color=tile.side==='problem'?'#742f36':'#243f75';
    this.preview.append(label);
    if(tile.item.diagram){const c=document.createElement('canvas');c.width=224;c.height=160;const ctx=c.getContext('2d');ctx.scale(2,2);SC.drawMathDiagram(ctx,tile.item.diagram,{x:0,y:0,w:112,h:80},{textColor:'#742f36'});this.preview.replaceChildren(c);}
  }
  down(e){
    if(!this.game.ready()||e.button!==0)return;
    if(this.pointer!==null){this.cancel();return;}
    const p=this.position(e),id=this.locate(p.x,p.y);if(id===null)return;
    this.advance(performance.now());this.keyboard=false;this.game.cut=null;this.game.begin(id);this.focusTile(id);
    this.pointer=e.pointerId;this.downAt=p;this.previous=p;this.downTile=id;this.blocked=false;this.surface.setPointerCapture(e.pointerId);e.preventDefault();this.draw();
  }
  drag(e){
    if(e.pointerId!==this.pointer)return;this.advance(performance.now());
    const p=this.position(e),previous=this.previous,steps=Math.max(1,Math.ceil(Math.hypot(p.x-previous.x,p.y-previous.y)/(this.scale*.22)));
    // Sample the actual pointer segment, never path-find around walls or lines.
    for(let i=1;i<=steps&&this.game.active;i++){
      const id=this.locate(previous.x+(p.x-previous.x)*i/steps,previous.y+(p.y-previous.y)*i/steps);
      const tip=this.game.active.path.at(-1);
      if(id===tip){this.blocked=false;continue;}
      if(this.blocked)continue;
      if(id===null||!this.game.move(id))this.blocked=true;
    }
    this.previous=p;e.preventDefault();this.draw();
  }
  up(e){
    if(e.pointerId!==this.pointer)return;this.drag(e);
    const p=this.position(e),tap=Math.hypot(p.x-this.downAt.x,p.y-this.downAt.y)<this.scale*.3;
    const pending=this.game.active;this.game.release();
    if(tap&&!pending){const l=this.game.lineAt(this.downTile);if(l)this.game.showCut(l.id,this.downTile);}
    this.pointer=null;this.surface.releasePointerCapture(e.pointerId);this.draw();
  }
  cancel(){this.pointer=null;this.game.cancel();this.draw();}
  key(e){
    if(!this.game.ready()||!this.keyboard||!this.game.active)return;
    const directions={e:[1,-1],d:[1,0],s:[0,1],a:[-1,1],q:[-1,0],w:[0,-1]},dir=directions[e.key.toLowerCase()];
    if(dir){e.preventDefault();const c=this.game.board.cells[this.game.active.path.at(-1)],target=this.game.board.cells.find(t=>t.q===c.q+dir[0]&&t.r===c.r+dir[1]);if(target)this.game.move(target.id);this.draw();}
    else if(e.key==='Enter'){e.preventDefault();this.game.release();this.keyboard=false;this.draw();}
  }
  pathData(path,fraction=1){
    if(!path.length)return '';
    const end=(path.length-1)*fraction,n=Math.floor(end),points=path.slice(0,n+1).map(id=>this.points[id]);
    if(n<path.length-1&&end>n){const a=this.points[path[n]],b=this.points[path[n+1]],f=end-n;points.push({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f});}
    return points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ');
  }
  scoreEvent(e){
    if(['pause','resume'].includes(e.type)){this.lastTime=performance.now();this.pointer=null;}
    if(e.type==='trassel-ready')this.layout();this.draw();
  }
  draw(){
    const g=this.game;if(!this.points)return;if(this.board!==g.board){this.layout();return;}
    const changed=this.lastRevision!==g.revision||this.lastState!==g.state||this.lastPhase!==g.phase;
    if(changed){
      const drawn=g.lines.map(l=>({...l,key:'line'+l.id}));
      if(g.active?.started)drawn.push({...g.active,key:'active'});
      for(const line of drawn){
        let node=this.pathNodes.get(line.key);if(!node){node=svg('path',{class:'trassel-route'});this.routes.append(node);this.pathNodes.set(line.key,node);}
        node.setAttribute('d',this.pathData(line.path));node.style.stroke=line.gray?'#8d9497':line.color;node.classList.toggle('is-gray',!!line.gray);
      }
      for(const [key,node] of this.pathNodes)if(!drawn.some(l=>l.key===key)){node.remove();this.pathNodes.delete(key);}
      for(const [id,node] of this.faceNodes){const line=g.lineAt(id);node.disabled=!g.ready();const cap=this.capNodes.get(id);cap.style.stroke=line?(line.gray?'#8d9497':line.color):'';cap.style.strokeWidth=line?2:'';}
      this.message.textContent=g.message;
      this.hintButton.disabled=!g.ready()||!!g.active||!g.lines.length||g.lastHintRevision===g.boardRevision;
      this.scissors.hidden=!g.cut||!g.ready();
      if(g.cut){const p=this.points[g.cut.tile];Object.assign(this.scissors.style,{left:p.x+'px',top:p.y+'px'});}
      this.lastRevision=g.revision;this.lastState=g.state;this.lastPhase=g.phase;
    }
    this.host.classList.toggle('is-paused',g.state==='paused');
    this.cover.hidden=g.phase==='ready';this.cover.textContent=g.phase==='preparing'?'Lägger ut trasslet…':'Kontrollerar linjerna…';
    this.ghosts.replaceChildren();
    for(const effect of g.effects){const fraction=this.reduced?0:Math.max(0,1-effect.age/effect.duration);this.ghosts.append(svg('path',{d:this.pathData(effect.path,fraction),stroke:effect.color,class:'trassel-route is-retracting'}));}
  }
  destroy(){this.destroyed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.game.search=null;this.host.remove();}
}
SC.TrasselRenderer=TrasselRenderer;
})(globalThis);
