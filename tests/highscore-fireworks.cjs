'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
class Element extends EventTarget{
  constructor(){super();this.children=[];this.value='';this.hidden=false;this.isConnected=true;this.classes=new Set();this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n)};}
  append(...items){this.children.push(...items);for(const item of items)item.parent=this;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.isConnected=false;}
  replaceChildren(){this.children=[];}setAttribute(k,v){this[k]=v;}focus(){}setSelectionRange(){}showModal(){this.open=true;}
  querySelector(){return {getBoundingClientRect:()=>({left:395,right:885,top:120,bottom:680})};}
}
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const motion=new EventTarget();motion.matches=false;
const engines=[];
class Engine{
  constructor(canvas,options){this.canvas=canvas;this.options=options;this.width=1280;this.height=800;this.queue=[];this.batches=[];this.launches=[];engines.push(this);}
  launch(options){this.launches.push(options);this.batches.push({});return true;}
  dispose(){this.disposed=true;this.queue=[];this.batches=[];}
}
const page=new EventTarget();let board={scores:[],rank:10},holdRead=null;
const context=vm.createContext({console,Event,Math,setTimeout,clearTimeout,AbortController,
  Starlight:{modes:{swedish:{name:'Svenska'}}},FireworksVisuals:{Fireworks:Engine},
  crypto:{randomUUID:()=>String(Math.random())},matchMedia:()=>motion,
  document:{getElementById:get,createElement:()=>new Element()},localStorage:{getItem:()=>'',setItem(){}},
  addEventListener:page.addEventListener.bind(page),
  fetch:async(_url,opts)=>opts.method==='POST'?Response.json({ok:true}):holdRead?await holdRead:Response.json(board)
});
for(const f of ['resources/data.js','resources/language-exercises-data.js','resources/language-exercises.js','resources/highscore-fireworks.js','resources/highscore-policy.js','resources/highscores.js'])vm.runInContext(read(f),context);
const Celebration=context.Starlight.HighscoreFireworks;
const selection={kind:'city',mode:'swedish',pace:'gentle',label:'Meteorregn',input:'typing'};
(async()=>{
  for(const rank of [null,undefined,0,-1,11,1.2,'1',NaN,Infinity])assert.equal(Celebration.programme(rank),null);
  for(let rank=1;rank<10;rank++){
    const a=Celebration.programme(rank),b=Celebration.programme(rank+1);
    assert(a.count>b.count&&a.size>b.size&&a.duration>b.duration,'better places get more, bigger fireworks for longer');
  }
  assert.equal(Celebration.programme(1).count,16);assert.equal(Celebration.programme(10).count,3);
  const ui=new context.Starlight.Highscores({getSelection:()=>selection});
  await ui.open(selection);assert.equal(engines.length,0,'browsing a top-ten board never celebrates');
  ui.begin(selection);ui.finish(123);board={scores:[],rank:null};await ui.open(selection,ui.result);
  assert.equal(engines.length,0,'unknown rank does not celebrate');
  for(const rank of [11,0,-1,1.2,'1']){board={scores:[],rank};await ui.load(ui.view);assert.equal(engines.length,0);}
  board={scores:[],rank:10};await ui.load(ui.view);
  const first=ui.celebration,e=engines.at(-1);
  assert.equal(first.rank,10);assert.equal(e.options.transparent,true);
  e.onStep(0);assert.equal(e.launches.length,1);
  await ui.load(ui.view);assert.equal(ui.celebration,first);assert.equal(first.launched,1,'same rank does not reset the programme');
  board={scores:[{is_player:1,player_name:'TEST',score:123}],rank:1};await ui.submit();
  assert.equal(ui.celebration,first);assert.equal(first.launched,1,'saving does not replay the opening');assert.equal(first.plan.count,16);
  for(let t=1;t<30;t++)e.onStep(t);
  assert.equal(e.launches.length,16,'a celebration is finite');
  const xs=e.launches.map(s=>s.x);assert(xs.some(x=>x<0)&&xs.some(x=>x>0),'bursts use both sides of the card');
  e.batches=[];e.onStep(31);assert(e.disposed);assert.equal(get('end-overlay').children.length,0,'completed fireworks release the canvas');
  await ui.load(ui.view);assert.equal(engines.length,1,'refresh after completion does not restart');
  ui.dismiss();assert(!get('end-overlay').classes.has('has-fireworks'));
  ui.begin(selection);ui.finish(1);board={scores:[],rank:3};await ui.open(selection,ui.result);
  const second=engines.at(-1);assert.equal(engines.length,2);ui.begin(selection);assert(second.disposed,'replay cleans up the previous GPU resources');
  ui.finish(1);board={scores:[],rank:5};await ui.open(selection,ui.result);
  board={scores:[],rank:11};const third=engines.at(-1);await ui.load(ui.view);assert(third.disposed,'falling out of the top ten stops fireworks');
  let release;holdRead=new Promise(resolve=>{release=resolve;});const pending=ui.load(ui.view);ui.dismiss();release(Response.json({scores:[],rank:1}));await pending;holdRead=null;
  assert.equal(ui.celebration,null,'stale network responses cannot restart a dismissed celebration');
  ui.begin(selection);ui.finish(1);board={scores:[],rank:1};await ui.open(selection,ui.result);
  const fourth=engines.at(-1);page.dispatchEvent(new Event('pagehide'));assert(fourth.disposed,'page departure cleans up immediately');
  await ui.pendingSave;page.dispatchEvent(new Event('pageshow'));
  const count=engines.length;ui.begin({...selection,reducedMotion:true});ui.finish(1);await ui.open(ui.result.selection,ui.result);assert.equal(engines.length,count);
  ui.begin(selection);ui.finish(1);motion.matches=true;await ui.open(selection,ui.result);assert.equal(engines.length,count,'system reduced motion creates no canvas');
  motion.matches=false;ui.begin(selection);ui.finish(1);await ui.open(selection,ui.result);const fifth=engines.at(-1);motion.matches=true;motion.dispatchEvent(new Event('change'));assert(fifth.disposed,'live reduced-motion changes stop the animation');
  ui.dismiss();motion.matches=false;
  const hidden=new Celebration(get('end-overlay'));hidden.setRank(5);const sixth=engines.at(-1);get('end-overlay').hidden=true;sixth.onStep(0);assert(sixth.disposed);hidden.dispose();get('end-overlay').hidden=false;
  context.FireworksVisuals.Fireworks=class{constructor(){throw Error('WebGL unavailable');}};
  ui.begin(selection);ui.finish(1);await ui.open(selection,ui.result);
  assert.equal(get('end-overlay').children.length,0);assert.equal(get('end-scores-list').children.length,10,'graphics failure leaves the scoreboard usable');
  assert.equal(get('score-name').readOnly,false);ui.dismiss();
  console.log('PASS highscore fireworks: ranks 1–10, progressive intensity, duplicate suppression, saved ranks, stale reads, replay/departure/finish cleanup, reduced motion and unavailable graphics.');
})().catch(e=>{console.error(e);process.exitCode=1;});
