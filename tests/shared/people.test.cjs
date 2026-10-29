'use strict';
const assert = require('node:assert/strict');
const {load} = require('../helpers/runtime.cjs');
const SC = load(['people']);
function person(category, rest = .5) {
  let first = true;
  return SC.makePerson(() => { if (first) { first = false; return category; } return rest; });
}
for (const [low, high, kind] of [[0, .4, 'man'], [.4, .8, 'woman'], [.8, .895, 'boy'], [.895, .99, 'girl'], [.99, 1, 'exotic']]) {
  for (const value of [low, (low + high) / 2, high - 1e-10]) {
    const p = person(value);
    assert.equal(p.kind, kind);
    assert.equal(p.child, kind === 'boy' || kind === 'girl');
    if (p.child) { assert(!p.beard); if (!p.feminine) assert(p.hairStyle < 2); }
  }
}
assert.equal(new Set(SC.rarePeople.map(p => p.id)).size, 8);
assert.equal(new Set(SC.rarePeople.map((_, i) => person(.995, (i + .5) / SC.rarePeople.length).exotic)).size, 8);
for (const value of [0, .499999, .5, .999999]) {
  const child = SC.makeChild(() => value);
  assert(child.child); assert(!child.exotic); assert(!child.beard);
  assert.equal(child.kind, value < .5 ? 'boy' : 'girl');
}
console.log('PASS character category boundaries, child appearance and all rare characters');
