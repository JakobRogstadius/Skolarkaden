'use strict';
const assert = require('node:assert/strict');
const {boot} = require('../helpers/app.cjs');
const {read} = require('../helpers/runtime.cjs');
(async () => {
  const edited = JSON.parse(read('language-exercises.json'));
  edited.exercises.swedish.words = ['testordet'];
  for (const source of ['json', 'offline', 'invalid', undefined]) {
    const app = boot({exerciseSource: source, exerciseData: edited});
    if (source) assert(app.elements.start.disabled, 'start waits for the language catalogue');
    await app.appReady;
    assert.equal(app.exerciseRequests, source ? 1 : 0);
    assert(!app.elements.start.disabled);
    const words = Array.from(app.context.Starlight.modes.swedish.items, item => item.answer);
    if (source === 'json') assert.deepEqual(words, ['testordet'], 'the fetched catalogue is used');
    else assert(words.length > 1, 'offline and invalid data retain the bundled catalogue');
    await app.start('city');
    assert.equal(app.getGame('city').state, 'playing');
    assert.equal(app.getGame('city').mode, 'swedish');
    app.click('pause-menu');
  }
  console.log('PASS app startup with JSON, offline/invalid fallback and local files');
})().catch(error => {console.error(error); process.exitCode = 1;});
