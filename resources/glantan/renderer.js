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
      this.toast = make('button', 'g-toast'); this.toast.type = 'button'; this.toast.setAttribute('aria-live', 'polite'); this.stage.append(this.toast);
      this.toast.onclick = () => { const notice = this.game.world.notices.at(-1); if (Number.isFinite(notice?.x)) this.focus(notice); };
      this.controls = make('div', 'g-map-controls');
      for (const [glyph, label, action] of [['minus', 'Zooma ut', () => this.zoomBy(0.8)], ['home', 'Till klockborgen', () => this.focus(G.castle(this.game.world))], ['plus', 'Zooma in', () => this.zoomBy(1.25)]]) {
        const button = document.createElement('button'); button.type = 'button'; button.innerHTML = G.icon(glyph, 19); button.title = label; button.setAttribute('aria-label', label); button.onclick = action; this.controls.append(button);
      }
      this.stage.append(this.controls);
      this.bell = make('button', 'g-bell'); this.bell.type = 'button'; this.bell.innerHTML = G.icon('bell', 25) + '<span>Ring</span><span class="g-bell-charge" aria-hidden="true">' + '<i></i>'.repeat(6) + '</span>';
      this.bell.title = 'Samlar mod, läker hjältar och hejdar monster nära borgen. Laddas av 6 rätta svar, även över brutna följder.';
      this.bell.onclick = () => this.game.ringBell(); this.stage.append(this.bell);
      this.minimap = make('canvas', 'g-minimap'); this.minimap.width = 180; this.minimap.height = 140; this.minimap.tabIndex = 0; this.minimap.setAttribute('role', 'button'); this.minimap.setAttribute('aria-label', 'Översiktskarta. Piltangenter flyttar utsnittet, Home återgår till borgen.'); this.stage.append(this.minimap);
      this.ui = new G.Interface(this); this.node.append(this.ui.node, this.stage); canvas.parentElement.append(this.node);
      const U = G.UI;
      this.status = make('div', 'g-status');
      const castleHealth = make('div', 'g-castle-health'); castleHealth.append(U.portrait(game.world, 'building', 'castle', { small: true }), U.icon('tower'));
      this.castleHealth = make('progress', ''); this.castleHealth.setAttribute('aria-label', 'Borgens liv'); castleHealth.append(this.castleHealth);
      const population = make('div', 'g-population'); this.population = make('span', ''); population.append(U.icon('people'), this.population);
      this.goal = make('button', 'g-goal'); this.goal.type = 'button'; this.goal.innerHTML = G.icon('crown') + '<span>Bossboet</span>'; this.goal.setAttribute('aria-label', 'Förstör bossboet för att vinna');
      this.goal.onclick = () => { const boss = this.game.world.lairs.find(l => l.boss && l.seen); if (boss) { this.focus(boss); this.ui.inspect({ kind: 'lair', id: boss.id }); } else document.getElementById('help-open').click(); };
      this.status.append(castleHealth, population, this.goal); canvas.parentElement.querySelector('.hud').insertBefore(this.status, document.getElementById('pause'));
      this.terrainChunks = new Map();
      this.previousPositions = new Map();
      game.simulation.beforeStep = w => {
        this.previousPositions.clear();
        for (const units of [w.heroes, w.skeletons, w.monsters]) for (const unit of units) if (G.alive(unit)) this.previousPositions.set(unit.id, { x: unit.x, y: unit.y });
      };
      // Fog only needs a few texels per tile, rather than a second full world image.
      this.fog = document.createElement('canvas'); this.fog.width = game.world.width * 4; this.fog.height = game.world.height * 4;
      this.minimapTerrain = document.createElement('canvas'); this.minimapTerrain.width = this.minimap.width; this.minimapTerrain.height = this.minimap.height;
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
      this.listen(this.minimap, 'keydown', e => {
        const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (delta) { e.preventDefault(); this.camera.x += delta[0] * T * 5; this.camera.y += delta[1] * T * 5; this.clampCamera(); }
        if (e.key === 'Home' || e.key === 'Enter') { e.preventDefault(); this.focus(G.castle(this.game.world)); }
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
        this.placementPoint = { x: action.x, y: action.y };
        if (!G.placementReason(w, action.id, action.x, action.y) && this.game.choose(action)) { this.blueprint = null; this.selection = null; }
        this.ui.questionKey = ''; this.ui.update(); return;
      }
      const hero = [...w.heroes].filter(G.alive).sort((a, b) => G.distance(a, point) - G.distance(b, point)).find(h => Math.hypot(h.x - point.x, h.y - 0.25 - point.y) < 0.6 / Math.min(1, this.camera.zoom) || Math.abs(h.x - point.x) < .38 && point.y > h.y - (h.classId === 'warrior' && w.research.banner ? 1.3 : ['mage', 'necromancer'].includes(h.classId) ? 1.05 : .9) && point.y < h.y);
      if (hero) { this.ui.inspect({ kind: 'hero', id: hero.id }); return; }
      const skeleton = w.skeletons.find(s => G.alive(s) && Math.hypot(s.x - point.x, s.y - .3 - point.y) < .55 / Math.min(1, this.camera.zoom));
      if (skeleton) { this.ui.inspect({ kind: 'skeleton', id: skeleton.id }); return; }
      // Visible silhouettes stay clickable even when their upper pixels, or a
      // discovered lair's centre, extend into an unrevealed tile.
      const monster = w.monsters.filter(m => G.alive(m) && w.explored[G.index(w, m.x, m.y)]).sort((a, b) => b.y - a.y).find(m => Math.abs(m.x - point.x) < (G.flying(m) ? .7 : .43) * A.monsterScale(m) && point.y > m.y - (m.boss || G.flying(m) ? 1.1 : ['husher', 'binder', 'mender', 'thornling', 'boneservant'].includes(m.type) ? .95 : .7) * A.monsterScale(m) && point.y < m.y + 0.35);
      if (monster) { this.ui.inspect({ kind: 'monster', id: monster.id }); return; }
      const buildings = w.buildings.filter(b => G.footprint(b, point.x, point.y) ||
        G.alive(b) && Math.abs(point.x - b.x) < b.w * .38 && point.y > b.y - (b.type === 'castle' ? 1.9 : ['spire', 'beacon'].includes(b.type) ? 1.8 : 1.4) && point.y < b.y + .4);
      const building = buildings.find(G.alive) || buildings.at(-1);
      if (building) { this.ui.inspect({ kind: 'building', id: building.id }); return; }
      const lair = w.lairs.find(b => b.seen && (G.footprint(b, point.x, point.y) || G.alive(b) && Math.abs(point.x - b.x) < 0.85 && point.y > b.y - (b.boss ? 2.15 : 1.6) && point.y < b.y + .4));
      if (lair) { this.ui.inspect({ kind: 'lair', id: lair.id }); return; }
      for (const [kind, items] of [['trap', w.traps], ['corpse', w.corpses]]) {
        const item = items.find(e => w.explored[G.index(w, e.x, e.y)] && G.distance(e, point) < .4 / Math.min(1, this.camera.zoom));
        if (item) { this.ui.inspect({ kind, id: item.id }); return; }
      }
      this.ui.inspect({ kind: 'ground', x: Math.floor(point.x) + 0.5, y: Math.floor(point.y) + 0.5 });
    }
    viewBounds(padding = 0) {
      const w = this.game.world, a = this.toWorld(0, 0), b = this.toWorld(this.width, this.height);
      return { x0: G.clamp(Math.floor(a.x / T) - padding, 0, w.width), y0: G.clamp(Math.floor(a.y / T) - padding, 0, w.height), x1: G.clamp(Math.ceil(b.x / T) + padding, 0, w.width), y1: G.clamp(Math.ceil(b.y / T) + padding, 0, w.height) };
    }
    drawTerrain() {
      const w = this.game.world, view = this.viewBounds(), chunkSize = 12;
      const scale = this.camera.zoom < 0.65 ? 0.5 : 1, used = new Set();
      for (let cy = Math.floor(view.y0 / chunkSize); cy < Math.ceil(view.y1 / chunkSize); cy++) {
        for (let cx = Math.floor(view.x0 / chunkSize); cx < Math.ceil(view.x1 / chunkSize); cx++) {
          const key = cx + ':' + cy + ':' + scale; used.add(key);
          let chunk = this.terrainChunks.get(key);
          const x = cx * chunkSize, y = cy * chunkSize, width = Math.min(chunkSize, w.width - x), height = Math.min(chunkSize, w.height - y);
          if (!chunk) {
            // Padding allows trees and ridges to cross the cache seam naturally.
            const region = { x: Math.max(0, x - 2), y: Math.max(0, y - 2), width: width + 4, height: height + 4, scale };
            region.width = Math.min(w.width, x + width + 2) - region.x; region.height = Math.min(w.height, y + height + 2) - region.y;
            const canvas = document.createElement('canvas'); A.terrain(canvas, w, region);
            chunk = { canvas, x: region.x, y: region.y }; this.terrainChunks.set(key, chunk);
          }
          this.ctx.drawImage(chunk.canvas, (x - chunk.x) * T * scale, (y - chunk.y) * T * scale, width * T * scale, height * T * scale, x * T, y * T, width * T, height * T);
        }
      }
      // Keep one viewport only: visiting a large map never accumulates giant bitmaps.
      for (const [key, chunk] of this.terrainChunks) if (!used.has(key)) { chunk.canvas.width = chunk.canvas.height = 0; this.terrainChunks.delete(key); }
    }
    drawFog() {
      const w = this.game.world;
      if (this.fogKey === w.fogRevision) return;
      this.fogKey = w.fogRevision;
      const c = this.fog.getContext('2d'); c.clearRect(0, 0, this.fog.width, this.fog.height);
      for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) if (!w.explored[y * w.width + x]) {
        c.fillStyle = A.hash(x, y) > 0.5 ? '#29473f' : '#294940'; c.fillRect(x * 4, y * 4, 4, 4);
      }
    }
    drawBar(entity, yOffset = 0, color = '#bbdc97') {
      const c = this.ctx, x = entity.x * T, y = entity.y * T + yOffset;
      const width = entity.boss ? entity.w ? 62 : 36 : entity.w ? 44 : 23;
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
    drawEffects(view) {
      const c = this.ctx, w = this.game.world;
      for (const e of w.effects) {
        const padding = e.type === 'bell' ? 10 : 3;
        if (Math.max(e.x, e.toX ?? e.x) + padding < view.x0 || Math.min(e.x, e.toX ?? e.x) - padding > view.x1 || Math.max(e.y, e.toY ?? e.y) + padding < view.y0 || Math.min(e.y, e.toY ?? e.y) - padding > view.y1) continue;
        const p = Math.max(0, e.age - this.renderDelay) / e.duration, x = e.x * T, y = e.y * T;
        c.save(); c.globalAlpha = Math.min(1, (1 - p) * 2); c.strokeStyle = c.fillStyle = e.color || '#f3dfab';
        if (e.type === 'spell') A.spell(c, e, p, this.reduced);
        else if (e.type === 'raise' || e.type === 'snare') A.ritual(c, e, p, this.reduced);
        else if (e.type === 'bolt') {
          const xx = x + (e.toX * T - x) * Math.min(1, p * 1.6), yy = y + (e.toY * T - y) * Math.min(1, p * 1.6) - 11;
          A.line(c, [[xx - (e.toX * T - x) * 0.07, yy - (e.toY * T - y) * 0.07], [xx, yy]], e.color, e.heavy ? 4 : 2.5); A.ellipse(c, xx, yy, e.heavy ? 4 : 3, 3, e.color);
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
      const w = this.game.world, point = this.hover || this.placementPoint, action = this.blueprint && point ? { id: this.blueprint, x: point.x, y: point.y } : this.game.pending?.type === 'build' ? this.game.pending : null;
      if (!action) return;
      const c = this.ctx, spec = G.buildings[action.id], valid = !G.placementReason(w, action.id, action.x, action.y);
      c.save(); c.strokeStyle = '#cfe2b552'; c.lineWidth = 1;
      const view = this.viewBounds(1);
      for (let y = view.y0; y < view.y1; y++) for (let x = view.x0; x < view.x1; x++) if (w.explored[y * w.width + x]) c.strokeRect(x * T, y * T, T, T);
      c.fillStyle = valid ? '#cce9a965' : '#ef998465'; c.strokeStyle = valid ? '#edffbb' : '#ffc4ad'; c.lineWidth = 2;
      c.fillRect(action.x * T, action.y * T, spec.w * T, spec.h * T); c.strokeRect(action.x * T, action.y * T, spec.w * T, spec.h * T);
      for (let y = action.y; y < action.y + spec.h; y++) for (let x = action.x; x < action.x + spec.w; x++) {
        const blocked = !G.inside(w, x, y) || !w.explored[G.index(w, x, y)] || G.tile(w, x, y) !== 0 || G.occupant(w, x, y);
        if (blocked) { c.fillStyle = '#b9474466'; c.fillRect(x * T, y * T, T, T); A.line(c, [[x * T + 12, y * T + 12], [(x + 1) * T - 12, (y + 1) * T - 12]], '#ffe6ce', 3); A.line(c, [[x * T + 12, (y + 1) * T - 12], [(x + 1) * T - 12, y * T + 12]], '#ffe6ce', 3); }
      }
      c.globalAlpha = 0.5; A.building(c, { type: action.id, id: 0, tx: action.x, ty: action.y, x: action.x + spec.w / 2, y: action.y + spec.h / 2, w: spec.w, h: spec.h, hp: spec.hp }, w, w.time);
      c.globalAlpha = 1; const x = (action.x + spec.w / 2) * T, y = (action.y + spec.h) * T + 13;
      A.ellipse(c, x, y, 13, 13, valid ? '#33572e' : '#803d35');
      if (valid) A.line(c, [[x - 7, y], [x - 2, y + 5], [x + 7, y - 5]], '#fff2d2', 3);
      else { A.line(c, [[x - 5, y - 5], [x + 5, y + 5]], '#fff2d2', 3); A.line(c, [[x + 5, y - 5], [x - 5, y + 5]], '#fff2d2', 3); }
      c.restore();
    }
    drawSelection() {
      const s = this.selection, w = this.game.world; if (!s) return;
      const lists = { hero: w.heroes, building: w.buildings, lair: w.lairs, monster: w.monsters, skeleton: w.skeletons, corpse: w.corpses, trap: w.traps };
      const found = lists[s.kind] ? lists[s.kind].find(e => e.id === s.id) : s;
      const entity = found && this.renderUnit(found);
      if (!entity) return;
      const c = this.ctx, x = entity.x * T, y = entity.y * T;
      c.strokeStyle = '#f9e9a7'; c.lineWidth = 2.2; c.setLineDash([4, 4]); c.beginPath(); c.ellipse(x, y + 3, entity.w ? entity.w * 25 : 16, entity.h ? entity.h * 17 : 9, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      if (s.kind === 'hero' && entity.route?.length) {
        c.strokeStyle = '#fff0bf80'; c.lineWidth = 1.5; c.setLineDash([4, 7]); c.beginPath(); c.moveTo(x, y); for (const p of entity.route) c.lineTo(p.x * T, p.y * T); c.stroke(); c.setLineDash([]);
      }
    }
    draw() {
      if (!this.width || !this.camera) return;
      const c = this.ctx, w = this.game.world;
      this.renderAlpha = this.game.state === 'playing' ? G.clamp(this.game.simulation.accumulator / G.STEP, 0, 1) : 1;
      this.renderDelay = (1 - this.renderAlpha) * G.STEP;
      const time = this.reduced ? 0 : Math.max(0, w.time - this.renderDelay);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.fillStyle = '#294a41'; c.fillRect(0, 0, this.width, this.height);
      c.save(); c.translate(this.width / 2, this.height / 2); c.scale(this.camera.zoom, this.camera.zoom); c.translate(-this.camera.x, -this.camera.y);
      this.drawTerrain(); this.drawFog();
      c.imageSmoothingEnabled = true; c.drawImage(this.fog, 0, 0, w.width * T, w.height * T);
      const view = this.viewBounds(3);
      const visible = entity => entity.x >= view.x0 && entity.x <= view.x1 && entity.y >= view.y0 && entity.y <= view.y1;
      for (const corpse of w.corpses) if (visible(corpse) && w.explored[G.index(w, corpse.x, corpse.y)]) A.corpse(c, corpse);
      for (const trap of w.traps) if (visible(trap)) A.trap(c, trap, w);
      const entities = [
        ...w.buildings.map(value => ({ type: 'building', value })),
        ...w.lairs.filter(l => l.seen).map(value => ({ type: 'lair', value })),
        ...w.heroes.map(value => ({ type: 'hero', value })),
        ...w.skeletons.filter(G.alive).map(value => ({ type: 'skeleton', value })),
        ...w.monsters.filter(m => G.alive(m) && w.explored[G.index(w, m.x, m.y)]).map(value => ({ type: 'monster', value }))
      ].filter(e => visible(e.value)).sort((a, b) => a.value.y - b.value.y);
      this.drawSelection();
      for (const entity of entities) {
        const { type } = entity, value = this.renderUnit(entity.value);
        A[type](c, value, w, time);
        if (G.alive(value) && !value.w) A.status(c, value, w);
        const selected = this.selection?.id === value.id;
        if (G.alive(value) && (selected || value.hp < value.maxHp * 0.98)) this.drawBar(value, type === 'building' || type === 'lair' ? 29 : 8, type === 'monster' || type === 'lair' ? '#e7aa8d' : '#c7e2a6');
        if (type === 'hero' && selected) { const y = value.y * T - (value.classId === 'mage' ? 66 : 57); c.font = 'bold 12px Trebuchet MS'; c.textAlign = 'center'; c.fillStyle = '#fff1ce'; c.strokeStyle = '#20372e'; c.lineWidth = 3; c.strokeText(value.name, value.x * T, y); c.fillText(value.name, value.x * T, y); }
      }
      this.drawFlags(); this.drawBlueprint(); this.drawEffects(view);
      for (const notice of w.notices) if (Number.isFinite(notice.x) && w.explored[G.index(w, notice.x, notice.y)]) {
        c.strokeStyle = '#ffdc92'; c.lineWidth = 3 / this.camera.zoom; c.beginPath(); c.arc(notice.x * T, notice.y * T, this.reduced ? 42 : 36 + Math.sin(w.time * 4) * 6, 0, Math.PI * 2); c.stroke();
      }
      if (!this.reduced) for (let i = 0; i < 14; i++) {
        const x = (A.hash(i, G.seedNumber(w.seed)) * w.width + Math.sin(time * 0.12 + i) * 0.4) * T;
        const y = (A.hash(i + 7, 3) * w.height + Math.cos(time * 0.16 + i) * 0.3) * T;
        if (w.explored[G.index(w, x / T, y / T)]) A.ellipse(c, x, y, 1.8, 1.8, '#ffe6a890');
      }
      c.restore();
      const vignette = c.createRadialGradient(this.width / 2, this.height / 2, this.width * 0.2, this.width / 2, this.height / 2, this.width * 0.8);
      vignette.addColorStop(0, '#19392f00'); vignette.addColorStop(1, '#19392f38'); c.fillStyle = vignette; c.fillRect(0, 0, this.width, this.height);
      this.drawMinimap();
    }
    renderUnit(unit) {
      const previous = this.previousPositions.get(unit.id);
      if (!previous || this.renderAlpha === 1 || G.distance(previous, unit) > 3) return unit;
      return { ...unit, x: previous.x + (unit.x - previous.x) * this.renderAlpha, y: previous.y + (unit.y - previous.y) * this.renderAlpha };
    }
    drawMinimap() {
      const w = this.game.world, c = this.minimap.getContext('2d'), sx = this.minimap.width / w.width, sy = this.minimap.height / w.height;
      const frameKey = [w.tick, w.revision, w.fogRevision, this.camera.x, this.camera.y, this.camera.zoom, this.width, this.height].join(':');
      if (frameKey === this.minimapFrameKey) return;
      this.minimapFrameKey = frameKey;
      if (this.minimapKey !== w.fogRevision) {
        this.minimapKey = w.fogRevision; const base = this.minimapTerrain.getContext('2d');
        const colors = ['#9ab780', '#76965e', '#397daf', '#798485', '#afb3a3', '#315940'];
        for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) {
          const i = y * w.width + x; base.fillStyle = !w.explored[i] ? '#233e36' : colors[w.terrain[i]]; base.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
        }
      }
      c.drawImage(this.minimapTerrain, 0, 0);
      const mark = (entity, color, radius = 2) => { c.fillStyle = color; c.fillRect(entity.x * sx - radius, entity.y * sy - radius, radius * 2, radius * 2); };
      for (const l of w.lairs) if (G.alive(l) && l.seen) {
        if (l.boss) {
          A.polygon(c, [[l.x * sx, l.y * sy - 5], [l.x * sx + 5, l.y * sy], [l.x * sx, l.y * sy + 5], [l.x * sx - 5, l.y * sy]], '#ffe0a7');
          mark(l, '#c51e30', 2.8);
        } else {
          mark(l, '#431e25', 3.2); mark(l, l.awake ? '#ff3545' : '#b82b3c', 2.5);
        }
      }
      for (const m of w.monsters) if (G.alive(m) && w.explored[G.index(w, m.x, m.y)]) {
        const radius = m.boss ? 2 : 1.4; mark(m, '#431e25', radius + .6); mark(m, '#ff3545', radius);
      }
      for (const h of w.heroes) if (G.alive(h)) mark(h, '#fff0bf', 1.3);
      for (const s of w.skeletons) if (G.alive(s)) mark(s, '#b3f4db', .8);
      mark(G.castle(w), '#fff1bb', 3);
      for (const notice of w.notices) if (Number.isFinite(notice.x) && w.explored[G.index(w, notice.x, notice.y)]) { c.strokeStyle = '#ffe69e'; c.lineWidth = 2; c.beginPath(); c.arc(notice.x * sx, notice.y * sy, 6, 0, Math.PI * 2); c.stroke(); }
      c.strokeStyle = '#fff3c9'; c.lineWidth = 1;
      const topLeft = this.toWorld(0, 0); c.strokeRect(topLeft.x / T * sx, topLeft.y / T * sy, this.width / this.camera.zoom / T * sx, this.height / this.camera.zoom / T * sy);
    }
    updateOverlay() {
      const w = this.game.world, notice = w.notices.at(-1);
      this.toast.hidden = !notice; this.toast.textContent = notice?.text || ''; this.toast.dataset.kind = notice?.kind || '';
      this.toast.disabled = !Number.isFinite(notice?.x);
      this.bell.disabled = !w.bellCharges || this.game.state !== 'playing'; this.bell.classList.toggle('g-ready', !!w.bellCharges);
      [...this.bell.querySelectorAll('i')].forEach((pip, i) => pip.classList.toggle('filled', !!w.bellCharges || i < w.bellProgress));
      this.bell.setAttribute('aria-label', 'Stormklocka, ' + (w.bellCharges ? 'redo' : (w.bellProgress || 0) + ' av 6 rätta svar'));
      this.castleHealth.max = G.castle(w).maxHp; this.castleHealth.value = G.castle(w).hp;
      this.population.textContent = G.population(w) + ' / ' + G.capacity(w); this.population.setAttribute('aria-label', G.population(w) + ' av ' + G.capacity(w) + ' platser');
      this.canvas.style.cursor = this.blueprint ? 'crosshair' : this.down?.dragged ? 'grabbing' : 'grab';
    }
    scoreEvent(e) { if (e.type.startsWith('glantan') || e.type === 'miss') { this.ui.update(); this.updateOverlay(); } }
    destroy() {
      this.game.simulation.beforeStep = null;
      this.game.soundscape?.destroy();
      for (const chunk of this.terrainChunks.values()) chunk.canvas.width = chunk.canvas.height = 0;
      this.terrainChunks.clear(); this.fog.width = this.fog.height = 0;
      root.cancelAnimationFrame(this.raf); this.resizeObserver.disconnect(); this.listeners.forEach(off => off()); this.game.save(); this.status.remove(); this.node.remove(); this.original.hidden = false;
    }
  }
  SC.GlantanRenderer = GlantanRenderer;
})(globalThis);
