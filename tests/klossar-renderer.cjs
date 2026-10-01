/* DOM lifecycle/geometry checks. These do not replace visual browser review. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let now=0,viewport={width:1160,height:620},observed=0,cancelled=0;
const ctx2d=new Proxy({},{get:(o,k)=>k==='measureText'?text=>({width:text.length*8}):()=>{}});
class Element extends EventTarget{
  constructor(tag='div'){
    super();this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.style={setProperty(k,v){this[k]=v;}};this.textContent='';this.hidden=false;
    const classes=new Set();this.classList={add:k=>classes.add(k),contains:k=>classes.has(k),toggle(k,on){if(on)classes.add(k);else classes.delete(k);}};
  }
  append(...items){for(const item of items){item.parentElement=this;this.children.push(item);}}
  remove(){this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
  get firstElementChild(){return this.children[0];}
  setAttribute(k,v){this.attributes[k]=v;}
  getBoundingClientRect(){return {left:0,top:0,...viewport};}
  getContext(){return ctx2d;}
  get clientWidth(){return this.className==='klossar-viewport'?viewport.width:parseFloat(this.parentElement?.style.width)||100;}
  get clientHeight(){return this.className==='klossar-viewport'?viewport.height:parseFloat(this.parentElement?.style.height)||100;}
  get scrollWidth(){return this.clientWidth;}
  get scrollHeight(){return this.clientHeight;}
}
const context=vm.createContext({console,Event,EventTarget,CustomEvent:class extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}},document:{createElement:tag=>new Element(tag)},performance:{now:()=>now},matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){observed++;}disconnect(){observed--;}},requestAnimationFrame:()=>1,cancelAnimationFrame(){cancelled++;}});
for(const name of ['data','language-exercises-data','language-exercises','input','game','klossar','klossar-creatures','klossar-renderer'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+name+'.js'),'utf8'),context);
const SC=context.Starlight;
for(const mode of ['swedishLong','chineseTrad4','math-equations','math-diagrams'])for(const layout of SC.klossarLayouts)for(const pace of ['gentle','steady','brave']){
  let renderer;const g=new SC.KlossarGame({random:()=>.31,onEvent:e=>renderer?.scoreEvent(e)});g.start({mode,layout:layout.id,pace});
  const arena=new Element(),canvas=new Element('canvas');arena.append(canvas);renderer=new SC.KlossarRenderer(canvas,g,{creatureRandom:()=>1});
  assert.equal(renderer.buttons.size,g.total*2);assert.equal(arena.children.length,3);
  for(const size of [{width:1160,height:620},{width:1000,height:360},{width:700,height:300},{width:350,height:470},{width:280,height:360}]){
    viewport=size;renderer.resize();
    assert(parseFloat(renderer.board.style.width)<=size.width+.001,'the entire board fits the viewport width');
    assert(parseFloat(renderer.board.style.height)<=size.height+.001,'the entire board fits the viewport height');
    for(const tile of g.tiles){const button=renderer.buttons.get(tile.id);assert.equal(button.disabled,!g.free(tile));assert.equal(button.attributes['aria-pressed'],'false');assert.equal(button.attributes.title,SC.isChinese(mode)&&tile.side==='problem'?tile.chinese.translation:'');
      const p=renderer.position(tile),w=renderer.geometry.tileWidth,h=renderer.geometry.tileHeight,{depthX,depthY}=renderer.geometry;
      // Compare footprints on the table; perspective only lifts the faces.
      const footprint={x:p.x+tile.z*depthX,y:p.y+tile.z*depthY};
      const covered=g.tiles.some(other=>{
        if(other.z<=tile.z)return false;
        const q=renderer.position(other);q.x+=other.z*depthX;q.y+=other.z*depthY;
        return footprint.x<q.x+w&&q.x<footprint.x+w&&footprint.y<q.y+h&&q.y<footprint.y+h;
      });
      const z=Number(button.style.zIndex);
      assert(Number.isInteger(z),'CSS must accept the stacking order even for half-row positions');
      for(const other of g.tiles)if(other.z<tile.z||other.z===tile.z&&(other.y<tile.y||other.y===tile.y&&other.x<tile.x))assert(z>Number(renderer.buttons.get(other.id).style.zIndex),'draw tiles in layer, row and column order');
      assert.equal(button.disabled,covered,'only a higher tile covering the footprint disables selection');
      const upper=renderer.position({...tile,z:tile.z+1});
      assert(Math.abs(upper.x+depthX-p.x)<1e-8&&Math.abs(upper.y+depthY-p.y)<1e-8,'the upper tile side ends exactly on the supporting face');
      assert.equal(depthX,parseFloat(renderer.board.style['--tile-side-x']));assert.equal(depthY,parseFloat(renderer.board.style['--tile-side-y']));
      for(const key of ['left','top','width','height'])assert(Number.isFinite(parseFloat(button.style[key])));
      assert(parseFloat(button.style.left)>=0&&parseFloat(button.style.top)>=0);
      assert(parseFloat(button.style.left)+parseFloat(button.style.width)<=parseFloat(renderer.board.style.width));
      assert(parseFloat(button.style.top)+parseFloat(button.style.height)<=parseFloat(renderer.board.style.height));
      assert(parseFloat(button.style.width)>parseFloat(button.style.height),'every tile is landscape');
      if(!tile.item.diagram)assert.equal(button.firstElementChild.textContent,tile.item.label);
    }
  }
  if(SC.isChinese(mode)){
    assert.equal(renderer.caption.firstElementChild.className,'klossar-chinese-toggle');
    const fonts=g.tiles.map(t=>renderer.buttons.get(t.id).firstElementChild.dataset.font);
    const translation=renderer.displayButtons.get('translation'),pinyin=renderer.displayButtons.get('pinyin');
    translation.dispatchEvent(new Event('click'));assert.equal(g.chineseDisplay,'translation');
    assert.equal(translation.attributes['aria-pressed'],'true');assert.equal(pinyin.attributes['aria-pressed'],'false');
    for(const tile of g.tiles){const button=renderer.buttons.get(tile.id);assert.equal(button.firstElementChild.textContent,tile.item.label);assert.equal(button.attributes['aria-label'],tile.item.label);assert.equal(button.attributes.title,tile.side==='problem'?tile.chinese.pinyin:'');if(tile.side==='answer')assert.equal(tile.item.label,tile.chinese.translation);}
    assert.deepEqual(g.tiles.map(t=>renderer.buttons.get(t.id).firstElementChild.dataset.font),fonts,'switching keeps each tile font');
    pinyin.dispatchEvent(new Event('click'));assert.equal(g.chineseDisplay,'pinyin');
    for(const tile of g.tiles)if(tile.side==='problem')assert.equal(renderer.buttons.get(tile.id).attributes.title,tile.chinese.translation);
  }else{assert.equal(renderer.displayButtons.size,0);assert.equal(renderer.caption.firstElementChild.textContent,SC.modes[g.mode].name);}
  const [a,b]=g.order[0].map(id=>g.tiles[id]),click=t=>renderer.buttons.get(t.id).dispatchEvent(new Event('click'));
  click(a);assert(renderer.buttons.get(a.id).classList.contains('is-selected'));click(a);assert(!renderer.buttons.get(a.id).classList.contains('is-selected'));
  click(a);now+=800;click(b);assert.equal(g.hits,1);assert.equal(g.elapsed,.8);assert(renderer.buttons.get(a.id).hidden&&renderer.buttons.get(b.id).hidden);assert.equal(renderer.puffs.size,2);
  const free=g.getAvailableTargets(),wrong=free.find(t=>t!==free[0]&&!SC.klossarMatches(t,free[0]));
  if(wrong){click(free[0]);click(wrong);assert(renderer.buttons.get(wrong.id).classList.contains('is-wrong'));now+=500;renderer.advance(now);renderer.draw();assert(!renderer.buttons.get(wrong.id).classList.contains('is-wrong'));}
  g.pause();const elapsed=g.elapsed;now+=30000;renderer.advance(now);assert.equal(g.elapsed,elapsed);renderer.draw();assert(renderer.host.classList.contains('is-paused'));
  g.resume();now+=2000;renderer.advance(now);renderer.draw();assert.equal(g.elapsed,elapsed+2);assert.equal(renderer.puffs.size,0);
  renderer.destroy();assert.equal(arena.children.length,1);assert.equal(observed,0);
}
assert.equal(cancelled,60);console.log('PASS DOM rendering for all five layouts and three difficulties: landscape tiles fit wide, short and narrow viewports; long words, Chinese, equations, diagrams, selection, smoke, wiggles, pause timing and cleanup');

// Force the rare effect through the actual removal/rendering path. All draws
// belong to the visual RNG, so even a busy scene cannot alter the next deal.
{
  viewport={width:1160,height:620};let renderer,visualDraws=0,dealDraws=0;
  const g=new SC.KlossarGame({random:()=>{dealDraws++;return .31;},onEvent:e=>renderer?.scoreEvent(e)});g.start({mode:'letters'});
  const arena=new Element(),canvas=new Element('canvas');arena.append(canvas);
  renderer=new SC.KlossarRenderer(canvas,g,{creatureRandom:()=>{visualDraws++;return 0;}});
  const [a,b]=g.order[0].map(id=>g.tiles[id]),click=t=>renderer.buttons.get(t.id).dispatchEvent(new Event('click')),before=dealDraws;
  click(a);click(a);assert.equal(visualDraws,0,'selection and toggling never expose a creature');
  click(a);click(b);assert.equal(renderer.creatures.creatures.length,2,'one chance for each removed block');assert.equal(g.hits,1);
  const count=visualDraws;renderer.draw();renderer.layout();assert.equal(visualDraws,count,'frames and resize never re-roll an exposed tile');
  assert.equal(dealDraws,before,'visual effects cannot consume the deal RNG');
  const expected=renderer.position(a),bee=renderer.creatures.creatures[0];
  assert(Math.abs(bee.start.x*viewport.width-expected.x-renderer.geometry.tileWidth/2)<1e-8,'the creature starts at the removed tile center');
  now+=300;renderer.advance(now);g.pause();const age=bee.age;
  now+=5000;renderer.advance(now);renderer.draw();assert.equal(bee.age,age,'pause freezes the flight');g.resume();
  now+=300;renderer.advance(now);assert.equal(bee.age,age+.3);
  viewport={width:350,height:470};renderer.layout();assert.equal(bee.age,age+.3,'resizing preserves progress');
  g.state='won';now+=10000;renderer.advance(now);renderer.draw();assert.equal(renderer.creatures.creatures.length,0,'last-pair creatures finish even after victory');assert(renderer.creatures.canvas.hidden);
  renderer.destroy();assert.equal(arena.children.length,1);assert.equal(observed,0);
}
console.log('PASS creature reveal once per removed tile, independent randomness, tile-center origin, pause, resize, victory and cleanup');

{
  viewport={width:1160,height:620};let renderer;
  const g=new SC.KlossarGame({random:()=>.31,onEvent:e=>renderer?.scoreEvent(e)});g.start({mode:'letters'});
  const arena=new Element(),canvas=new Element('canvas');arena.append(canvas);renderer=new SC.KlossarRenderer(canvas,g,{creatureRandom:()=>1});
  assert.equal(renderer.hintButton.textContent,'Ledtråd (-100 poäng)');assert(!renderer.hintButton.disabled);
  renderer.hintButton.dispatchEvent(new Event('click'));
  const hinted=g.tiles.filter(t=>renderer.buttons.get(t.id).classList.contains('is-hint'));
  assert.equal(hinted.length,2);assert(hinted.every(t=>g.free(t)));assert(SC.klossarMatches(...hinted));
  assert(renderer.hintButton.disabled);assert.equal(g.score,-100);assert(renderer.status.textContent.includes('100 poäng'));
  now+=6000;renderer.advance(now);renderer.draw();assert.equal(g.score,-100);
  g.pause();renderer.draw();assert(renderer.host.classList.contains('is-paused'));assert(renderer.hintButton.disabled);g.resume();
  renderer.buttons.get(hinted[0].id).dispatchEvent(new Event('click'));
  assert(g.tiles.every(t=>!renderer.buttons.get(t.id).classList.contains('is-hint')));assert(!renderer.hintButton.disabled);
  g.state='won';renderer.draw();assert(renderer.hintButton.disabled);renderer.destroy();
}
console.log('PASS hint button, pair animation classes, single charge, cancellation and disabled states');

{
  viewport={width:350,height:470};
  const g=new SC.KlossarGame({random:()=>.31});g.start({mode:'letters',layout:'turtle'});
  const arena=new Element(),canvas=new Element('canvas');arena.append(canvas);
  const renderer=new SC.KlossarRenderer(canvas,g,{creatureRandom:()=>1});
  const left=g.tiles[0],right=g.tiles.find(t=>t.z===left.z&&t.y===left.y&&t.x>left.x);
  [left.x,right.x]=[right.x,left.x];renderer.layout();
  assert(Number(renderer.buttons.get(left.id).style.zIndex)>Number(renderer.buttons.get(right.id).style.zIndex),'the right-hand tile draws in front after positions change, regardless of its original ID');
  g.tiles.reverse();renderer.layout();
  assert(Number(renderer.buttons.get(left.id).style.zIndex)>Number(renderer.buttons.get(right.id).style.zIndex),'array order cannot change side overlap');
  renderer.destroy();
}
console.log('PASS perspective alignment and stable same-row overlap after tile repositioning');
