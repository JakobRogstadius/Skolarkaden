'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});for(const f of ['pinyin','data','input','people','game','plants','marshmallows'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+f+'.js'),'utf8'),ctx,{filename:f+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);};
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function setup(options={}){const events=[],g=new SC.MarshmallowGame({random:rng(5),onEvent:e=>events.push(e)});g.start(options);g.resize(1000,740);g.spawnIn=10000;tick(g,.85);return {g,p:g.getTargets()[0],events};}
function policy(g){g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(p=>p.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});}
test('Timing scores peak at the time midpoint and fall equally towards both edges as the fire cools',()=>{
 for(const mode of ['swedish','math-addition'])for(const start of [20,70])for(const [fraction,points] of [[0,25],[.2,35],[.5,50],[.8,35],[.999999,25]]){
  const {g,p,events}=setup({mode});g.elapsed=start;
  const rate=g.cookingRate(),cooling=.092*.48/(g.duration*g.timeScale);
  const window=2*(1.28-.62)/(rate+Math.sqrt(rate*rate-2*cooling*(1.28-.62))),dt=window*fraction;
  g.elapsed=start+dt;p.roast=.62+rate*dt-.5*cooling*dt*dt;
  g.queue.enqueue(p.item.answer);g.work();assert.equal(g.score,points,mode+'/'+start+'/'+fraction);assert.equal(events.find(e=>e.type==='hit').points,points);
  g.work();assert.equal(g.score,points);
 }
 const {g,p}=setup();const start=g.duration-4;g.elapsed=start;const rate=g.cookingRate(),cooling=.092*.48/(g.duration*g.timeScale);
 g.elapsed=start+2;p.roast=.62+rate*2-.5*cooling*4;g.queue.enqueue(p.item.answer);g.work();assert.equal(g.score,50,'dawn truncates the accepted window');
});
test('Difficulty changes capacity to 2/4/6 with the same cooking, night length and score rules',()=>{
 for(const [pace,max] of [['gentle',2],['steady',4],['brave',6]]){const {g}=setup({pace});while(g.spawn());assert.equal(g.sticks.length,max);assert.equal(g.maxSticks,max);assert.equal(g.duration,120);assert.equal(g.score,0);assert.equal(new Set(g.sticks.map(p=>p.slot)).size,max);}
});
test('All six sticks respond in one update, without waiting for each other or their animations',()=>{
 const {g}=setup({pace:'brave'});while(g.spawn());tick(g,.85);for(const p of g.getTargets()){p.roast=.8;g.queue.enqueue(p.item.answer);}g.update(.05);assert.equal(g.score,228);assert.equal(g.hits,6);assert.equal(g.queue.length,0);assert(g.sticks.every(p=>p.stage==='withdrawing'));tick(g,1);assert.equal(g.score,228);assert.equal(g.sticks.length,0);
});
test('Early collection pauses cooking, inspects, and returns with a different label and fresh hint timer',()=>{
 const {g,p,events}=setup({mode:'chinese'});p.roast=.4;const item=p.item,at=p.appearedAt;g.queue.enqueue(p.item.answer);g.work();assert.equal(p.stage,'inspecting');tick(g,1.65);assert.equal(p.roast,.4);assert(!g.getTargets().includes(p));tick(g,.05);assert.equal(p.stage,'roasting');assert.notEqual(p.item.answer,item.answer);assert(p.appearedAt>at);assert(!SC.pinyinHints(g).has(p));assert.equal(g.score,0);assert.equal(g.early,1);assert.equal(events.filter(e=>e.type==='early').length,1);
});
test('The golden window includes its lower boundary and excludes its burnt boundary',()=>{
 for(const [roast,outcome] of [[.61999,'early'],[.62,'good'],[1.27999,'good'],[1.28,'burnt'],[1.6,'burnt']]){const {g,p}=setup();p.roast=roast;g.queue.enqueue(p.item.answer);g.work();assert.equal(g.early,outcome==='early'?1:0);assert.equal(g.hits,outcome==='good'?1:0);assert.equal(g.burnt,outcome==='burnt'?1:0);assert.equal(g.score,outcome==='good'?25:0);}
});
test('Ignored marshmallows ignite once, withdraw, and leave permanent charred pieces on the ground',()=>{
 const {g,p,events}=setup();p.roast=1.599;tick(g,.05);assert.equal(p.stage,'flaming');assert.equal(events.filter(e=>e.type==='camp-ignite').length,1);tick(g,2);assert.equal(g.burnt,1);assert.equal(g.sticks.length,0);assert.equal(g.waste.length,1);const waste=g.waste[0];assert(waste.x>=.28&&waste.x<=.72&&waste.y>=.87&&waste.y<=.97);tick(g,12);assert.equal(g.waste[0],waste);assert.equal(events.filter(e=>e.type==='camp-ignite').length,1);g.start();assert.equal(g.waste.length,0);
});
test('Wrong answers keep the two-item limit and do not delay a simultaneous correct answer',()=>{
 const {g,p}=setup();policy(g);p.roast=.8;for(let i=0;i<20;i++)g.queue.enqueue('wrong '+i);g.queue.enqueue(p.item.answer);assert.equal(g.queue.length,3);g.work();assert.equal(g.wrong,2);assert.equal(g.hits,1);assert.equal(g.queue.length,0);assert.equal(g.queue.enqueue(p.item.answer),undefined,'active answer repeated');
});
test('Matching duplicate targets can still be answered separately',()=>{
 const {g,p}=setup();assert(g.spawn());tick(g,.85);for(const q of g.getTargets()){q.item={...p.item};q.roast=.8;}policy(g);g.queue.enqueue(p.item.answer);g.queue.enqueue(p.item.answer);assert.equal(g.queue.length,2);g.work();assert.equal(g.hits,2);
});
test('Every exercise uses shared matching, including spoken numbers and tone-free Chinese aliases',()=>{
 for(const mode of Object.keys(SC.modes)){const {g,p}=setup({mode});p.roast=.9;g.queue.enqueue(p.item.answer);g.work();assert.equal(g.hits,1,mode);}
 for(const lang of ['sv-SE','en-US','zh-CN','zh-TW'])for(let n=0;n<=20;n++){const {g,p}=setup({mode:'math-addition',lang});p.item=SC.makeMath(n,rng(4),1);p.roast=.9;g.queue.enqueue(SC.numberName(n,lang),'speech');g.work();assert.equal(g.hits,1,lang+'/'+n);}
 const {g,p}=setup({mode:'chinese',lang:'zh-TW'});p.item={label:'十',answer:'十',hint:'shí'};p.roast=.8;g.queue.enqueue('是','speech');g.work();assert.equal(g.hits,1);
});
test('Cooling slows roasting, pauses freeze everything, and arithmetic stays at the selected level',()=>{
 const {g,p}=setup({mode:'math-addition'}),hot=g.cookingRate();g.elapsed=g.duration*.8;assert(g.cookingRate()<hot*.65&&g.cookingRate()>0);g.pause();const before=JSON.stringify({p,clock:g.clock,elapsed:g.elapsed});tick(g,10);assert.equal(JSON.stringify({p,clock:g.clock,elapsed:g.elapsed}),before);g.resume();
 const item=p.item;p.roast=0;tick(g,5);assert.equal(p.item,item);assert.equal(p.item.mathLevel,0);assert.equal(g.mathPractice,undefined);
});
test('Dawn stops inputs, raises the sun for six seconds, extinguishes the fire and ends exactly once',()=>{
 const expired=setup();expired.p.roast=.8;expired.g.elapsed=expired.g.duration;expired.g.queue.enqueue(expired.p.item.answer);expired.g.update(.05);assert.equal(expired.g.hits,0);assert.equal(expired.g.state,'celebrating');
 const {g,p,events}=setup();p.roast=.8;g.elapsed=g.duration-.05;g.update(.05);assert.equal(g.state,'celebrating');assert.equal(events.filter(e=>e.type==='daybreak').length,1);g.queue.enqueue(p.item.answer);tick(g,4.7);assert(g.fireStrength()<1e-8);assert.equal(g.state,'celebrating');assert.equal(g.hits,0);tick(g,1.3);assert.equal(g.state,'won');assert.equal(events.filter(e=>e.type==='end').length,1);assert.equal(g.queue.length,1);tick(g,5);assert.equal(events.filter(e=>e.type==='end').length,1);
});
test('Full nights finish on all difficulties with silent, timed, early and wrong-input players',()=>{
 for(const pace of ['gentle','steady','brave'])for(const mode of ['swedish','math-addition'])for(const strategy of ['silent','timed','early','wrong'])for(let seed=1;seed<=2;seed++){
  const events=[],g=new SC.MarshmallowGame({random:rng(seed),onEvent:e=>events.push(e)});g.start({pace,mode});policy(g);let due=0,max=0;
  for(let i=0;i<3600&&g.state!=='won';i++){
   if(g.state==='playing'&&g.clock>=due){const p=g.getTargets().find(p=>strategy==='early'||strategy==='timed'&&p.roast>=.8&&p.roast<1.1);if(strategy==='wrong')g.queue.enqueue('wrong');else if(p)g.queue.enqueue(p.item.answer);due=g.clock+.6;}
   g.update(.05);max=Math.max(max,g.sticks.length);
  }
  assert.equal(g.state,'won',pace+'/'+mode+'/'+strategy);assert(max<=g.maxSticks);assert.equal(events.filter(e=>e.type==='end').length,1);assert.equal(events.filter(e=>e.type==='daybreak').length,1);assert.equal(g.fireStrength(),0);assert(g.score>=g.hits*25&&g.score<=g.hits*50);assert.equal(g.score,events.filter(e=>e.type==='hit').reduce((sum,e)=>sum+e.points,0));
  if(strategy==='timed'){assert(g.hits>=8,pace+'/'+mode+' only '+g.hits+' served');assert.equal(g.burnt,0);}if(strategy==='silent'||strategy==='wrong'){assert.equal(g.hits,0);assert(g.waste.length>0);}
 }
});
test('Inspection pivots about a fixed elbow, preserves arm and stick lengths, and stays onscreen',()=>{
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 for(const [width,height] of [[320,540],[370,740],[1100,540],[1100,740]]){
  const {g}=setup({pace:'brave'});g.resize(width,height);const r=Object.create(SC.MarshmallowRenderer.prototype);r.game=g;
  for(let slot=0;slot<6;slot++){const p={slot,stage:'roasting',age:0},rest=r.pose(p);
   for(const age of [0,.2,.85,1.5,1.7]){p.stage='inspecting';p.age=age;const pose=r.pose(p);
    assert.deepEqual(pose.elbow,rest.elbow);assert.deepEqual(pose.shoulder,rest.shoulder);
    for(const [a,b] of [['elbow','hand'],['hand','tip'],['elbow','tip']])assert(Math.abs(distance(pose[a],pose[b])-distance(rest[a],rest[b]))<1e-8,'rigid grip stretches');
    assert(pose.tip.x>16&&pose.tip.x<width-16&&pose.tip.y>=150-1e-8,'inspection leaves the visible play area');
    if(age===.85){assert(pose.hand.y<rest.hand.y);assert(Math.abs(pose.hand.x-rest.hand.x)>1,'inspection is translating instead of rotating');}
   }
   p.age=.6;const before=r.pose(p);p.exitLift=Math.sin(Math.PI*p.age/1.7);p.stage='withdrawing';p.age=0;const after=r.pose(p);assert(distance(before.hand,after.hand)<1e-8);assert(distance(before.tip,after.tip)<1e-8,'dawn snaps a lifted stick');
  }
 }
});
test('Six labels stay separate with short letters, long words, math and mixed pinyin at narrow and wide sizes',()=>{
 const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 for(const [width,height] of [[320,540],[370,740],[1100,540],[1100,740]])for(const mode of ['letters','swedishLong','englishLong','math-addition','chinese']){
  const {g}=setup({mode,pace:'brave'});g.resize(width,height);while(g.spawn());tick(g,.85);g.clock+=6;g.getTargets().forEach((p,i)=>{p.appearedAt=i%2?g.clock:0;p.roast=.2+i*.25;});
  const c=new Proxy({font:'16px system-ui',measureText(text){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||16);return {width:Array.from(text).reduce((n,ch)=>n+size*(/\p{Script=Han}/u.test(ch)?1:.6),0)};},fillText(text,x,y,max){assert(Number.isFinite(x)&&Number.isFinite(y));if(max!==undefined)assert(max>0);}},{get:(o,k)=>k in o?o[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
  const r=Object.create(SC.MarshmallowRenderer.prototype);Object.assign(r,{ctx:c,game:g,dpr:1,reduced:false});r.draw();assert.equal(r.labelBoxes.length,6);
  for(const [i,b] of r.labelBoxes.entries()){assert(b.x>=0&&b.y>=126&&b.x+b.w<=width&&b.y+b.h<=height);assert(r.labelBoxes.slice(i+1).every(a=>!overlap(a,b)),width+'/'+mode);if(mode==='letters')assert(b.w<=32);}
  const before=JSON.stringify(g.scene);g.resize(800,600);g.resize(width,height);r.draw();assert.equal(JSON.stringify(g.scene),before);g.dawn();tick(g,4);r.draw();assert.equal(r.labelBoxes.length,0);
 }
});
console.log(checks+' marshmallow simulation, timing and renderer checks passed.');
