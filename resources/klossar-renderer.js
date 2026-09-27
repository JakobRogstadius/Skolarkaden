/* DOM tile faces keep text sharp, selectable by touch, and accessible as buttons. */
(function(root){
'use strict';
const SC=root.Starlight;
const element=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
const clock=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
class KlossarRenderer{
  constructor(canvas,game){
    this.canvas=canvas;this.game=game;this.reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.host=element('section','klossar-scene');this.host.setAttribute('aria-label','Klossar');
    this.caption=element('div','klossar-caption');
    this.caption.append(element('span','klossar-layout-name',game.layout.name),element('span','klossar-rule','Fri ovansida + fri vänster- eller högerkant'));
    this.viewport=element('div','klossar-viewport');this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label','Spelplan. Rulla för att se hela banan på en liten skärm.');
    this.board=element('div','klossar-board');this.viewport.append(this.board);
    this.instructions=element('p','klossar-instructions','Välj två klossar som hör ihop. Klicka igen för att avmarkera.');
    this.status=element('span','sr-only');this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');
    this.host.append(this.caption,this.viewport,this.instructions,this.status);canvas.parentElement.append(this.host);
    this.buttons=new Map();this.puffs=new Map();this.lastRevision=-1;this.lastState='';this.destroyed=false;
    for(const tile of game.tiles){
      const button=element('button','klossar-tile');button.type='button';button.dataset.tileId=tile.id;
      button.addEventListener('click',()=>{this.advance(performance.now());game.select(tile.id);this.draw();});
      const face=element('span','klossar-face');
      if(tile.item.diagram){
        const diagram=document.createElement('canvas');diagram.width=224;diagram.height=160;diagram.setAttribute('aria-hidden','true');
        const ctx=diagram.getContext('2d');ctx.scale(2,2);SC.drawMathDiagram(ctx,tile.item.diagram,{x:0,y:0,w:112,h:80});face.append(diagram);
        button.setAttribute('aria-label',tile.item.diagram.kind==='dots'?'Räkna prickarna':tile.item.diagram.kind==='number-line'?'Vilket tal saknas på tallinjen?':'Vilket tal ersätter frågetecknet i diagrammet?');
      }else{face.textContent=tile.item.label;button.setAttribute('aria-label',tile.item.label);}
      button.append(face);this.board.append(button);this.buttons.set(tile.id,button);
    }
    this.resize=()=>this.layout();this.observer=new ResizeObserver(this.resize);this.observer.observe(this.viewport);
    this.lastTime=performance.now();
    const frame=now=>{if(this.destroyed)return;this.advance(now);this.draw();this.raf=requestAnimationFrame(frame);};
    this.raf=requestAnimationFrame(frame);this.layout();
  }
  advance(now){
    // Use real foreground time, including slow frames; pause/resume reset this
    // timestamp so reading a paused board never earns an artificial speed bonus.
    const dt=Math.max(0,(now-this.lastTime)/1000);this.lastTime=now;this.game.update(dt);
  }
  layout(){
    const g=this.game,viewport=this.viewport.getBoundingClientRect();if(!viewport.width)return;
    const points=g.slots.map(t=>({x:t.x-t.z*.12,y:t.y-t.z*.12}));
    const minX=Math.min(...points.map(p=>p.x))-.18,minY=Math.min(...points.map(p=>p.y))-.18;
    const columns=Math.max(...points.map(p=>p.x))-minX+1.3,rows=Math.max(...points.map(p=>p.y))-minY+1.4;
    const longest=Math.max(...g.tiles.map(t=>Array.from(t.item.label||'').length));
    const minWidth=g.tiles.some(t=>t.item.diagram)?100:longest>16?104:longest>8?86:longest>3?70:48;
    const ratio=longest>8?1.04:1.14;
    const cell=Math.max(minWidth,Math.min(104,viewport.width/columns,Math.max(1,viewport.height)/rows/ratio));
    this.geometry={minX,minY,cell,row:cell*ratio};
    this.board.style.width=columns*cell+'px';this.board.style.height=rows*cell*ratio+'px';
    this.host.classList.toggle('klossar-scrollable',columns*cell>viewport.width+2||rows*cell*ratio>viewport.height+2);
    this.instructions.textContent=(this.host.classList.contains('klossar-scrollable')?'Rulla för att se hela banan. ':'')+'Välj två klossar. Klicka igen för att avmarkera.';
    for(const tile of g.tiles){
      const button=this.buttons.get(tile.id),p=this.position(tile);
      Object.assign(button.style,{left:p.x+'px',top:p.y+'px',width:(cell-3)+'px',height:(cell*ratio-5)+'px',zIndex:String(10+tile.z*100+tile.y)});
      button.style.setProperty('--tile-font',Math.min(27,cell*.35)+'px');
      const face=button.firstElementChild;
      if(!tile.item.diagram){
        // Wrap naturally, then shrink uniformly if a long word still needs room.
        let size=Math.min(27,cell*.35);face.style.fontSize=size+'px';
        while(size>12&&(face.scrollWidth>face.clientWidth+1||face.scrollHeight>face.clientHeight+1)){size--;face.style.fontSize=size+'px';}
      }
    }
    for(const [id,node] of this.puffs){const effect=g.effects.find(e=>e.id===id);if(effect)this.placePuff(node,effect);}
    this.draw();
  }
  position(tile){const p=this.geometry;return {x:(tile.x-tile.z*.12-p.minX)*p.cell,y:(tile.y-tile.z*.12-p.minY)*p.row};}
  placePuff(node,effect){const p=this.position(effect);node.style.left=p.x+'px';node.style.top=p.y+'px';node.style.width=this.geometry.cell+'px';node.style.height=this.geometry.row+'px';}
  scoreEvent(event){
    if(event.type==='pause'||event.type==='resume')this.lastTime=performance.now();
    if(event.type==='hit')this.status.textContent=this.game.hits+' av '+this.game.total+' par klara.';
    if(event.type==='miss')this.status.textContent='De klossarna hör inte ihop. Försök igen.';
    if(event.type==='klossar-shuffle'){this.layout();this.status.textContent='Inga fria par. De återstående klossarna har blandats.';}
    this.draw();
  }
  draw(){
    const g=this.game;if(!this.geometry)return;
    const changed=this.lastRevision!==g.revision||this.lastState!==g.state;
    if(changed){
      const free=new Set(g.getAvailableTargets());
      for(const tile of g.tiles){
        const button=this.buttons.get(tile.id);button.hidden=tile.removed;
        button.disabled=!free.has(tile)||g.state!=='playing'||!!g.feedback;
        button.classList.toggle('is-blocked',!free.has(tile));
        button.classList.toggle('is-selected',g.selected.includes(tile));
        button.classList.toggle('is-wrong',!!g.feedback?.ids.includes(tile.id));
        button.setAttribute('aria-pressed',String(g.selected.includes(tile)));
      }
      this.lastRevision=g.revision;this.lastState=g.state;
    }
    this.host.classList.toggle('is-paused',g.state==='paused');
    for(const effect of g.effects)if(!this.puffs.has(effect.id)){
      const puff=element('span','klossar-puff');puff.setAttribute('aria-hidden','true');
      for(let i=0;i<9;i++){const smoke=element('i','');const angle=i*2.399;smoke.style.setProperty('--dx',Math.cos(angle)*(15+i*3)+'px');smoke.style.setProperty('--dy',Math.sin(angle)*(12+i*2)-19+'px');smoke.style.setProperty('--turn',i*37+'deg');puff.append(smoke);}
      this.placePuff(puff,effect);this.board.append(puff);this.puffs.set(effect.id,puff);
    }
    for(const [id,puff] of this.puffs)if(!g.effects.some(e=>e.id===id)){puff.remove();this.puffs.delete(id);}
  }
  destroy(){this.destroyed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.host.remove();}
}
Object.assign(SC,{KlossarRenderer,klossarClock:clock});
})(globalThis);
