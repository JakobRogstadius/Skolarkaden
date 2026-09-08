'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','speech','input','people','game','home','home-renderer'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);};
function setup(options={}){const events=[],g=new SC.HomeGame({random:rng(8),onEvent:e=>events.push(e)});g.start({uppercase:false,...options});g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});g.people.slice(1).forEach(p=>p.wait=1e6);return {g,events};}
function until(g,condition,seconds=60){for(let i=0;i<seconds*20&&!condition();i++)g.update(.05);assert(condition(),'condition must resolve in '+seconds+' seconds');}
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('Five rooms, two ordinary adults and 1/2/3 children with matching beds, shared models and fixed speeds',()=>{
 for(const [pace,count] of [['gentle',1],['steady',2],['brave',3]]){const {g}=setup({pace});assert.equal(g.layout.rooms.length,5);assert.equal(g.people.length,count+2);assert.equal(g.people.filter(p=>p.look.child).length,count);assert(g.people.slice(0,2).every(p=>!p.look.child&&!p.look.exotic));assert(g.people.slice(2).every(p=>!p.look.beard&&!p.look.exotic&&(p.look.feminine||p.look.hairStyle<2)));assert.equal(g.layout.furniture.filter(b=>b.child).length,count);assert.equal(g.people.filter(p=>p.player).length,1);assert.equal(g.playerSpeed,3.15);assert.equal(g.walkSpeed,1.3);assert.equal(g.messes.length,0);}
});
test('Every walkable cell is connected; routes use doorways, avoid furniture and survive resizing',()=>{
 for(const pace of ['gentle','steady','brave']){const {g}=setup({pace}),visited=new Set([0]),pending=[0];for(let i=0;i<pending.length;i++)for(const n of g.neighbours[pending[i]])if(!visited.has(n)){visited.add(n);pending.push(n);}assert.equal(visited.size,g.cells.length);
  const goals=[...Object.values(g.stations),...g.seats,...g.spots.clothes,...g.spots.toys,...g.layout.rooms.map(r=>({x:r.x+r.w/2,y:r.y+r.d/2}))];let current=g.player;
  for(const goal of goals){const points=[{x:current.x,y:current.y},...g.route(current,goal)];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.05);for(let k=0;k<=steps;k++){const q={x:a.x+(b.x-a.x)*k/(steps||1),y:a.y+(b.y-a.y)*k/(steps||1)};assert(g.walkable(q),JSON.stringify(q));}}current=points.at(-1);}
  const before=JSON.stringify([g.layout,g.people.map(p=>[p.x,p.y])]);g.resize(320,540);g.resize(1100,820);assert.equal(JSON.stringify([g.layout,g.people.map(p=>[p.x,p.y])]),before);
 }
});
test('10 base points and a 10-second bonus lock at submission, including a long FIFO wait',()=>{
 for(const [age,expected] of [[0,20],[4.6,15],[10,10],[80,10]]){const {g}=setup(),t=g.createTask('toys',{x:3.8,y:10.7});g.clock=age;g.queue.enqueue(t.item.answer);until(g,()=>g.hits===1);assert.equal(g.score,expected);}
 const {g}=setup(),first=g.createTask('clothes',{x:3.5,y:7.7}),last=g.createTask('toys',{x:8.2,y:8.2});g.clock=2;g.queue.enqueue(first.item.answer);g.queue.enqueue(last.item.answer);const held=g.queue.items[1];g.work(g.player,.05);g.clock=35;assert.equal(g.answerLocks.get(held).at,2);until(g,()=>g.hits===2);assert.equal(g.score,36,'both tasks keep their 18-point submission score');
});
test('Relatives can put their own used clothes directly into the laundry basket',()=>{
 const {g}=setup(),p=g.people[1];p.wait=0;
 for(let i=1;i<=3;i++){p.activity={type:'laundry',goal:g.stations.laundry,stage:'use',age:2,duration:1};g.updateFamily(p,.05);assert.equal(g.stations.laundry.fill,i);assert.equal(!!g.stations.laundry.task,i===3);p.wait=0;}
});
test('Clothes must reach the basket; a full basket is a new task and washing preserves later arrivals',()=>{
 const {g}=setup();g.stations.laundry.fill=2;const shirt=g.createTask('clothes',{x:3.7,y:7.8});g.queue.enqueue(shirt.item.answer);until(g,()=>g.player.carry==='clothes');assert.equal(g.stations.laundry.fill,2);assert.equal(g.cleaned,0);until(g,()=>g.cleaned===1);assert(Math.hypot(g.player.x-g.stations.laundry.x,g.player.y-g.stations.laundry.y)<.4);const wash=g.stations.laundry.task;assert(wash&&wash!==shirt);assert(wash.appearedAt>shirt.appearedAt);g.queue.enqueue(wash.item.answer);until(g,()=>g.player.carry==='laundry');assert.equal(g.stations.laundry.fill,0);g.addToStation('laundry',1);until(g,()=>g.cleaned===2);assert.equal(g.stations.laundry.fill,1,'a new shirt cannot disappear into an earlier wash');
});
test('Cooking is one task, eating precedes the separate dishes task, piles retain one label and age',()=>{
 const {g}=setup(),p=g.people[1],meal=g.requestFood(p);g.queue.enqueue(meal.item.answer);until(g,()=>g.hits===1);assert.equal(g.stations.dishes.fill,0);assert(p.meal);until(g,()=>!!g.stations.dishes.task);const dishes=g.stations.dishes.task,item=dishes.item,at=dishes.appearedAt;g.clock+=3;g.addToStation('dishes',3);assert.equal(g.stations.dishes.task,dishes);assert.equal(dishes.item,item);assert.equal(dishes.appearedAt,at);assert.equal(g.getTargets().filter(t=>t.type==='dishes').length,1);assert.equal(g.stations.dishes.fill,4);
});
test('No anger at six; seven triggers immediately, freezes the parent briefly and sends one job per relative',()=>{
 const {g,events}=setup({pace:'brave'});for(let i=0;i<6;i++)g.createTask('toys',g.spots.toys[i%5]);g.update(.05);assert.equal(g.angerCount,0);g.createTask('clothes',g.spots.clothes[0]);g.queue.enqueue(g.getTargets()[0].item.answer);const before={x:g.player.x,y:g.player.y};g.update(.05);assert.equal(g.angerCount,1);assert.equal(g.angerLeft,1.2);assert.equal(events.filter(e=>e.type==='home-anger').length,1);assert.equal(new Set(g.people.slice(1).map(p=>p.job.target)).size,4);assert(g.people.slice(1).every(p=>p.fear>.95));assert.equal(g.player.x,before.x);assert.equal(g.player.y,before.y);assert.equal(g.score,0);until(g,()=>g.familyCleaned>=4);assert.equal(g.cleaned,g.hits+g.familyCleaned);
});
test('Family takeover removes exactly the queued reservation, including repeated Mandarin homophones',()=>{
 const item={label:'十',answer:'十',hint:'shí'}, {g}=setup({mode:'chinese',lang:'zh-TW',items:[item]}),a=g.createTask('toys',g.spots.toys[0]),b=g.createTask('toys',g.spots.toys[1]);
 const first=g.queue.enqueue('是','speech'),second=g.queue.enqueue('事','speech'),wrong=g.queue.enqueue('wrong');assert(first&&second&&wrong);g.takeFamilyTask(g.people[1],b);assert.deepEqual([...g.queue.items],[first,wrong]);assert(!g.getTargets().includes(b));assert(g.getTargets().includes(a));assert.equal(g.getTaskStates().get(a),'queued');assert(!SC.pinyinHints(g).has(a));until(g,()=>g.familyCleaned===1);assert(!g.queue.items.includes(second));
});
test('An active player job stays with the player while relatives remove pending chores',()=>{
 const {g}=setup({pace:'steady'}),a=g.createTask('clothes',g.spots.clothes[0]);g.queue.enqueue(a.item.answer);g.work(g.player,.05);for(let i=0;i<6;i++){const t=g.createTask('toys',g.spots.toys[i%5]);g.queue.enqueue(t.item.answer);}g.update(.05);assert.equal(g.player.job.target,a);assert(g.people.slice(1).every(p=>p.job.target!==a));assert.equal(g.queue.length,3);assert.equal(g.getTaskStates().get(a),'active');
});
test('Pause freezes work, family activity, anger, bonus age and delayed pinyin; replay removes old queue listeners',()=>{
 const {g}=setup({mode:'chinese'}),t=g.createTask('toys',g.spots.toys[0]);g.clock=4;assert(!SC.pinyinHints(g).has(t));g.pause();const before=JSON.stringify([g.clock,g.people,g.messes]);tick(g,10);assert.equal(JSON.stringify([g.clock,g.people,g.messes]),before);g.resume();tick(g,1.1);assert(SC.pinyinHints(g).has(t));g.queue.enqueue(t.item.answer);assert(SC.pinyinHints(g).has(t));g.start({mode:'chinese'});assert.equal(g.cleaned,0);assert.equal(g.score,0);assert.equal(g.answerLocks.size,0);g.menu();assert.equal(g.queueListener,null);
});
test('After 40, family clears queued leftovers and committed meal/laundry chains before celebrations and resting',()=>{
 const {g,events}=setup({pace:'steady'});g.cleaned=39;g.familyCleaned=39;const t=g.createTask('toys',{x:6,y:10.45}),extra=g.createTask('clothes',g.spots.clothes[0]);g.stations.laundry.fill=1;g.stations.trash.fill=2;g.people[1].meal={stage:'eat',age:0,seat:g.seats[0]};g.queue.enqueue(t.item.answer);const leftover=g.queue.enqueue(extra.item.answer);until(g,()=>g.closing);assert(g.state==='playing');assert(g.cleaned>=40);assert(!g.queue.items.includes(leftover),'family takes over the pending shirt');assert(g.stations.trash.task);const id=g.nextId;until(g,()=>g.state==='won',120);assert(g.cleaned>40);assert.equal(g.messes.length,0);assert(Object.values(g.stations).every(s=>s.fill===0&&!s.task));assert(g.people.every(p=>!p.meal&&!p.job));assert(g.player.restAge>=2.5);assert.equal(g.cleaned,g.hits+g.familyCleaned);assert.equal(events.filter(e=>e.type==='end').length,1);assert(g.nextId<=id+3,'only committed household chains may add closing tasks');
});
test('All exercises and Mandarin/bopomofo speech use the common queue and delayed hints',()=>{
 for(const mode of Object.keys(SC.modes)){const {g}=setup({mode,lang:SC.modes[mode].lang}),t=g.createTask('toys',{x:6,y:10.45});assert(t.item.answer);g.queue.enqueue(t.item.answer);until(g,()=>g.hits===1);assert.equal(g.score,20,mode);}
 for(const [mode,lang,item,spoken] of [['chinese','zh-TW',{label:'山',answer:'山',hint:'shān'},'衫'],['bopomofo','zh-TW',{label:'ㄅ',answer:'ㄅ',hint:'b'},'玻']]){const {g}=setup({mode,lang,items:[item]});g.createTask('toys',{x:6,y:10.45});const stream=new SC.SpeechStream({getContext:()=>({lesson:mode,language:lang,candidates:g.getAvailableTargets().map(t=>t.item)}),enqueue:text=>g.queue.enqueue(text,'speech'),revise:(entry,text)=>g.queue.revise(entry,text),trace:()=>{}});stream.update([Object.assign([{transcript:spoken,confidence:.9}],{isFinal:false})]);assert.equal(g.queue.length,1,mode);until(g,()=>g.hits===1);}
});
test('Compact labels stay inside the canvas and do not overlap across bed counts, widths, hints and queue states',()=>{
 const canvas=new Proxy({measureText:text=>({width:[...text].length*9})},{get:(o,k)=>k in o?o[k]:String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}});
 for(const pace of ['gentle','steady','brave'])for(const width of [320,370,620,1100])for(const mode of ['swedishLong','chinese','math6']){
  const {g}=setup({pace,mode});g.resize(width,width<600?620:820);for(let i=0;i<8;i++)g.createTask(i%2?'clothes':'toys',g.spots[i%2?'clothes':'toys'][i%5]);g.clock=6;g.queue.enqueue(g.getTargets()[0].item.answer);
  const r=Object.create(SC.HomeRenderer.prototype);Object.assign(r,{game:g,ctx:canvas,dpr:1,reduced:true,scoreNotices:[]});r.draw();assert.equal(r.labelBoxes.length,8);for(const [i,a] of r.labelBoxes.entries()){assert(a.x>=6&&a.y>=115&&a.x+a.w<=width-6&&a.y+a.h<=g.height-6);for(const b of r.labelBoxes.slice(i+1))assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`${pace}/${width}/${mode}: overlapping labels`);}
  const before=JSON.stringify(r.labelBoxes);r.draw();assert.equal(JSON.stringify(r.labelBoxes),before,'stationary reading targets must not shuffle every frame');
 }
});
test('Finite full rounds with paced imperfect answers, silence or wrong answers; no losses or wall crossings',()=>{
 let rounds=0;
 for(const pace of ['gentle','steady','brave'])for(const style of ['letters','swedishLong','math3','chinese','silent','wrong'])for(let seed=1;seed<=4;seed++){
  const g=new SC.HomeGame({random:rng(seed)}),inputRng=rng(seed+411);g.start({pace,mode:['silent','wrong'].includes(style)?'letters':style,lang:style==='chinese'?'zh-TW':'sv-SE'});g.resize(seed%2?370:1100,740);g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});let due=0;
  for(let i=0;i<26000&&['playing','celebrating'].includes(g.state);i++){
   if(g.state==='playing'&&g.clock>=due&&style!=='silent'){const reserved=g.reservations(),t=g.getAvailableTargets().find(t=>!reserved.has(t));if(t){g.queue.enqueue(style==='wrong'||inputRng()<.1?'wrong':t.item.answer);due=g.clock+(style==='math3'?8:5);}}
   g.update(.05);if(i%20===0)assert(g.people.every(p=>g.walkable(p)),`${pace}/${style}/${seed}: nobody crosses a wall`);
  }
  assert.equal(g.state,'won',`${pace}/${style}/${seed} at ${g.elapsed}`);assert(g.cleaned>=40);assert.equal(g.messes.length,0);assert.equal(g.cleaned,g.hits+g.familyCleaned);assert(g.score>=10*g.hits&&g.score<=20*g.hits);assert(g.player.restAge>=2.5);if(['silent','wrong'].includes(style)){assert.equal(g.score,0);assert(g.angerCount>0);}else assert(g.hits>=28,`${pace}/${style}/${seed}: enough jobs remain with the player`);rounds++;
 }
 assert.equal(rounds,72);console.log('  72 complete rounds passed.');
});
console.log(`${checks} home checks passed.`);
