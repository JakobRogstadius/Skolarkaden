/* Browser QA only. Loaded by dev/serve.cjs, never by the published index. */
(function () {
  'use strict';
  const SC = window.Starlight, Base = SC.GlantanGame, originalFetch = window.fetch;
  let game, renderer, frozen = false;
  const Renderer = SC.GlantanRenderer;
  SC.GlantanRenderer = class extends Renderer { constructor(...args) { super(...args); renderer = this; } };
  // Exercise result/replay without writing synthetic scores to the live service.
  window.fetch = function (url, options) {
    if (String(url).includes('skolarkaden-api.') && String(url).includes('/scores')) return Promise.resolve(Response.json({ error: 'invalid_leaderboard' }, { status: 400 }));
    return originalFetch.call(this, url, options);
  };
  SC.GlantanGame = class extends Base {
    constructor(options) { super(options); game = this; }
    update(dt) { if (!frozen) super.update(dt); }
    start(options) { super.start({ ...options, fresh: true, seed: options.seed || 'moss-koppar' }); }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.setAttribute('aria-label', 'Testkontroller');
    bar.style.cssText = 'position:fixed;right:4px;top:4px;z-index:100;display:flex;gap:4px;background:#13282e;padding:4px;font-size:10px';
    for (const [name, action] of [['Visa karta', () => { game.world.explored.fill(1); game.world.lairs.forEach(l => {l.seen=true;}); game.world.fogRevision++; }], ['Visa boss', () => { const l=game.world.lairs.find(l=>l.boss); SC.Glantan.reveal(game.world,l.x,l.y,10); renderer.focus(l); renderer.ui.inspect({kind:'lair',id:l.id}); }], ['Stanna tiden', () => { frozen=!frozen; }], ['Testvinst', () => { game.world.lairs.forEach(l => { l.hp = 0; }); game.world.monsters = []; }], ['Testförlust', () => { SC.Glantan.castle(game.world).hp = 0; }], ['Dölj testknappar', () => bar.remove()]]) {
      const button = document.createElement('button'); button.textContent = name; button.type = 'button'; button.style.cssText = 'padding:5px;font-size:10px';
      button.onclick = () => { if (game?.state === 'playing' || name.startsWith('Dölj')) action(); }; bar.append(button);
    }
    document.body.append(bar);
  });
})();
