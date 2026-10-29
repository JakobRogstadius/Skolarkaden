'use strict';
const assert = require('node:assert/strict');
const { runtime } = require('./helpers.cjs');
const { G } = runtime();
const world = () => new G.Simulation({ seed: 'purchase-rules' }).world;
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
  assert(!G.purchase(w, { type: 'research', id: 'breaker' }).ok, 'permanent mutually exclusive class choice');
  assert(!G.purchase(w, { type: 'research', id: 'guardian' }).ok, 'no duplicate research');
  const hall = w.buildings.find(b => b.type === 'hall'); hall.hp = 0;
  G.addBuilding(w, 'hall', hall.tx, hall.ty);
  assert(!G.purchase(w, { type: 'research', id: 'breaker' }).ok, 'rebuilding does not reset specialisation');
}
{
  const w = world();
  assert(G.placementReason(w, 'house', 17, 12));
  assert(G.placementReason(w, 'house', 0, 0));
  w.research.castle2 = true; w.explored.fill(1);
  let chosen;
  for (let y = 1; y < 26 && !chosen; y++) for (let x = 1; x < 34 && !chosen; x++) {
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
