'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'}});
for(const file of ['pinyin','data','voice','speech','input','people','game','plants','dinosaur'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,n)=>{for(let i=0;i<Math.round(n/.05);i++)g.update(.05);};
let checks=0;function test(name,fn){fn();console.log('PASS '+name);checks++;}
function isolated(options={},onEvent=()=>{}){const g=new SC.DinosaurGame({random:rng(3),onEvent});g.start(options);g.spawnIn=10000;const p=g.people[0];p.x=.18;p.y=.58;p.direction=-1;return {g,p};}
function until(g,condition,seconds=30){for(let i=0;i<seconds/.05&&!condition();i++)g.update(.05);assert(condition(),'condition not reached');}
function policy(g){g.queue.setPolicy({getCandidates:()=>g.getAvailableTargets().map(p=>p.item),getActiveEntries:()=>g.getActiveEntries(),matches:(e,i)=>SC.matches(e.text,i,g.mode,g.lang,e.source),sameInput:(a,b)=>SC.sameInput(a,b,g.mode,g.lang)});}
test('Dinosaur moves at exactly twice fleeing speed, in every direction and canvas aspect ratio',()=>{
 for(const pace of ['gentle','steady','brave'])for(const [w,h] of [[1100,700],[370,700]]){const {g}=isolated({pace});g.resize(w,h);assert.equal(g.dinoSpeed,g.runSpeed*2);for(const goal of [{x:.9,y:.5},{x:.5,y:.9},{x:.8,y:.8}]){const a={x:.5,y:.5},b={...a},origin={...a};g.move(a,goal,g.runSpeed,.05);g.move(b,goal,g.dinoSpeed,.05);assert(Math.abs(g.distance(b,origin)/g.distance(a,origin)-2)<1e-9);}}
});
test('Target and bystander both jump straight up, show fear, flee, then stop briefly',()=>{
 const {g,p}=isolated();g.dino.x=.50;g.dino.y=.75;p.x=.57;p.y=.65;assert(g.spawn());const q=g.people[1];q.x=.45;q.y=.66;g.spawnIn=10000;
 const locations=[p,q].map(p=>({x:p.x,y:p.y}));g.update(.05);for(const [i,person] of [p,q].entries()){assert.equal(person.status,'startled');assert.equal(person.fear,1);assert.deepEqual({x:person.x,y:person.y},locations[i]);}
 tick(g,.15);for(const person of [p,q])assert(g.jumpHeight(person)>0);tick(g,.25);for(const person of [p,q]){assert.equal(person.status,'running');assert(person.fear>.9);}
 until(g,()=>p.status==='resting');const stopped={x:p.x,y:p.y};tick(g,.3);assert.equal(p.status,'resting');assert.deepEqual({x:p.x,y:p.y},stopped);until(g,()=>p.status==='walking');
});
test('Scares score for bystanders once per scare, including another scare after recovery',()=>{
 const events=[],{g,p}=isolated({},e=>events.push(e));g.dino.x=.5;g.dino.y=.75;p.x=.57;p.y=.65;p.look.exotic=null;
 g.update(.05);assert.equal(g.score,5);tick(g,.15);assert.equal(g.score,5);assert.equal(g.hits,0);
 Object.assign(p,{status:'walking',cooldown:0,x:.57,y:.65});g.update(.05);assert.equal(g.score,10);
 Object.assign(p,{status:'walking',cooldown:0,x:.57,y:.65});p.look.exotic='test';g.update(.05);assert.equal(g.score,35);
 assert.deepEqual(events.filter(e=>e.type==='scare').map(e=>e.points),[5,5,25]);
});
test('Walkers form a circle, finish talking, and a nearby dinosaur interrupts the whole group',()=>{
 const {g,p}=isolated();assert(g.spawn());assert(g.spawn());const members=g.people.slice(0,3);g.dino.x=.95;g.dino.y=.9;members.forEach((p,i)=>{p.x=.28+i*.015;p.y=.57;p.entryGoal=null;p.chatCooldown=0;});g.findConversations();assert.equal(g.groups.length,1);const group=g.groups[0];assert.equal(group.members.length,3);
 until(g,()=>group.members.every(p=>p.status==='talking'));for(const p of members){assert.equal(p.x,p.chatGoal.x);assert.equal(p.y,p.chatGoal.y);assert(Math.abs(Math.hypot((p.x-group.center.x)*g.width/(38*g.scale()),(p.y-group.center.y)*g.height/(26*g.scale()))-1)<1e-9);}
 until(g,()=>!g.groups.length);assert(members.every(p=>p.status==='walking'&&p.chatCooldown>0));
 members.forEach((p,i)=>{p.x=.30+i*.015;p.y=.57;});g.conversation(members);g.dino.x=.32;g.dino.y=.64;g.update(.05);assert.equal(g.groups.length,0);assert(members.every(p=>p.group===null&&p.status==='startled'));
});
test('A correct FIFO answer chases, catches, displays the same sprite, then scores once after swallowing',()=>{
 const events=[],{g,p}=isolated({},e=>events.push(e));g.queue.enqueue(p.item.answer);g.update(.05);assert.equal(g.job.stage,'chase');assert.equal(g.job.target,p);assert.equal(g.hits,0);assert(!g.getAvailableTargets().includes(p));assert.equal(g.getTaskStates().get(p),'active');
 const phases=new Set();until(g,()=>{phases.add(p.status);return g.job.stage==='eat';});assert(phases.has('startled'));assert(phases.has('running'));assert.equal(p.status,'eaten');assert(!g.getTargets().includes(p));assert(g.people.includes(p));assert.equal(g.passed,0);assert.equal(g.job.target.look,p.look);tick(g,.7);assert.equal(g.hits,0);until(g,()=>g.hits===1);assert(!g.people.includes(p));assert.equal(g.passed,1);assert.equal(g.score,15);assert.equal(g.escaped,0);tick(g,10);assert.equal(g.hits,1);assert.equal(events.filter(e=>e.type==='hit').length,1);assert(events.some(e=>e.type==='dino-chomp'));
});
test('Only one job runs; a wrong word occupies the dinosaur briefly, then the next answer works',()=>{
 const events=[],{g,p}=isolated({},e=>events.push(e));g.queue.enqueue('ett fel');g.queue.enqueue(p.item.answer);g.update(.05);assert.equal(g.job.stage,'confused');assert.equal(g.queue.length,1);const location={x:g.dino.x,y:g.dino.y};tick(g,.7);assert.deepEqual({x:g.dino.x,y:g.dino.y},location);assert.equal(g.score,0);until(g,()=>g.job?.stage==='chase');assert.equal(g.job.target,p);until(g,()=>g.hits===1);assert.equal(g.shots,2);assert.deepEqual(events.filter(e=>e.type==='work').map(e=>e.entry.text),['ett fel',p.item.answer]);assert.equal(events.filter(e=>e.type==='miss').length,1);
});
test('Spam filtering, target reservation and homophone revisions use the shared queue rules',()=>{
 const {g,p}=isolated({mode:'chinese',lang:'zh-CN'});p.item={label:'十',answer:'shi',hint:'shí'};policy(g);const entry=g.queue.enqueue('是','speech');assert(entry);assert.equal(g.queue.enqueue('事','speech'),undefined);assert.equal(g.getTaskStates().get(p),'queued');g.queue.revise(entry,'時');g.update(.05);assert.equal(g.job.target,p);assert.equal(g.queue.enqueue('十','speech'),undefined);
 assert(g.queue.enqueue('fel1'));assert(g.queue.enqueue('fel2'));assert.equal(g.queue.enqueue('fel3'),undefined);assert.equal(g.queue.length,2);until(g,()=>g.hits===1);assert.equal(g.score,15);
});
test('The cast retains its shared probabilities; all eight rare creatures earn five times the scare and eating points',()=>{
 const counts={};for(let i=0;i<10000;i++){let first=true;const p=SC.makePerson(()=>{if(first){first=false;return (i+.5)/10000;}return .5;});counts[p.kind]=(counts[p.kind]||0)+1;if(p.child){assert(!p.beard);assert(p.feminine||p.hairStyle<2);}}
 assert.deepEqual(counts,{man:4000,woman:4000,boy:950,girl:950,exotic:100});
 for(const rare of SC.rarePeople){const {g,p}=isolated();let first=true;p.look=SC.makePerson(()=>{if(first){first=false;return .995;}return .4;});p.look.exotic=rare.id;g.queue.enqueue(p.item.answer);until(g,()=>g.hits===1);assert.equal(g.score,75);}
});
test('Pause freezes chasing, swallowing and queued input',()=>{
 for(const stage of ['chase','eat','confused']){const {g,p}=isolated();g.queue.enqueue(stage==='confused'?'felord':p.item.answer);g.update(.05);if(stage==='eat')until(g,()=>g.job.stage==='eat');g.queue.enqueue('senare');g.pause();const snapshot=JSON.stringify({dino:g.dino,people:g.people,job:g.job,clock:g.clock,elapsed:g.elapsed});tick(g,6);assert.equal(JSON.stringify({dino:g.dino,people:g.people,job:g.job,clock:g.clock,elapsed:g.elapsed}),snapshot);assert.equal(g.queue.length,1);g.resume();if(stage!=='confused')until(g,()=>g.hits===1);}
});
test('Conversation timers and the vertical startle jump also freeze during pause',()=>{
 const {g,p}=isolated();assert(g.spawn());const q=g.people[1];g.dino.x=.95;g.dino.y=.9;p.x=.28;p.y=.57;q.x=.32;q.y=.57;const group=g.conversation([p,q]);until(g,()=>p.status==='talking'&&q.status==='talking');const age=group.talkAge;g.pause();tick(g,5);assert.equal(group.talkAge,age);g.resume();g.dino.x=.32;g.dino.y=.64;g.update(.05);tick(g,.1);assert.equal(p.status,'startled');const jump=g.jumpHeight(p);assert(jump>0);g.pause();tick(g,5);assert.equal(g.jumpHeight(p),jump);g.resume();until(g,()=>p.status==='running');
});
test('Catches at either exit keep the dinosaur and dangling legs inside the picture',()=>{
 for(const width of [320,370,1100])for(const side of [-1,1]){const {g,p}=isolated();g.resize(width,700);p.x=side<0?.05:.95;p.y=.60;p.direction=side;g.queue.enqueue(p.item.answer);until(g,()=>g.job?.stage==='eat');const x=g.dino.x*width,s=g.scale();assert(x-174*s>=-1e-6&&x+174*s<=width+1e-6);until(g,()=>g.hits===1);assert.equal(g.escaped,0);}
});
test('All exercises work, including spoken numbers, Chinese pinyin and single letters',()=>{
 for(const mode of Object.keys(SC.modes)){const {g,p}=isolated({mode,lang:SC.modes[mode].lang,uppercase:true});g.queue.enqueue(p.item.answer);until(g,()=>g.hits===1);assert.equal(g.score,15);if(['swedish','english','swedishLong','englishLong','letters','food'].includes(mode))assert.equal(p.item.label,p.item.label.toUpperCase());}
 for(const lang of ['sv-SE','en-US','zh-CN','zh-TW']){const {g,p}=isolated({mode:'math',lang});g.queue.enqueue(SC.numberName(Number(p.item.answer),lang),'speech');until(g,()=>g.hits===1);}
});
test('Every round resolves forty people and cannot lose, even with silence or only mistakes',()=>{
 const report=[];for(const pace of ['gentle','steady','brave'])for(const strategy of ['none','correct','wrong'])for(const width of [1000,370])for(let seed=1;seed<=3;seed++){
  const events=[],g=new SC.DinosaurGame({random:rng(seed),onEvent:e=>events.push(e)});g.resize(width,700);g.start({pace});policy(g);let peak=0;
  for(let i=0;i<18000&&['playing','celebrating'].includes(g.state);i++){
   if(g.state==='playing'&&!g.job&&!g.queue.length){if(strategy==='wrong')g.queue.enqueue('felord');else if(strategy==='correct'){const p=g.getAvailableTargets()[0];if(p)g.queue.enqueue(p.item.answer);}}
   g.update(.05);peak=Math.max(peak,g.people.length);assert(g.people.length<=g.maxPeople);assert(g.spawned<=40);assert(g.passed<=40);assert.equal(g.hits+g.escaped,g.passed);
  }
  assert.equal(g.state,'won',`${pace}/${strategy}/${width}/${seed}: ${g.passed} passed, ${g.spawned} spawned`);assert.equal(g.spawned,40);assert.equal(g.passed,40);assert.equal(g.people.length,0);assert.equal(g.score,events.filter(e=>['scare','hit'].includes(e.type)).reduce((sum,e)=>sum+e.points,0));assert.equal(events.filter(e=>e.type==='end').length,1);assert(events.find(e=>e.type==='end').won);
  if(strategy!=='correct')assert.equal(g.hits,0);else assert(g.hits>=20,`${pace}/${width}: only ${g.score} catches`);if(seed===1&&width===1000)report.push({pace,strategy,hits:g.hits,seconds:Math.round(g.elapsed),peak});
 }
 console.log(JSON.stringify(report));
});
test('Celebration delays results; leftover queue cannot delay the ending, and replay is clean',()=>{
 const events=[],{g,p}=isolated({},e=>events.push(e));g.spawned=40;g.passed=39;g.escaped=39;p.x=1.119;p.direction=1;g.queue.enqueue('senare');g.update(.05);assert.equal(g.state,'celebrating');assert.equal(g.queue.length,1);tick(g,2);assert.equal(g.state,'celebrating');until(g,()=>g.state==='won');assert.equal(events.filter(e=>e.type==='end').length,1);g.queue.clear();g.start();assert.equal(g.score,0);assert.equal(g.passed,0);assert.equal(g.escaped,0);assert.equal(g.groups.length,0);assert.equal(g.job,null);assert.equal(g.spawned,1);
});
test('Eight compact labels fit without overlap at narrow and desktop widths, including pinyin',()=>{
 const canvasContext=new Proxy({},{get:(_,key)=>key==='measureText'?text=>({width:[...text].length*9}):()=>{}});
 for(const width of [320,370,640,1000])for(const mode of ['letters','swedishLong','chinese'])for(let seed=1;seed<=6;seed++){
  const g=new SC.DinosaurGame({random:rng(seed)});g.start({mode,pace:'brave'});g.resize(width,700);g.people=[];g.spawned=0;for(let i=0;i<8;i++){assert(g.spawn());g.people.at(-1).x=.12+i*.10;g.people.at(-1).y=.55+(i%3)*.115;}
  SC.noteTargetAppearance(g);g.clock+=5;const r=Object.create(SC.DinosaurRenderer.prototype);r.game=g;r.ctx=canvasContext;r.round=()=>{};
  for(let i=0;i<25;i++){r.labels();const boxes=r.labelBoxes;for(const [j,a] of boxes.entries()){assert(a.x>=0&&a.x+a.w<=width&&a.y>=150&&a.y+a.h<=700);if(mode==='letters')assert(a.w<=45);for(const b of boxes.slice(j+1))assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`${width}/${mode}: overlap`);}g.update(.05);}
 }
});
test('Entrances leave a clear walking corridor when the dinosaur camps at an edge',()=>{
 const edges=new Set();for(const width of [320,370,1000])for(const dino of [{x:.16,y:.53},{x:.84,y:.665},{x:.5,y:.94}])for(let seed=1;seed<=12;seed++){
  const g=new SC.DinosaurGame({random:rng(seed)});g.resize(width,700);g.start();g.people=[];g.spawned=0;Object.assign(g.dino,dino);g.spawnIn=10000;
  const gates=g.entrances();assert(gates.length,'a safe alternative entrance must remain');
  for(const gate of gates)for(let step=0;step<=20;step++){const point={x:gate.from.x+(gate.to.x-gate.from.x)*step/20,y:gate.from.y+(gate.to.y-gate.from.y)*step/20},scare={x:g.dino.x+g.dino.facing*25*g.scale()/width,y:g.dino.y-45*g.scale()/700};assert(g.distance(point,scare)>=215*g.scale()-1e-6);}
  assert(g.spawn());const p=g.people[0];edges.add(p.entrance);until(g,()=>g.getTargets().includes(p),12);assert.equal(p.fear,0);assert.equal(p.status,'walking');tick(g,1);assert.equal(p.fear,0,'a stationary dinosaur must not frighten a new arrival immediately');
 }
 assert.deepEqual([...edges].sort(),['bottom','left','right']);
 const {g}=isolated();g.people=[];g.spawned=0;const safe=g.entryIsSafe;g.entryIsSafe=()=>false;assert.equal(g.spawn(),false);assert.equal(g.spawned,0);g.entryIsSafe=safe;assert(g.spawn());
});
test('Bottom arrivals walk up smoothly, become matchable in view, and can be caught or walk away',()=>{
 for(const width of [370,1000])for(const catchIt of [true,false]){
  const {g}=isolated();g.resize(width,700);g.people=[];g.spawned=0;g.dino.x=.90;g.dino.y=.53;const entrances=g.entrances.bind(g);g.entrances=()=>entrances().filter(e=>e.edge==='bottom');assert(g.spawn());const p=g.people[0];assert(p.y>1);assert(!g.getTargets().includes(p));
  const x=p.x;until(g,()=>g.getTargets().includes(p),12);assert.equal(p.x,x);assert(p.y<=.96&&p.y>.80);assert.equal(p.fear,0);
  if(catchIt){g.queue.enqueue(p.item.answer);let previous=p.y;until(g,()=>{assert(Math.abs(p.y-previous)*g.height<=g.runSpeed*g.scale()*.05+.01,'no vertical snap from the bottom');previous=p.y;return g.hits===1;});assert.equal(g.score,15);}
  else{until(g,()=>p.entryGoal===null,12);assert(Math.abs(p.y-.80)<1e-8);until(g,()=>g.escaped===1,55);assert.equal(g.passed,1);}
 }
});
test('People farther apart seek each other and have time to form their conversation circle',()=>{
 const {g,p}=isolated();assert(g.spawn());const q=g.people[1];g.dino.x=.95;g.dino.y=.94;for(const [i,person] of [p,q].entries())Object.assign(person,{x:.25+i*.15,y:.54,chatCooldown:0,entryGoal:null});assert(g.distance(p,q)>100*g.scale());assert(g.distance(p,q)<180*g.scale());g.findConversations();assert.equal(g.groups.length,1);const group=g.groups[0];until(g,()=>group.members.every(p=>p.status==='talking'));until(g,()=>group.talkAge>=2);assert(g.groups.includes(group));
});
test('A roar belongs to each new correct target, a scream to a jump, and chewing to capture',()=>{
 const events=[],{g,p}=isolated({},e=>events.push(e));g.queue.enqueue('fel');tick(g,1.3);assert(!events.some(e=>e.type==='dino-roar'));g.queue.enqueue(p.item.answer);until(g,()=>g.hits===1);const types=events.map(e=>e.type);assert.equal(types.filter(t=>t==='dino-roar').length,1);assert.equal(types.filter(t=>t==='dino-chomp').length,1);assert(types.indexOf('dino-roar')<types.indexOf('dino-startle'));assert(types.indexOf('dino-startle')<types.indexOf('dino-chomp'));assert(types.indexOf('dino-chomp')<types.indexOf('hit'));
});
console.log(checks+' hungry-dinosaur checks passed.');
