'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'},globalThis:null});context.globalThis=context;
for(const file of ['pinyin','data','voice','speech','input','people','game','foodtruck','plants','garden'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+file+'.js'),'utf8'),context,{filename:file+'.js'});
const SC=context.Starlight;const tick=(g,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);};
const plain=v=>JSON.parse(JSON.stringify(v));
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
test('FIFO preserves raw casing, punctuation, repeated words, and returned work',()=>{const q=new SC.AnswerQueue();q.enqueue(' SOL! ');q.enqueue('sol');q.enqueue('sol');assert.equal(q.take().text,' SOL! ');const e=q.take();q.returnFront(e);assert.equal(q.take(),e);assert.equal(q.take().text,'sol');assert.equal(q.length,0);});
test('Speech splits all words without filtering; Chinese symbols split without spaces',()=>{assert.deepEqual(plain(SC.speechWords(' SOL! wrong sol sol ','swedish')),['SOL!','wrong','sol','sol']);assert.deepEqual(plain(SC.speechWords('山水 火！ yī','chinese')),['山','水','火！','yī']);});
test('Three city workers start concurrently; automatic aim and no manual timing',()=>{const g=new SC.CityGame({random:rng(1)});g.start();for(let i=0;i<3;i++)g.spawn();for(const t of g.getTargets())g.queue.enqueue(t.item.answer);g.update(.05);assert.equal(g.turrets.filter(t=>t.job).length,3);assert.equal(new Set(g.turrets.map(t=>t.job.target)).size,3);tick(g,2);assert.equal(g.hits,3);});
test('Incorrect city words reset streak without deducting points; pause freezes work',()=>{const g=new SC.CityGame();g.start();g.spawnIn=100;g.score=123;g.streak=7;g.queue.enqueue('incorrect');g.update(.05);assert.equal(g.turrets.filter(t=>t.job).length,1);tick(g,.8);assert.equal(g.shots,0);g.queue.enqueue('later');g.pause();tick(g,4);assert.equal(g.queue.length,1);g.resume();tick(g,2);assert.equal(g.score,123);assert.equal(g.streak,0);assert.equal(g.shots,2);});
test('Projectiles keep destination after destruction, including destroyed turret jobs',()=>{const g=new SC.CityGame({random:rng(2)});g.start();g.spawnIn=100;g.spawn();const t=g.threats[0],d=t.destination;t.destination.alive=false;tick(g,.2);assert.equal(t.destination,d);g.queue.enqueue('wrong');g.update(.05);const gun=g.turrets.find(t=>t.job),entry=gun.job.entry;gun.alive=false;for(const x of g.turrets)if(x!==gun)x.cooldown=10;g.update(.05);assert.equal(g.queue.items[0],entry);});
test('City scores uncapped streaks, resets on misses and destruction, and counts surviving turrets',()=>{
 const g=new SC.CityGame();g.start();g.spawnIn=100;const gun=g.turrets[0],entry={text:'test'};
 const hit=()=>{const target={x:100,y:150,color:'#ffffff'};g.threats.push(target);gun.job={entry,target};g.fireJob(gun);};
 for(let i=0;i<15;i++)hit();assert.equal(g.score,555);assert.equal(g.streak,15);
 gun.job={entry,target:null};g.fireJob(gun);assert.equal(g.streak,0);hit();assert.equal(g.score,585);
 for(const destination of [g.buildings[0],g.turrets[1]]){
  g.streak=7;g.threats.push({startX:0,progress:.99,duration:.01,destination});g.update(.05);assert.equal(g.streak,0);
 }
 const before=g.score;g.finish(true);assert.equal(g.score,before+9*50);g.finish(true);assert.equal(g.score,before+9*50);
 const lost=new SC.CityGame();lost.start();lost.buildings.forEach(b=>b.alive=false);lost.finish(false);assert.equal(lost.score,150);
});
test('City bot reaches exactly 40 kills and wins all three difficulties',()=>{for(const pace of ['gentle','steady','brave']){const g=new SC.CityGame({random:rng(15)});g.start({pace});for(let i=0;i<18000&&g.state==='playing';i++){for(const t of g.getTargets())if(!g.turrets.some(x=>x.job?.target===t)&&!g.queue.items.some(e=>e.text===t.item.answer))g.queue.enqueue(t.item.answer);g.update(.05);}assert.equal(g.state,'won',pace);assert.equal(g.hits,40);}});
test('Food cook consumes wrong and correct words in FIFO, serves automatically, retains flipped waste',()=>{const g=new SC.FoodTruckGame({random:rng(3)});g.start();tick(g,.85);const c=g.getTargets()[0];g.queue.enqueue('mystery');g.queue.enqueue(c.item.answer);g.update(.05);assert.equal(g.activeCook.entry.text,'mystery');assert.equal(g.queue.length,1);tick(g,2);assert.equal(g.waste.length,1);assert(g.waste[0].angle>Math.PI-.26);assert.equal(g.waste[0].text,'mystery');tick(g,2);assert.equal(g.hits,1);assert.equal(c.happy,true);assert.equal(g.lives,5);const waste=g.waste[0];tick(g,5);assert.equal(g.waste[0],waste);});
test('Departed customer does not cancel cooking; its dish becomes waste with no extra life penalty',()=>{const g=new SC.FoodTruckGame({random:rng(4)});g.start();tick(g,.85);const c=g.getTargets()[0];c.wait=c.patience-.2;g.queue.enqueue(c.item.answer);g.update(.05);tick(g,2.1);assert.equal(g.lives,4);assert.equal(g.waste.length,1);assert.equal(g.hits,0);});
test('Food scoring uses patience, capped streaks and exotic bonuses; failures break streaks',()=>{
 const events=[],g=new SC.FoodTruckGame({onEvent:e=>events.push(e)});g.start();
 const serve=(remaining=1,exotic=null)=>{
  const c={status:'cooking',patience:100,wait:100*(1-remaining),look:{exotic},slot:0};g.customers.push(c);
  g.activeCook={customer:c,entry:{text:'meal'},age:0,duration:1,dish:0};const before=g.score;g.work(1);return g.score-before;
 };
 assert.equal(serve(),20);assert.equal(serve(.5),16);assert.equal(serve(0),12);
 assert.equal(serve(),23);assert.equal(serve(),24);assert.equal(serve(),25);assert.equal(serve(),25);
 assert.equal(serve(1,'dragon'),65);assert.equal(events.find(e=>e.type==='rare-earned').bonus,40);
 g.activeCook={customer:null,entry:{text:'wrong'},age:0,duration:1,dish:0};const before=g.score;g.work(1);
 assert.equal(g.score,before);assert.equal(g.streak,0);assert.equal(serve(),20);
 g.loseCustomer({status:'waiting'});assert.equal(g.streak,0);assert.equal(serve(.5),15);
 const final=g.score;g.finish();assert.equal(g.score,final,'no end bonus');
});
test('Food bot finishes full 90-second rounds with automatic service',()=>{for(const pace of ['gentle','steady','brave']){const g=new SC.FoodTruckGame({random:rng(5)});g.start({pace});for(let i=0;i<2000&&['playing','celebrating'].includes(g.state);i++){for(const c of g.getTargets())if(c.status==='waiting'&&!g.queue.items.some(e=>e.text===c.item.answer))g.queue.enqueue(c.item.answer);g.update(.05);}assert.equal(g.state,'won');assert.equal(g.lives,5);assert(g.hits>12);}});
test('Garden has one global 0.1-second chance trial, and math halves the probability',()=>{
 for(const pace of ['gentle','steady','brave']){
  const g=new SC.GardenGame({random:rng(4)});g.start({pace});const expected=2*.1/(60/{gentle:6,steady:9,brave:12}[pace]);assert(Math.abs(g.decayProbability()-expected)<1e-10);
  const math=new SC.GardenGame({random:rng(4)});math.start({pace,mode:'math'});assert(Math.abs(math.decayProbability()*2-g.decayProbability())<1e-10);
  const ticks=[];g.onEvent=e=>{if(e.type==='care-tick')ticks.push(e);};g.random=()=>0;const before=g.pots.map(p=>p.moisture);
  g.update(.05);assert.equal(ticks.length,0);g.update(.05);assert.equal(ticks.length,1);assert.equal(ticks[0].pots.length,1);assert.equal(g.pots.filter((p,i)=>p.moisture!==before[i]).length,1);
  g.random=()=>.9999;tick(g,.5);assert.equal(ticks.length,1);
 }
 const g=new SC.GardenGame();g.start();const before=g.decayProbability();g.pots.slice(0,3).forEach(p=>p.bloom=true);assert(Math.abs(g.decayProbability()*2-before)<1e-10);const p=g.pots[3];p.moisture=.8;g.syncRequests(p);assert(!p.requests.moisture);p.moisture=.6;g.syncRequests(p);assert(p.requests.moisture);
});
test('Garden measured request inflow follows its steady per-plant target rate',()=>{
 for(const pace of ['gentle','steady','brave'])for(const mode of ['letters','math'])for(const elapsed of [0,60,120]){
  const g=new SC.GardenGame({random:rng(45)});g.start({pace,mode});g.elapsed=elapsed;
  let needs=0;g.onEvent=e=>{if(e.type==='need')needs++;};const seconds=2000,expected=seconds/g.requestInterval();
  for(let i=0;i<seconds/.1;i++){g.decayPlants();for(const p of g.pots)for(const t of Object.values(p.requests)){p[t.property]=t.property==='infection'?0:1;g.syncRequests(p);}}
  assert(Math.abs(needs-expected)/expected<.13,`${pace}/${mode}/${elapsed}: ${needs} versus ${expected}`);
 }
});
test('Garden puts held tool down at current position, fetches needed tool and keeps it after care',()=>{const g=new SC.GardenGame({random:rng(7)});g.start();g.decayInterval=100;const p=g.pots[0];p.moisture=.4;p.nutrition=.6;g.syncRequests(p);g.gardener.x=.3;g.gardener.y=-.2;g.gardener.held=g.tools[1];g.queue.enqueue(p.requests.moisture.item.answer);g.beginJob();assert.equal(g.gardener.held,null);assert.equal(g.tools[1].x,.3);assert.equal(g.tools[1].y,-.2);assert.equal(g.job.stage,'fetch');tick(g,8);assert.equal(p.moisture,1);assert.equal(p.nutrition,.6);assert.equal(g.gardener.held.property,'moisture');p.moisture=.4;g.syncRequests(p);g.queue.enqueue(p.requests.moisture.item.answer);g.beginJob();assert.equal(g.job.stage,'run');});
test('Wrong garden word causes a thinking delay, keeps held tool, changes no score',()=>{const g=new SC.GardenGame();g.start();g.gardener.held=g.tools[0];g.queue.enqueue('??');g.queue.enqueue('next');g.update(.05);assert.equal(g.job.stage,'think');tick(g,1);assert.equal(g.queue.length,1);assert.equal(g.gardener.held,g.tools[0]);assert.equal(g.score,0);tick(g,1);assert.equal(g.queue.length,0);});
test('Garden growth reflects care, flowers freeze needs, and individual deaths leave the other plants playing',()=>{const g=new SC.GardenGame();g.start();g.decayInterval=100;g.pots.forEach(p=>Object.assign(p,{moisture:1,nutrition:1,infection:0}));g.pots[0].moisture=.4;tick(g,1);assert(g.pots[1].growth>g.pots[0].growth);assert(Math.abs(g.pots[1].growth-.021)<1e-8);g.pots[0].growth=.99999;g.pots[0].moisture=1;tick(g,.1);assert(g.pots[0].bloom);const moisture=g.pots[0].moisture;tick(g,7);assert.equal(g.pots[0].moisture,moisture);assert.equal(Object.keys(g.pots[0].requests).length,0);for(const key of ['moisture','nutrition','infection']){const x=new SC.GardenGame();x.start();x.pots[0][key]=key==='infection'?1:0;x.update(.05);assert.equal(x.state,'playing');assert(x.pots[0].dead);assert.equal(Object.keys(x.pots[0].requests).length,0);for(const p of x.pots)p[key]=key==='infection'?1:0;x.update(.05);assert.equal(x.state,'mourning');tick(x,3);assert.equal(x.state,'lost');}});
test('Garden can finish with 6, 9 and 12 pots across 15 seeded gardens each',()=>{for(const pace of ['gentle','steady','brave'])for(let seed=1;seed<=15;seed++){const g=new SC.GardenGame({random:rng(seed)});g.start({pace});for(let i=0;i<6000&&['playing','celebrating'].includes(g.state);i++){if(!g.job&&!g.queue.length){const t=g.getTargets()[0];if(t)g.queue.enqueue(t.item.answer);}g.update(.05);}assert.equal(g.state,'won',pace+' seed '+seed+' at '+g.elapsed);assert(g.pots.every(p=>p.bloom||p.dead));assert(g.pots.every(p=>p.bloom),pace+' seed '+seed+' must keep every plant alive');}});
test('Garden pause freezes tool movement, growth, decay and the queue',()=>{const g=new SC.GardenGame();g.start();g.queue.enqueue('wait');g.pause();const before=JSON.stringify(g.pots);tick(g,10);assert.equal(JSON.stringify(g.pots),before);assert.equal(g.queue.length,1);});
test('All scattered plants stay within the screen at full growth, across sizes and difficulties',()=>{
 for(const [width,height] of [[355,718],[620,718],[1164,718]])for(const pace of ['gentle','steady','brave'])for(let seed=1;seed<=8;seed++){
  const g=new SC.GardenGame({random:rng(seed)});g.start({pace});g.resize(width,height);const r=Object.create(SC.GardenRenderer.prototype);r.game=g;r.projection();assert.equal(g.pots.length,{gentle:6,steady:9,brave:12}[pace]);
  for(const p of g.pots){const q=r.point(p);assert(q.x-70*r.scale>=0&&q.x+70*r.scale<=width);assert(q.y-145*r.scale>=112&&q.y+40*r.scale<=height);}
  const positions=JSON.stringify(g.pots.map(p=>[p.x,p.y]));g.resize(width,height);assert.equal(JSON.stringify(g.pots.map(p=>[p.x,p.y])),positions);
 }
});
test('Garden health drives facial expression; victory jumps for four seconds before results',()=>{
 const events=[],g=new SC.GardenGame({onEvent:e=>events.push(e)});g.start();assert(g.gardenerAnger()>0&&g.gardenerAnger()<.4);for(const p of g.pots){p.moisture=.4;p.nutrition=.4;p.infection=.4;}assert(Math.abs(g.gardenerAnger()-(1-(.4+.4+.6)/3))<1e-8);
 for(const p of g.pots){p.growth=1;p.bloom=true;p.requests={};}g.update(.05);assert.equal(g.state,'celebrating');assert.equal(g.celebrationLeft,4);assert.equal(g.gardenerAnger(),0);assert(events.some(e=>e.type==='celebrate'));assert(!events.some(e=>e.type==='end'));g.queue.enqueue('leftover');tick(g,3.95);assert.equal(g.state,'celebrating');assert.equal(g.queue.length,1);g.update(.05);assert.equal(g.state,'won');assert.equal(events.filter(e=>e.type==='end').length,1);
});
test('Only the final plant death begins a three-second mourning and freezes the queue',()=>{
 const events=[],g=new SC.GardenGame({random:rng(8),onEvent:e=>events.push(e)});g.start();g.pots.forEach(p=>{if(p!==g.pots[2])p.dead=true;});g.pots[2].nutrition=0;g.queue.enqueue('pending');g.update(.05);
 assert.equal(g.state,'mourning');assert.equal(g.failedPot,g.pots[2]);assert.equal(g.lossReason,'Näringen tog slut');assert(events.some(e=>e.type==='loss-pause'));assert(!events.some(e=>e.type==='end'));
 const before=JSON.stringify(g.pots);tick(g,2.95);assert.equal(g.state,'mourning');assert.equal(JSON.stringify(g.pots),before);assert.equal(g.queue.length,1);g.update(.05);assert.equal(g.state,'lost');assert.equal(events.filter(e=>e.type==='end').length,1);tick(g,5);assert.equal(events.filter(e=>e.type==='end').length,1);
});
test('Garden highlights one request per queued match, plus active work, and responds to corrections',()=>{
 const g=new SC.GardenGame({random:rng(8)});g.start({mode:'english',lang:'en-US'});g.decayInterval=100;const [a,b]=g.pots;a.moisture=.6;b.nutrition=.6;g.syncRequests(a);g.syncRequests(b);const r=a.requests.moisture,t=b.requests.nutrition;r.item={answer:'sea',label:'sea'};t.item={answer:'sea',label:'sea'};
 const entry=g.queue.enqueue('see','speech');assert.equal(g.getTaskStates().size,1);assert.equal(g.getTaskStates().get(r),'queued');g.beginJob();assert.equal(g.getTaskStates().get(r),'active');
 const pending=g.queue.enqueue('c','speech');assert.equal(g.getTaskStates().get(t),'queued');g.queue.revise(pending,'wrong');assert.equal(g.getTaskStates().size,1);g.queue.revise(pending,'sea');assert.equal(g.getTaskStates().size,2);g.queue.clear();assert.equal(g.getTaskStates().get(r),'active');
});
test('Food victory waves for four seconds before one result; customers, lives and queue stay frozen',()=>{
 const events=[],g=new SC.FoodTruckGame({random:rng(3),onEvent:e=>events.push(e)});g.start();g.elapsed=89.95;g.timeLeft=.05;g.queue.enqueue('last');g.update(.05);assert.equal(g.state,'celebrating');assert.equal(g.celebrationLeft,4);assert(!events.some(e=>e.type==='end'));assert(events.some(e=>e.type==='celebrate'));assert.equal(g.activeCook,null);
 const before=JSON.stringify(g.customers);tick(g,3.95);assert.equal(g.state,'celebrating');assert.equal(g.queue.length,1);assert.equal(JSON.stringify(g.customers),before);assert.equal(g.lives,5);g.update(.05);assert.equal(g.state,'won');assert.equal(events.filter(e=>e.type==='end').length,1);tick(g,2);assert.equal(events.filter(e=>e.type==='end').length,1);
 const lost=new SC.FoodTruckGame();lost.start();lost.lives=0;lost.finish();assert.equal(lost.state,'lost');
});
test('City reaches its old intensity over the shorter 40-target round',()=>{
 const g=new SC.CityGame();g.start();assert.equal(SC.cityGoal,40);g.hits=20;g.elapsed=43.2;assert(Math.abs(g.pressure()-.7)<1e-10);g.hits=40;assert.equal(g.pressure(),1);
});
test('City has distinct aim, lock and fire stages, and the barrel stays still while its beam fades',()=>{
 const g=new SC.CityGame({random:rng(2)});g.start();g.spawnIn=100;g.spawn();const target=g.threats[0];g.queue.enqueue(target.item.answer);g.update(.05);const gun=g.turrets.find(t=>t.job);assert.equal(gun.job.stage,'aim');assert.equal(g.shots,0);let sawLock=false,sawFire=false;
 for(let i=0;i<80&&gun.job;i++){if(gun.job.stage==='locked'){sawLock=true;assert.equal(g.shots,0);}if(gun.job.stage==='fire'){sawFire=true;assert.equal(g.shots,0);}g.update(.05);}assert(sawLock&&sawFire);assert.equal(g.shots,1);const angle=gun.angle;g.queue.enqueue('wrong');tick(g,.25);assert.equal(gun.angle,angle);
});
test('Longer word lessons are distinct, case-varying dictionaries usable by every game',()=>{
 for(const mode of ['swedishLong','englishLong']){const items=SC.vocabulary(mode,SC.modes[mode].lang);assert(items.length>=40);assert.equal(new Set(items.map(i=>i.answer)).size,items.length);assert(items.every(i=>i.answer.length>=6&&i.answer.length<=12));assert.equal(SC.lessonLabel(items[0].label,mode,true),items[0].label.toUpperCase());for(const Game of [SC.CityGame,SC.FoodTruckGame,SC.GardenGame]){const g=new Game({random:rng(5)});g.start({mode});assert.equal(g.items,items);}}
});
test('Math rounds accept spoken answers through all three game engines',()=>{
 for(const Game of [SC.CityGame,SC.FoodTruckGame,SC.GardenGame]){const g=new Game({random:rng(21)});g.start({mode:'math',pace:'brave',lang:'sv-SE'});
 for(let i=0;i<18000&&['playing','celebrating'].includes(g.state);i++){
  if(!g.queue.length){let t;if(g instanceof SC.CityGame)t=g.getTargets().find(t=>!g.turrets.some(gun=>gun.job?.target===t));else if(g instanceof SC.FoodTruckGame)t=g.getTargets().find(t=>t.status==='waiting');else if(!g.job)t=g.getTargets()[0];if(t)g.queue.enqueue(SC.numberName(Number(t.item.answer),'sv-SE'),'speech');}
  g.update(.05);
 }assert.equal(g.state,'won',Game.name);assert(g.hits>0);}
});
test('Case, math aliases, bopomofo and static package references',()=>{assert(SC.matches('SOL!',SC.modes.swedish.items[0],'swedish'));assert(SC.matches('två',{answer:'2'},'math','sv-SE','speech'));assert.equal(SC.toBopomofo('1qaz'),'ㄅㄆㄇㄈ');const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const m of html.matchAll(/(?:src|href)="(resources\/[^"]+)"/g))assert(fs.existsSync(path.join(__dirname,'..',m[1])));assert(!/skyhop/i.test(html));});
console.log(checks+' engine/queue checks passed.');
