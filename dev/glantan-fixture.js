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
    frozen = true; w.buildings = []; w.heroes = []; w.skeletons = []; w.corpses = []; w.traps = []; w.effects = []; w.notices = [];
    for (let y = Math.floor(home.y) - 7; y <= home.y + 9; y++) for (let x = Math.floor(home.x) - 8; x <= home.x + 8; x++) {
      w.terrain[G.index(w, x, y)] = 0; w.paths[G.index(w, x, y)] = 0;
    }
    const types = ['castle', 'house', 'hall', 'lodge', 'garden', 'spire', 'tower', 'beacon', 'conservatory', 'crypt'];
    types.forEach((type, i) => {
      const spec = G.buildings[type];
      G.addBuilding(w, type, Math.floor(home.x + (i % 4 - 1.5) * 3.3 - spec.w / 2), Math.floor(home.y - 3 + Math.floor(i / 4) * 3.3 - spec.h / 2));
    });
    Object.keys(G.classes).forEach((classId, i) => {
      const hero = G.addHero(w, classId); hero.x = home.x - 4 + i * 2; hero.y = home.y + 6.5;
      hero.route = []; hero.level = 3; hero.maxHp = hero.hp = G.heroStats(w, hero).hp; hero.task = 'Visuell översikt';
    });
    w.explored.fill(1); w.lairs.forEach(l => { l.seen = true; }); w.fogRevision++; w.revision++;
    renderer.terrainChunks.forEach(chunk => { chunk.canvas.width = chunk.canvas.height = 0; }); renderer.terrainChunks.clear();
    renderer.camera.zoom = Math.min(1, renderer.width / 620, renderer.height / 650);
    renderer.focus({ x: home.x, y: home.y + 1 }); renderer.ui.panelKey = ''; renderer.ui.update();
  }
  function showCombat() {
    const G = SC.Glantan, w = game.world, home = { ...G.castle(w) }, x = Math.floor(home.x), y = Math.floor(home.y);
    frozen = true; w.outcome = null; w.monsters = []; w.lairs = []; w.buildings = []; w.heroes = []; w.skeletons = []; w.corpses = []; w.traps = []; w.bounties = []; w.expeditions = []; w.effects = []; w.notices = [];
    w.research = { castle2: true, banner: true, traps: true }; w.choices = { warrior: 'banner', ranger: 'traps' };
    for (let yy = y - 10; yy <= y + 10; yy++) for (let xx = x - 10; xx <= x + 10; xx++) {
      w.terrain[G.index(w, xx, yy)] = 0; w.paths[G.index(w, xx, yy)] = 0;
    }
    for (const [type, dx, dy] of [['castle', -6, 3], ['house', -9, 5], ['house', -9, 2], ['crypt', -6, -1], ['spire', -3, -1], ['hall', -3, 3], ['lodge', -6, -5]]) G.addBuilding(w, type, x + dx, y + dy);
    const lair = G.addLair(w, { tx: x + 4, ty: y - 3, type: 'spore', tier: 1 }, 1e6); lair.seen = true;
    w.monsters = [];
    const roster = [['warrior', 0, -1], ['ranger', -1, 2], ['healer', 0, 4.3], ['mage', 0, -3], ['necromancer', -1, 0]];
    for (const [role, dx, dy] of roster) {
      const h = G.addHero(w, role); Object.assign(h, { x: x + dx, y: y + dy, level: 3, route: [], task: 'Stridsöversikt' }); h.hp = h.maxHp = G.heroStats(w, h).hp;
    }
    const necro = w.heroes.find(h => h.classId === 'necromancer');
    for (const [dx, dy, level] of [[1, 0, 2], [1, 1.2, 4]]) {
      w.corpses.push({ id: w.nextId++, x: necro.x + 1, y: necro.y, level, monsterType: 'rattler', diedAt: w.time });
      necro.raiseAt = 0; const s = G.raiseSkeleton(w, necro); s.x = x + dx; s.y = y + dy;
    }
    const types = ['nightwing', 'husher', 'binder', 'mender', 'broodcap', 'siegebreaker', 'thornling', 'bulwark'];
    for (let i = 0; i < types.length; i++) {
      const m = G.spawnMonster(w, lair, { type: types[i] }); m.x = x + 3 + i % 3 * 1.6; m.y = y + Math.floor(i / 3) * 2; m.rank = i < 4 ? 2 : 3;
    }
    for (const [dx, dy] of [[1, 3.2], [2.2, 4.4], [3.4, 5.4]]) w.traps.push({ id: w.nextId++, x: x + dx, y: y + dy, owner: w.heroes[1].id, lair: lair.id, level: 3 });
    w.corpses.push({ id: w.nextId++, x: x + 1.5, y: y - 2, level: 3, monsterType: 'rattler', diedAt: w.time });
    w.effects = [];
    for (const [role, target, school, color] of [['mage', w.monsters[1], 'arcane', '#c5a4ff'], ['necromancer', w.monsters[4], 'soul', '#93e3cb'], ['healer', w.heroes[0], 'life', '#c3ff9c']]) {
      const h = w.heroes.find(h => h.classId === role);
      G.effect(w, 'spell', h.x, h.y, { toX: target.x, toY: target.y, school, color, radius: 1.5, duration: .8, age: .38 });
    }
    w.monsters[4].rootedUntil = w.time + 2.8;
    w.explored.fill(1); w.fogRevision++; w.revision++; w.navRevision++;
    renderer.terrainChunks.forEach(chunk => { chunk.canvas.width = chunk.canvas.height = 0; }); renderer.terrainChunks.clear();
    renderer.camera.zoom = Math.min(1.25, renderer.width / 670, renderer.height / 530);
    renderer.focus({ x, y: y + .8 }); renderer.ui.inspect({ kind: 'hero', id: necro.id });
  }
  function alternateBranches() {
    const w = game.world, defensive = !w.research.guardian;
    for (const id of ['guardian', 'banner', 'traps', 'marksman']) delete w.research[id];
    w.choices.warrior = defensive ? 'guardian' : 'banner'; w.choices.ranger = defensive ? 'marksman' : 'traps';
    w.research[w.choices.warrior] = w.research[w.choices.ranger] = true;
    renderer.ui.panelKey = ''; renderer.ui.update();
  }
  function showLairWaves() {
    const G = SC.Glantan, w = game.world, lair = w.lairs.find(l => !l.boss && G.alive(l));
    if (!lair) return;
    const growth = (4 - lair.level) * 45;
    frozen = true; lair.seen = lair.awake = true; lair.level = 4; lair.hp += growth; lair.maxHp += growth;
    lair.nextGuardAt = w.time + 30;
    const guard = w.monsters.find(m => G.alive(m) && m.guard && m.lair === lair.id);
    if (guard) G.damage(w, guard, guard.hp);
    G.launchWave(w, lair); G.reveal(w, lair.x, lair.y, 10);
    renderer.focus(lair); renderer.ui.inspect({ kind: 'lair', id: lair.id });
  }
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.setAttribute('aria-label', 'Testkontroller');
    bar.style.cssText = 'position:fixed;right:4px;top:4px;z-index:100;display:flex;gap:4px;background:#13282e;padding:4px;font-size:10px';
    bar.style.flexWrap = 'wrap'; bar.style.maxWidth = '95vw';
    for (const [name, action] of [['Visuell översikt', showVisualRoster], ['Stridsöversikt', showCombat], ['Byt vägval', alternateBranches], ['Bovågor', showLairWaves], ['Visa karta', () => { game.world.explored.fill(1); game.world.lairs.forEach(l => {l.seen=true;}); game.world.fogRevision++; }], ['Visa boss', () => { const l=game.world.lairs.find(l=>l.boss); if (!l) return; SC.Glantan.reveal(game.world,l.x,l.y,10); renderer.focus(l); renderer.ui.inspect({kind:'lair',id:l.id}); }], ['Stanna tiden', () => { frozen=!frozen; }], ['Testvinst', () => { const boss = game.world.lairs.find(l => l.boss); if (boss) { frozen = false; boss.hp = 0; } }], ['Testförlust', () => { frozen = false; SC.Glantan.castle(game.world).hp = 0; }], ['Dölj testknappar', () => bar.remove()]]) {
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
