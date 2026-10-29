'use strict';
const assert = require('node:assert/strict');
const { runtime } = require('./helpers.cjs');
const { G } = runtime();
for (const pace of ['gentle', 'steady', 'brave']) for (let seed = 0; seed < 30; seed++) {
  const a = new G.Simulation({ seed, pace }).world, b = new G.Simulation({ seed, pace }).world;
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'same seed produces the same starting world');
  const entrance = G.freeNear(a, G.castle(a));
  for (const lair of a.lairs) {
    const route = G.path(a, entrance, lair);
    assert(route.length && G.distance(route.at(-1), lair) < 2, 'every lair has a reachable approach: ' + seed);
    assert(route.every(p => G.open(a, p.x, p.y)), 'navigation never crosses water or occupied tiles');
  }
  const explored = a.explored.filter(Boolean).length;
  G.reveal(a, 3, 3, 4);
  assert(a.explored.filter(Boolean).length >= explored, 'exploration is permanent');
}
console.log('world: 90 seeded maps, reachable lairs, stable generation and permanent exploration');
