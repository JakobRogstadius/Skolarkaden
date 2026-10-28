/* Canvas world, camera and input. Rendering has no authority over game rules. */
(function(root) {
  'use strict';
  const SC = root.Starlight, G = SC.Glantan, A = G.Art, T = A.tile;
  const make = (tag, className) => { const el = document.createElement(tag); el.className = className; return el; };
  class GlantanRenderer {
    constructor(canvas, game) {
      this.original = canvas; this.game = game; this.selection = null; this.blueprint = null; this.hover = null;
      this.reduced = root.matchMedia('(prefers-reduced-motion: reduce)').matches;
      canvas.hidden = true;
      this.node = make('section', 'g-scene'); this.stage = make('div', 'g-stage');
      this.canvas = make('canvas', 'g-world'); this.canvas.tabIndex = 0; this.canvas.setAttribute('aria-label', 'Klockgläntans karta. Dra för att flytta, rulla för att zooma. Piltangenter flyttar kartan.');
      this.ctx = this.canvas.getContext('2d'); this.stage.append(this.canvas);
      this.mapBadge = make('div', 'g-map-badge');
      const names = ['Mossviken', 'Kopparlyckan', 'Rävbäcken', 'Lilla Efterklang', 'Tegelgläntan', 'Daggholmen'];
      this.mapBadge.innerHTML = G.icon('compass', 15); const mapName = document.createElement('span'); mapName.textContent = names[G.seedNumber(game.world.seed) % names.length]; this.mapBadge.append(mapName); this.mapBadge.title = 'Kartfrö: ' + game.world.seed;
      this.stage.append(this.mapBadge);
      this.toast = make('div', 'g-toast'); this.toast.setAttribute('role', 'status'); this.toast.setAttribute('aria-live', 'polite'); this.stage.append(this.toast);
      this.controls = make('div', 'g-map-controls');
      for (const [glyph, label, action] of [['minus', 'Zooma ut', () => this.zoomBy(0.8)], ['home', 'Till klockborgen', () => this.focus(G.castle(this.game.world))], ['plus', 'Zooma in', () => this.zoomBy(1.25)]]) {
        const button = document.createElement('button'); button.type = 'button'; button.innerHTML = G.icon(glyph, 19); button.title = label; button.setAttribute('aria-label', label); button.onclick = action; this.controls.append(button);
      }
      this.stage.append(this.controls);
      this.bell = make('button', 'g-bell'); this.bell.type = 'button'; this.bell.innerHTML = G.icon('bell', 25) + '<span>Stormklocka</span><small></small>';
      this.bell.title = 'Samlar mod, läker hjältar och hejdar monster nära borgen. Laddas av 6 rätta svar, även över brutna följder.';
      this.bell.onclick = () => this.game.ringBell(); this.stage.append(this.bell);
      this.minimap = make('canvas', 'g-minimap'); this.minimap.width = 144; this.minimap.height = 112; this.minimap.setAttribute('aria-label', 'Översiktskarta'); this.stage.append(this.minimap);
      this.ui = new G.Interface(this); this.node.append(this.stage, this.ui.node); canvas.parentElement.append(this.node);
      this.terrain = document.createElement('canvas'); A.terrain(this.terrain, game.world);
      this.fog = document.createElement('canvas'); this.fog.width = this.terrain.width; this.fog.height = this.terrain.height;
      this.fogScratch = document.createElement('canvas'); this.fogScratch.width = this.fog.width; this.fogScratch.height = this.fog.height;
      this.camera = { x: G.castle(game.world).x * T, y: G.castle(game.world).y * T, zoom: 0.8 };
      this.pointers = new Map(); this.listeners = []; this.bind();
      this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.stage); this.resize();
      this.last = 0; this.uiAt = 0;
      const frame = now => {
        const dt = this.last ? Math.min(0.15, (now - this.last) / 1000) : 0; this.last = now;
        game.update(dt); this.draw();
        if (now - this.uiAt > 180) { this.ui.update(); this.updateOverlay(); this.uiAt = now; }
        this.raf = root.requestAnimationFrame(frame);
      };
      this.raf = root.requestAnimationFrame(frame); this.updateOverlay();
    }
    listen(node, name, handler, options) { node.addEventListener(name, handler, options); this.listeners.push(() => node.removeEventListener(name, handler, options)); }
    bind() {
      const canvas = this.canvas;
      this.listen(canvas, 'pointerdown', e => {
        if (e.button !== 0 && e.pointerType !== 'touch') return;
        const point = this.screenPoint(e); this.pointers.set(e.pointerId, point); canvas.setPointerCapture(e.pointerId);
        this.down = { ...point, cameraX: this.camera.x, cameraY: this.camera.y, dragged: false };
        if (this.pointers.size === 2) {
          const [a, b] = [...this.pointers.values()]; this.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.camera.zoom };
          this.down.dragged = true;
        }
      });
      this.listen(canvas, 'pointermove', e => {
        const point = this.screenPoint(e), world = this.toWorld(point.x, point.y);
        this.hover = { x: Math.floor(world.x / T), y: Math.floor(world.y / T) };
        if (!this.pointers.has(e.pointerId)) return;
        this.pointers.set(e.pointerId, point);
        if (this.pointers.size === 2 && this.pinch) {
          const [a, b] = [...this.pointers.values()]; this.camera.zoom = G.clamp(this.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, this.pinch.distance), 0.3, 2); this.clampCamera(); return;
        }
        if (!this.down) return;
        const dx = point.x - this.down.x, dy = point.y - this.down.y;
        if (Math.hypot(dx, dy) > 5) this.down.dragged = true;
        if (this.down.dragged) { this.camera.x = this.down.cameraX - dx / this.camera.zoom; this.camera.y = this.down.cameraY - dy / this.camera.zoom; this.clampCamera(); }
      });
      const release = (e, cancelled) => {
        const point = this.screenPoint(e), click = this.down && !this.down.dragged && this.pointers.size === 1 && !cancelled;
        this.pointers.delete(e.pointerId);
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
        if (click) this.click(point.x, point.y);
        this.down = null; this.pinch = null;
      };
      this.listen(canvas, 'pointerup', e => release(e, false)); this.listen(canvas, 'pointercancel', e => release(e, true));
      this.listen(canvas, 'pointerleave', () => { if (!this.pointers.size) this.hover = null; });
      this.listen(canvas, 'wheel', e => { if (e.ctrlKey) return; e.preventDefault(); const p = this.screenPoint(e); this.zoomBy(Math.exp(-e.deltaY * 0.0015), p); }, { passive: false });
      this.listen(canvas, 'keydown', e => {
        const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (delta) { e.preventDefault(); this.camera.x += delta[0] * 80 / this.camera.zoom; this.camera.y += delta[1] * 80 / this.camera.zoom; this.clampCamera(); }
        if (e.key === '+' || e.key === '=') this.zoomBy(1.25);
        if (e.key === '-') this.zoomBy(0.8);
        if (e.key === 'Home') this.focus(G.castle(this.game.world));
      });
      this.listen(this.minimap, 'pointerdown', e => {
        const box = this.minimap.getBoundingClientRect();
        this.camera.x = (e.clientX - box.left) / box.width * this.game.world.width * T;
        this.camera.y = (e.clientY - box.top) / box.height * this.game.world.height * T; this.clampCamera();
      });
    }
    screenPoint(e) { const b = this.canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    toWorld(x, y) { return { x: (x - this.width / 2) / this.camera.zoom + this.camera.x, y: (y - this.height / 2) / this.camera.zoom + this.camera.y }; }
    focus(point) { if (!point) return; this.camera.x = point.x * T; this.camera.y = point.y * T; this.clampCamera(); }
    clampCamera() {
      if (!this.camera) return;
      const halfW = this.width / (2 * this.camera.zoom), halfH = this.height / (2 * this.camera.zoom), w = this.game.world;
      this.camera.x = halfW * 2 >= w.width * T ? w.width * T / 2 : G.clamp(this.camera.x, halfW - 30, w.width * T - halfW + 30);
      this.camera.y = halfH * 2 >= w.height * T ? w.height * T / 2 : G.clamp(this.camera.y, halfH - 30, w.height * T - halfH + 30);
    }
    zoomBy(factor, point = { x: this.width / 2, y: this.height / 2 }) {
      const before = this.toWorld(point.x, point.y);
      this.camera.zoom = G.clamp(this.camera.zoom * factor, 0.3, 2);
      const after = this.toWorld(point.x, point.y); this.camera.x += before.x - after.x; this.camera.y += before.y - after.y; this.clampCamera();
    }
    resize() {
      const box = this.stage.getBoundingClientRect(); if (!box.width || !box.height) return;
      this.width = box.width; this.height = box.height; this.dpr = Math.min(2, root.devicePixelRatio || 1);
      this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
      if (!this.initialSize) { this.camera.zoom = G.clamp(Math.min(this.width / 780, this.height / 590), 0.42, 1.05); this.initialSize = true; }
      this.clampCamera(); this.draw();
    }
    click(sx, sy) {
      if (this.game.state !== 'playing') return;
      const p = this.toWorld(sx, sy), point = { x: p.x / T, y: p.y / T }, w = this.game.world;
      if (!G.inside(w, point.x, point.y)) return;
      if (this.blueprint) {
        const action = { type: 'build', id: this.blueprint, x: Math.floor(point.x), y: Math.floor(point.y) };
        if (this.game.choose(action)) { this.blueprint = null; this.selection = null; }
        this.ui.questionKey = ''; this.ui.update(); return;
      }
      const hero = [...w.heroes].filter(G.alive).sort((a, b) => G.distance(a, point) - G.distance(b, point)).find(h => Math.hypot(h.x - point.x, h.y - 0.25 - point.y) < 0.6 / Math.min(1, this.camera.zoom));
      if (hero) { this.ui.inspect({ kind: 'hero', id: hero.id }); return; }
      if (w.explored[G.index(w, point.x, point.y)]) {
        const buildings = w.buildings.filter(b => G.footprint(b, point.x, point.y) ||
          G.alive(b) && Math.abs(point.x - b.x) < b.w * .38 && point.y > b.y - (b.type === 'castle' ? 1.9 : b.type === 'spire' ? 1.8 : 1.4) && point.y < b.y + .4);
        const building = buildings.find(G.alive) || buildings.at(-1);
        if (building) { this.ui.inspect({ kind: 'building', id: building.id }); return; }
        const lair = w.lairs.find(b => G.footprint(b, point.x, point.y));
        if (lair) { this.ui.inspect({ kind: 'lair', id: lair.id }); return; }
        const monster = w.monsters.find(m => G.alive(m) && G.distance(m, point) < 0.7);
        if (monster) { this.ui.inspect({ kind: 'monster', id: monster.id }); return; }
      }
      this.ui.inspect({ kind: 'ground', x: Math.floor(point.x) + 0.5, y: Math.floor(point.y) + 0.5 });
    }
    drawFog() {
      const w = this.game.world;
      if (this.fogKey === w.fogRevision) return;
      this.fogKey = w.fogRevision; const c = this.fogScratch.getContext('2d'); c.clearRect(0, 0, this.fog.width, this.fog.height);
      for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) if (!w.explored[y * w.width + x]) {
        c.fillStyle = A.hash(x, y) > 0.5 ? '#2c4c46' : '#2b4b45'; c.fillRect(x * T, y * T, T + 1, T + 1);
        if (A.hash(x, y, 5) > 0.7) { c.strokeStyle = '#6c8a7138'; c.lineWidth = 1; c.beginPath(); c.arc(x * T + 22, y * T + 25, 9, 3.3, 6); c.stroke(); }
      }
      const softened = this.fog.getContext('2d'); softened.clearRect(0, 0, this.fog.width, this.fog.height);
      softened.filter = 'blur(9px)'; softened.drawImage(this.fogScratch, 0, 0); softened.filter = 'none';
    }
    drawBar(entity, yOffset = 0, color = '#bbdc97') {
      const c = this.ctx, x = entity.x * T, y = entity.y * T + yOffset;
      const width = entity.w ? 44 : 23;
      A.round(c, x - width / 2 - 1, y, width + 2, 5, 2, '#24423ed9');
      A.round(c, x - width / 2, y + 1, Math.max(0, width * entity.hp / entity.maxHp), 3, 1, color);
    }
    drawFlags() {
      const c = this.ctx, w = this.game.world;
      for (const bounty of w.bounties) {
        const color = bounty.type === 'attack' ? '#e8ac70' : bounty.type === 'explore' ? '#d5d49b' : '#a3ced0';
        const x = bounty.x * T + (bounty.type === 'attack' ? 27 : 0), y = bounty.y * T;
        A.ellipse(c, x, y, 8, 3, '#273e3c44'); A.line(c, [[x, y], [x, y - 50]], '#d6c8a1', 2.4);
        A.polygon(c, [[x + 1, y - 49], [x + 25, y - 43], [x + 21, y - 31], [x + 1, y - 35]], color);
        c.fillStyle = '#3b4e3e'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('•'.repeat(bounty.level), x + 11, y - 38);
      }
    }
    drawEffects() {
      const c = this.ctx, w = this.game.world;
      for (const e of w.effects) {
        const p = e.age / e.duration, x = e.x * T, y = e.y * T;
        c.save(); c.globalAlpha = Math.min(1, (1 - p) * 2); c.strokeStyle = c.fillStyle = e.color || '#f3dfab';
        if (e.type === 'bolt') {
          const xx = x + (e.toX * T - x) * Math.min(1, p * 1.6), yy = y + (e.toY * T - y) * Math.min(1, p * 1.6) - 11;
          A.line(c, [[xx - (e.toX * T - x) * 0.07, yy - (e.toY * T - y) * 0.07], [xx, yy]], e.color, 2.5); A.ellipse(c, xx, yy, 3, 3, e.color);
        } else if (e.type === 'slash') {
          c.lineWidth = 3; c.beginPath(); c.arc(e.toX * T, e.toY * T - 8, 13, -2 + p, 0.5 + p); c.stroke();
        } else if (e.type === 'heal') {
          A.line(c, [[x - 4, y - 24 - p * 14], [x + 4, y - 24 - p * 14]], e.color, 2.5); A.line(c, [[x, y - 28 - p * 14], [x, y - 20 - p * 14]], e.color, 2.5);
        } else if (e.type === 'level') {
          c.font = 'bold 12px Trebuchet MS'; c.textAlign = 'center'; c.fillText(e.text, x, y - 44 - p * 12);
        } else if (e.type === 'bell') {
          for (let i = 0; i < 3; i++) { const radius = Math.max(0, p - i * 0.13) * T * (this.reduced ? 3 : 9); c.lineWidth = 2 - p; c.beginPath(); c.ellipse(x, y, radius, radius * 0.7, 0, 0, Math.PI * 2); c.stroke(); }
        } else if (!this.reduced) {
          for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; A.ellipse(c, x + Math.cos(a) * p * 35, y - 15 + Math.sin(a) * p * 22 - Math.sin(p * Math.PI) * 15, 2.7 * (1 - p), 2.7 * (1 - p), e.color || '#f3dfa7'); }
        }
        c.restore();
      }
    }
    drawBlueprint() {
      const w = this.game.world, action = this.blueprint && this.hover ? { id: this.blueprint, x: this.hover.x, y: this.hover.y } : this.game.pending?.type === 'build' ? this.game.pending : null;
      if (!action) return;
      const c = this.ctx, spec = G.buildings[action.id], valid = !G.placementReason(w, action.id, action.x, action.y);
      c.save(); c.strokeStyle = '#cfe2b552'; c.lineWidth = 1;
      for (let y = 1; y < w.height - 1; y++) for (let x = 1; x < w.width - 1; x++) if (w.explored[y * w.width + x]) c.strokeRect(x * T, y * T, T, T);
      c.fillStyle = valid ? '#cce9a965' : '#ef998465'; c.strokeStyle = valid ? '#edffbb' : '#ffc4ad'; c.lineWidth = 2;
      c.fillRect(action.x * T, action.y * T, spec.w * T, spec.h * T); c.strokeRect(action.x * T, action.y * T, spec.w * T, spec.h * T);
      c.globalAlpha = 0.5; A.building(c, { type: action.id, id: 0, tx: action.x, ty: action.y, x: action.x + spec.w / 2, y: action.y + spec.h / 2, w: spec.w, h: spec.h, hp: spec.hp }, w, w.time); c.restore();
    }
    drawSelection() {
      const s = this.selection, w = this.game.world; if (!s) return;
      const entity = s.kind === 'hero' ? w.heroes.find(h => h.id === s.id) : s.kind === 'building' ? w.buildings.find(b => b.id === s.id) : s.kind === 'lair' ? w.lairs.find(l => l.id === s.id) : s.kind === 'monster' ? w.monsters.find(m => m.id === s.id) : s;
      if (!entity) return;
      const c = this.ctx, x = entity.x * T, y = entity.y * T;
      c.strokeStyle = '#f9e9a7'; c.lineWidth = 2.2; c.setLineDash([4, 4]); c.beginPath(); c.ellipse(x, y + 3, entity.w ? entity.w * 25 : 16, entity.h ? entity.h * 17 : 9, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      if (s.kind === 'hero' && entity.route?.length) {
        c.strokeStyle = '#fff0bf80'; c.lineWidth = 1.5; c.setLineDash([4, 7]); c.beginPath(); c.moveTo(x, y); for (const p of entity.route) c.lineTo(p.x * T, p.y * T); c.stroke(); c.setLineDash([]);
      }
    }
    draw() {
      if (!this.width || !this.camera) return;
      const c = this.ctx, w = this.game.world, time = this.reduced ? 0 : w.time;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.fillStyle = '#294a41'; c.fillRect(0, 0, this.width, this.height);
      c.save(); c.translate(this.width / 2, this.height / 2); c.scale(this.camera.zoom, this.camera.zoom); c.translate(-this.camera.x, -this.camera.y);
      c.drawImage(this.terrain, 0, 0); this.drawFog();
      c.drawImage(this.fog, 0, 0);
      const entities = [
        ...w.buildings.map(value => ({ type: 'building', value })),
        ...w.lairs.filter(l => l.seen).map(value => ({ type: 'lair', value })),
        ...w.heroes.map(value => ({ type: 'hero', value })),
        ...w.monsters.filter(m => G.alive(m) && w.explored[G.index(w, m.x, m.y)]).map(value => ({ type: 'monster', value }))
      ].sort((a, b) => a.value.y - b.value.y);
      this.drawSelection();
      for (const { type, value } of entities) {
        A[type](c, value, w, time);
        const selected = this.selection?.id === value.id;
        if (G.alive(value) && (selected || value.hp < value.maxHp * 0.98)) this.drawBar(value, type === 'building' || type === 'lair' ? 29 : 8, type === 'monster' || type === 'lair' ? '#e7aa8d' : '#c7e2a6');
        if (type === 'hero' && selected) { c.font = 'bold 12px Trebuchet MS'; c.textAlign = 'center'; c.fillStyle = '#fdf1c8'; c.strokeStyle = '#284335'; c.lineWidth = 3; c.strokeText(value.name, value.x * T, value.y * T - 48); c.fillText(value.name, value.x * T, value.y * T - 48); }
      }
      this.drawFlags(); this.drawBlueprint(); this.drawEffects();
      if (!this.reduced) for (let i = 0; i < 14; i++) {
        const x = (A.hash(i, G.seedNumber(w.seed)) * w.width + Math.sin(time * 0.12 + i) * 0.4) * T;
        const y = (A.hash(i + 7, 3) * w.height + Math.cos(time * 0.16 + i) * 0.3) * T;
        if (w.explored[G.index(w, x / T, y / T)]) A.ellipse(c, x, y, 1.8, 1.8, '#ffe6a890');
      }
      c.restore();
      const vignette = c.createRadialGradient(this.width / 2, this.height / 2, this.width * 0.2, this.width / 2, this.height / 2, this.width * 0.8);
      vignette.addColorStop(0, '#19392f00'); vignette.addColorStop(1, '#19392f60'); c.fillStyle = vignette; c.fillRect(0, 0, this.width, this.height);
      this.drawMinimap();
    }
    drawMinimap() {
      const w = this.game.world, c = this.minimap.getContext('2d'), scale = 4;
      for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) { const i = y * w.width + x; c.fillStyle = !w.explored[i] ? '#294a43' : w.terrain[i] === 2 ? '#73a1a3' : '#8da67c'; c.fillRect(x * scale, y * scale, scale, scale); }
      const mark = (entity, color, radius = 2) => { c.fillStyle = color; c.fillRect(entity.x * scale - radius, entity.y * scale - radius, radius * 2, radius * 2); };
      for (const l of w.lairs) if (G.alive(l) && l.seen) mark(l, l.awake ? '#d49391' : '#b8a9ce', 2.5);
      for (const h of w.heroes) if (G.alive(h)) mark(h, '#f6e3b0', 1);
      mark(G.castle(w), '#fff1bb', 3);
      c.strokeStyle = '#f5e9c1bb'; c.lineWidth = 1;
      const topLeft = this.toWorld(0, 0); c.strokeRect(topLeft.x / T * scale, topLeft.y / T * scale, this.width / this.camera.zoom / T * scale, this.height / this.camera.zoom / T * scale);
    }
    updateOverlay() {
      const w = this.game.world, notice = w.notices.at(-1);
      this.toast.hidden = !notice; this.toast.textContent = notice?.text || ''; this.toast.dataset.kind = notice?.kind || '';
      this.bell.disabled = !w.bellCharges || this.game.state !== 'playing'; this.bell.classList.toggle('g-ready', !!w.bellCharges);
      this.bell.querySelector('small').textContent = w.bellCharges ? 'Redo' : (w.bellProgress || 0) + ' / 6';
      this.bell.setAttribute('aria-label', 'Stormklocka, ' + (w.bellCharges ? 'redo' : (w.bellProgress || 0) + ' av 6 rätta svar'));
      this.canvas.style.cursor = this.blueprint ? 'crosshair' : this.down?.dragged ? 'grabbing' : 'grab';
    }
    scoreEvent(e) { if (e.type.startsWith('glantan') || e.type === 'miss') { this.ui.update(); this.updateOverlay(); } }
    destroy() {
      root.cancelAnimationFrame(this.raf); this.resizeObserver.disconnect(); this.listeners.forEach(off => off()); this.game.save(); this.node.remove(); this.original.hidden = false;
    }
  }
  SC.GlantanRenderer = GlantanRenderer;
})(globalThis);
