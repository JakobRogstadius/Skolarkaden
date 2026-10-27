'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class CustomEvent extends Event{constructor(type,{detail}={}){super(type);this.detail=detail;}}
const context=vm.createContext({console,Event,EventTarget,CustomEvent,setTimeout,clearTimeout,Float32Array,Math,navigator:{userAgent:'Chrome/145'},globalThis:null});context.globalThis=context;
for(const file of ['pinyin', 'data', 'language-exercises-data', 'language-exercises', 'speech', 'input', 'people', 'game', 'plants', 'garden'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../resources/'+file+'.js'),'utf8'),context,{filename:file+'.js'});
const SC=context.Starlight;const tick=(g,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);};
const plain=v=>JSON.parse(JSON.stringify(v));
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};

test('Garden has one global 0.1-second chance trial, and math halves the probability',()=>{
 for(const pace of ['gentle','steady','brave']){
  const g=new SC.GardenGame({random:rng(4)});g.start({pace});const expected=2*.1/(60/{gentle:6,steady:9,brave:12}[pace]);assert(Math.abs(g.decayProbability()-expected)<1e-10);
  const math=new SC.GardenGame({random:rng(4)});math.start({pace,mode:'math-addition'});assert(Math.abs(math.decayProbability()*2-g.decayProbability())<1e-10);
  const ticks=[];g.onEvent=e=>{if(e.type==='care-tick')ticks.push(e);};g.random=()=>0;const before=g.pots.map(p=>p.moisture);
  g.update(.05);assert.equal(ticks.length,0);g.update(.05);assert.equal(ticks.length,1);assert.equal(ticks[0].pots.length,1);assert.equal(g.pots.filter((p,i)=>p.moisture!==before[i]).length,1);
  g.random=()=>.9999;tick(g,.5);assert.equal(ticks.length,1);
 }
 const g=new SC.GardenGame();g.start();const before=g.decayProbability();g.pots.slice(0,3).forEach(p=>p.bloom=true);assert(Math.abs(g.decayProbability()*2-before)<1e-10);const p=g.pots[3];p.moisture=.8;g.syncRequests(p);assert(!p.requests.moisture);p.moisture=.6;g.syncRequests(p);assert(p.requests.moisture);
});
test('Garden measured request inflow follows its steady per-plant target rate',()=>{
 for(const pace of ['gentle','steady','brave'])for(const mode of ['letters','math-addition'])for(const elapsed of [0,60,120]){
  const g=new SC.GardenGame({random:rng(45)});g.start({pace,mode});g.elapsed=elapsed;
  let needs=0;g.onEvent=e=>{if(e.type==='need')needs++;};const seconds=2000,expected=seconds/g.requestInterval();
  for(let i=0;i<seconds/.1;i++){g.decayPlants();for(const p of g.pots)for(const t of Object.values(p.requests)){p[t.property]=t.property==='infection'?0:1;g.syncRequests(p);}}
  assert(Math.abs(needs-expected)/expected<.13,`${pace}/${mode}/${elapsed}: ${needs} versus ${expected}`);
 }
});
test('Garden action-type sequences, incorrect answers and survivor bonus',()=>{
 const g=new SC.GardenGame();g.start();g.decayInterval=1000;const pot=g.pots[0];
 const action=property=>{
  pot[property]=property==='infection'?.6:.4;g.syncRequests(pot);const request=pot.requests[property];assert(request);
  g.job={request,entry:{text:request.item.answer},stage:'tend',age:0};const before=g.score;g.work(.5);return g.score-before;
 };
 assert.equal(action('moisture'),10);assert.equal(action('moisture'),15);assert.equal(action('moisture'),20);
 assert.equal(action('nutrition'),10);assert.equal(action('nutrition'),15);
 g.queue.enqueue('incorrect');g.beginJob();assert.equal(g.job.stage,'think');g.work(2);
 assert.equal(action('nutrition'),10);assert.equal(action('infection'),10);assert.equal(action('infection'),15);
 g.pots.forEach(p=>Object.assign(p,{moisture:1,nutrition:1,infection:0,growth:0}));pot.growth=.99999;
 const beforeBloom=g.score;g.update(.05);assert(pot.bloom);assert.equal(g.score,beforeBloom,'blooming alone adds no points');
 g.pots[1].dead=true;g.finish(true);assert.equal(g.survivorBonus,100);assert.equal(g.score,beforeBloom+100);
 g.finish(true);tick(g,5);assert.equal(g.score,beforeBloom+100,'survivor bonus only once');
 g.start();assert.equal(g.sameTypeStreak,0);assert.equal(g.lastActionType,null);assert.equal(g.survivorBonus,0);
 g.pots.forEach(p=>p.dead=true);g.finish(false);assert.equal(g.score,0);
});
test('Garden puts held tool down at current position, fetches needed tool and keeps it after care',()=>{const g=new SC.GardenGame({random:rng(7)});g.start();g.decayInterval=100;const p=g.pots[0];p.moisture=.4;p.nutrition=.6;g.syncRequests(p);g.gardener.x=.3;g.gardener.y=-.2;g.gardener.held=g.tools[1];g.queue.enqueue(p.requests.moisture.item.answer);g.beginJob();assert.equal(g.gardener.held,null);assert.equal(g.tools[1].x,.3);assert.equal(g.tools[1].y,-.2);assert.equal(g.job.stage,'fetch');tick(g,8);assert.equal(p.moisture,1);assert.equal(p.nutrition,.6);assert.equal(g.gardener.held.property,'moisture');p.moisture=.4;g.syncRequests(p);g.queue.enqueue(p.requests.moisture.item.answer);g.beginJob();assert.equal(g.job.stage,'run');});
test('Wrong garden word causes a thinking delay, keeps held tool, changes no score',()=>{const g=new SC.GardenGame();g.start();g.gardener.held=g.tools[0];g.queue.enqueue('??');g.queue.enqueue('next');g.update(.05);assert.equal(g.job.stage,'think');tick(g,1);assert.equal(g.queue.length,1);assert.equal(g.gardener.held,g.tools[0]);assert.equal(g.score,0);tick(g,1);assert.equal(g.queue.length,0);});
test('Garden growth reflects care, flowers freeze needs, and individual deaths leave the other plants playing',()=>{const g=new SC.GardenGame();g.start();g.decayInterval=100;g.pots.forEach(p=>Object.assign(p,{moisture:1,nutrition:1,infection:0}));g.pots[0].moisture=.4;tick(g,1);assert(g.pots[1].growth>g.pots[0].growth);assert(Math.abs(g.pots[1].growth-.021)<1e-8);g.pots[0].growth=.99999;g.pots[0].moisture=1;tick(g,.1);assert(g.pots[0].bloom);const moisture=g.pots[0].moisture;tick(g,7);assert.equal(g.pots[0].moisture,moisture);assert.equal(Object.keys(g.pots[0].requests).length,0);for(const key of ['moisture','nutrition','infection']){const x=new SC.GardenGame();x.start();x.pots[0][key]=key==='infection'?1:0;x.update(.05);assert.equal(x.state,'playing');assert(x.pots[0].dead);assert.equal(Object.keys(x.pots[0].requests).length,0);for(const p of x.pots)p[key]=key==='infection'?1:0;x.update(.05);assert.equal(x.state,'mourning');tick(x,3);assert.equal(x.state,'lost');}});
test('Garden can finish with 6, 9 and 12 pots at every difficulty',()=>{for(const pace of ['gentle','steady','brave'])for(let seed=1;seed<=1;seed++){const g=new SC.GardenGame({random:rng(seed)});g.start({pace});for(let i=0;i<6000&&['playing','celebrating'].includes(g.state);i++){if(!g.job&&!g.queue.length){const t=g.getTargets()[0];if(t)g.queue.enqueue(t.item.answer);}g.update(.05);}assert.equal(g.state,'won',pace+' seed '+seed+' at '+g.elapsed);assert(g.pots.every(p=>p.bloom||p.dead));assert(g.pots.every(p=>p.bloom),pace+' seed '+seed+' must keep every plant alive');}});
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

test('Gardens start penalised but request-free, walk at one fifth speed and finish mixed outcomes',()=>{
 const g=new SC.GardenGame({random:rng(7)});g.start();assert.equal(g.getTargets().length,0);for(const p of g.pots)for(const key of ['moisture','nutrition','infection'])assert(g.badness(p,key)>0&&g.badness(p,key)<.4);
 g.gardener.x=0;g.gardener.y=0;g.moveTo({x:1,y:0},.25);assert(Math.abs(g.gardener.x-.14)<1e-9);
 const a=g.pots[0];a.moisture=.6;g.syncRequests(a);g.queue.enqueue(a.requests.moisture.item.answer);g.beginJob();a.moisture=0;g.update(.05);assert(a.dead);assert.equal(g.job,null);assert.equal(g.state,'playing');assert.equal(g.getTargets().filter(t=>t.pot===a).length,0);
 g.pots.slice(1).forEach(p=>p.bloom=true);g.update(.05);assert.equal(g.state,'celebrating');tick(g,4);assert.equal(g.state,'won');assert.equal(g.score,100,'only the five surviving plants award points');
});
