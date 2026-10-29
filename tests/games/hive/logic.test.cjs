'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const ctx=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'}});
for(const file of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input', 'people', 'game', 'plants', 'beehive'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const SC=ctx.Starlight,rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},tick=(g,n)=>{for(let i=0;i<Math.round(n/.05);i++)g.update(.05);};
let checks=0;function test(name,fn){fn();console.log('PASS '+name);checks++;}
function flowers(g,n=5){while(g.plants.length<n)g.spawn();g.nextSpawn=10000;for(const p of g.plants.slice(0,n)){g.bloom(p);p.bloomFor=1000;}return g.getTargets();}
function exotic(i){let first=true;return SC.makePerson(()=>{if(first){first=false;return .995;}return (i+.5)/SC.rarePeople.length;});}

test('Five bees take different queued targets concurrently; nectar counts only after returning',()=>{
 const g=new SC.BeehiveGame({random:rng(2)});g.start();const targets=flowers(g);for(const t of targets)g.queue.enqueue(t.item.answer);g.update(.05);assert.equal(g.bees.filter(b=>b.stage==='outbound').length,5);assert.equal(new Set(g.bees.map(b=>b.job.target)).size,5);assert.equal(g.honey,0);
 let sawNectar=false;for(let i=0;i<600&&g.hits<5;i++){g.update(.05);if(g.bees.some(b=>b.nectar)){sawNectar=true;assert(g.honey<5);}}assert(sawNectar);assert.equal(g.honey,5);assert.equal(g.shots,5);assert.equal(g.bees.filter(b=>b.stage==='idle').length,5);
});
test('Wrong words use one bee and cost travel time without changing honey or score',()=>{
 const g=new SC.BeehiveGame({random:rng(3)});g.start();g.queue.enqueue('wrong');g.update(.05);const b=g.bees.find(b=>b.job);assert.equal(b.stage,'confused');assert.equal(g.bees.filter(b=>b.stage==='idle').length,4);tick(g,3);assert.equal(b.stage,'confused');assert.equal(g.honey,0);tick(g,12);assert.equal(b.stage,'idle');assert.equal(g.score,0);assert.equal(g.honey,0);
});
test('Flowers that wilt before arrival or gathering finish cannot produce nectar',()=>{
 for(const stage of ['outbound','gather']){const g=new SC.BeehiveGame({random:rng(4)});g.start();const p=flowers(g,1)[0];g.queue.enqueue(p.item.answer);g.update(.05);const b=g.bees.find(b=>b.job);b.stage=stage;p.bloomFor=.01;g.update(.05);assert.equal(b.stage,'return');assert.equal(b.nectar,0);tick(g,12);assert.equal(g.honey,0);}
});
test('Queued flower highlights use speech aliases, track revisions and reserve each flower once',()=>{
 const g=new SC.BeehiveGame({random:rng(5)});g.start({mode:'english',lang:'en-US'});const [a,b]=flowers(g,2);a.item={answer:'sea',label:'sea'};b.item={answer:'sun',label:'sun'};g.queue.enqueue('see','speech');const e=g.queue.enqueue('son','speech');assert.equal(g.getTaskStates().get(a),'queued');assert.equal(g.getTaskStates().get(b),'queued');g.queue.revise(e,'wrong');assert.equal(g.getTaskStates().get(b),undefined);g.dispatch();assert.equal(g.getTaskStates().get(a),'active');assert.equal(g.bees.filter(b=>b.stage==='confused').length,1);
});
test('Pause freezes the year, flower life, flights and pending answers',()=>{
 const g=new SC.BeehiveGame({random:rng(6)});g.start();g.queue.enqueue(flowers(g,1)[0].item.answer);g.update(.05);g.queue.enqueue('later');g.pause();const before=JSON.stringify({plants:g.plants,bees:g.bees,elapsed:g.elapsed});tick(g,10);assert.equal(JSON.stringify({plants:g.plants,bees:g.bees,elapsed:g.elapsed}),before);assert.equal(g.queue.length,1);g.resume();g.update(.05);assert.equal(g.queue.length,0);
});
test('Spring and summer grow plants; autumn stops new growth; math extends the year and flower lifetime',()=>{
 const g=new SC.BeehiveGame({random:rng(8)});g.start();assert.equal(g.season(),'Vår');assert(g.plants.every(p=>p.status==='young'));tick(g,15);assert(g.getTargets().length>0);g.elapsed=g.duration*.3;assert.equal(g.season(),'Sommar');g.elapsed=g.duration*.64;assert.equal(g.season(),'Höst');const count=g.spawned;tick(g,20);assert.equal(g.spawned,count);
 const math=new SC.BeehiveGame({random:rng(8)});math.start({mode:'math-addition'});assert.equal(math.duration,g.duration*1.4);const p=flowers(math,1)[0];tick(math,7);assert(Math.abs(p.flowerAge-5)<1e-7);
});
test('Winter is the strict delivery deadline, with one delayed result and no early win',()=>{
 const events=[],g=new SC.BeehiveGame({onEvent:e=>events.push(e)});g.start();g.honey=g.honeyGoal;g.update(.05);assert.equal(g.state,'playing');g.elapsed=g.duration-.05;g.queue.enqueue('pending');g.update(.05);assert.equal(g.state,'celebrating');assert.equal(g.season(),'Vinter');assert(!events.some(e=>e.type==='end'));tick(g,3.95);assert.equal(g.state,'celebrating');g.update(.05);assert.equal(g.state,'won');assert.equal(g.queue.length,1);assert.equal(events.filter(e=>e.type==='end').length,1);
 const lost=new SC.BeehiveGame();lost.start();lost.honey=lost.honeyGoal-1;Object.assign(lost.bees[0],{stage:'return',nectar:1,job:{entry:{text:'late'},target:null}});lost.elapsed=lost.duration-.05;lost.update(.05);assert.equal(lost.honey,lost.honeyGoal-1);assert.equal(lost.state,'mourning');tick(lost,3);assert.equal(lost.state,'lost');assert(lost.bees.every(b=>b.stage==='hungry'));
});
test('Beehive rounds win at calibrated answer rates with 10% wrong answers, on desktop and narrow layouts',()=>require('../../helpers/sweeps/beehive-rounds.cjs').run({widths:[390],seeds:1}));
test('Late-summer flowers remain alive until winter; early flowers still wilt and visited flowers retire',()=>{
 for(const mode of ['swedish','math-addition']){const g=new SC.BeehiveGame({random:rng(7)});g.start({mode});g.elapsed=g.duration*.64;g.nextSpawn=10000;g.plants=g.plants.slice(0,1);const p=g.plants[0];g.bloom(p);assert(p.lateSeason);tick(g,g.timeLeft()-1);assert.equal(p.status,'flower');assert(g.getTargets().includes(p));tick(g,1.1);assert(['mourning','celebrating'].includes(g.state));}
 const early=new SC.BeehiveGame();early.start();early.nextSpawn=10000;const p=early.plants[0];early.bloom(p);tick(early,p.bloomFor+.1);assert.equal(p.status,'wilt');
 const visited=new SC.BeehiveGame();visited.start();visited.elapsed=visited.duration*.65;visited.plants=visited.plants.slice(0,1);const flower=visited.plants[0];visited.bloom(flower);const b=visited.bees[0];b.stage='gather';b.age=.79;b.job={entry:{text:flower.item.answer},target:flower};visited.work(.05);assert(flower.harvested);assert(flower.bloomFor-flower.flowerAge<=4);tick(visited,4.1);assert.equal(flower.status,'wilt');
});
test('Normal bee flights are slower than before, bend away from a straight path and still land',()=>{
 const g=new SC.BeehiveGame();g.start();const b=g.bees[0],from={x:.83,y:.32},to={x:.17,y:.82};Object.assign(b,from);let travel=0,path=0,maxDeviation=0,previous={...from};const lineX=(to.x-from.x)*1.35,lineY=to.y-from.y,direct=Math.hypot(lineX,lineY);let landed=false;
 while(travel<30&&!landed){b.age+=.05;landed=g.move(b,to,.05);travel+=.05;path+=Math.hypot((b.x-previous.x)*1.35,b.y-previous.y);maxDeviation=Math.max(maxDeviation,Math.abs(lineX*(b.y-from.y)-lineY*(b.x-from.x)*1.35)/direct);previous={x:b.x,y:b.y};}
 assert(landed);assert(travel>direct/.185*1.2);assert(path>direct*1.035);assert(maxDeviation>.012);assert.equal(b.x,to.x);assert.equal(b.y,to.y);
});
