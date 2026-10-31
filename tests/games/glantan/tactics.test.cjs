'use strict';
const assert = require('node:assert/strict');
const { runtime, advance } = require('./helpers.cjs');
const { G } = runtime();
function arena(type = 'rust') {
  const w = G.createMap('tactics', 'gentle');
  w.terrain.fill(0); w.paths.fill(0); w.explored.fill(1); delete w.lairSites;
  G.addBuilding(w, 'castle', 4, 4); G.addBuilding(w, 'house', 8, 4);
  const lair = G.addLair(w, { tx: 29, ty: 14, type, tier: 1 }, 1e6);
  lair.seen = true; w.monsters = [];
  return { w, lair };
}
function hero(w, role, x = 16, y = 15) {
  const h = G.addHero(w, role); Object.assign(h, { x, y, trait: 2 }); return h;
}
function enemy(w, lair, type = 'rattler', x = 19, y = 15) {
  const m = G.spawnMonster(w, lair, { type }); Object.assign(m, { x, y }); return m;
}
function bones(w, x, y, level) {
  const b = { id: w.nextId++, x, y, level, monsterType: 'rattler', diedAt: w.time }; w.corpses.push(b); return b;
}
{
  const { w, lair } = arena(), necro = hero(w, 'necromancer');
  const monster = enemy(w, lair); monster.rank = 4;
  G.damage(w, monster, 999, necro);
  assert.equal(w.corpses.length, 1); assert.equal(w.corpses[0].level, 4);
  const first = G.raiseSkeleton(w, necro);
  assert(first && first.level === 4 && first.owner === necro.id);
  assert.equal(w.corpses.length, 0, 'raising consumes exactly one corpse');
  bones(w, 18, 15, 2); bones(w, 17, 16, 3);
  assert.equal(G.raiseSkeleton(w, necro), null, 'summoning has a real cooldown');
  w.time += 3; assert(G.raiseSkeleton(w, necro)); w.time += 3;
  assert.equal(G.raiseSkeleton(w, necro), null, 'two living skeletons per master');
  assert.equal(w.corpses.length, 1, 'a full master leaves spare remains intact');
  const other = hero(w, 'necromancer'); assert(G.raiseSkeleton(w, other), 'another master can use the remaining corpse');
  assert.equal(G.ownedSkeletons(w, other).length, 1);
  assert.equal(G.population(w), 2, 'skeletons do not consume housing');
  const kills = w.kills; G.damage(w, first, 999, monster);
  assert.equal(w.corpses.length, 0, 'dead summoned skeletons cannot be raised recursively'); assert.equal(w.kills, kills);
  bones(w, 17, 15, 1); assert(G.raiseSkeleton(w, necro), 'a dead minion frees its slot');
  G.damage(w, necro, 999, monster);
  assert.equal(G.ownedSkeletons(w, necro).length, 0, 'fallen master releases its own summons');
  assert.equal(G.ownedSkeletons(w, other).length, 1, 'another master retains ownership');
}
{
  const { w, lair } = arena(), necro = hero(w, 'necromancer'), other = hero(w, 'necromancer'), friend = hero(w, 'warrior');
  bones(w, 17, 15, 2); const own = G.raiseSkeleton(w, necro);
  bones(w, 17, 15, 1); const unrelated = G.raiseSkeleton(w, other);
  for (const h of [necro, other, friend, own, unrelated]) h.hp = h.maxHp - 25;
  const victim = enemy(w, lair), neighbour = enemy(w, lair, 'sporeling', 19.5, 15), far = enemy(w, lair, 'sporeling', 23, 15);
  const before = [necro.hp, own.hp, other.hp, unrelated.hp, friend.hp];
  G.necromancerStrike(w, necro, victim, 7);
  assert.equal(victim.hp, victim.maxHp - 7); assert.equal(neighbour.hp, neighbour.maxHp - 7 * .65); assert.equal(far.hp, far.maxHp);
  assert(necro.hp > before[0] && own.hp > before[1]);
  assert.deepEqual([other.hp, unrelated.hp, friend.hp], before.slice(2), 'life drain never heals another hero or their minions');
  assert(w.effects.some(e => e.type === 'spell' && e.school === 'drain'));
  const healing = necro.healing; G.necromancerStrike(w, necro, { ...victim, hp: 0, x: 40, y: 40 }, 7);
  assert.equal(necro.healing, healing, 'no healing from damage that was never dealt');
  Object.assign(own, { x: 18.5, y: 15 }); victim.hp = victim.maxHp;
  G.updateSkeletons(w, .1); assert(victim.hp < victim.maxHp, 'raised skeleton fights nearby ground enemies');
  assert.equal(own.level, 2, 'summons keep the source level');
}
for (const [chosen, excluded, guild] of [['banner', 'guardian', 'hall'], ['guardian', 'banner', 'hall'], ['marksman', 'traps', 'lodge'], ['traps', 'marksman', 'lodge']]) {
  const { w } = arena(); G.addBuilding(w, guild, 11, 4); w.research.castle2 = true;
  assert(G.purchase(w, { type: 'research', id: chosen }).ok);
  assert(!G.purchase(w, { type: 'research', id: excluded }).ok, chosen + ' excludes ' + excluded);
}
{
  const { w, lair } = arena(), ranger = hero(w, 'ranger'), warrior = hero(w, 'warrior', 16.5), foe = enemy(w, lair);
  const damage = G.heroStats(w, ranger).damage;
  w.research.banner = true; assert.equal(G.heroStats(w, ranger).damage, damage * 1.25);
  hero(w, 'warrior', 17); assert.equal(G.heroStats(w, ranger).damage, damage * 1.25, 'offensive auras never stack');
  warrior.hp = 0; w.heroes.at(-1).x = 30;
  assert.equal(G.heroStats(w, ranger).damage, damage, 'attack aura requires a living nearby warrior');
  delete w.research.banner; w.research.guardian = true; warrior.hp = warrior.maxHp;
  const hp = ranger.hp; G.damage(w, ranger, 10, foe); assert.equal(ranger.hp, hp - 7.8);
  delete w.research.guardian; w.research.marksman = true; assert.equal(G.heroStats(w, ranger).damage, damage * 1.4);
}
{
  const { w, lair } = arena(), ranger = hero(w, 'ranger', 16, 10); ranger.level = 3; w.research.traps = true;
  const sites = G.trapSites(w, lair); assert(sites.length > 3);
  assert(sites.every(s => s.progress >= .3 && s.progress <= .7 && G.open(w, s.x, s.y)));
  for (let i = 0; i < 1500; i++) { w.time += .1; G.rangerTrapWork(w, ranger, 2, .1); }
  assert.equal(w.traps.length, 4, 'ranger walks out and lays exactly four traps');
  assert(w.traps.every(t => t.owner === ranger.id && t.lair === lair.id && t.level === ranger.level && t.progress >= .3 && t.progress <= .7));
  const trap = w.traps[0], flying = enemy(w, lair, 'nightwing', trap.x, trap.y);
  G.updateTraps(w); assert.equal(w.traps.length, 4); assert.equal(flying.hp, flying.maxHp, 'fliers do not trigger ground traps');
  const caught = enemy(w, lair, 'rattler', trap.x, trap.y), second = enemy(w, lair, 'rattler', trap.x, trap.y);
  caught.hp = caught.maxHp = 200;
  G.updateTraps(w); assert.equal(w.traps.length, 3); assert.equal(caught.hp, 200 - G.trapDamage(3)); assert.equal(second.hp, second.maxHp, 'one trap catches only one monster');
  assert(caught.rootedUntil > w.time); const x = caught.x;
  G.moveMonster(w, caught, { x: x + 5, y: caught.y }, 2, 1); assert.equal(caught.x, x);
  w.time += 3; G.moveMonster(w, caught, { x: x + 5, y: caught.y }, 2, .5); assert(caught.x > x, 'immobilization expires');
  w.monsters = []; lair.hp = 0; w.navRevision++;
  const start = { x: ranger.x, y: ranger.y };
  for (let i = 0; i < 600 && w.traps.length; i++) { w.time += .1; G.rangerTrapWork(w, ranger, 2, .1); }
  assert.equal(w.traps.length, 0, 'obsolete traps are physically retrieved after the lair is destroyed');
  assert(G.distance(start, ranger) > .5);
}
{
  const { w, lair } = arena('sky'), warrior = hero(w, 'warrior'), ranger = hero(w, 'ranger');
  const flyer = enemy(w, lair, 'nightwing', 17, 15), hp = flyer.hp;
  assert.equal(G.damage(w, flyer, 20, warrior), 0); assert.equal(flyer.hp, hp);
  assert.equal(G.damage(w, flyer, 10, ranger), 10);
  const skeleton = { skeleton: true }; assert(!G.canHit(skeleton, flyer));
  for (let y = 10; y <= 20; y++) w.terrain[G.index(w, 18, y)] = 2;
  w.navRevision++;
  for (let i = 0; i < 20; i++) G.moveMonster(w, flyer, { x: 20, y: 15 }, 2, .1);
  assert(flyer.x > 19, 'flight crosses terrain that blocks the ground army');
  const tower = G.addBuilding(w, 'tower', 19, 16); G.castle(w).shotAt = 1e6;
  G.updateBuildings(w, .1); assert(flyer.hp < hp - 10, 'defensive towers can shoot flying targets');
  assert(G.canHit(tower, flyer));
}
for (const type of Object.keys(G.lairTypes)) {
  const { w, lair } = arena(type); G.awakenLair(w, lair);
  assert(w.monsters.every(m => m.type === G.lairTypes[type].monster));
  w.time = lair.nextGrowth; G.updateLairs(w);
  const wave = w.monsters.filter(m => m.wave === lair.waveCount);
  assert(wave.some(m => m.type === G.lairTypes[type].monster));
  assert(wave.some(m => m.type === G.lairTypes[type].support), type + ' adds its complementary support at the first upgrade');
}
{
  const { w, lair } = arena(), patient = enemy(w, lair), medic = enemy(w, lair, 'mender', 20, 15);
  patient.hp -= 20; G.updateMonsters(w, .1); assert(patient.hp > patient.maxHp - 20, 'enemy healers sustain the melee wave');
  const victim = hero(w, 'warrior', 16.5, 15), binder = enemy(w, lair, 'binder', 18, 15);
  G.updateMonsters(w, .1); assert(victim.rootedUntil > w.time, 'binding spells pin a target temporarily');
  assert(w.effects.some(e => e.type === 'spell' && e.school === 'enemy'));
  const rootedUntil = victim.rootedUntil;
  enemy(w, lair, 'binder', 18, 16); w.time += 1; G.updateMonsters(w, .1);
  assert.equal(victim.rootedUntil, rootedUntil, 'several binders cannot extend a root into a permanent lock');
  const siege = enemy(w, lair, 'siegebreaker', 17, 15); G.updateMonsters(w, .1);
  assert(w.buildings.some(b => b.id === siege.targetId), 'siege monster ignores a closer hero to attack a building');
  const giant = enemy(w, lair, 'broodcap', 17, 15);
  for (let i = 0; i < 6; i++) { w.time += 10; G.updateMonsters(w, .1); victim.hp = victim.maxHp; }
  assert.equal(w.monsters.filter(m => G.alive(m) && m.broodParent === giant.id).length, 3, 'brood growth is useful but bounded');
  const shield = enemy(w, lair, 'bulwark', 20, 15); patient.x = 20.5; patient.hp = 100;
  G.damage(w, patient, 20, victim); assert.equal(patient.hp, 85, 'armoured escort protects nearby allies');
  shield.hp = 0; G.damage(w, patient, 20, victim); assert.equal(patient.hp, 65, 'killing the escort removes its protection');
}
{
  const { w, lair } = arena(), boss = G.addLair(w, { tx: 39, ty: 20, type: 'hush', tier: 3, boss: true, suggestedLevels: 10 }, 1e6);
  const sim = new G.Simulation({ saved: w });
  G.damage(w, lair, 9999); assert(!w.outcome, 'an ordinary lair is not the victory objective');
  G.addLair(w, { tx: 45, ty: 25, type: 'sky', tier: 2 }, 1e6);
  G.damage(w, boss, 9999); assert.equal(w.outcome, 'won', 'boss destruction wins immediately');
  assert(w.monsters.some(G.alive) && w.lairs.some(G.alive), 'remaining guards and other lairs do not block victory');
  const before = JSON.stringify(w); advance(sim, 5); assert.equal(JSON.stringify(w), before, 'no combat or time advances after victory');
}
{
  const { w } = arena(); w.research.breaker = w.research.pathfinder = true; w.choices.warrior = 'breaker'; w.choices.ranger = 'pathfinder';
  delete w.skeletons; delete w.corpses; delete w.traps;
  const sim = new G.Simulation({ saved: w });
  assert(w.research.banner && w.research.traps && !w.research.breaker && !w.research.pathfinder);
  assert.equal(w.choices.warrior, 'banner'); assert.equal(w.choices.ranger, 'traps');
  const necro = hero(w, 'necromancer'); bones(w, 17, 15, 3); G.raiseSkeleton(w, necro);
  w.traps.push({ id: w.nextId++, owner: necro.id, lair: w.lairs[0].id, x: 20, y: 15, level: 1 });
  const restored = new G.Simulation({ saved: sim.snapshot() });
  assert.equal(JSON.stringify(restored.world), JSON.stringify(w), 'ownership, remaining traps and corpse state round-trip');
}
{
  const { w, lair } = arena();
  for (let i = 0; i < G.MAX_CORPSES + 10; i++) G.damage(w, enemy(w, lair), 1000);
  assert.equal(w.corpses.length, G.MAX_CORPSES, 'long campaigns keep a bounded, useful supply of remains');
}
console.log('tactics: necromancy, exclusive branches, auras, traps, flight, mixed waves, support roles, boss victory and save migration');
