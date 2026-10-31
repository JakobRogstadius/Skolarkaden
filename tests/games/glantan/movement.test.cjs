'use strict';
const assert = require('node:assert/strict');
const { runtime, advance } = require('./helpers.cjs');
const { G } = runtime();
function quiet(seed) {
  const sim = new G.Simulation({ seed });
  for (const l of sim.world.lairs) l.wakeAt = l.nextSpawn = l.nextGrowth = 1e6;
  return sim;
}
{
  const sim = quiet('separation'), w = sim.world;
  const point = G.freeNear(w, G.castle(w));
  const heroes = Array.from({length:8}, () => G.addHero(w, 'warrior'));
  for (const h of heroes) Object.assign(h, point);
  advance(sim, 1);
  for (let i = 0; i < heroes.length; i++) for (let j = i+1; j < heroes.length; j++) {
    assert(G.distance(heroes[i], heroes[j]) > .45, 'overlapping heroes resolve into separate positions');
  }
  assert(heroes.every(h => G.open(w,h.x,h.y)), 'separation cannot push heroes into structures');
}
{
  const sim = quiet('patrol'), w = sim.world, hero = G.addHero(w,'warrior');
  const positions = [];
  for(let i=0;i<20;i++){advance(sim,1);positions.push({x:hero.x,y:hero.y});}
  assert(positions.some(p => G.distance(p,positions[0]) > 2), 'idle guards make a real patrol');
  assert(positions.every(p => G.distance(p,G.castle(w)) < 7), 'patrol stays near village');
  assert(positions.every(p => G.open(w,p.x,p.y)), 'patrol remains on open ground');
}
{
  const sim = quiet('boss-flight'), w=sim.world, boss=w.lairs.find(l=>l.boss);
  const guardian=w.monsters.find(m=>m.lair===boss.id), hero=G.addHero(w,'ranger');
  Object.assign(hero,G.freeNear(w,guardian));
  const start={x:hero.x,y:hero.y};
  advance(sim,.3);
  assert(hero.retreating && hero.retreatUntil > w.time, 'healthy unsupported scout commits to escape');
  advance(sim,3);
  assert(G.alive(hero),'the fast scout can escape a boss guardian');
  assert(G.distance(hero,start)>2,'escape does not oscillate between return and combat');
  assert(boss.seen,'seeing the guardian identifies its lair before the scout must flee');
}
{
  const sim=quiet('heard-boss'),w=sim.world,boss=w.lairs.find(l=>l.boss);
  const heroes=['warrior','warrior','healer','ranger'].map((role,i)=>{
    const h=G.addHero(w,role);h.level=[3,3,2,2][i];h.maxHp=G.heroStats(w,h).hp;h.hp=h.maxHp;return h;
  });
  boss.seen=true;
  const bounty=G.purchase(w,{type:'bounty',id:'attack',target:boss.id,level:3}).entity;
  const party={members:heroes.map(h=>h.id),bounty:bounty.id};
  assert(G.expeditionReadiness(w,party)>=1, 'recommended healthy mixed party is willing to attack');
  const before=G.expeditionReadiness(w,party);
  w.monsters.filter(m=>m.guard&&m.lair===boss.id).forEach(m=>{m.hp=0;});
  assert(G.expeditionReadiness(w,party)>before*2,'guard losses lower the remaining risk');
}
console.log('movement: body separation, purposeful patrols, safe boss retreat and regrouping');
for (const type of ['spore', 'sky']) {
  const w = G.createMap('wave-cohesion', 'gentle');
  w.terrain.fill(0); w.explored.fill(1); delete w.lairSites;
  G.addBuilding(w, 'castle', 4, 22);
  const lair = G.addLair(w, { type, tier: 1, tx: 52, ty: 22 }, 1e6);
  w.monsters = []; lair.level = 4;
  // A long river with one pass: flying escorts must share the ground detour.
  for (let y = 1; y < w.height - 1; y++) if (y < 8 || y > 10) w.terrain[G.index(w, 25, y)] = 2;
  w.navRevision++; G.launchWave(w, lair);
  const wave = [...w.monsters]; let widest = 0, crossed = false;
  for (let step = 0; step < 2400 && !wave.some(m => m.waveEngaged); step++) {
    w.time += .1; G.updateMonsters(w, .1);
    if (wave.some(m => m.waveEngaged)) break;
    for (const a of wave) for (const b of wave) widest = Math.max(widest, G.distance(a,b));
    assert(wave.every(m => G.open(w,m.x,m.y)), 'all intact wave members follow the pass, including flyers');
    crossed ||= wave.every(m => m.x < 25);
  }
  assert(widest < 9, type + ' escorts never split from the wave: ' + widest);
  assert(crossed, type + ' wave makes progress around the obstacle');
  assert(wave.every(m => m.waveEngaged), 'contact releases the whole wave to use its combat abilities');
  assert.notEqual(G.monsterSpeed(wave[0]), G.monsterSpeed(wave.at(-1)), 'individual combat speeds remain distinct');
}
{
  const sim = quiet('wave-ambush'), w = sim.world, lair = w.lairs.find(l => !l.boss);
  w.monsters = []; lair.level = 3; G.launchWave(w,lair);
  const wave = [...w.monsters]; G.damage(w,wave[0],1);
  G.updateMonsters(w,.1);
  assert(wave.every(m=>m.waveEngaged), 'an attack on one member releases its entire wave');
}
{
  const sim=quiet('scout-arrival'),w=sim.world,scout=G.addHero(w,'ranger');
  scout.scoutGoal={x:scout.x,y:scout.y};scout.rethinkAt=9;w.tick=9;
  advance(sim,.1);
  assert(G.distance(scout,scout.scoutGoal)>.5,'a scout chooses another viewpoint after its arrival reveal instead of standing for nine seconds');
}
{
  const sim=quiet('expedition-pace'),w=sim.world;
  w.terrain.fill(0);w.explored.fill(1);w.lairs=[];w.monsters=[];w.navRevision++;
  const lair=G.addLair(w,{type:'rust',tier:1,tx:w.home.tx+22,ty:w.home.ty+4},1e6);w.monsters=[];
  const leader=G.addHero(w,'warrior'),scout=G.addHero(w,'ranger');
  Object.assign(leader,{x:w.home.x+8.5,y:lair.y+.5});
  Object.assign(scout,{x:leader.x+6,y:leader.y});
  const bounty=G.purchase(w,{type:'bounty',id:'attack',target:lair.id,level:3}).entity;
  w.expeditions=[{id:99999,bounty:bounty.id,members:[leader.id,scout.id],state:'march',created:0,progressAt:0,targetHp:lair.hp,x:leader.x,y:leader.y}];
  leader.expedition=scout.expedition=99999;
  const before=G.travelDistance(w,leader,lair),scoutX=scout.x;
  advance(sim,.9);
  assert(G.travelDistance(w,leader,lair)<before,'leader catches up with a faster ally instead of waiting for it');
  assert(scout.x<=scoutX+.1,'the ahead scout waits for its front line');
}
{
  const sim=quiet('distant-raid'),w=sim.world,castle=G.castle(w),hero=G.addHero(w,'warrior');
  w.monsters=[];
  const enemy=G.spawnMonster(w,w.lairs.find(l=>G.distance(l,castle)>20));
  enemy.targetId=castle.id;
  const flag=G.purchase(w,{type:'bounty',id:'defend',x:hero.x,y:hero.y,level:1}).entity;
  advance(sim,4);
  assert(G.distance(enemy,castle)>12,'incoming raider is still well outside the village');
  assert(G.distance(hero,castle)<6,'an assigned guard does not march across the map toward a distant incoming raid');
  assert(w.bounties.some(b=>b.id===flag.id),'guard assignment stays active');
}
{
  const sim=quiet('forgotten-lair'),w=sim.world,lair=w.lairs.find(l=>!l.boss);
  w.explored.fill(1);w.monsters=[];
  for(let y=lair.ty;y<lair.ty+lair.h;y++)for(let x=lair.tx;x<lair.tx+lair.w;x++)w.explored[y*w.width+x]=0;
  lair.seen=false;w.fogRevision++;
  const scout=G.addHero(w,'ranger');
  advance(sim,90);
  assert(lair.seen,'scout can discover a fogged lair even when every walkable tile is explored');
  assert(G.availability(w,{type:'bounty',id:'attack',target:lair.id,level:1})==='','discovered edge can be targeted');
}
{
  const sim=quiet('raid-not-a-clue'),w=sim.world,boss=w.lairs.find(l=>l.boss);
  w.explored.fill(0);w.lairs.forEach(l=>{l.seen=false;});
  const raider=G.spawnMonster(w,boss);Object.assign(raider,G.freeNear(w,G.castle(w)));
  G.reveal(w,raider.x,raider.y,1);
  assert(!boss.seen,'a raider at the village cannot reveal its distant source automatically');
}
