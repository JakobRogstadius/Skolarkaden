'use strict';
const assert = require('node:assert/strict');
const {boot} = require('../helpers/app.cjs');
const {games} = require('../helpers/runtime.cjs');
(async () => {
  const app = boot(); await app.appReady;
  for (const kind of games(['city', 'food', 'garden', 'hive', 'paint', 'dinosaur', 'marshmallows', 'eggs', 'home'])) {
    await app.start(kind);
    assert.equal(app.getGame(kind).state, 'playing', kind);
    assert.equal(app.elements.play.dataset.game, kind);
    assert.equal(app.elements.objective.closest('.hud-objective').hidden, ['marshmallows', 'eggs'].includes(kind));
    app.click('pause-menu');
    assert.equal(app.elements.menu.hidden, false);
  }
  console.log('PASS selected games start, show their HUD and return to the menu');
})().catch(error => {console.error(error); process.exitCode = 1;});
