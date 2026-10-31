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
  function showVisualRoster() {
    const G = SC.Glantan, w = game.world, home = { ...G.castle(w) };
    frozen = true; w.buildings = []; w.heroes = []; w.effects = []; w.notices = [];
    for (let y = Math.floor(home.y) - 7; y <= home.y + 9; y++) for (let x = Math.floor(home.x) - 8; x <= home.x + 8; x++) {
      w.terrain[G.index(w, x, y)] = 0; w.paths[G.index(w, x, y)] = 0;
    }
    const types = ['castle', 'house', 'hall', 'lodge', 'garden', 'spire', 'tower', 'beacon', 'conservatory'];
    types.forEach((type, i) => {
      const spec = G.buildings[type];
      G.addBuilding(w, type, Math.floor(home.x + (i % 3 - 1) * 3.5 - spec.w / 2), Math.floor(home.y - 3 + Math.floor(i / 3) * 3.5 - spec.h / 2));
    });
    Object.keys(G.classes).forEach((classId, i) => {
      const hero = G.addHero(w, classId); hero.x = home.x - 3 + i * 2; hero.y = home.y + 6.5;
      hero.route = []; hero.level = 3; hero.maxHp = hero.hp = G.heroStats(w, hero).hp; hero.task = 'Visuell översikt';
    });
    w.explored.fill(1); w.lairs.forEach(l => { l.seen = true; }); w.fogRevision++; w.revision++;
    renderer.terrainChunks.forEach(chunk => { chunk.canvas.width = chunk.canvas.height = 0; }); renderer.terrainChunks.clear();
    renderer.camera.zoom = Math.min(1, renderer.width / 620, renderer.height / 650);
    renderer.focus({ x: home.x, y: home.y + 1 }); renderer.ui.panelKey = ''; renderer.ui.update();
  }
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.setAttribute('aria-label', 'Testkontroller');
    bar.style.cssText = 'position:fixed;right:4px;top:4px;z-index:100;display:flex;gap:4px;background:#13282e;padding:4px;font-size:10px';
    for (const [name, action] of [['Visuell översikt', showVisualRoster], ['Visa karta', () => { game.world.explored.fill(1); game.world.lairs.forEach(l => {l.seen=true;}); game.world.fogRevision++; }], ['Visa boss', () => { const l=game.world.lairs.find(l=>l.boss); SC.Glantan.reveal(game.world,l.x,l.y,10); renderer.focus(l); renderer.ui.inspect({kind:'lair',id:l.id}); }], ['Stanna tiden', () => { frozen=!frozen; }], ['Testvinst', () => { game.world.lairs.forEach(l => { l.hp = 0; }); game.world.monsters = []; }], ['Testförlust', () => { SC.Glantan.castle(game.world).hp = 0; }], ['Dölj testknappar', () => bar.remove()]]) {
      const button = document.createElement('button'); button.textContent = name; button.type = 'button'; button.style.cssText = 'padding:5px;font-size:10px';
      button.onclick = () => { if (game?.state === 'playing' || name.startsWith('Dölj')) action(); }; bar.append(button);
    }
    document.body.append(bar);
    const audio = document.createElement('output'); audio.setAttribute('aria-label', 'Ljudstatus'); bar.append(audio);
    const meter = setInterval(() => {
      if (!bar.isConnected) { clearInterval(meter); return; }
      const mixer = game?.soundscape, music = mixer?.music, track = music?.active;
      const position = track ? (track.offset + music.context.currentTime - track.at) % 40 : music?.offset || 0;
      audio.textContent = (track ? 'Musik spelar' : 'Musik tyst') + ' · ' + (mixer?.context?.state || 'ej startad') + ' · ' + position.toFixed(1) + ' s · ' + ((track?.gain.gain.value || 0) * (mixer?.bus?.gain.value || 0)).toFixed(4);
    }, 250);
  });
})();
