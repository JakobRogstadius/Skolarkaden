'use strict';
const assert=require('node:assert/strict');
const {load,rng}=require('../../helpers/runtime.cjs');
const SC=load(['data','language-exercises-data','language-exercises','homework','input','game','klossar','bubblefish/game','bubblefish/sound']);
function fresh(options={}){const events=[],g=new SC.BubblefishGame({random:rng(19),onEvent:e=>events.push(e)});g.start({mode:'math-addition',...options});g.nextHazard=g.nextBalls=g.nextPickup=Infinity;g.events=events;return g;}
function hold(g){g.collectQuestion(g.questions[0]);return g.held;}
function answer(g,label){return g.bubble({...g.held.pair,answer:label},'answer',g.fish.x,g.fish.y);}
function obstacle(g,kind,extra={}){return {kind,x:g.fish.x,y:g.fish.y,baseY:g.fish.y,r:30,phase:0,age:0,...extra};}
{
  const g=fresh();assert.equal(g.questions.length,3);const held=hold(g);assert.equal(g.questions.length,0);assert.equal(g.held.pair,held.pair);
  g.life=27;g.answers=[answer(g,g.held.pair.answer),answer(g,'not correct')];g.collectAnswer(g.answers[0]);
  assert.equal(g.life,77);assert.equal(g.hits,1);assert.equal(g.collected.length,1);assert.equal(g.answers.length,0);assert.equal(g.held,null);
  g.makeQuestionWave();hold(g);g.life=80;g.collectAnswer(answer(g,g.held.pair.answer));assert.equal(g.life,100);
  g.makeQuestionWave();hold(g);g.answers=[answer(g,'not correct')];g.collectAnswer(g.answers[0]);
  assert.equal(g.stun,0);assert.equal(g.life,100);assert.equal(g.held,null);assert.equal(g.answers.length,0);assert.equal(g.streak,0);
}
{
  const g=fresh();hold(g);g.answers=[answer(g,g.held.pair.answer)];g.collide(obstacle(g,'rock'));
  assert.equal(g.stun,2);assert.equal(g.held,null);assert.equal(g.answers.length,0);
  const x=g.fish.x,health=g.life,d=g.distance;g.steer(1,0);
  g.balls=[{x:g.fish.x+5,y:g.fish.y,r:8}];g.pickups=[{kind:'refill',x:g.fish.x,y:g.fish.y,r:20}];
  g.obstacles=[obstacle(g,'octopus')];g.update(.4);
  assert(g.fish.x>x);assert.equal(g.points,0);assert.equal(g.ink.length,0);assert.equal(g.pickups.length,1);assert.equal(g.questions.length,0);
  assert(Math.abs(health-g.life-(g.distance-d)/g.profile.range*100)<1e-9);
  g.pause();const snapshot=[g.life,g.distance,g.stun];g.update(3);assert.deepEqual([g.life,g.distance,g.stun],snapshot);
  g.resume();g.obstacles=[];g.update(1.7);assert.equal(g.stun,0);assert.equal(g.questions.length,3);
}
{
  const a=fresh(),b=fresh();a.steer(1,1);a.active.agility=8;a.active.armor=8;a.update(1);b.update(1);
  assert.equal(a.life,b.life);assert.equal(a.distance,b.distance);
  hold(a);a.active.armor=8;const held=a.held;
  for(const kind of ['rock','wall']){const o=obstacle(a,kind,{w:90,gapY:200,gap:80});a.collide(o);assert(o.dead);assert.equal(a.held,held);assert.equal(a.stun,0);}
  a.active.growth=8;const fish=obstacle(a,'predator',{r:29});const life=a.life;a.collide(fish);assert(fish.dead);assert(a.gulp>0);assert.equal(a.life,life);assert.equal(a.held,held);
  a.collide(obstacle(a,'predator',{r:100}));assert.equal(a.stun,2);
}
{
  const g=fresh();hold(g);const octopus=obstacle(g,'octopus');g.collide(octopus);assert.equal(g.ink.length,1);
  const rockVelocity=g.velocity({kind:'rock'}),octopusVelocity=g.velocity(octopus);
  assert(rockVelocity<octopusVelocity&&octopusVelocity<0);assert.equal(octopusVelocity/rockVelocity,.3);
  const x=g.ink[0].x,d=g.distance;g.update(.5);assert(Math.abs((x-g.ink[0].x)-(g.distance-d)*g.pixelsPerMetre()*.3)<1e-8);
  g.update(5);assert.equal(g.ink.length,0);
  assert(g.velocity({kind:'predator',speed:-.32})>0);
}
{
  const g=fresh({mode:'swedish-synonyms',items:[{label:'glad',answer:'lycklig',aliases:['nöjd'],answerLang:'sv-SE',answerKeys:['lycklig','nöjd']}]});
  hold(g);assert(g.isCorrect('nöjd'));assert(!g.isCorrect('ledsen'));assert(g.isCorrect(g.distractor().answer),'single-item exercise never invents an incorrect accepted answer');
  const chinese=fresh({mode:'chinese'});hold(chinese);assert(chinese.isCorrect(chinese.held.pair.chinese.pinyin));
  assert(chinese.isCorrect(chinese.held.pair.chinese.translation));
  const math=fresh({mode:'math-simple-multiplication'});assert(math.questions.every(q=>q.item.diagram));hold(math);assert(math.isCorrect(String(math.held.pair.problem.answer)));
}
// Every clean half-bar answer cycle has a catchable correct arrival, including
// late runs and portrait/landscape viewports. A spawn beyond death is not enough.
for(const pace of ['gentle','steady','brave'])for(const [width,height] of [[360,640],[1000,620],[850,320]])for(const elapsed of [0,300,900,1800]){
  const g=fresh({pace});g.resize(width,height);g.fish.x=g.limits().left+g.radius();hold(g);g.life=50;g.elapsed=elapsed;g.distance=elapsed?1800:0;
  g.nextAnswer=g.distance+4;g.correctAt=2;g.nextHazard=g.nextBalls=g.nextPickup=Infinity;
  let reachable=false;
  for(let i=0;i<1800&&g.state==='playing';i++){
    g.update(1/30);
    for(const b of g.answers)if(g.isCorrect(b.item.label)&&b.x+ b.w/2<g.width){
      const seconds=Math.max(0,b.x-g.fish.x)/(g.speed()*g.pixelsPerMetre());
      if(seconds<g.life/100*g.profile.range/g.speed()&&Math.abs(b.y-g.fish.y)<Math.max(.1,seconds)*g.steeringSpeed()){reachable=true;break;}
    }
    if(reachable)break;
  }
  assert(reachable,`correct opportunity: ${pace} ${width}x${height} at ${elapsed}s`);
}
{
  const g=fresh();g.collectBoost({kind:'growth'});g.collectBoost({kind:'armor'});assert(g.has('growth')&&g.has('armor'));
  g.update(2);g.collectBoost({kind:'growth'});assert.equal(g.active.growth,8);assert(g.active.armor<7);
  g.life=65;g.collectBoost({kind:'refill'});assert.equal(g.life,90);g.collectBoost({kind:'refill'});assert.equal(g.life,100);
  g.life=.001;g.update(.1);assert.equal(g.state,'lost');assert.equal(g.events.filter(e=>e.type==='end').length,1);g.update(10);assert.equal(g.events.filter(e=>e.type==='end').length,1);
  g.start();assert.equal(g.introduced.size,0);assert.equal(g.pickupSerial,0);assert.equal(g.hits,0);
}
// The speed keeps rising in every difficulty; the same travel drains the same life.
for(const pace of ['gentle','steady','brave']){
  const g=fresh({pace}),start=g.speed();let previous=start;
  for(const seconds of [60,150,300,600,900,1800]){g.elapsed=seconds;assert(g.speed()>previous);previous=g.speed();}
  g.elapsed=300;assert.equal(g.speed(),start*3);g.elapsed=600;assert.equal(g.speed(),start*5);
}
for(const pointer of [false,true]){
  const left=fresh(),right=fresh();
  for(const [g,direction] of [[left,-1],[right,1]]){
    g.fish.x=500;g.questions=[];g.nextQuestion=Infinity;
    if(pointer)g.moveTo(500+direction*1000,g.fish.y);else g.steer(direction,0);
    g.update(.3);
  }
  assert(Math.abs((500-left.fish.x)/(right.fish.x-500)-1.2)<1e-9,'backwards is 20% faster for both inputs');
  assert.equal(left.distance,right.distance);assert.equal(left.life,right.life);
}
{
  const schedule=SC.bubblefishProgression;
  assert(schedule.every((s,i)=>i===0||s.at>schedule[i-1].at),'one ordered introduction schedule');
  for(const s of schedule.filter(s=>s.after))assert(schedule.find(p=>p.kind===s.after).at<s.at);
  // Check every pickup immediately before and at its threshold, prioritising
  // that new effect over previously introduced ones.
  for(const stage of schedule.filter(s=>s.type==='pickup')){
    const g=fresh();for(const s of schedule)if(s!==stage)g.introduced.add(s.kind);
    g.distance=stage.at-.01;g.spawnPickup();assert(!g.pickups.some(p=>p.kind===stage.kind));
    g.distance=stage.at;g.spawnPickup();assert.equal(g.pickups.at(-1).kind,stage.kind);
  }
  const g=fresh();g.distance=2000;
  for(let i=0;i<12;i++)g.spawnPickup();
  assert(g.pickups.every(p=>p.kind==='refill'),'counter boosts require their hazard to actually spawn');
  g.introduced.add('rock');g.spawnPickup();assert.equal(g.pickups.at(-1).kind,'armor');
  g.introduced.add('predator');g.spawnPickup();assert.equal(g.pickups.at(-1).kind,'growth');
  // Exercise the real scheduler across the full introduction sequence, keeping
  // the fish alive and removing question corridors that deliberately block hazards.
  for(const seed of [7,19,51]){
    const g=fresh();g.random=rng(seed);g.questions=[];g.makeQuestionWave=()=>{};g.collide=()=>{};
    g.nextHazard=32;g.nextBalls=8;g.nextPickup=100;
    const first=new Map();
    while(g.distance<1800){
      g.life=100;g.update(.1);
      for(const kind of g.introduced)if(!first.has(kind))first.set(kind,g.distance);
    }
    for(const s of schedule){assert(first.has(s.kind),`${s.kind} introduced, seed ${seed}`);assert(first.get(s.kind)>=s.at,`${s.kind} respects minimum distance`);}
    const hazards=schedule.filter(s=>s.type==='hazard');
    assert(hazards.every((s,i)=>i===0||first.get(s.kind)>first.get(hazards[i-1].kind)),'hazards introduced in order');
    for(const s of schedule.filter(s=>s.after))assert(first.get(s.kind)>first.get(s.after));
  }
  const blocked=fresh(),attempts=[];blocked.distance=1700;blocked.nextHazard=0;
  blocked.spawnHazard=kind=>{attempts.push(kind);return false;};
  blocked.step(.01);blocked.distance=blocked.nextHazard;blocked.step(.01);
  assert.deepEqual(attempts,['rock','rock'],'retry a blocked introduction instead of skipping it');
  assert(!blocked.introduced.has('rock'));
}
{
  const g=fresh();g.elapsed=12000;g.questions=[];
  g.obstacles=[obstacle(g,'rock',{x:g.fish.x+100})];g.update(.05);
  assert(g.stun>0,'very fast obstacles cannot tunnel through the fish between collision checks');
}
for(const kind of ['pick','pop','correct','wrong','hit','ball','growth','armor','smash','gulp','ink','refill','agility','magnet','senses','danger','end']){
  const pcm=SC.synthesizeBubblefishSound(kind);assert(pcm.length>100);assert.equal(pcm[0],0);assert.equal(pcm.at(-1),0);
  assert(pcm.every(n=>Number.isFinite(n)&&Math.abs(n)<=1));assert(pcm.some(n=>Math.abs(n)>.01));
}
console.log('PASS Bubbelfisken: life, matching, collisions, boosts, ink, answer deadlines, staged progression, speed ramp, backward steering, sound and restart.');
