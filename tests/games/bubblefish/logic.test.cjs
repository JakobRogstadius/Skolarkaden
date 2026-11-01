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
for(const pace of ['gentle','steady','brave'])for(const [width,height] of [[360,640],[1000,620],[850,320]])for(const elapsed of [0,900]){
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
  g.start();assert.equal(g.lastStage,0);assert.equal(g.pickupSerial,0);assert.equal(g.hits,0);
}
for(const kind of ['pick','pop','correct','wrong','hit','ball','growth','armor','smash','gulp','ink','refill','agility','magnet','senses','danger','end']){
  const pcm=SC.synthesizeBubblefishSound(kind);assert(pcm.length>100);assert.equal(pcm[0],0);assert.equal(pcm.at(-1),0);
  assert(pcm.every(n=>Number.isFinite(n)&&Math.abs(n)<=1));assert(pcm.some(n=>Math.abs(n)>.01));
}
console.log('PASS Bubbelfisken: life, matching alternatives, spins, armor/walls, growth, ink drift, answer deadlines, effects, sound and restart.');
