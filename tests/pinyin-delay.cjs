'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','input','people','game','foodtruck','plants','garden','beehive','paint','dinosaur','marshmallows'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,names=['City','FoodTruck','Garden','Beehive','Paint','Dinosaur','Marshmallow'];
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,t)=>{for(let i=0;i<Math.round(t/.05);i++)g.update(.05);};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
function game(name,width=1000){
 const g=new SC[name+'Game']({random:rng(5)});g.start({mode:'chinese',lang:'zh-CN',pace:'gentle'});g.resize(width,name==='Beehive'&&width<600?1200:740);
 if(name==='Garden'){g.pots[0].moisture=.4;g.syncRequests(g.pots[0]);g.decayPlants=()=>{};}
 for(let i=0;i<100&&!g.getTargets().length;i++)g.update(.05);
 const p=g.getTargets()[0];assert(p,name+' first target missing');assert(Number.isFinite(p.appearedAt),name+' missing appearance time');
 g.spawnIn=10000;g.nextSpawn=10000;
 if(name==='City'){g.threats=[p];p.duration=10000;}
 if(name==='Beehive'){g.plants=[p];p.bloomFor=10000;}
 if(name==='FoodTruck'){g.customers=[p];p.patience=10000;}
 if(name==='Paint'){g.people=[p];p.speed=0;}
 if(name==='Dinosaur'){g.people=[p];g.walkSpeed=0;g.runSpeed=0;}
 return {g,p};
}
function renderer(name,g){
 const text=[],stack=[],c=new Proxy({font:'16px system-ui',save(){stack.push(this.font);},restore(){this.font=stack.pop();},measureText(s){return {width:Array.from(s).length*Number(this.font?.match(/([\d.]+)px/)?.[1]||16)*.6};},fillText(s,x,y,max){assert(Number.isFinite(x)&&Number.isFinite(y));if(max!==undefined)assert(max>0);text.push(s);}},{get:(o,k)=>k in o?o[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
 const r=Object.create(SC[name+'Renderer'].prototype);Object.assign(r,{game:g,ctx:c,dpr:1,stars:[],reduced:true});return {r,text};
}
test('Every game reveals each unhandled character after five playable seconds, excluding pauses',()=>{
 for(const name of names){const {g,p}=game(name);assert(!SC.pinyinHints(g).has(p),name);tick(g,4.95);assert(!SC.pinyinHints(g).has(p),name+' early hint');
  g.pause();const clock=g.clock;tick(g,8);assert.equal(g.clock,clock);assert(!SC.pinyinHints(g).has(p));g.resume();tick(g,.05);assert(SC.pinyinHints(g).has(p),name+' late hint');
 }
});
test('Queued speech aliases and active jobs suppress new hints; wrong answers and revisions do not',()=>{
 for(const name of names){
  let {g,p}=game(name);p.item={answer:'十',label:'十',hint:'shí'};
  const e=g.queue.enqueue('是','speech');g.clock+=6;assert(!SC.pinyinHints(g).has(p),name+' queued homophone');g.queue.revise(e,'wrong');assert(SC.pinyinHints(g).has(p),name+' revised answer');
  ({g,p}=game(name));g.queue.enqueue(p.item.answer);g.work(.05);assert(!g.getAvailableTargets().includes(p),name+' not reserved');g.clock+=6;assert(!SC.pinyinHints(g).has(p),name+' active job');
  ({g,p}=game(name));g.queue.enqueue('wrong');g.clock+=6;assert(SC.pinyinHints(g).has(p),name+' wrong input must not hide hint');
 }
});
test('Reservations handle duplicate characters one at a time; revealed hints remain stable',()=>{
 const {g}=game('Garden'),pot=g.pots[0];pot.nutrition=.4;pot.infection=.4;g.syncRequests(pot);
 for(const p of g.getTargets())p.item={answer:'十',label:'十',hint:'shí'};
 const [a,b,c]=g.getTargets();g.queue.enqueue('十');g.work(.05);assert.equal(g.job.request,a);g.queue.enqueue('是','speech');g.clock+=6;
 const hints=SC.pinyinHints(g);assert(!hints.has(a));assert(!hints.has(b));assert(hints.has(c));g.queue.enqueue('十');assert(SC.pinyinHints(g).has(c),'visible hint must not collapse when queued');
});
test('Offscreen entrances, unbloomed plants and newly recurring garden requests get their own delay',()=>{
 for(const name of ['Paint','Dinosaur']){
  const {g}=game(name);g.people=[];g.spawned=0;g.clock=20;
  if(name==='Dinosaur'){g.dino.x=.88;g.dino.y=.49;const gates=g.entrances.bind(g);g.entrances=()=>gates(false).filter(p=>p.edge==='bottom');}
  assert(g.spawn());const p=g.people[0];if(name==='Paint')p.speed=0;assert(!g.getTargets().includes(p));tick(g,8);assert.equal(p.appearedAt,undefined,name+' clock started offscreen');
  if(name==='Paint')p.speed=.06;else g.walkSpeed=80;
  for(let i=0;i<500&&!g.getTargets().includes(p);i++)g.update(.05);assert(g.getTargets().includes(p));assert(p.appearedAt>=28);assert(!SC.pinyinHints(g).has(p));
  if(name==='Paint')p.speed=0;else g.walkSpeed=0;tick(g,4.95);assert(!SC.pinyinHints(g).has(p));tick(g,.05);assert(SC.pinyinHints(g).has(p));
 }
 const hive=new SC.BeehiveGame();hive.start({mode:'chinese'});const p=hive.plants[0];hive.clock=50;assert.equal(p.appearedAt,undefined);hive.bloom(p);assert(!SC.pinyinHints(hive).has(p));hive.clock+=5;assert(SC.pinyinHints(hive).has(p));
 const {g,p:old}=game('Garden');g.clock+=6;assert(SC.pinyinHints(g).has(old));const pot=old.pot;pot.moisture=1;g.syncRequests(pot);pot.moisture=.4;g.syncRequests(pot);const fresh=pot.requests.moisture;assert.notEqual(fresh,old);assert(!SC.pinyinHints(g).has(fresh));
});
test('All renderers draw the delayed hint, use compact early boxes, and preserve already revealed hints',()=>{
 for(const width of [370,1100])for(const name of names){const {g,p}=game(name,width),{r,text}=renderer(name,g);p.item={answer:'十',label:'十',hint:'shí'};
  r.draw();assert(!text.includes('shí'),name+' renders hint immediately');g.clock+=5;text.length=0;r.draw();assert(text.includes('shí'),name+' missing drawn hint');
  const boxes=name==='City'?[p.labelBox]:name==='Garden'?r.bubbleBoxes:r.labelBoxes;
  if(boxes)for(const b of boxes)assert(b.x>=0&&b.y>=0&&b.x+b.w<=width&&b.y+b.h<=g.height,name+' hint outside screen');
  g.queue.enqueue(p.item.answer);text.length=0;r.draw();assert(text.includes('shí'),name+' visible hint disappeared');
 }
 const {g,p}=game('Beehive'),{r}=renderer('Beehive',g);r.labels();const before=r.labelBoxes[0].h;g.clock+=5;r.labels();assert(r.labelBoxes[0].h>before,'cached meadow layout did not grow for pinyin');
});
test('Restart clears revealed hints, and other exercises never show pinyin',()=>{
 for(const name of names){const {g,p}=game(name);g.clock+=6;SC.pinyinHints(g);assert(p.pinyinRevealed);g.queue.clear();g.start({mode:'chinese'});assert.equal(SC.pinyinHints(g).size,0,name+' restart');
  for(const mode of ['letters','bopomofo','math','swedish']){g.start({mode});g.clock+=30;assert.equal(SC.pinyinHints(g).size,0,name+'/'+mode);}
 }
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),app=fs.readFileSync(path.join(__dirname,'../resources/app.js'),'utf8');assert.doesNotMatch(html,/id="hints"|Visa pinyin/);assert.doesNotMatch(app,/\$\('hints'\)/);
});
console.log(checks+' delayed-pinyin checks passed across seven games.');
