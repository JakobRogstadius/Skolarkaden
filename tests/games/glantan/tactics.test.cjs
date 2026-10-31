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
// Exercise the real attack paths, including strikes against buildings. A cue
// must begin on a hit, retain its aim and not restart during the cooldown.
for (const role of Object.keys(G.classes)) {
  const { w, lair } = arena(), h = hero(w, role, 9, 9), m = enemy(w, lair, 'rattler', 10, 9);
  w.time = 10; w.tick = 3; m.targetId = h.id;
  assert.equal(h.actionCue, undefined, role + ' starts idle');
  G.updateHeroes(w, .1);
  assert(m.hp < m.maxHp, role + ' really attacked');
  assert.equal(h.actionCue?.kind, 'attack', role + ' exposes its attack');
  assert.equal(h.actionCue.at, 10); assert(h.actionCue.dx > .9);
  w.time += .1; G.updateHeroes(w, .1);
  assert.equal(h.actionCue.at, 10, role + ' does not restart the cue on cooldown');
}
for (const type of Object.keys(G.monsterTypes)) {
  const { w, lair } = arena(), m = enemy(w, lair, type, 6.6, 5), castle = G.castle(w);
  w.time = 10; G.updateMonsters(w, .1);
  assert(castle.hp < castle.maxHp, type + ' really attacked the castle');
  assert.equal(m.actionCue?.kind, 'attack', type + ' exposes its attack');
  assert.equal(m.actionCue.at, 10); assert(m.actionCue.dx < -.9);
  w.time += .1; G.updateMonsters(w, .1);
  assert.equal(m.actionCue.at, 10, type + ' does not restart the cue on cooldown');
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
  w.time += 3;
  assert.equal(G.raiseSkeleton(w, necro), null, 'one living skeleton per master');
  assert.equal(w.corpses.length, 2, 'a full master leaves spare remains intact');
  const other = hero(w, 'necromancer'); assert(G.raiseSkeleton(w, other), 'another master can use the remaining corpse');
  assert.equal(G.ownedSkeletons(w, other).length, 1);
  assert.equal(G.population(w), 2, 'skeletons do not consume housing');
  const kills = w.kills; G.damage(w, first, 999, monster);
  assert.equal(w.corpses.length, 1, 'dead summoned skeletons cannot be raised recursively'); assert.equal(w.kills, kills);
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
  assert.equal(own.actionCue?.kind, 'attack', 'friendly skeleton exposes its real attack');
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
for (const type of Object.keys(G.lairTypes)) for (const tier of [1, 2, 3]) {
  const { w, lair } = arena(type); lair.tier = tier; G.awakenLair(w, lair);
  for (const [level, basic, advanced] of [[1, 2, 0], [2, 3, 0], [3, 4, 1], [4, 5, 2]]) {
    if (level > 1) { w.time = lair.nextGrowth; G.updateLairs(w); }
    assert.equal(lair.level, level);
    const wave = w.monsters.filter(m => m.lair === lair.id && !m.guard && m.wave === lair.waveCount);
    assert.equal(wave.filter(m => m.type === G.lairTypes[type].monster).length, basic + (tier === 3 ? 1 : 0), type + ' basic wave at level ' + level);
    assert.equal(wave.filter(m => m.type === G.lairTypes[type].support).length, advanced, type + ' advanced wave at level ' + level);
    assert(wave.every(m => m.strength === G.monsterStrength(lair)), 'wave members use the current lair strength');
  }
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
{
  const { w, lair } = arena(), healer = hero(w, 'healer'), foe = enemy(w, lair, 'rattler', 18, 15);
  w.time = 1; foe.targetId = healer.id; healer.hurtAt = w.time;
  G.updateHeroes(w, .1); assert(foe.hp < foe.maxHp);
  healer.hp -= 30; const hp = healer.hp, enemyHp = foe.hp;
  G.updateHeroes(w, .1);
  assert.equal(healer.hp, hp, 'attacking delays healing');
  for (let i = 0; i < 17; i++) { w.time += .1; G.updateHeroes(w, .1); }
  assert(healer.hp > hp, 'healing becomes available on the shared cooldown');
  assert.equal(foe.hp, enemyHp, 'healing occupies the next cast');
  healer.hp = healer.maxHp;
  for (let i = 0; i < 19; i++) { w.time += .1; G.updateHeroes(w, .1); }
  assert.equal(foe.hp, enemyHp, 'healing also delays attacks');
}
for (const type of ['sporeling', 'rattler']) {
  const { w, lair } = arena(), healer = hero(w, 'healer', 24, 16);
  lair.nextGuardAt = 1e6;
  // No castle arrows, clinic or friends; the weakest trio on the easiest setting.
  const foes = Array.from({ length: 3 }, (_, i) => { const m = enemy(w, lair, type, 25 + i * .5, 16); m.targetId = healer.id; return m; });
  const sim = new G.Simulation({ saved: w }); let escaped = false;
  for (let i = 0; i < 1200 && G.alive(healer) && foes.some(G.alive); i++) {
    sim.step(.1); if (healer.retreating) { escaped = true; break; }
  }
  assert(foes.filter(G.alive).length >= 2, 'a level-one healer cannot solo three basic monsters on easy');
  if (type === 'rattler') assert(escaped || !G.alive(healer), 'the normal melee trio forces retreat');
}
{
  const { w } = arena(); bones(w, 16, 15, 1); w.time = 44.8;
  const sim = new G.Simulation({ saved: w }); sim.step(.1); assert.equal(w.corpses.length, 1);
  sim.step(.11); assert.equal(w.corpses.length, 0, 'remains expire at 45 seconds of game time');
  const old = bones(w, 16, 15, 2); old.diedAt = w.time - 45;
  assert.equal(G.raiseSkeleton(w, hero(w, 'necromancer')), null, 'expired remains cannot be raised even before cleanup');
}
{
  const { w, lair } = arena('hush'), master = enemy(w, lair, 'binder', 18, 15);
  for (let i = 0; i < 6; i++) bones(w, 18, 16, i + 1);
  const first = G.raiseEnemySkeleton(w, master); assert(first && first.raisedBy === master.id && first.rank === 1);
  assert.equal(G.raiseEnemySkeleton(w, master), null, 'enemy raising has a cooldown');
  for (let i = 0; i < 3; i++) { w.time += 4; assert(G.raiseEnemySkeleton(w, master)); }
  w.time += 4; assert.equal(G.raiseEnemySkeleton(w, master), null);
  assert.equal(G.enemySkeletons(w, master).length, 4); assert.equal(w.corpses.length, 2);
  const before = w.corpses.length; G.damage(w, first, 999);
  assert.equal(w.corpses.length, before, 'enemy skeletons cannot supply new corpses');
  assert(G.raiseEnemySkeleton(w, master), 'a slain enemy minion frees its owner slot');
  const ally = hero(w, 'necromancer', 18, 16); assert(G.raiseSkeleton(w, ally)); assert.equal(w.corpses.length, 0, 'both sides compete for the same remains');
  const victim = hero(w, 'warrior', 18, 15), minion = G.enemySkeletons(w, master)[0];
  Object.assign(minion, { x: 18.5, y: 15 }); master.stunnedUntil = w.time + 10;
  const hp = victim.hp; G.updateMonsters(w, .1); assert(victim.hp < hp, 'enemy skeletons attack heroes');
  const saved = new G.Simulation({ saved: JSON.parse(JSON.stringify(w)) });
  assert.equal(G.enemySkeletons(saved.world, master).length, 4, 'enemy ownership survives saving');
  G.damage(w, master, 999); assert.equal(G.enemySkeletons(w, master).length, 0, 'killing the caster releases its skeletons');
  assert.equal(G.ownedSkeletons(w, ally).length, 1, 'friendly skeleton remains alive');
}
{
  const { w } = arena(), necro = hero(w, 'necromancer'), healer = hero(w, 'healer');
  bones(w, 17, 15, 2); const first = G.raiseSkeleton(w, necro);
  w.skeletons.push({ ...first, id: w.nextId++, level: 4 }); healer.healCooldown = 1.8; healer.cooldown = .5;
  const old = bones(w, 16, 15, 1); old.diedAt = -50;
  new G.Simulation({ saved: w });
  assert.equal(G.ownedSkeletons(w, necro).length, 1); assert.equal(G.ownedSkeletons(w, necro)[0].level, 4);
  assert.equal(healer.cooldown, 1.8); assert(!('healCooldown' in healer)); assert.equal(w.corpses.length, 0);
}
console.log('tactics: summon limits, corpse expiry, shared healer cooldown, mixed waves, roles and save migration');
