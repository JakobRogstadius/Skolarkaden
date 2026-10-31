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
  assert.equal(w.monsters.filter(G.alive).length, 1, 'seeding cannot bypass the replenishment timer');
  const survivor = w.monsters[1]; survivor.hp /= 2;
  const hp = survivor.hp;
  w.time = 29.9; G.updateLairs(w); assert.equal(w.monsters.filter(G.alive).length, 1);
  w.time = 30; G.updateLairs(w);
  assert.equal(w.monsters.filter(G.alive).length, 2, 'dormant garrisons refill at thirty seconds');
  assert.equal(survivor.hp, hp, 'replenishment does not heal surviving guards');
  G.updateLairs(w); assert.equal(w.monsters.filter(G.alive).length, 2, 'one tick cannot replenish twice');
  w.time = 60; G.updateLairs(w); assert.equal(w.monsters.filter(G.alive).length, 2, 'full garrisons cannot exceed their initial size');
  assert(!lair.awake, 'replenishment does not awaken a dormant lair');
  lair.level = 3; G.awakenLair(w, lair);
  const original = w.monsters.filter(m => G.alive(m) && m.guard); original[0].hp = 0;
  w.time = 89.9; G.updateLairs(w); assert.equal(w.monsters.filter(m => G.alive(m) && m.guard).length, 1);
  w.time = 90; G.updateLairs(w);
  const guards = w.monsters.filter(m => G.alive(m) && m.guard);
  assert.equal(guards.length, 2, 'awakened lairs also replenish only their missing guards');
  assert.equal(guards.find(m => !original.includes(m)).strength, G.monsterStrength(lair), 'replacement guards use the current lair level');
  assert.equal(original[1].strength, 1, 'surviving guards are not upgraded during replenishment');
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
  const expected = { gentle: 1, steady: 2, brave: 3 }[pace];
  assert.equal(guards.length, expected);
  assert(guards.every(m => m.type === 'guardian' && m.boss));
  assert.equal(lair.suggestedLevels, G.profiles[pace].bossLevels);
  const warrior = G.addHero(w, 'warrior', { x: lair.x + 2, y: lair.y });
  const damage = G.monsterDamage(w, guards[0]);
  const combinedTime = Math.ceil(warrior.hp / (damage * expected)) * G.monsterTypes.guardian.cooldown;
  assert(combinedTime < 8, 'a level-one fighter cannot safely tank the boss guardians');
  assert(G.heroStats(w, warrior).speed > G.monsterSpeed(guards[0]), 'retreat remains possible');
  Object.assign(warrior, { x: lair.x + 9, y: lair.y });
  for (let i = 0; i < 120; i++) { w.time += .1; G.updateMonsters(w, .1); }
  assert(guards.every(m => G.distance(m, lair) < 5), 'boss guardians cannot be dragged into the village');
  assert.equal(G.bossDemand(w, lair), lair.suggestedLevels, 'boss risk uses the difficulty-specific full garrison');
  guards[0].hp = 0;
  w.time = 29.9; G.updateLairs(w);
  assert.equal(w.monsters.filter(G.alive).length, expected - 1);
  assert(G.bossDemand(w, lair) < lair.suggestedLevels);
  w.time = 30; G.updateLairs(w);
  assert.equal(w.monsters.filter(G.alive).length, expected, 'boss guards also replenish to their original count');
  assert.equal(G.bossDemand(w, lair), lair.suggestedLevels);
}
{
  const { w, lair } = fixture();
  for (let i = 0; i < G.MAX_RAIDERS + 5; i++) G.spawnMonster(w, lair);
  assert.equal(w.monsters.filter(m => !m.guard).length, G.MAX_RAIDERS);
  const child = G.addLair(w, { tx: 30, ty: 18, type: 'spore', tier: 1 }, 300);
  assert.equal(w.monsters.filter(m => m.lair === child.id && m.guard).length, 2, 'raid cap leaves capacity for new guardians');
  assert(w.monsters.length <= G.MAX_MONSTERS);
}
{
  const w = new G.Simulation({ seed: 'full-garrisons', pace: 'brave' }).world;
  for (const [tx, ty] of [[4, 4], [12, 4]]) G.addLair(w, { tx, ty, type: 'spore', tier: 1 }, 300);
  for (let i = 0; i < G.MAX_RAIDERS; i++) G.spawnMonster(w, w.lairs[0]);
  assert.equal(w.monsters.filter(m => m.guard).length, 23, 'hard mode reserves all 23 original and spreading guard slots');
  assert.equal(w.monsters.length, G.MAX_MONSTERS);
  w.monsters.filter(m => m.guard).forEach(m => { m.hp = 0; });
  w.time = 30; G.updateLairs(w);
  assert.equal(w.monsters.filter(m => G.alive(m) && m.guard).length, 23, 'full raider capacity cannot prevent guardian replenishment');
  assert.equal(w.monsters.filter(G.alive).length, G.MAX_MONSTERS);
}
for (const level of [1, 2, 3, 4]) for (const tier of [1, 3]) {
  const { w, lair } = fixture();
  Object.assign(lair, { level, tier });
  w.monsters.forEach(m => { m.hp = 0; });
  G.damage(w, lair, lair.hp);
  const wave = w.monsters.filter(G.alive);
  assert.equal(wave.filter(m => m.type === 'rattler').length, [0, 2, 3, 4, 5][level] + (tier === 3 ? 1 : 0));
  assert.equal(wave.filter(m => m.type === 'mender').length, [0, 0, 0, 1, 2][level]);
  assert.equal(lair.waveCount, 1, 'a lethal hit releases one final wave, without a duplicate awakening wave');
  assert(wave.every(m => !m.guard && m.lair === lair.id));
  G.updateMonsters(w, .1); assert(wave.every(m => m.targetId === G.castle(w).id), 'the final wave raids the village');
  G.damage(w, lair, 1000); w.time = 1000; G.updateLairs(w);
  assert.equal(w.monsters.filter(G.alive).length, wave.length, 'a destroyed lair cannot replenish, grow or release another wave');
}
{
  const { w, lair } = fixture('steady', true), count = w.monsters.length;
  G.damage(w, lair, lair.hp);
  assert.equal(w.outcome, 'won');
  assert.equal(w.monsters.length, count, 'destroying the boss wins without a final or awakening wave');
}
{
  const { w, lair } = fixture(); lair.level = 4; lair.tier = 3;
  const original = [];
  for (let i = 0; i < G.MAX_RAIDERS; i++) original.push(G.spawnMonster(w, lair));
  G.damage(w, lair, lair.hp);
  assert.equal(lair.pendingWave.length, 8, 'a full raider cap defers rather than drops the final wave');
  original.slice(0, 3).forEach(m => { m.hp = 0; }); G.updateLairs(w);
  assert.equal(lair.pendingWave.length, 5);
  assert.equal(w.monsters.filter(m => G.alive(m) && m.wave === 1).length, 3);
  const restored = new G.Simulation({ saved: JSON.parse(JSON.stringify(w)) }).world;
  const deadLair = restored.lairs[0];
  restored.monsters.filter(m => G.alive(m) && !m.guard && !m.wave).slice(0, 5).forEach(m => { m.hp = 0; });
  G.updateLairs(restored);
  const finalWave = restored.monsters.filter(m => G.alive(m) && m.wave === 1);
  assert.equal(finalWave.length, 8, 'the remaining final wave survives a save and completes once slots free up');
  assert.equal(finalWave.filter(m => m.type === 'mender').length, 2);
  assert.equal(deadLair.pendingWave, undefined);
  assert.equal(restored.monsters.filter(m => G.alive(m) && !m.guard).length, G.MAX_RAIDERS);
  G.updateLairs(restored); assert.equal(restored.monsters.filter(m => m.wave === 1).length, 8);
}
{
  const { w, lair } = fixture(); w.time = 25; w.monsters[0].hp = 0;
  const sim = new G.Simulation({ saved: JSON.parse(JSON.stringify(w)) });
  assert.equal(sim.world.lairs[0].nextGuardAt, 30, 'save/resume retains the remaining replenishment interval');
  sim.world.time = 29.9; G.updateLairs(sim.world); assert.equal(sim.world.monsters.filter(G.alive).length, 1);
  sim.world.time = 30; G.updateLairs(sim.world); assert.equal(sim.world.monsters.filter(G.alive).length, 2);
  delete lair.guardCount; delete lair.nextGuardAt;
  const legacy = new G.Simulation({ saved: JSON.parse(JSON.stringify(w)) });
  assert.equal(legacy.world.lairs[0].guardCount, 2, 'existing runs retain their initial garrison size');
  assert.equal(legacy.world.lairs[0].nextGuardAt, 55, 'old saves receive a fresh thirty-second replenishment timer');
}
console.log('encounters: patrols, raid waves, replenishment, boss garrisons, destruction waves, caps and save/resume');
