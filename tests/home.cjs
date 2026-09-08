'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({Event,EventTarget,CustomEvent,console});
for(const file of ['pinyin','data','speech','input','people','game','home','home-renderer'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);};
function setup(options={},active=false){const events=[],g=new SC.HomeGame({random:rng(8),onEvent:e=>events.push(e)});g.start({uppercase:false,...options});g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});if(!active){g.chooseActivity=()=>false;g.people.slice(1).forEach(p=>{p.wait=0;p.activity=null;});}return {g,events};}
function until(g,condition,seconds=60){for(let i=0;i<seconds*20&&!condition();i++)g.update(.05);assert(condition(),'condition must resolve in '+seconds+' seconds');}
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('Player speed and expression respond to the backlog on the actual walking route',()=>{
 for(const count of [1,4,6,10]){const {g}=setup();Object.assign(g.player,{x:6.125,y:10.125});const t=g.createTask('toys',{x:6.125,y:3.125});for(let i=1;i<count;i++)g.createTask('toys',g.spots.toys[i%g.spots.toys.length]);g.queue.enqueue(t.item.answer);const start=g.player.y;g.work(g.player,.05);assert(Math.abs(start-g.player.y-g.playerSpeed*(1+.7*count)*.05)<1e-9);assert.equal(g.angerLevel(),Math.min(1,count/7));g.helping=true;g.messes=[];assert.equal(g.angerLevel(),1,'anger lasts throughout help even after the backlog shrinks');}
});
test('Five rooms, two ordinary adults and 1/2/3 children with matching beds, shared models and fixed speeds',()=>{
 for(const [pace,count] of [['gentle',1],['steady',2],['brave',3]]){const {g}=setup({pace});assert.equal(g.layout.rooms.length,5);assert.equal(g.people.length,count+2);assert.equal(g.people.filter(p=>p.look.child).length,count);assert(g.people.slice(0,2).every(p=>!p.look.child&&!p.look.exotic));assert(g.people.slice(2).every(p=>!p.look.beard&&!p.look.exotic&&(p.look.feminine||p.look.hairStyle<2)));assert.equal(g.layout.furniture.filter(b=>b.child).length,count);assert.equal(g.people.filter(p=>p.player).length,1);assert.equal(g.playerSpeed,3.15);assert.equal(g.walkSpeed,1.3);assert.equal(g.messes.length,0);}
});
test('Children walk 50% faster on both household and meal routes; the adult speed stays the same',()=>{
 const {g}=setup({pace:'steady'}),parent=g.people[1],child=g.people[2],goal={x:6.125,y:7.125};
 for(const meal of [false,true])for(const p of [parent,child]){Object.assign(p,{x:6.125,y:10.125,wait:0});g.clearRoute(p);if(meal){g.startMeal(p,'snack');p.meal.seat=goal;}else p.activity={type:'toys',goal,stage:'walk',age:0,duration:1};const before=p.y;g.updateFamily(p,.05);assert(Math.abs(before-p.y-(p.look.child?1.95:1.3)*.05)<1e-9);p.activity=null;p.meal=null;}
});
test('Task anchors stay on dropped objects and place settings, never following the person',()=>{
 const {g,events}=setup(),p=g.people[1],hunger=g.requestFood(p),anchor={...g.taskPosition(hunger)};Object.assign(p,g.nearest(g.spots.toys[0]));assert.deepEqual({...g.taskPosition(hunger)},anchor);assert.equal(hunger.room,'kitchen');
 g.startMeal(p,'snack');p.hungry=null;g.messes=[];until(g,()=>p.meal.stage==='drop');assert.equal(g.messes.length,0);assert.equal(events.filter(e=>e.type==='home-container').length,0);until(g,()=>!p.meal);const dish=g.messes[0],at={...g.taskPosition(dish)};assert.equal(events.filter(e=>e.type==='home-container').length,1);Object.assign(p,g.nearest(g.spots.clothes[0]));assert.deepEqual({...g.taskPosition(dish)},at);
});
test('Parent pairs are 90% different gender and 10% same gender, with either gender equally likely',()=>{
 const g=new SC.HomeGame({random:rng(2026)});let same=0,women=0,men=0,femalePlayer=0;
 for(let i=0;i<10000;i++){const [a,b]=g.makeParents();assert(!a.child&&!b.child&&!a.exotic&&!b.exotic);if(a.feminine===b.feminine){same++;if(a.feminine)women++;else men++;}if(a.feminine)femalePlayer++;}
 assert(same>900&&same<1100);assert(women>400&&women<600);assert(men>400&&men<600);assert(femalePlayer>4800&&femalePlayer<5200);
});
test('All relatives skip rest up to three messes, then one fewer per additional mess at every difficulty',()=>{
 for(const pace of ['gentle','steady','brave'])for(const count of [0,3,4,5,6,7]){const {g}=setup({pace},true),family=g.people.slice(1);family.forEach(p=>{p.activity=null;p.wait=12;});for(let i=0;i<count;i++)g.createTask('toys',g.spots.toys[i]);
  for(const p of family)g.updateFamily(p,.05);
  assert.equal(family.filter(p=>p.activity).length,Math.max(0,family.length-Math.max(0,count-3)),`${pace}/${count}`);
  for(const p of family){assert.equal(p.wait,p.activity?0:11.95);if(!p.activity){p.wait=.025;g.updateFamily(p,.05);assert.equal(p.wait,0);g.updateFamily(p,.05);assert(p.activity,'probabilistic relatives still resume when their sampled rest ends');}}
 }
});
test('Continuous roles rotate and a switch to normal timing never interrupts an activity',()=>{
 const {g}=setup({pace:'brave'},true),family=g.people.slice(1);for(let i=0;i<6;i++)g.createTask('toys',g.spots.toys[i]);const selected=new Set();
 for(let n=0;n<family.length;n++){g.nextId++;const continuous=family.filter(p=>g.skipsRest(p));assert.equal(continuous.length,1);selected.add(continuous[0]);}assert.equal(selected.size,family.length);
 const p=family.find(p=>!g.skipsRest(p));Object.assign(p,{x:6.125,y:10.125,wait:12,activity:{type:'toys',goal:{x:6.125,y:7.125},stage:'walk',age:0,duration:1}});g.clearRoute(p);g.updateFamily(p,.05);assert(p.y<10.125,'existing walks continue');assert.equal(p.wait,0);
});
test('Every cupboard, drawer and floor spot is reserved; occupied locations are excluded from new activities',()=>{
 const {g}=setup({pace:'brave'},true);g.people.slice(1).forEach(p=>p.activity=null);const a=g.people[1],b=g.people[2];
 for(const id of ['cabinet','kitchenCabinet','bedsideDrawer','deskDrawer','fridge']){const s=g.stations[id];a.activity={type:s.type==='fridge'?'snack':s.type,stationId:id,goal:s};assert(!g.activityChoices(b).some(c=>c.stationId===id));a.activity=null;g.addToStation(id);assert(!g.activityChoices(b).some(c=>c.stationId===id));}
 const goal=g.spots.toys[0];a.activity={type:'toys',goal};assert(!g.activityChoices(b).some(c=>Math.hypot(c.goal.x-goal.x,c.goal.y-goal.y)<.65));a.activity=null;g.createTask('toys',goal);assert(!g.activityChoices(b).some(c=>Math.hypot(c.goal.x-goal.x,c.goal.y-goal.y)<.65));
 assert(g.activityChoices(b).length>=10,'plenty of other locations remain available');
});
test('Natural routines can generate at least ten simultaneous distinct messes at every difficulty without anger cleanup',()=>{
 for(const pace of ['gentle','steady','brave'])for(let seed=1;seed<=8;seed++){
  const g=new SC.HomeGame({random:rng(seed)});g.start({pace,mode:'letters'});g.becomeAngry=()=>{};until(g,()=>g.messes.filter(t=>t.type!=='hungry').length>=10,240);
  assert.equal(g.cleaned,0);assert.equal(g.familyCleaned,0);const positions=g.messes.filter(t=>t.type!=='hungry').map(t=>g.taskPosition(t));assert(new Set(positions.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2))).size>=10);
 }
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
 for(let i=1;i<=3;i++){p.activity={type:'laundry',stationId:'laundry',goal:g.stations.laundry,stage:'use',age:2,duration:1};g.updateFamily(p,.05);assert.equal(g.stations.laundry.fill,i);assert.equal(!!g.stations.laundry.task,i===3);p.wait=0;}
});
test('Clothes must reach the basket; a full basket is a new task and washing preserves later arrivals',()=>{
 const {g}=setup();g.stations.laundry.fill=2;const shirt=g.createTask('clothes',{x:3.7,y:7.8});g.queue.enqueue(shirt.item.answer);until(g,()=>g.player.carry==='clothes');assert.equal(g.stations.laundry.fill,2);assert.equal(g.cleaned,0);until(g,()=>g.cleaned===1);assert(Math.hypot(g.player.x-g.stations.laundry.x,g.player.y-g.stations.laundry.y)<.4);const wash=g.stations.laundry.task;assert(wash&&wash!==shirt);assert(wash.appearedAt>shirt.appearedAt);g.queue.enqueue(wash.item.answer);until(g,()=>g.player.carry==='laundry');assert.equal(g.stations.laundry.fill,0);g.addToStation('laundry',1);until(g,()=>g.cleaned===2);assert.equal(g.stations.laundry.fill,1,'a new shirt cannot disappear into an earlier wash');
});
test('Cooking is one task, eating precedes the separate dishes task, piles retain one label and age',()=>{
 const {g}=setup(),p=g.people[1],meal=g.requestFood(p);tick(g,10);assert(!p.meal);assert(!g.messes.some(t=>t.type==='dishes'),'hunger without cooking cannot create dishes');g.queue.enqueue(meal.item.answer);until(g,()=>g.hits===1);assert.equal(p.meal.kind,'cooked');assert.equal(p.meal.stage,'collect');assert(!g.messes.some(t=>t.type==='dishes'));until(g,()=>p.meal.stage==='walk');assert(Math.hypot(p.x-3.65,p.y-1.75)<.4,'cooked food is collected from the stove');until(g,()=>p.meal.stage==='return');assert(!g.messes.some(t=>t.type==='dishes'),'eating alone cannot teleport a dish to the bench');until(g,()=>!p.meal);
 const dishes=g.messes.find(t=>t.type==='dishes'),s=dishes.station,item=dishes.item,at=dishes.appearedAt;assert(Math.hypot(p.x-s.x,p.y-s.y)<.4);assert.deepEqual([...s.items],['plate']);g.clock+=3;g.addToStation(s.id,3);assert.equal(s.task,dishes);assert.equal(dishes.item,item);assert.equal(dishes.appearedAt,at);assert.equal(g.getTargets().filter(t=>t.type==='dishes').length,1);assert.equal(s.fill,4);
});
test('A fridge snack leaves an open fridge and only creates a dirty container after a physical return to a bench',()=>{
 const {g}=setup(),p=g.people[1];p.activity={type:'snack',stationId:'fridge',goal:g.stations.fridge,stage:'walk',age:0,duration:1.4};until(g,()=>!!p.meal);
 assert.equal(p.meal.kind,'snack');assert(g.stations.fridge.task);assert.equal(g.stations.fridge.fill,1);assert(Math.hypot(p.x-g.stations.fridge.x,p.y-g.stations.fridge.y)<.4);assert(!g.messes.some(t=>t.type==='hungry'||t.type==='dishes'));
 until(g,()=>p.meal.stage==='return');assert(!g.messes.some(t=>t.type==='dishes'));until(g,()=>!p.meal);const s=g.messes.find(t=>t.type==='dishes').station;assert.deepEqual([...s.items],['container']);assert(Math.hypot(p.x-s.x,p.y-s.y)<.4);assert.equal(g.stations.fridge.fill,1,'the fridge stays open until somebody closes it');
});
test('Returned dishes use separate benches and reroute physically if a claimed pile starts being washed',()=>{
 const {g}=setup({pace:'brave'}),family=g.people.slice(1);for(const p of family){g.startMeal(p,p.id%2?'snack':'cooked');p.meal.stage='return';g.updateFamily(p,.05);}
 assert.equal(new Set(family.filter(p=>p.meal.bench).map(p=>p.meal.bench)).size,3);assert.equal(family.filter(p=>p.meal.bench===null).length,1,'the fourth relative waits for a bench');
 const p=family[0],old=p.meal.bench;g.addToStation(old.id);old.task.owner=0;p.meal.stage='drop';p.meal.age=.59;const at={x:p.x,y:p.y};g.updateFamily(p,.05);assert.equal(p.meal.stage,'return');assert.equal(old.fill,1);assert.equal(g.messes.filter(t=>t.type==='dishes').length,1);assert(Math.hypot(p.x-at.x,p.y-at.y)<=g.walkSpeed*.05+.001);
 old.task.owner=null;until(g,()=>family.every(p=>!p.meal));assert.equal(Object.values(g.stations).filter(s=>s.type==='dishes').reduce((n,s)=>n+s.fill,0),5,'no incoming container or plate is lost');
});
test('Helping interruptions preserve food and require returning to the seat or bench before eating or dropping',()=>{
 for(const stage of ['eat','drop']){const {g}=setup(),p=g.people[1];g.startMeal(p,'snack');p.meal.stage=stage;p.meal.bench=g.stations.dishes;p.meal.age=3.1;
  const chore=g.createTask('toys',g.spots.toys[3]);g.takeFamilyTask(p,chore);assert.equal(p.meal.stage,stage==='eat'?'walk':'return');assert.equal(p.meal.bench,null);until(g,()=>!p.job);assert(!g.messes.some(t=>t.type==='dishes'));
  g.updateFamily(p,.05);assert(p.meal);assert(!g.messes.some(t=>t.type==='dishes'));until(g,()=>!p.meal);const s=g.messes.find(t=>t.type==='dishes').station;assert(Math.hypot(p.x-s.x,p.y-s.y)<.4);assert.deepEqual([...s.items],['container']);
 }
});
test('Angry cleanup gives tasks to the closest available relative, independent of family order',()=>{
 const {g}=setup(),[adult,child]=g.people.slice(1);Object.assign(adult,{x:6.125,y:6.125});Object.assign(child,{x:6.125,y:2.125});
 const near=g.createTask('toys',{x:6.125,y:2.125}),far=g.createTask('toys',{x:6.125,y:11.125});g.becomeAngry();assert.equal(child.job.target,near);assert.equal(adult.job.target,far);
});
test('Closest means the walk through doorways, not straight through a wall',()=>{
 const {g}=setup(),[acrossWall,inRoom]=g.people.slice(1),t=g.createTask('toys',{x:7.125,y:1.875});
 Object.assign(acrossWall,{x:6.125,y:1.875});Object.assign(inRoom,{x:8.625,y:1.875});assert(g.people.slice(1).every(p=>g.walkable(p)));assert(Math.hypot(acrossWall.x-t.x,acrossWall.y-t.y)<Math.hypot(inRoom.x-t.x,inRoom.y-t.y));
 g.becomeAngry();assert.equal(inRoom.job.target,t);assert.equal(acrossWall.job,null);
});
test('An idle relative takes over a farther walk, while cleaning and carrying remain uninterrupted',()=>{
 for(const stage of ['walk','clean','deliver','machine','finish']){
  const {g}=setup(),[far,near]=g.people.slice(1),t=g.createTask('toys',{x:6.125,y:10.125});Object.assign(far,{x:6.125,y:2.125});Object.assign(near,{x:t.x,y:t.y});g.takeFamilyTask(far,t);far.job.stage=stage;g.helping=true;g.assignAngryHelp();
  assert.equal(t.owner,stage==='walk'?near.id:far.id);assert.equal(g.people.filter(p=>p.job?.target===t).length,1);if(stage==='walk'){assert.equal(far.job,null);assert.equal(near.job.target,t);}
 }
});
test('Every relative stays fully afraid throughout a long anger phase, then relaxes',()=>{
 const {g}=setup(),speed=g.helpSpeed;for(let i=0;i<7;i++)g.createTask('toys',g.spots.toys[i]);g.helpSpeed=.1;g.update(.05);
 for(let i=0;i<200;i++){g.update(.05);assert(g.helping);assert(g.people.slice(1).every(p=>p.fear===1));}assert.equal(g.angerLeft,0,'the short startle timer is independent of fear');
 g.helpSpeed=speed;until(g,()=>!g.helping,120);assert(g.people.slice(1).every(p=>p.fear===0));
});
test('No anger at six; seven triggers immediately and sends one job per relative',()=>{
 const {g,events}=setup({pace:'brave'});for(let i=0;i<6;i++)g.createTask('toys',g.spots.toys[i%5]);g.update(.05);assert.equal(g.angerCount,0);g.createTask('clothes',g.spots.clothes[0]);g.queue.enqueue(g.getTargets()[0].item.answer);const before={x:g.player.x,y:g.player.y};g.update(.05);assert.equal(g.angerCount,1);assert.equal(g.angerLeft,1.2);assert.equal(events.filter(e=>e.type==='home-anger').length,1);assert.equal(new Set(g.people.slice(1).map(p=>p.job.target)).size,4);assert(g.people.slice(1).every(p=>p.fear>.95));assert.equal(g.player.x,before.x);assert.equal(g.player.y,before.y);assert.equal(g.score,0);until(g,()=>g.familyCleaned>=4);assert.equal(g.cleaned,g.hits+g.familyCleaned);
});
test('Anger lasts until every mess is cleared, including when cleanup number 40 happens mid-spree',()=>{
 for(const beforeCount of [0,39]){const {g}=setup({pace:'brave'});g.cleaned=beforeCount;g.familyCleaned=beforeCount;for(const point of [...g.spots.clothes.slice(0,3),...g.spots.toys.slice(0,4)])g.createTask('toys',point);g.update(.05);const start={x:g.player.x,y:g.player.y};let sawLongAnger=false;
  for(let i=0;i<1600&&g.helping;i++){g.update(.05);if(g.messes.length){assert(g.helping);assert.equal(g.player.x,start.x);assert.equal(g.player.y,start.y);if(g.angerAge>1.3)sawLongAnger=true;}}
  assert(sawLongAnger);assert.equal(g.familyCleaned,beforeCount+7);assert.equal(g.helping,false);assert.equal(g.messes.length,0);assert.equal(g.score,0);assert(g.people.slice(1).every(p=>!p.job));if(beforeCount){assert(g.closing);until(g,()=>g.state==='won',120);}
 }
});
test('Family takeover removes exactly the queued reservation, including repeated Mandarin homophones',()=>{
 const item={label:'十',answer:'十',hint:'shí'}, {g}=setup({mode:'chinese',lang:'zh-TW',items:[item]}),a=g.createTask('toys',g.spots.toys[0]),b=g.createTask('toys',g.spots.toys[1]);
 const first=g.queue.enqueue('是','speech'),second=g.queue.enqueue('事','speech'),wrong=g.queue.enqueue('wrong');assert(first&&second&&wrong);g.takeFamilyTask(g.people[1],b);assert.deepEqual([...g.queue.items],[first,wrong]);assert(!g.getTargets().includes(b));assert(g.getTargets().includes(a));assert.equal(g.getTaskStates().get(a),'queued');assert(!SC.pinyinHints(g).has(a));until(g,()=>g.familyCleaned===1);assert(!g.queue.items.includes(second));
});
test('Full family cleanup takes over active chores and physically collects carried clothes or laundry',()=>{
 for(const type of ['toys','clothes','laundry'])for(const stage of (type==='toys'?['walk','clean']:['walk','clean',type==='clothes'?'deliver':'machine','finish'])){
  const {g}=setup({pace:'steady'}),t=type==='laundry'?(g.addToStation('laundry',3)):g.createTask(type,g.spots[type][0]);
  g.queue.enqueue(t.item.answer);until(g,()=>g.player.job?.stage===stage);
  const carried=g.player.carry,at={x:g.player.x,y:g.player.y};
  if(carried==='laundry')g.addToStation('laundry',1); // A later shirt must receive its own wash.
  for(let i=0;i<6;i++){const task=g.createTask('toys',g.spots.toys[i]);g.queue.enqueue(task.item.answer);}
  g.update(.05);assert(g.helping);assert(!g.player.job);assert(t.owner===0||g.people.some(p=>p.job?.target===t),'active chore remains assigned or pending family takeover');assert(!g.getTargets().includes(t),'the accepted chore stays hidden while awaiting its helper');
  if(carried){assert.equal(g.player.carry,carried);assert.equal(t.handoff,g.player);assert(!SC.HomeRenderer.prototype.messOnSite.call({game:g},t));
   until(g,()=>!g.player.carry);const helper=g.people.find(p=>p.carry===carried);assert(helper);assert(Math.hypot(helper.x-at.x,helper.y-at.y)<.01,'handoff happens at the parent');
  }
  until(g,()=>!g.helping,120);assert.equal(g.messes.length,0);assert.equal(g.queue.length,0);assert.equal(g.hits,0);assert.equal(g.score,0);assert.equal(g.player.x,at.x);assert.equal(g.player.y,at.y);assert(g.people.every(p=>!p.carry&&!p.job));assert(Object.values(g.stations).every(s=>s.fill===0&&!s.task));
  assert(g.cleaned>=7+(type==='clothes'||carried==='laundry'?1:0),'follow-up laundry is cleaned too');
 }
});
test('Taking an active homophone never removes the queued answer for another matching task',()=>{
 const item={label:'十',answer:'十',hint:'shí'},{g}=setup({mode:'chinese',lang:'zh-TW',items:[item]}),a=g.createTask('toys',g.spots.toys[0]),b=g.createTask('toys',g.spots.toys[1]);g.queue.enqueue('是','speech');g.work(g.player,.05);const pending=g.queue.enqueue('事','speech');
 // Occupy the other helper so only the active task is taken in this call.
 g.people[2].job={target:b,stage:'walk',age:0};b.owner=2;
 g.becomeAngry();assert.equal(g.people[1].job.target,a);assert(g.queue.items.includes(pending));
});
test('The parent lies down at their final position with 40% anger throughout the ending',()=>{
 for(const point of [{x:2,y:2},{x:9,y:8},{x:6,y:11}]){const {g}=setup();Object.assign(g.player,g.nearest(point));const at={x:g.player.x,y:g.player.y};g.finish();assert.equal(g.angerLevel(),.4);
  until(g,()=>g.state==='won');assert.equal(g.player.x,at.x);assert.equal(g.player.y,at.y);assert.equal(g.angerLevel(),.4);assert(g.player.restAge>=2.5);
 }
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
  const {g}=setup({pace,mode});g.resize(width,width<600?620:820);for(let i=0;i<10;i++)g.createTask(i%2?'clothes':'toys',g.spots[i%2?'clothes':'toys'][Math.floor(i/2)]);g.clock=6;g.queue.enqueue(g.getTargets()[0].item.answer);
  const r=Object.create(SC.HomeRenderer.prototype);Object.assign(r,{game:g,ctx:canvas,dpr:1,reduced:true,scoreNotices:[]});r.draw();assert.equal(r.labelBoxes.length,10);for(const [i,a] of r.labelBoxes.entries()){assert(a.x>=6&&a.y>=115&&a.x+a.w<=width-6&&a.y+a.h<=g.height-6);for(const b of r.labelBoxes.slice(i+1))assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`${pace}/${width}/${mode}: overlapping labels`);}
  const before=JSON.stringify(r.labelBoxes);r.draw();assert.equal(JSON.stringify(r.labelBoxes),before,'stationary reading targets must not shuffle every frame');
 }
});
test('Three children remain manageable with a correct answer every two seconds',()=>{
 for(let seed=1;seed<=12;seed++){const g=new SC.HomeGame({random:rng(seed)});g.start({pace:'brave',mode:'swedish',uppercase:false});g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});let next=0,maxWait=0;const pending=new Map();
  for(let i=0;i<24000&&['playing','celebrating'].includes(g.state);i++){if(g.state==='playing'&&g.clock>=next){const reserved=g.reservations(),t=g.getAvailableTargets().find(t=>!reserved.has(t)&&g.clock-t.appearedAt>=2);if(t){g.queue.enqueue(t.item.answer);pending.set(t,g.clock);next=g.clock+2;}}g.update(.05);for(const [t,at]of pending)if(t.done){if(t.owner===0)maxWait=Math.max(maxWait,g.clock-at);pending.delete(t);}}
  assert.equal(g.state,'won');assert(g.hits>=g.cleaned*.6,`seed ${seed}: ${g.hits} player cleanups`);assert(g.angerCount<=2,`seed ${seed}: ${g.angerCount} anger episodes`);assert(maxWait<10,`seed ${seed}: ${maxWait}s from answer to completion`);
 }console.log('  12 hard-mode capacity rounds passed.');
});
test('Finite full rounds with paced imperfect answers, silence or wrong answers; balanced rooms and no wall crossings',()=>{
 let rounds=0;const roomTotals={gentle:{},steady:{},brave:{}};
 for(const pace of ['gentle','steady','brave'])for(const style of ['letters','swedishLong','math3','chinese','silent','wrong'])for(let seed=1;seed<=4;seed++){
  const g=new SC.HomeGame({random:rng(seed)}),inputRng=rng(seed+411);g.start({pace,mode:['silent','wrong'].includes(style)?'letters':style,lang:style==='chinese'?'zh-TW':'sv-SE'});g.resize(seed%2?370:1100,740);g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(t=>t.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});let due=0;
  for(let i=0;i<26000&&['playing','celebrating'].includes(g.state);i++){
   if(g.state==='playing'&&g.clock>=due&&style!=='silent'){const reserved=g.reservations(),t=g.getAvailableTargets().find(t=>!reserved.has(t));if(t){g.queue.enqueue(style==='wrong'||inputRng()<.1?'wrong':t.item.answer);due=g.clock+(style==='math3'?8:5);}}
   g.update(.05);if(i%20===0)assert(g.people.every(p=>g.walkable(p)),`${pace}/${style}/${seed}: nobody crosses a wall`);
  }
  // Fast-input capacity is checked above. These deliberately slow/imperfect
  // runs verify completion and earned points despite faster unpaid family help.
  assert.equal(g.state,'won',`${pace}/${style}/${seed} at ${g.elapsed}`);assert(g.cleaned>=40);assert.equal(g.messes.length,0);assert.equal(g.cleaned,g.hits+g.familyCleaned);assert(g.score>=10*g.hits&&g.score<=20*g.hits);assert(g.player.restAge>=2.5);if(['silent','wrong'].includes(style)){assert.equal(g.score,0);assert(g.angerCount>0);}else assert(g.hits>0,`${pace}/${style}/${seed}: ${g.hits} player jobs`);for(const [room,n]of Object.entries(g.roomCounts))roomTotals[pace][room]=(roomTotals[pace][room]||0)+n;rounds++;
 }
 assert.equal(rounds,72);for(const [pace,counts]of Object.entries(roomTotals)){const total=Object.values(counts).reduce((a,b)=>a+b,0);assert.equal(Object.keys(counts).length,6);for(const [room,n]of Object.entries(counts))assert(n/total>=.15,`${pace}/${room}: ${(100*n/total).toFixed(1)}% of generated tasks`);}console.log('  72 complete rounds passed; every room and the hallway receive at least 15% at each difficulty across the seeded rounds.');
});
console.log(`${checks} home checks passed.`);
