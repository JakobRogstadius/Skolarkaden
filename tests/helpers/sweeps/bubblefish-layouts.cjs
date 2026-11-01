'use strict';
const assert=require('node:assert/strict');
const {load,rng}=require('../runtime.cjs');
const SC=load(['data','language-exercises-data','language-exercises','homework','input','game','klossar','bubblefish/layout','bubblefish/game']);
const kinds=['rock','urchin','predator','current','wall','bird','octopus'];
function fresh({width=1000,height=620,elapsed=120,seed=19,pace='steady',active={},vx=0,vy=0,mode='math-addition'}={}){
  const g=new SC.BubblefishGame({random:rng(seed)});g.resize(width,height);g.start({mode,pace});
  g.questions=[];g.layout=new SC.BubblefishLayout(g);g.layout.serial=seed%6;
  g.elapsed=g.clock=elapsed;g.distance=1600;g.active={...active};g.fish.vx=vx;g.fish.vy=vy;
  g.nextHazard=g.nextBalls=g.nextPickup=g.nextQuestion=g.nextAnswer=Infinity;g.life=10000;
  return g;
}
function replay(g,points,label='route'){
  let collisions=0;const collide=g.collide.bind(g);g.collide=o=>{collisions++;collide(o);};
  // Prevent new waves after the intended target is caught; all existing objects
  // still move, collide and collect through the production update loop.
  g.makeQuestionWave=()=>{};g.spawnAnswer=()=>{};
  let maxError=0;
  for(const p of points){
    const dt=p.time-g.clock;if(dt<=1e-8)continue;
    g.steer(0,p.control);g.update(dt);
    maxError=Math.max(maxError,Math.hypot(g.fish.x-p.x,g.fish.y-p.y));
  }
  assert.equal(collisions,0,label+' has no collisions, including protected/eaten encounters');
  assert(maxError<3,label+' matches actual acceleration and current movement: '+maxError);
  return maxError;
}
function sweep(count=21){
  const sizes=[[1000,620],[360,640],[850,320]],times=[0,150,600,1800],boosts=[{}, {armor:8,growth:8}, {agility:.7}, {armor:.4,agility:3,growth:4}];
  let accepted=0,maxError=0;const seen=new Set();
  for(let i=0;i<count;i++){
    const [width,height]=sizes[Math.floor(i/7)%3],kind=kinds[i%7],elapsed=times[Math.floor(i/21)%4];
    const g=fresh({width,height,elapsed,seed:i+1,pace:['gentle','steady','brave'][i%3],active:boosts[Math.floor(i/7)%4],vx:i%2?50:-45,vy:i%2?35:-30});
    const label=`${kind}, ${width}x${height}, ${elapsed}s, seed ${i+1}`;
    if(!g.spawnHazard(kind))continue;
    accepted++;seen.add(kind);maxError=Math.max(maxError,replay(g,g.layout.sections.at(-1).points,label));
  }
  assert(accepted>=count*.85,`isolated sections should usually fit (${accepted}/${count})`);
  assert.equal(seen.size,kinds.length,'every kind generates a feasible section');
  return {accepted,count,maxError};
}
module.exports={SC,fresh,replay,sweep,kinds};
