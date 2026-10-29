'use strict';
const assert = require('node:assert/strict');
const { runtime, advance } = require('./helpers.cjs');
const { G } = runtime();
const make = seed => new G.Simulation({ seed, pace: 'gentle' });

{
  const sim = make('guards'), w = sim.world, lair = w.lairs.find(l => l.tier === 3);
  assert.equal(w.lairs.filter(l => l.awake).length, 0);
  const threat = G.threat(w, lair);
  G.damage(w, lair, 1, w.heroes[0]);
  assert(lair.awake && lair.defendersRaised, 'an attacked dormant nest wakes immediately');
  assert.equal(w.monsters.filter(m => m.guard).length, 5, 'outer nests have a substantial mixed garrison');
  assert(w.monsters.some(m => m.type === 'husher'));
  assert(G.threat(w, lair) > threat * .9, 'projected risk includes the defenders before they appear');
  const count = w.monsters.length; G.damage(w, lair, 1, w.heroes[0]);
  assert.equal(w.monsters.length, count, 'garrison is raised only once');
  const hp = lair.hp; advance(sim, 25); assert(lair.hp >= hp, 'unopposed nests recover after a failed raid');
}
{
  const sim = make('shared-alarm'), w = sim.world, castle = G.castle(w), hero = w.heroes[0];
  w.heroes.slice(1).forEach(h => { h.hp = 0; });
  Object.assign(hero, { x: castle.x - 3.5, y: castle.y }); castle.shotAt = 9999;
  const enemy = G.spawnMonster(w, w.lairs[0], { type: 'husher' });
  Object.assign(enemy, { x: castle.x + 3.5, y: castle.y, targetId: castle.id, raidAt: 0 });
  assert(G.distance(hero, enemy) > 5, 'attacker starts outside the old personal detection radius');
  advance(sim, 9);
  assert(enemy.hp < enemy.maxHp, 'village defender crosses the castle to intercept the attacker');
}
{
  const sim = make('reinforcements'), w = sim.world; w.explored.fill(1);
  const bounty = G.purchase(w, { type: 'bounty', id: 'attack', target: w.lairs[0].id, level: 1 }).entity;
  advance(sim, 8); const group = w.expeditions.find(e => e.bounty === bounty.id);
  assert.equal(group.state, 'march'); const before = group.members.length;
  G.addBuilding(w, 'house', 12, 10);
  for (const role of ['warrior', 'ranger', 'warrior', 'healer']) G.addHero(w, role);
  assert(G.purchase(w, { type: 'bounty', id: 'attack', target: w.lairs[0].id, level: 3 }).ok);
  G.planExpeditions(w);
  assert(group.members.length > before, 'a paid upgrade recruits reinforcements during the march');
  assert.equal(new Set(group.members).size, group.members.length);
}
for (const assignment of ['defend', 'gather']) {
  const sim = make('shared-alarm'), w = sim.world, castle = G.castle(w), hero = w.heroes[0];
  w.heroes.slice(1).forEach(h => { h.hp = 0; });
  w.lairs.forEach(l => { l.wakeAt = 1e6; }); castle.shotAt = 9999;
  Object.assign(hero, { x: castle.x - 3.5, y: castle.y });
  w.explored.fill(1);
  const action = assignment === 'defend'
    ? { type: 'bounty', id: 'defend', x: hero.x, y: hero.y, level: 1 }
    : { type: 'bounty', id: 'attack', target: w.lairs.find(l => l.tier === 3).id, level: 1 };
  const bounty = G.purchase(w, action).entity; assert(bounty);
  G.planExpeditions(w);
  const group = w.expeditions.find(e => e.bounty === bounty.id);
  if (assignment === 'defend') group.state = 'march';
  const enemy = G.spawnMonster(w, w.lairs[0], { type: 'husher' });
  Object.assign(enemy, { x: castle.x + 2, y: castle.y, targetId: castle.id, raidAt: 0 });
  assert(G.distance(hero, enemy) > 5);
  advance(sim, 9);
  assert.equal(enemy.hp, 0, assignment + ' heroes answer the nearby castle alarm');
  assert.equal(hero.expedition, group.id, 'intercepting does not discard a paid assignment');
}
{
  const sim = make('aftermath'), w = sim.world, hero = w.heroes[0]; w.explored.fill(1);
  w.heroes.slice(1).forEach(h => { h.hp = 0; });
  w.lairs.forEach(l => { l.wakeAt = l.nextSpawn = l.nextGrowth = 1e6; });
  const lair = w.lairs.find(l => G.distance(l, G.castle(w)) > 12);
  Object.assign(hero, G.freeNear(w, lair), { trait: 0 }); lair.defendersRaised = true;
  const enemy = G.spawnMonster(w, lair, { type: 'husher', guard: true });
  Object.assign(enemy, { x: hero.x + .5, y: hero.y, targetId: hero.id, raidAt: 0 });
  assert(G.purchase(w, { type: 'bounty', id: 'attack', target: lair.id, level: 3 }).ok);
  G.planExpeditions(w); G.damage(w, lair, lair.hp, hero);
  advance(sim, .5); const hp = enemy.hp;
  advance(sim, 3.5);
  assert.equal(hero.expedition, null, 'destroyed lair releases its expedition');
  assert(enemy.hp < hp - 20, 'released hero keeps defending itself from surviving guards');
}
{
  const sim = make('support'), w = sim.world, healer = w.heroes.find(h => h.classId === 'healer'), friend = w.heroes[0];
  Object.assign(healer, { x: friend.x, y: friend.y }); friend.hp /= 2;
  const before = friend.hp; advance(sim, .5);
  assert(friend.hp > before && healer.healing > 0 && healer.totalXp > 0, 'healing contributes experience');
  const veteran = friend; veteran.level = 5; veteran.totalXp = 0;
  const weak = G.spawnMonster(w, w.lairs[0]); Object.assign(weak, { x: veteran.x, y: veteran.y });
  G.damage(w, weak, 10000, veteran); assert.equal(veteran.totalXp, 0, 'outlevelled enemies cannot be farmed indefinitely');
}
{
  const sim = make('finite-spores'), w = sim.world;
  for (const lair of w.lairs) { lair.type = 'spore'; lair.awake = true; lair.nextGrowth = 0; }
  for (let n = 0; n < 60; n++) { w.time += 300; G.updateLairs(w); }
  assert(w.lairs.length <= G.profiles[w.pace].lairs + 2);
  assert(w.monsters.length <= G.MAX_MONSTERS);
  assert(w.lairs.some(l => l.level > 1), 'growth continues after the finite spread budget is exhausted');
  const lair = w.lairs[0]; lair.hp = 0; const level = lair.level;
  w.time += 1000; G.updateLairs(w); assert.equal(lair.level, level, 'destroyed nests never return');
}
{
  const sim = make('last-monster'), w = sim.world;
  w.lairs.forEach(l => { l.hp = 0; });
  const last = G.spawnMonster(w, w.lairs[0]);
  Object.assign(last, { x: 3.5, y: 12.5, raidAt: 9999 });
  advance(sim, 120);
  assert.equal(w.outcome, 'won', 'heroes automatically find and finish the final survivor');
  const endedAt = w.time; advance(sim, 5); assert.equal(w.time, endedAt);
  const lost = make('castle-loss'); G.castle(lost.world).hp = 0; advance(lost, .2);
  assert.equal(lost.world.outcome, 'lost', 'castle destruction ends the run');
}
console.log('simulation: defended lairs, shared alarms, reinforcements, support XP, bounded escalation and terminal cleanup');
