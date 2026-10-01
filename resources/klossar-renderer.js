/* DOM tile faces keep text sharp, selectable by touch, and accessible as buttons. */
(function(root){
'use strict';
const SC=root.Starlight;
const element=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
const clock=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
class KlossarRenderer{
  constructor(canvas,game,{creatureRandom=Math.random}={}){
    this.canvas=canvas;this.game=game;this.reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.host=element('section','klossar-scene');this.host.setAttribute('aria-label','Klossar');
    this.caption=element('div','klossar-caption');
    this.displayButtons=new Map();
    if(SC.isChinese(game.mode)){
      const toggle=element('div','klossar-chinese-toggle');toggle.setAttribute('role','group');toggle.setAttribute('aria-label','Matcha kinesiska tecken med');
      for(const [value,label] of [['pinyin','Pinyin'],['translation','Översättningar']]){
        const button=element('button','',label);button.type='button';
        button.addEventListener('click',()=>{this.advance(performance.now());if(game.setChineseDisplay(value))this.layout();});
        toggle.append(button);this.displayButtons.set(value,button);
      }
      this.caption.append(toggle);
    }else this.caption.append(element('span','klossar-exercise-name',SC.modes[game.mode].name));
    this.caption.append(element('span','klossar-rule','Välj klossar med helt fri ovansida'));
    this.viewport=element('div','klossar-viewport');this.viewport.setAttribute('aria-label','Spelplan');
    this.board=element('div','klossar-board');this.viewport.append(this.board);
    this.instructions=element('p','klossar-instructions','Välj två klossar som hör ihop. Klicka igen för att avmarkera.');
    this.hintButton=element('button','klossar-hint','Ledtråd (-100 poäng)');this.hintButton.type='button';
    this.hintButton.addEventListener('click',()=>{this.advance(performance.now());game.requestHint();this.draw();});
    const footer=element('div','klossar-footer');footer.append(this.instructions,this.hintButton);
    this.status=element('span','sr-only');this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');
    this.host.append(this.caption,this.viewport,footer,this.status);canvas.parentElement.append(this.host);
    this.creatures=new SC.KlossarCreatures(canvas.parentElement,{random:creatureRandom,reduced:this.reduced});
    this.buttons=new Map();this.puffs=new Map();this.lastRevision=-1;this.lastState='';this.destroyed=false;
    for(const tile of game.tiles){
      const button=element('button','klossar-tile');button.type='button';button.dataset.tileId=tile.id;
      const textColor=tile.side==='problem'?'#742f36':'#243f75';
      button.style.setProperty('--tile-ink',textColor);
      button.addEventListener('click',()=>{this.advance(performance.now());game.select(tile.id);this.draw();});
      const face=element('span','klossar-face');
      // Visual randomness is independent of the deal and is assigned only once.
      face.dataset.font=Math.random()<.5?'serif':'sans';
      if(tile.item.diagram){
        const diagram=document.createElement('canvas');diagram.width=224;diagram.height=160;diagram.setAttribute('aria-hidden','true');
        const ctx=diagram.getContext('2d');ctx.scale(2,2);SC.drawMathDiagram(ctx,tile.item.diagram,{x:0,y:0,w:112,h:80},{textColor});face.append(diagram);
        button.setAttribute('aria-label',tile.item.diagram.kind==='dots'?'Räkna prickarna':tile.item.diagram.kind==='number-line'?'Vilket tal saknas på tallinjen?':'Vilket tal ersätter frågetecknet i diagrammet?');
      }else{face.textContent=tile.item.label;button.setAttribute('aria-label',tile.item.label);}
      button.append(face);this.board.append(button);this.buttons.set(tile.id,button);
    }
    this.resize=()=>this.layout();this.observer=new ResizeObserver(this.resize);this.observer.observe(this.viewport);
    this.lastTime=performance.now();
    const frame=now=>{if(this.destroyed)return;this.advance(now);this.draw();this.raf=requestAnimationFrame(frame);};
    this.raf=requestAnimationFrame(frame);this.layout();
    // A downloaded font can have different metrics from its local fallback.
    // Refit once both faces are ready, without changing any tile's font choice.
    document.fonts?.ready.then(()=>{if(!this.destroyed)this.layout();});
  }
  advance(now){
    // Use real foreground time, including slow frames; pause/resume reset this
    // timestamp so reading a paused board never earns an artificial speed bonus.
    const dt=Math.max(0,(now-this.lastTime)/1000);this.lastTime=now;
    if(['playing','celebrating','won'].includes(this.game.state))this.creatures.update(dt);
    this.game.update(dt);
  }
  layout(){
    this.creatures.resize();
    const g=this.game,width=this.viewport.clientWidth,height=this.viewport.clientHeight;if(!width||!height)return;
    const columns=Math.max(...g.slots.map(p=>p.x))-Math.min(...g.slots.map(p=>p.x))+1;
    const rows=Math.max(...g.slots.map(p=>p.y))-Math.min(...g.slots.map(p=>p.y))+1,maxZ=Math.max(...g.slots.map(p=>p.z));
    // Reserve room for perspective as well as the footprint. Each upper face
    // rises by exactly the solid side's offset, so its base rests on the face below.
    const padding=Math.min(18,width/8,height/8),ratio=.58,depthX=2;
    const cell=Math.min(144,(width-padding*2-maxZ*depthX)/columns,(height-padding*2-maxZ*2)/(rows*ratio+maxZ*.04));
    const row=cell*ratio,gap=Math.min(3,cell*.04),depth=Math.min(4,cell*.04),depthY=depth+2;
    const points=g.slots.map(t=>({x:t.x*cell-t.z*depthX,y:t.y*row-t.z*depthY}));
    const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y));
    this.geometry={minX,minY,cell,row,padding,depthX,depthY,tileWidth:cell-gap,tileHeight:row-gap};
    this.board.style.width=Math.max(...points.map(p=>p.x))-minX+cell+padding*2+'px';
    this.board.style.height=Math.max(...points.map(p=>p.y))-minY+row+padding*2+'px';
    this.board.style.setProperty('--tile-depth',depth+'px');
    this.board.style.setProperty('--tile-side-x',depthX+'px');
    this.board.style.setProperty('--tile-side-y',depthY+'px');
    // Give every tile a distinct integer priority, independent of DOM order
    // and original IDs, including after a reshuffle or half-tile placement.
    const order=new Map([...g.tiles].sort((a,b)=>a.z-b.z||a.y-b.y||a.x-b.x||a.id-b.id).map((t,i)=>[t.id,10+i]));
    for(const tile of g.tiles){
      const button=this.buttons.get(tile.id),p=this.position(tile);
      Object.assign(button.style,{left:p.x+'px',top:p.y+'px',width:this.geometry.tileWidth+'px',height:this.geometry.tileHeight+'px',zIndex:String(order.get(tile.id))});
      this.fitText(tile,button);
    }
    for(const [id,node] of this.puffs){const effect=g.effects.find(e=>e.id===id);if(effect)this.placePuff(node,effect);}
    this.draw();
  }
  fitText(tile,button){
    if(tile.item.diagram||tile.removed)return;
    const face=button.firstElementChild;
    // Try a single line first, allowing long labels to shrink by up to 40%
    // before wrapping. Keep up to ten characters on one line as before.
    face.style.whiteSpace='nowrap';
    let size=Math.min(22,this.geometry.cell*.18);face.style.fontSize=size+'px';
    const singleLineMin=Math.max(1,size*.6),canWrap=Array.from(tile.item.label).length>10;
    const overflows=()=>face.scrollWidth>face.clientWidth||face.scrollHeight>face.clientHeight;
    if(canWrap){
      while(size>singleLineMin&&overflows()){size=Math.max(singleLineMin,size-.5);face.style.fontSize=size+'px';}
      if(overflows())face.style.whiteSpace='normal';
    }
    while(size>1&&overflows()){size=Math.max(1,size-.5);face.style.fontSize=size+'px';}
  }
  position(tile){const p=this.geometry;return {x:p.padding+tile.x*p.cell-tile.z*p.depthX-p.minX,y:p.padding+tile.y*p.row-tile.z*p.depthY-p.minY};}
  placePuff(node,effect){const p=this.position(effect);node.style.left=p.x+'px';node.style.top=p.y+'px';node.style.width=this.geometry.tileWidth+'px';node.style.height=this.geometry.tileHeight+'px';}
  scoreEvent(event){
    if(event.type==='pause'||event.type==='resume')this.lastTime=performance.now();
    if(event.type==='hit')this.status.textContent=this.game.hits+' av '+this.game.total+' par klara.';
    if(event.type==='miss')this.status.textContent='De klossarna hör inte ihop. Försök igen.';
    if(event.type==='klossar-hint')this.status.textContent='Ledtråd: två matchande klossar markeras. 100 poäng har dragits av.';
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
        if(!tile.item.diagram&&button.firstElementChild.textContent!==tile.item.label){
          button.firstElementChild.textContent=tile.item.label;button.setAttribute('aria-label',tile.item.label);this.fitText(tile,button);
        }
        button.setAttribute('title',tile.item.tooltip||'');
        button.disabled=!free.has(tile)||g.state!=='playing'||!!g.feedback;
        button.classList.toggle('is-blocked',!free.has(tile));
        button.classList.toggle('is-selected',g.selected.includes(tile));
        button.classList.toggle('is-wrong',!!g.feedback?.ids.includes(tile.id));
        button.classList.toggle('is-hint',!!g.hint?.includes(tile.id));
        button.setAttribute('aria-pressed',String(g.selected.includes(tile)));
      }
      for(const [value,button] of this.displayButtons){
        button.setAttribute('aria-pressed',String(value===g.chineseDisplay));
        button.disabled=g.state!=='playing'||value==='translation'&&!g.canTranslate();
        button.title=value==='translation'&&!g.canTranslate()?'Översättning saknas i övningen.':'';
      }
      this.hintButton.disabled=g.state!=='playing'||!!g.feedback||!!g.hint;
      this.lastRevision=g.revision;this.lastState=g.state;
    }
    this.host.classList.toggle('is-paused',g.state==='paused');
    for(const effect of g.effects)if(!this.puffs.has(effect.id)){
      const puff=element('span','klossar-puff');puff.setAttribute('aria-hidden','true');
      for(let i=0;i<9;i++){const smoke=element('i','');const angle=i*2.399;smoke.style.setProperty('--dx',Math.cos(angle)*(15+i*3)+'px');smoke.style.setProperty('--dy',Math.sin(angle)*(12+i*2)-19+'px');smoke.style.setProperty('--turn',i*37+'deg');puff.append(smoke);}
      this.placePuff(puff,effect);this.board.append(puff);this.puffs.set(effect.id,puff);
      const board=this.board.getBoundingClientRect(),arena=this.creatures.host.getBoundingClientRect(),p=this.position(effect);
      this.creatures.reveal(board.left-arena.left+p.x+this.geometry.tileWidth/2,board.top-arena.top+p.y+this.geometry.tileHeight/2,this.geometry.tileHeight);
    }
    for(const [id,puff] of this.puffs)if(!g.effects.some(e=>e.id===id)){puff.remove();this.puffs.delete(id);}
    this.creatures.draw();
  }
  destroy(){this.destroyed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.creatures.destroy();this.host.remove();}
}
Object.assign(SC,{KlossarRenderer,klossarClock:clock});
})(globalThis);
