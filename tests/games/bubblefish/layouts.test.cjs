'use strict';
const assert=require('node:assert/strict');
const {fresh,replay,sweep,kinds}=require('../../helpers/sweeps/bubblefish-layouts.cjs');
const sweepResult=sweep();
// A predator sweeps across an otherwise open wall gap between safe endpoints.
// Endpoint-only checks would wrongly call the route feasible.
{
  const g=fresh({elapsed:0}),{x,y}=g.fish;
  const wall={kind:'wall',x,y,w:180,gapY:y,gap:112,r:20,age:0};
  const predator={kind:'predator',x,y:y+160,baseY:y+80,r:30,speed:0,frequency:Math.PI*4,phase:Math.PI/2,amplitude:80,age:0};
  assert(!g.obstacleAt(predator,x,y,g.layout.radius(),x,g.projectObstacle(predator,.5).y));
  assert(g.obstacleAt(predator,x,y,g.layout.radius(),x,g.projectObstacle(predator,.25).y));
  assert.equal(g.layout.trace(x+70,{duration:.5,objects:[wall,predator]}).length,0);
  g.obstacles=[{...wall,gap:0}];
  const b=g.bubble(g.makePair(),'answer',g.width+80,y);
  assert.equal(g.layout.place(b),null,'reject an impossible placement without deleting the wall');
  assert.equal(g.obstacles.length,1);
}
// A reserved bonus route must survive later section placement, including
// currents and predators. Follow its stored controls in the actual game.
{
  let sections=0;
  for(const kind of kinds){
    const g=fresh({seed:13});assert(g.spawnBalls());assert.equal(g.balls.length,7);
    const route=g.layout.reservations.at(-1).points;
    assert(g.balls.every((b,i)=>!i||b.x>g.balls[i-1].x),'ordered environmental trail');
    if(g.spawnHazard(kind))sections++;
    replay(g,route,kind+' preserves ball route');
    assert.equal(g.points,35,'all seven balls remain reachable');
  }
  assert(sections>=3,'reserving a trail should still allow interesting sections');
}
// Three real question alternatives, including large diagrams and long labels,
// have separate routes. Each alternative can be collected without taking another.
for(const [width,height] of [[360,640],[1000,620],[850,320]])for(const mode of ['math-addition','math-simple-multiplication','translation-sv-en-6']){
  for(let choice=0;choice<3;choice++){
    const g=fresh({width,height,mode,elapsed:300});g.makeQuestionWave();
    assert.equal(g.questions.length,3,`${mode} at ${width}x${height}`);
    const q=g.questions[choice],reservation=g.layout.reservations.find(r=>r.target===q);
    replay(g,reservation.points,mode+' choice '+choice);
    assert.equal(g.held?.id,q.id,'collect the chosen question');
  }
}
// Wrong answers leave an actual escape path; the next correct answer remains
// reachable while avoiding the still-visible distractor.
{
  const g=fresh({width:850,height:320,elapsed:1800});g.makeQuestionWave();g.collectQuestion(g.questions[0]);
  g.correctAt=2;g.life=10000;g.spawnAnswer();
  assert.equal(g.answers.length,1);const wrong=g.answers[0];assert(!wrong.correct);
  const escape=g.layout.reservations.find(r=>r.target===wrong);assert(escape);
  g.correctAt=0;g.spawnAnswer();const correct=g.answers.find(b=>b.correct);assert(correct);
  const route=g.layout.reservations.find(r=>r.target===correct);assert(route);
  replay(g,route.points,'correct answer around distractor');
  assert.equal(g.mistakes,0);assert.equal(g.hits,1);
}
// Keep the real answer scheduler running through a half-bar cycle with two
// distractors at extreme speed. Follow each newly offered route from its origin.
{
  const g=fresh({width:850,height:320,elapsed:1800});g.makeQuestionWave();g.collectQuestion(g.questions[0]);
  g.correctAt=2;g.life=50;let route=null,index=0;
  for(let i=0;i<1200&&g.state==='playing'&&!g.hits;i++){
    const live=g.layout.reservations.filter(r=>g.answers.includes(r.target)&&r.points.at(-1).time>g.clock);
    const wanted=live.find(r=>r.target.correct)||live.at(-1);
    if(wanted!==route){route=wanted;index=0;}
    if(route){
      while(index<route.points.length-1&&route.points[index].time<=g.clock+1e-7)index++;
      const p=route.points[index];g.steer(0,p.control);g.update(Math.max(.001,Math.min(1/60,p.time-g.clock)));
    }else{g.steer(0,0);g.update(1/60);}
  }
  assert.equal(g.mistakes,0);assert.equal(g.hits,1,'scheduled correct answer is collected before life runs out');
}
// World-fixed items have invariant world x and y as the reef accelerates. Only
// explicit magnet attraction and a held question may move relative to the reef.
{
  const g=fresh();g.spawnBalls();g.makeQuestionWave();g.spawnPickup();
  const b=g.bubble(g.makePair(),'answer',g.width+200,150);g.answers.push(b);
  const items=[...g.questions,...g.answers,...g.balls,...g.pickups];assert(items.length>=12);
  const before=items.map(b=>({x:b.x/g.pixelsPerMetre()+g.distance,y:b.y}));g.update(.4);
  items.forEach((b,i)=>{assert(Math.abs(b.x/g.pixelsPerMetre()+g.distance-before[i].x)<1e-8);assert.equal(b.y,before[i].y);});
}
// Live hazard movement and forecast agree through a bird's turnaround and with
// sinusoidal patrols (including a predator swimming in from behind).
{
  const g=fresh(),x=g.width+100,y=150;
  g.obstacles=[{kind:'bird',x,y,r:20,vy:170,diveY:220,age:0},
    {kind:'predator',x,y,baseY:y,r:25,speed:-.32,amplitude:60,phase:1,frequency:.7,age:0},
    {kind:'octopus',x,y,baseY:y,r:30,phase:2,age:0}];
  const forecast=g.obstacles.map(o=>g.projectObstacle(o,1));g.update(1);
  g.obstacles.forEach((o,i)=>{assert(Math.hypot(o.x-forecast[i].x,o.y-forecast[i].y)<1e-7);});
}
{
  const g=fresh({width:360,height:640,seed:3});assert(g.spawnHazard('predator'));
  const [a,b]=g.obstacles;assert(b&&a.speed===b.speed,'paired forward patrols keep their spacing');
  assert(b.x-a.x>(a.r+b.r)*1.5,'predator silhouettes stay separate on a phone');
}
console.log('PASS Bubbelfisken layouts: actual-route replay, moving hazards, reserved paths, reachable questions/answers/balls and fixed world coordinates.',sweepResult);
