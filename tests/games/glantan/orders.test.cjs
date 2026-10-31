'use strict';
const assert = require('node:assert/strict');
const { runtime } = require('./helpers.cjs');
const { G } = runtime();
const world = () => {
  const w = new G.Simulation({ seed: 'purchase-rules' }).world;
  G.addBuilding(w, 'hall', w.home.tx - 4, w.home.ty + 3);
  G.addBuilding(w, 'lodge', w.home.tx + 4, w.home.ty - 3);
  for (const role of ['warrior', 'ranger', 'healer']) G.addHero(w, role);
  return w;
};
{
  const w = new G.Simulation({ seed: 'new-opening' }).world;
  assert.deepEqual(Array.from(w.buildings, b => b.type).sort(), ['castle', 'house']);
  assert.equal(w.heroes.length, 0, 'a kingdom starts without heroes');
  assert.equal(G.capacity(w), 4);
  assert.match(G.availability(w, {type:'recruit', id:'warrior'}), /Väktarhus|väktarhus/);
}
{
  const w = world();
  assert.equal(G.capacity(w), 4);
  assert(G.purchase(w, { type: 'recruit', id: 'warrior' }).ok);
  assert.equal(G.population(w), 4);
  assert.match(G.availability(w, { type: 'recruit', id: 'ranger' }), /bostäder/);
  const veteran = w.heroes[0]; veteran.level = 4; veteran.xp = 17; veteran.hp = 0;
  assert(G.purchase(w, { type: 'recruit', id: 'warrior' }).ok);
  assert(!G.purchase(w, { type: 'resurrect', target: veteran.id }).ok, 'resurrection respects population');
  w.heroes.at(-1).hp = 0;
  assert(G.purchase(w, { type: 'resurrect', target: veteran.id }).ok);
  assert.equal(veteran.level, 4); assert.equal(veteran.xp, 17);
  w.buildings.find(b => b.type === 'house').hp = 0;
  assert.equal(G.capacity(w), 0); assert.equal(G.population(w), 4, 'housing loss never deletes heroes');
  assert(!G.purchase(w, { type: 'recruit', id: 'warrior' }).ok);
}
{
  const w = world();
  assert(!G.purchase(w, { type: 'research', id: 'guardian' }).ok);
  assert(G.purchase(w, { type: 'research', id: 'castle2' }).ok);
  assert(G.purchase(w, { type: 'research', id: 'guardian' }).ok);
  assert(!G.purchase(w, { type: 'research', id: 'banner' }).ok, 'permanent mutually exclusive class choice');
  assert(!G.purchase(w, { type: 'research', id: 'guardian' }).ok, 'no duplicate research');
  const hall = w.buildings.find(b => b.type === 'hall'); hall.hp = 0;
  G.addBuilding(w, 'hall', hall.tx, hall.ty);
  assert(!G.purchase(w, { type: 'research', id: 'banner' }).ok, 'rebuilding does not reset specialisation');
}
{
  const w = world();
  assert(G.placementReason(w, 'house', w.home.tx, w.home.ty));
  assert(G.placementReason(w, 'house', 0, 0));
  w.research.castle2 = true; w.explored.fill(1);
  let chosen;
  for (let y = 1; y < w.height - 1 && !chosen; y++) for (let x = 1; x < w.width - 1 && !chosen; x++) {
    const action = { type: 'build', id: 'beacon', x, y };
    if (!G.availability(w, action)) chosen = action;
  }
  assert(chosen); const result = G.purchase(w, chosen); assert(result.ok);
  result.entity.hp = 0;
  assert(!G.purchase(w, chosen).ok, 'eight-answer landmark cannot be bought indefinitely');
  assert.match(G.availability(w, { type: 'build', id: 'conservatory' }, { placement: false }), /vägval/);
  for (let i = 0; i < 10; i++) G.addBuilding(w, 'house', 2, 2);
  assert.equal(G.capacity(w), G.POPULATION_LIMIT, 'hard ceiling independent of housing count');
}
console.log('orders: population, resurrection, permanent research, placement and unique investments');
{
  const w = world(); w.explored.fill(1); const target = w.lairs[0].id;
  for (let level = 1; level <= 3; level++) {
    const action = { type: 'bounty', id: 'attack', target, level };
    assert.equal(G.actionCost(w, action), 1, 'bounty upgrades charge only the increase');
    assert(G.purchase(w, action).ok);
  }
  assert.equal(w.bounties.length, 1); assert.equal(w.bounties[0].level, 3);
}
{
  const w = G.createMap('bridge-building', 'gentle');
  w.explored.fill(1); w.lairSites = [];
  w.terrain = w.terrain.map((_, i) => G.inside(w, i % w.width, Math.floor(i / w.width)) ? 0 : 3);
  for (let y = 1; y < w.height - 1; y++) if (y !== 10) w.terrain[y * w.width + 20] = 2;
  w.navRevision++;
  assert.match(G.placementReason(w, 'tower', 20, 10), /passage/, 'a tower cannot seal the only crossing');
  assert.equal(G.placementReason(w, 'house', 17, 10), '', 'building beside a crossing still works');
  // Opening another passage changes the navigation revision and invalidates
  // the prior plot decision rather than keeping a stale forbidden placement.
  w.terrain[20 * w.width + 20] = 0; w.navRevision++;
  assert.equal(G.placementReason(w, 'tower', 20, 10), '', 'one crossing may close if another connects both regions');
  assert(G.purchase(w, { type: 'build', id: 'tower', x: 20, y: 10 }).ok);
  assert.match(G.placementReason(w, 'tower', 20, 20), /passage/, 'a second build cannot close the last remaining crossing');
}
{
  const w = world(); w.explored.fill(0);
  const blocked = w.terrain.findIndex((tile, i) => tile >= 2 && G.inside(w, i % w.width, Math.floor(i / w.width)));
  const original = { type: 'bounty', id: 'explore', x: blocked % w.width + 0.5, y: Math.floor(blocked / w.width) + 0.5, level: 1 };
  assert.match(G.availability(w, original), /fri plats/, 'un-normalized blocked goals are rejected');
  const action = G.normalizeAction(w, original);
  assert(G.open(w, action.x, action.y), 'a fogged lake/forest click becomes a reachable shore/clearing goal');
  assert.equal(G.availability(w, action), '');
  assert(G.purchase(w, action).ok);
  assert.equal(w.bounties[0].x, action.x); assert.equal(w.bounties[0].y, action.y);
  const lair = w.lairs.at(-1);
  w.explored[G.index(w, lair.tx, lair.ty)] = 1;
  G.reveal(w, lair.tx + 0.5, lair.ty + 0.5, 0.1);
  assert(lair.seen && !w.explored[G.index(w, lair.x, lair.y)], 'a partly revealed landmark can be recognized');
  assert.equal(G.availability(w, { type: 'bounty', id: 'attack', target: lair.id, level: 1 }), '', 'recognized lairs can receive bounties before their center tile is explored');
}
