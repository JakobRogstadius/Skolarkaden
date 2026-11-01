/* Browser QA only. Loaded by dev/serve.cjs, never by the published index. */
(function () {
  'use strict';
  const SC = window.Starlight, Base = SC.GlantanGame, originalFetch = window.fetch;
  const nativePixelRatio = window.devicePixelRatio;
  let game, renderer, initialHome, frozen = false;
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
    start(options) { super.start({ ...options, fresh: true, seed: options.seed || 'moss-koppar' }); initialHome = { ...SC.Glantan.castle(this.world) }; }
  };
  function showVisualRoster() {
    const G = SC.Glantan, w = game.world, home = initialHome;
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
    const G = SC.Glantan, w = game.world, home = initialHome, x = Math.floor(home.x), y = Math.floor(home.y);
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
    for (const [dx, dy, level] of [[1, 0, 4]]) {
      w.corpses.push({ id: w.nextId++, x: necro.x + 1, y: necro.y, level, monsterType: 'rattler', diedAt: w.time });
      necro.raiseAt = 0; const s = G.raiseSkeleton(w, necro); s.x = x + dx; s.y = y + dy;
    }
    const types = ['nightwing', 'husher', 'binder', 'mender', 'broodcap', 'siegebreaker', 'thornling', 'bulwark'];
    for (let i = 0; i < types.length; i++) {
      const m = G.spawnMonster(w, lair, { type: types[i] }); m.x = x + 3 + i % 3 * 1.6; m.y = y + Math.floor(i / 3) * 2; m.rank = i < 4 ? 2 : 3;
    }
    const binder = w.monsters.find(m => m.type === 'binder');
    for (let i = 0; i < 4; i++) {
      w.corpses.push({ id: w.nextId++, x: binder.x + 1, y: binder.y, level: 2, monsterType: 'rattler', diedAt: w.time });
      binder.raiseAt = 0; const s = G.raiseEnemySkeleton(w, binder); s.x = x + 7.5 + (i % 2) * .9; s.y = y + 2.5 + Math.floor(i / 2) * 1.3;
    }
    for (const [dx, dy] of [[1, 3.2], [2.2, 4.4], [3.4, 5.4]]) w.traps.push({ id: w.nextId++, x: x + dx, y: y + dy, owner: w.heroes[1].id, lair: lair.id, level: 3 });
    w.corpses.push({ id: w.nextId++, x: x + 1.5, y: y - 2, level: 3, monsterType: 'rattler', diedAt: w.time });
    w.effects = [];
    for (const [role, target, school, color] of [['mage', w.monsters[1], 'arcane', '#c5a4ff'], ['necromancer', w.monsters[4], 'soul', '#93e3cb'], ['healer', w.heroes[0], 'life', '#c3ff9c']]) {
      const h = w.heroes.find(h => h.classId === role);
      G.combatCue(w, h, target, role === 'healer' ? 'heal' : 'attack'); h.actionCue.at = w.time - .38;
      G.effect(w, 'spell', h.x, h.y, { toX: target.x, toY: target.y, school, color, radius: 1.5, duration: .8, age: .38 }, h);
    }
    w.monsters[4].rootedUntil = w.time + 2.8;
    w.explored.fill(1); w.fogRevision++; w.revision++; w.navRevision++;
    renderer.terrainChunks.forEach(chunk => { chunk.canvas.width = chunk.canvas.height = 0; }); renderer.terrainChunks.clear();
    renderer.camera.zoom = Math.min(1.1, renderer.width / 850, renderer.height / 650);
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
  function renderProbe(output) {
    showCombat();
    const G = SC.Glantan, w = game.world, source = w.effects.filter(e => e.type === 'spell');
    // Identical, stationary combat load isolates drawing from simulation changes.
    for (let i = 0; i < 21; i++) w.effects.push({ ...source[i % source.length], x: source[i % source.length].x + (i % 4) * .7, y: source[i % source.length].y + Math.floor(i / 4) * .4 });
    renderer.finishProbe?.();
    const originalDraw = renderer.draw, frames = [], draw = []; let last = 0, start = performance.now();
    renderer.finishProbe = () => { renderer.draw = originalDraw; renderer.finishProbe = null; };
    renderer.draw = function() {
      const at = performance.now(); originalDraw.call(this); const cost = performance.now() - at;
      if (last && at - start > 1000) { frames.push(at-last); draw.push(cost); }
      last = at;
      if (at - start < 6000) { output.textContent = 'Mäter grafik…'; return; }
      this.finishProbe(); frames.sort((a,b)=>a-b); draw.sort((a,b)=>a-b);
      const mean = a => a.reduce((n,x)=>n+x,0)/a.length;
      output.textContent = 'Grafik: ' + (1000/mean(frames)).toFixed(1) + ' fps · bild p95 ' + frames[Math.floor(frames.length*.95)].toFixed(1) + ' ms · ritning ' + mean(draw).toFixed(2) + ' ms · 24 trollformler';
    };
  }
  async function frameProbe(output) {
    showCombat();
    const G = SC.Glantan, w = game.world, home = G.castle(w), types = Object.keys(G.monsterTypes);
    while (w.heroes.length < 24) G.addHero(w, Object.keys(G.classes)[w.heroes.length % 5]);
    while (w.monsters.length < 83) if (!G.spawnMonster(w, w.lairs[0], { type: types[w.monsters.length % types.length], guard: true })) break;
    const units = [...w.heroes, ...w.monsters];
    units.forEach((u,i) => { u.x = home.x + 1 + i % 14 * .8; u.y = home.y - 7 + Math.floor(i / 14) * 1.05; u.route = [{ x: u.x + 1, y: u.y }]; });
    renderer.camera.zoom = Math.min(.8, renderer.width / 850, renderer.height / 650);
    renderer.focus({ x: home.x + 5, y: home.y - 2 });
    const origin = { ...renderer.camera }, results = [], originalDraw = renderer.draw;
    renderer.draw = () => {}; // Probe owns draws; the normal loop must not add hidden work.
    const summary = a => { a.sort((a,b)=>a-b); return { mean: +(a.reduce((n,x)=>n+x,0)/a.length).toFixed(3), p95: +a[Math.floor(a.length*.95)].toFixed(3), max: +a.at(-1).toFixed(3) }; };
    try {
      for (const scene of ['battle', 'pan']) {
        const draw = [], frames = []; let last = 0;
        for (let i = 0; i < 240; i++) {
          if (i % 12 === 0) { await new Promise(requestAnimationFrame); const now = performance.now(); if (last) frames.push(now-last); last = now; output.textContent = scene + ' ' + i + '/240'; }
          w.time = 100 + i / 60; w.tick = Math.floor(w.time * 10);
          for (const [j,u] of units.entries()) u.actionCue = { at: w.time - (i % 60) / 60, kind: j % 5 === 0 ? 'heal' : 'attack', dx: j % 2 ? -1 : 1, dy: .2 };
          renderer.camera.x = origin.x + (scene === 'pan' ? Math.sin(i / 239 * Math.PI * 4) * 900 : 0); renderer.clampCamera();
          const start = performance.now(); originalDraw.call(renderer); if (i >= 60) draw.push(performance.now()-start);
        }
        const ui = [], save = [], serialize = [];
        for (let i=0;i<20;i++) {
          let at=performance.now(); renderer.ui.update(); ui.push(performance.now()-at);
          at=performance.now(); JSON.stringify(w); serialize.push(performance.now()-at);
          at=performance.now(); game.save(); save.push(performance.now()-at);
        }
        results.push({scene, draw:summary(draw), ui:summary(ui), save:summary(save), serialize:summary(serialize), callbackInterval:summary(frames), cacheBytes:renderer.sprites?.bytes, terrainBytes:renderer.terrainBytes});
      }
      const result = { size:[renderer.canvas.width,renderer.canvas.height], dpr:renderer.dpr, heroes:w.heroes.length, monsters:w.monsters.length, results };
      output.textContent = JSON.stringify(result); console.log('Klockgläntan frame probe', result);
    } finally { renderer.draw = originalDraw; Object.assign(renderer.camera, origin); }
  }
  function showAttackRoster() {
    const G = SC.Glantan, A = G.Art, panel = document.createElement('div'), controls = document.createElement('div'), canvas = document.createElement('canvas');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Alla anfallsanimationer');
    panel.style.cssText = 'position:fixed;inset:0;z-index:200;background:#142f30;padding:12px;overflow:auto;color:#fff5d4';
    controls.style.cssText = 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:10px';
    const title = document.createElement('strong'); title.textContent = 'Alla anfall · vilande till vänster, anfall till höger'; controls.append(title);
    const roster = [
      ...Object.entries(G.classes).map(([type, spec]) => ({ kind: 'hero', type, label: spec.name })),
      { kind: 'skeleton', label: 'Vänligt skelett' },
      ...Object.entries(G.monsterTypes).map(([type, spec]) => ({ kind: 'monster', type, label: spec.name })),
      ...['banner', 'guardian', 'marksman', 'traps'].map(branch => ({ kind: 'hero', type: G.research[branch].group, branch, label: G.research[branch].name }))
    ];
    canvas.width = 1200; canvas.height = Math.ceil(roster.length / 6) * 180;
    canvas.style.cssText = 'display:block;max-width:100%;height:auto;margin:auto';
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Fem hjälteklasser, vänligt skelett, tolv monstertyper och fyra hjältevägar');
    const c = canvas.getContext('2d'), sprites = G.SpriteCache ? new G.SpriteCache() : null; if (sprites) sprites.scale = 2;
    let playing = false, age = .27, facing = 1, reduced = false, cached = true, last = performance.now();
    const world = { ...game.world, time: 2 };
    function draw() {
      sprites?.beginFrame();
      c.fillStyle = '#142f30'; c.fillRect(0, 0, canvas.width, canvas.height);
      roster.forEach((row, i) => {
        const left = i % 6 * 200, top = Math.floor(i / 6) * 180, scale = row.kind === 'monster' ? .82 : 1.1;
        c.fillStyle = '#a3b68b'; c.fillRect(left + 3, top + 3, 194, 174);
        c.fillStyle = '#213b33'; c.font = 'bold 14px Trebuchet MS'; c.textAlign = 'center'; c.fillText(row.label, left + 100, top + 24);
        const w = { ...world, choices: row.branch ? { [row.type]: row.branch } : {}, research: row.branch ? { [row.branch]: true } : {} };
        for (const attacking of [false, true]) {
          const unit = { id: 1, x: 0, y: 0, hp: 100, maxHp: 100, level: 2, rank: 2, strength: 1, facing, route: [], classId: row.kind === 'hero' ? row.type : undefined, type: row.type, monster: row.kind === 'monster' };
          const target = { x: facing, y: .2 };
          if (attacking) G.combatCue(w, unit, target);
          c.save(); c.translate(left + (attacking ? 137 : 48), top + 142); c.scale(scale, scale);
          const origin = A[row.kind](c, unit, w, 2 + age, reduced, cached ? sprites : null);
          if (attacking && age < .48) {
            const magic = ['mage', 'healer', 'necromancer'].includes(row.type) || G.monsterTypes[row.type]?.spell;
            const ranged = row.type === 'ranger' || row.type === 'thornling';
            const effect = { x: 0, y: 0, toX: target.x, toY: target.y, color: row.kind === 'monster' ? '#ff8c8a' : G.classes[row.type]?.color || '#ddf4c7', radius: .4, school: row.type === 'necromancer' ? 'soul' : 'arcane', heavy: ['guardian', 'siegebreaker', 'broodcap', 'bulwark'].includes(row.type), claw: row.type === 'nightwing' };
            A[magic ? 'spell' : ranged ? 'bolt' : 'slash'](c, effect, age / (magic ? .8 : .48), reduced, origin);
          }
          c.restore();
        }
      });
    }
    for (const [label, action] of [
      ['Spela animationer', () => { playing = !playing; last = performance.now(); }],
      ['Start', () => { playing = false; age = .04; }],
      ['Träff', () => { playing = false; age = .27; }],
      ['Återgång', () => { playing = false; age = .52; }],
      ['Vänd', () => { facing *= -1; }],
      ['Minskad rörelse', () => { reduced = !reduced; }],
      ['Byt ritmetod', () => { cached = !cached; title.textContent = (cached ? 'Spritebilder' : 'Direkt ritning') + ' · vila / anfall'; }],
      ['Stäng', () => { sprites?.clear(); panel.remove(); }]
    ]) { const button = document.createElement('button'); button.textContent = label; button.onclick = () => { action(); draw(); }; controls.append(button); }
    panel.append(controls, canvas); document.body.append(panel); draw();
    function frame(now) {
      if (!panel.isConnected) return;
      if (playing) { age = (age + (now - last) / 1000) % 1.4; draw(); }
      last = now; requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.setAttribute('aria-label', 'Testkontroller');
    bar.style.cssText = 'position:fixed;right:4px;top:4px;z-index:100;display:flex;gap:4px;background:#13282e;padding:4px;font-size:10px';
    bar.style.flexWrap = 'wrap'; bar.style.maxWidth = '95vw';
    for (const [name, action] of [['Visuell översikt', showVisualRoster], ['Stridsöversikt', showCombat], ['Byt vägval', alternateBranches], ['Välj vägval', () => { showVisualRoster(); game.world.research = { castle2: true }; game.world.choices = {}; renderer.ui.tab = 'research'; renderer.ui.selection = null; renderer.ui.panelKey = ''; renderer.ui.update(); }], ['Bovågor', showLairWaves], ['Visa karta', () => { game.world.explored.fill(1); game.world.lairs.forEach(l => {l.seen=true;}); game.world.fogRevision++; }], ['Visa boss', () => { const l=game.world.lairs.find(l=>l.boss); if (!l) return; SC.Glantan.reveal(game.world,l.x,l.y,10); renderer.focus(l); renderer.ui.inspect({kind:'lair',id:l.id}); }], ['Stanna tiden', () => { frozen=!frozen; }], ['Testvinst', () => { const boss = game.world.lairs.find(l => l.boss); if (boss) { frozen = false; boss.hp = 0; } }], ['Testförlust', () => { frozen = false; SC.Glantan.castle(game.world).hp = 0; }], ['Dölj testknappar', () => bar.remove()]]) {
      const button = document.createElement('button'); button.textContent = name; button.type = 'button'; button.style.cssText = 'padding:5px;font-size:10px';
      button.onclick = () => { if (game?.state === 'playing' || name.startsWith('Dölj')) action(); }; bar.append(button);
    }
    document.body.append(bar);
    const performanceOutput = document.createElement('output'), performanceButton = document.createElement('button');
    performanceOutput.setAttribute('aria-label', 'Grafikprestanda'); performanceButton.textContent = 'Mät grafik';
    performanceButton.onclick = () => { if (game?.state === 'playing') renderProbe(performanceOutput); };
    bar.append(performanceButton, performanceOutput);
    const fullProbe = document.createElement('button'); fullProbe.textContent = 'Mät hela bilden';
    fullProbe.onclick = async () => {
      if (game?.state !== 'playing') return;
      fullProbe.disabled = true; Object.defineProperty(window,'devicePixelRatio',{value:nativePixelRatio,configurable:true}); renderer.resize();
      try { await frameProbe(performanceOutput); } finally { fullProbe.disabled = false; }
    }; bar.append(fullProbe);
    const denseProbe = document.createElement('button'); denseProbe.textContent = 'Mät 2× pixlar';
    denseProbe.onclick = async () => {
      if (game?.state !== 'playing') return;
      denseProbe.disabled = true; Object.defineProperty(window,'devicePixelRatio',{value:2,configurable:true}); renderer.resize();
      try { await frameProbe(performanceOutput); } finally { denseProbe.disabled = false; }
    }; bar.append(denseProbe);
    const attacks = document.createElement('button'); attacks.textContent = 'Alla anfall'; attacks.onclick = () => { if (game?.state === 'playing') showAttackRoster(); }; bar.append(attacks);
    const audio = document.createElement('output'); audio.setAttribute('aria-label', 'Ljudstatus'); bar.append(audio);
    const meter = setInterval(() => {
      if (!bar.isConnected) { clearInterval(meter); return; }
      const mixer = game?.soundscape, music = mixer?.music, track = music?.active;
      const position = track ? (track.offset + music.context.currentTime - track.at) % 40 : music?.offset || 0;
      audio.textContent = (track ? 'Musik spelar' : 'Musik tyst') + ' · ' + (mixer?.context?.state || 'ej startad') + ' · ' + position.toFixed(1) + ' s · ' + ((track?.gain.gain.value || 0) * (mixer?.bus?.gain.value || 0)).toFixed(4);
    }, 250);
  });
})();
