'use strict';
const assert = require('node:assert/strict');
const { runtime } = require('./helpers.cjs');
const { G } = runtime();
function fixture(pace = 'gentle', boss = false) {
  const w = G.createMap('encounter-fixture', pace);
  w.terrain.fill(0); w.paths.fill(0); w.explored.fill(1); delete w.lairSites;
  G.addBuilding(w, 'castle', 4, 4); G.addBuilding(w, 'house', 7, 7);
  const lair = G.addLair(w, { tx: 20, ty: 14, type: boss ? 'hush' : 'rust', tier: boss ? 3 : 1, boss, suggestedLevels: G.profiles[pace].bossLevels }, 120);
  return { w, lair };
}
{
  const { w, lair } = fixture();
  assert.equal(w.monsters.length, 2, 'each lair is born with two visible guardians');
  assert(w.monsters.every(m => m.guard && m.lair === lair.id));
  const start = w.monsters.map(m => ({ x: m.x, y: m.y }));
  for (let i = 0; i < 180; i++) { w.time += .1; G.updateMonsters(w, .1); }
  assert(w.monsters.every((m, i) => G.distance(m, start[i]) > .7), 'dormant guardians patrol rather than stand still');
  assert(w.monsters.every(m => G.distance(m, lair) < 5), 'guardians remain close to their nest');
  assert.equal(G.castle(w).hp, G.castle(w).maxHp, 'dormant guardians do not raid the castle');
  G.seedLairGuards(w, lair); assert.equal(w.monsters.length, 2, 'initial garrison cannot be duplicated');
  w.monsters[0].hp = 0; G.seedLairGuards(w, lair);
  assert.equal(w.monsters.filter(G.alive).length, 1, 'killed guardians are not regenerated');
}
{
  const { w, lair } = fixture();
  w.time = 119.9; G.updateLairs(w);
  assert.equal(w.monsters.filter(m => !m.guard).length, 0, 'no village raid before awakening');
  w.time = 120; G.updateLairs(w);
  const raid = w.monsters.filter(m => !m.guard);
  assert(lair.awake); assert.equal(raid.length, 2, 'awakening releases a real multi-monster wave');
  assert(raid.every(m => m.wave === 1 && m.raidAt === 120));
  G.updateMonsters(w, .1);
  assert(raid.every(m => m.targetId === G.castle(w).id), 'raiders share the village objective');
  const next = lair.nextSpawn; w.time = next; G.updateLairs(w);
  assert.equal(w.monsters.filter(m => !m.guard && m.wave === 2).length, 2);
  assert.equal(w.monsters.filter(m => m.guard).length, 2, 'awakening and later waves do not duplicate guardians');
}
{
  const { w, lair } = fixture();
  G.damage(w, lair, 1);
  assert(lair.awake && lair.defendersRaised);
  assert.equal(w.monsters.filter(m => m.guard).length, 2);
  const count = w.monsters.length; G.damage(w, lair, 1); assert.equal(w.monsters.length, count);
  const child = G.addLair(w, { tx: 30, ty: 18, type: 'spore', tier: 1, spread: true }, 200);
  assert.equal(w.monsters.filter(m => m.lair === child.id && m.guard).length, 2, 'spread lairs also have two initial guards');
}
for (const pace of ['gentle', 'steady', 'brave']) {
  const { w, lair } = fixture(pace, true), guards = w.monsters;
  assert.equal(guards.length, 2);
  assert(guards.every(m => m.type === 'guardian' && m.boss));
  assert.equal(lair.suggestedLevels, G.profiles[pace].bossLevels);
  const warrior = G.addHero(w, 'warrior', { x: lair.x + 2, y: lair.y });
  const damage = G.monsterDamage(w, guards[0]);
  const combinedTime = Math.ceil(warrior.hp / (damage * 2)) * G.monsterTypes.guardian.cooldown;
  assert(combinedTime < 6.5, 'a level-one fighter cannot safely tank the boss guardians');
  assert(G.heroStats(w, warrior).speed > G.monsterSpeed(guards[0]), 'retreat remains possible');
  Object.assign(warrior, { x: lair.x + 9, y: lair.y });
  for (let i = 0; i < 120; i++) { w.time += .1; G.updateMonsters(w, .1); }
  assert(guards.every(m => G.distance(m, lair) < 5), 'boss guardians cannot be dragged into the village');
}
{
  const { w, lair } = fixture();
  for (let i = 0; i < G.MAX_RAIDERS + 5; i++) G.spawnMonster(w, lair);
  assert.equal(w.monsters.filter(m => !m.guard).length, G.MAX_RAIDERS);
  const child = G.addLair(w, { tx: 30, ty: 18, type: 'spore', tier: 1 }, 300);
  assert.equal(w.monsters.filter(m => m.lair === child.id && m.guard).length, 2, 'raid cap leaves capacity for new guardians');
  assert(w.monsters.length <= G.MAX_MONSTERS);
}
console.log('encounters: initial patrols, distinct raid waves, finite garrisons, boss danger and leashes');
