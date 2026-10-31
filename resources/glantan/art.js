/* Small, hand-drawn canvas illustrations. Visual randomness never touches simulation RNG. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  const paths = {
    shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z M12 7v10 M8 11h8',
    bow: 'M5 3q19 9 0 18l5-9Z M4 12h17m-4-3 4 3-4 3',
    skull: 'M6 16C0 9 4 2 12 2s12 7 6 14v5H6ZM8 10h1m6 0h1M10 16v5m4-5v5M12 12l-1 2h2Z',
    trap: 'M3 8l3 4 3-4 3 4 3-4 3 4 3-4M3 16l3-4 3 4 3-4 3 4 3-4 3 4M3 8a10 7 0 0 0 18 0M3 16a10 7 0 0 1 18 0',
    wing: 'M12 12C8 1 4 3 2 5l2 11 4-2 4 7 4-7 4 2 2-11c-2-2-6-4-10 7Z',
    leaf: 'M20 3C7 2 1 11 7 17S22 16 20 3ZM4 21 16 8 M8 16v-5m4 1h5',
    chime: 'M7 3v8a5 5 0 0 0 10 0V3M12 16v6 M4 6h3m10 0h3 M10 3v6m4-6v6',
    bell: 'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4ZM10 20a2 2 0 0 0 4 0 M12 2v2',
    house: 'm2 11 10-8 10 8M5 9v12h14V9 M10 21v-7h4v7',
    tower: 'M6 21V9L4 6V3h4v3h3V3h3v3h3V3h3v3l-2 3v12ZM10 21v-6h4v6',
    sun: 'M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
    tree: 'M12 3 4 13h4l-4 5h16l-4-5h4ZM12 18v4',
    hammer: 'm5 4 4-2 8 7-4 5-3-3-7 10-2-2 7-10Z M18 5l3-2',
    boot: 'M8 3h9v10l4 4v4H4v-5l4-3ZM8 8h5m-5 4h5',
    compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M16 7l-2 7-7 3 3-7Z',
    snow: 'M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3m-6 16 3-3 3 3',
    star: 'm12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z',
    gear: 'M9 3h6l1 4 4 1v7l-4 1-1 5H9l-1-5-4-1V8l4-1ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    spore: 'M3 13C1 0 23 0 21 13ZM9 13v8h6v-8 M7 8h1m7-2h1m1 4h1',
    moon: 'M19 17A9 9 0 0 1 7 4 9 9 0 1 0 19 17Z',
    flag: 'M5 22V3m0 0c6-4 8 4 15 0v10c-7 4-9-4-15 0',
    heart: 'M12 21 3 12C-2 4 9 0 12 7 15 0 26 4 21 12Z',
    heal: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
    people: 'M9 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M16 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0M2 21v-5a4 4 0 0 1 8 0v5m4 0v-5a4 4 0 0 1 8 0v5',
    sword: 'm3 21 5-5m-3-3 6 6M8 14 19 3l2 2-1 5L11 18',
    book: 'M12 21c-3-3-7-3-10-2V4c4-1 7-1 10 2 3-3 6-3 10-2v15c-3-1-7-1-10 2ZM12 6v15',
    plus: 'M12 4v16M4 12h16', home: 'm2 11 10-8 10 8M5 9v12h14V9',
    minus: 'M4 12h16', close: 'm5 5 14 14M5 19 19 5', check: 'm4 12 5 5L20 5',
    repair: 'm3 21 9-9m2-9a6 6 0 0 0-3 9 6 6 0 0 0 9-3l-4 1-3-3Z',
    arrow: 'M3 12h18m-6-6 6 6-6 6', revive: 'M5 8a8 8 0 1 1-1 9M3 3v6h6M12 8v8m-4-4h8',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    lock: 'M6 10h12v11H6ZM8 10V7a4 4 0 0 1 8 0v3 M12 14v3',
    crown: 'm3 7 4 4 5-8 5 8 4-4-2 12H5ZM5 22h14',
    clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 6v6l4 2'
  };
  G.icon = (name, size = 20) => '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + (paths[name] || paths.star) + '"/></svg>';
  const hash = (x, y, n = 0) => { let v = Math.imul(x + n * 37, 374761393) + Math.imul(y + 11, 668265263); v = Math.imul(v ^ v >>> 13, 1274126177); return ((v ^ v >>> 16) >>> 0) / 4294967296; };
  const ellipse = (c, x, y, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  const line = (c, points, color, width = 2) => { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); };
  const polygon = (c, points, color, outline) => { c.fillStyle = color; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); if (outline) { c.strokeStyle = outline; c.lineWidth = 1.6; c.lineJoin = 'round'; c.stroke(); } };
  const round = (c, x, y, w, h, r, color, outline) => { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); if (outline) { c.strokeStyle = outline; c.lineWidth = 1.6; c.stroke(); } };
  const A = G.Art = { tile: 48, hash, ellipse, line, polygon, round };
  A.tree = function(c, x, y, size, seed) {
    c.save(); c.translate(x, y); c.scale(size, size);
    ellipse(c, 4, 3, 15, 7, '#244b3b30');
    round(c, -2, -23, 5, 25, 2, '#766046');
    const colors = ['#254a36', '#3d7046', '#639354'];
    for (let i = 0; i < 3; i++) {
      const r = 14 - i * 2.2, cy = -18 - i * 9;
      polygon(c, [[-r, cy + 5], [-r * 0.7, cy - 5], [-3, cy - 18], [r * 0.8, cy - 5], [r, cy + 5], [0, cy + 9]], colors[i]);
      line(c, [[-r * 0.55, cy - 4], [-3, cy - 13], [r * 0.15, cy - 5]], '#a5bf7940', 2);
    }
    if (seed > 0.72) ellipse(c, 0, -27, 3, 2, '#d2bb72');
    c.restore();
  };
  // Optional tile region keeps large worlds off a single oversized canvas.
  A.terrain = function(canvas, w, region = {}) {
    const t = A.tile, x0 = region.x || 0, y0 = region.y || 0;
    const x1 = Math.min(w.width, x0 + (region.width || w.width)), y1 = Math.min(w.height, y0 + (region.height || w.height));
    const scale = region.scale || 1;
    canvas.width = Math.ceil((x1 - x0) * t * scale); canvas.height = Math.ceil((y1 - y0) * t * scale);
    const c = canvas.getContext('2d'); c.scale(scale, scale); c.translate(-x0 * t, -y0 * t);
    const greens = ['#8eab75', '#a2ad75', '#82ad96'][w.mood];
    const tile = (x, y) => w.terrain[y * w.width + x];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const type = tile(x, y), px = x * t, py = y * t;
      c.fillStyle = type === 2 ? '#226b9d' : type === 5 ? '#244a34' : type >= 3 ? '#687774' : greens; c.fillRect(px, py, t + 1, t + 1);
      if (type === 2) {
        polygon(c, [[px, py + 20], [px + 27, py + 13], [px + 48, py + 24], [px + 48, py + 48], [px, py + 48]], '#24648f44');
        for (let n = 0; n < 3; n++) {
          const xx = px + 5 + hash(x, y, n) * 25, yy = py + 8 + hash(y, x, n + 4) * 32;
          line(c, [[xx, yy], [xx + 4, yy + 1], [xx + 13, yy]], '#93d4e18c', 1.6);
        }
        // A dark recessed bank and pale waterline distinguish blocked water at a glance.
        const banks = [
          [0, -1, [[px, py + 2], [px + t, py + 2]]], [0, 1, [[px, py + t - 2], [px + t, py + t - 2]]],
          [-1, 0, [[px + 2, py], [px + 2, py + t]]], [1, 0, [[px + t - 2, py], [px + t - 2, py + t]]]
        ];
        for (const [dx, dy, points] of banks) if (tile(x + dx, y + dy) !== 2) {
          line(c, points, '#173e59', 7); line(c, points, '#b9d9cd', 2);
        }
        continue;
      }
      if (type === 4) {
        const peak = 7 + hash(x, y, 7) * 23, high = 3 + hash(x, y, 11) * 24;
        ellipse(c, px + 27, py + 38, 25, 10, '#293c3b55');
        polygon(c, [[px - 4, py + 47], [px + peak - 12, py + 14], [px + peak, py - high], [px + 51, py + 47]], hash(x, y, 4) > 0.5 ? '#a2ada4' : '#919f98');
        polygon(c, [[px + peak, py - high], [px + 51, py + 47], [px + 24, py + 36], [px + peak - 5, py + 17]], '#65747b');
        if (high > 12) polygon(c, [[px + peak - 7, py + 1], [px + peak, py - high], [px + peak + 10, py + 3], [px + peak + 2, py], [px + peak - 2, py + 9]], '#dde0cc');
        line(c, [[px + 6, py + 39], [px + peak - 9, py + 22], [px + peak - 5, py + 27]], '#c6ccb5', 1.5);
        continue;
      }
      if (type === 5) {
        ellipse(c, px + 24, py + 26, 23, 19, '#1c3e2e80');
        continue;
      }
      ellipse(c, px + 24, py + 26, 17 + hash(x, y) * 10, 9 + hash(y, x) * 10, '#b0bb7b0b');
      for (let n = 0; n < 5; n++) {
        const xx = px + hash(x, y, n + 2) * 48, yy = py + hash(y, x, n + 6) * 48;
        line(c, [[xx - 2, yy], [xx, yy - 4], [xx + 1, yy]], '#506e4930', 1);
        if (type === 0 && hash(x, y, n + 22) > 0.89) ellipse(c, xx, yy - 4, 1.7, 1.5, w.mood === 1 ? '#eed691' : '#eadbb4');
      }
      if (type === 3) {
        polygon(c, [[px + 4, py + 36], [px + 10, py + 12], [px + 27, py + 6], [px + 44, py + 27], [px + 35, py + 42]], '#718575');
        line(c, [[px + 10, py + 12], [px + 27, py + 6], [px + 33, py + 21]], '#b6bdac', 2);
      }
    }
    for (let y = Math.max(1, y0); y < Math.min(w.height - 1, y1); y++) for (let x = Math.max(1, x0); x < Math.min(w.width - 1, x1); x++) if (w.paths[y * w.width + x]) {
      const point = (xx, yy) => [xx * t + 24 + (hash(xx, yy, 2) - 0.5) * 8, yy * t + 24 + (hash(yy, xx, 3) - 0.5) * 8];
      for (const [dx, dy] of [[1, 0], [0, 1]]) if (w.paths[(y + dy) * w.width + x + dx]) {
        line(c, [point(x, y), point(x + dx, y + dy)], '#455a3b65', 19);
        line(c, [point(x, y), point(x + dx, y + dy)], '#d0bd89', 13);
      }
      const p = point(x, y); ellipse(c, p[0] + 3, p[1] + 2, 2.5, 1.3, '#d3cca7');
    }
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const type = tile(x, y);
      if (type === 1) A.tree(c, x * t + 18 + hash(x, y, 4) * 12, y * t + 31 + hash(x, y, 5) * 10, 0.7 + hash(x, y, 12) * 0.35, hash(x, y));
      if (type === 5) {
        for (let i = 0; i < 4; i++) {
          const xx = x * t + 3 + i % 2 * 25 + hash(x, y, i + 20) * 8, yy = y * t + 19 + Math.floor(i / 2) * 24 + hash(x, y, i + 30) * 8;
          A.tree(c, xx, yy, 0.95 + hash(x, y, i + 8) * 0.25, 0);
        }
        line(c, [[x * t + 5, y * t + 42], [x * t + 17, y * t + 35], [x * t + 29, y * t + 45]], '#b6b78b70', 1.4);
      }
    }
  };
  function roof(c, width, height, color) {
    polygon(c, [[-width / 2 - 5, 0], [0, -height], [width / 2 + 7, 0], [width / 2, 9], [-width / 2, 9]], '#424e3c');
    polygon(c, [[-width / 2 - 5, -2], [0, -height], [width / 2 + 7, -2]], color, '#334039');
    polygon(c, [[0, -height], [width / 2 + 7, -2], [0, 2]], '#243b3330');
    for (let yy = -height + 10; yy < 0; yy += 8) { const ww = width / 2 * (1 + yy / height); line(c, [[-ww, yy], [ww, yy]], '#20382f35', 1.4); }
    line(c, [[-width / 2 - 4, -2], [0, -height], [width / 2 + 6, -2]], '#f4e2a760', 2);
  }
  function window(c, x, y, size = 9) {
    round(c, x - size / 2, y, size, size * 1.2, 2, '#293d37');
    round(c, x - size / 2 + 1.5, y + 1.5, size - 3, size * 1.2 - 3, 1, '#ffe4a3');
    line(c, [[x, y + 1], [x, y + size]], '#746b4f', 1);
  }
  // The same large, simple role symbols appear on the buildings and in the UI.
  // Silhouette and equipment still identify a role when its colour is hard to see.
  function emblem(c, x, y, kind, color, size = 10) {
    c.save(); c.translate(x, y); c.scale(size / 10, size / 10);
    round(c, -12, -12, 24, 24, 4, '#243b3c', '#efdcab');
    if (kind === 'shield') {
      polygon(c, [[-7, -7], [7, -7], [6, 3], [0, 9], [-6, 3]], color);
      line(c, [[0, -4], [0, 5]], '#243b3c', 2);
    } else if (kind === 'bow') {
      line(c, [[-5, -8], [3, -4], [6, 0], [3, 4], [-5, 8], [-5, -8]], color, 2);
      line(c, [[-8, 0], [9, 0], [5, -4]], color, 2);
    } else if (kind === 'heal') {
      polygon(c, [[-3, -9], [3, -9], [3, -3], [9, -3], [9, 3], [3, 3], [3, 9], [-3, 9], [-3, 3], [-9, 3], [-9, -3], [-3, -3]], color);
    } else if (kind === 'chime') {
      line(c, [[-6, -9], [-6, 0], [0, 4], [6, 0], [6, -9]], color, 3);
      line(c, [[0, 3], [0, 10]], color, 2.5); ellipse(c, 0, -3, 2, 2, '#e9f6ff');
    } else if (kind === 'skull') {
      ellipse(c, 0, -2, 8, 8, color); round(c, -5, 1, 10, 8, 2, color);
      for (const side of [-1, 1]) ellipse(c, side * 3, -2, 2, 2.5, '#243b3c');
      line(c, [[-2, 5], [-2, 9]], '#243b3c', 1); line(c, [[2, 5], [2, 9]], '#243b3c', 1);
    }
    c.restore();
  }
  A.building = function(c, b, w, time) {
    const t = A.tile, x = b.x * t, y = b.y * t, ink = '#304039';
    c.save(); c.translate(x, y);
    if (b.hp <= 0) {
      ellipse(c, 0, 2, b.w * 17, b.h * 10, '#52634480');
      for (let i = 0; i < 6; i++) round(c, (hash(b.id, i) - 0.5) * 55, (hash(i, b.id) - 0.5) * 28, 9, 7, 2, '#989c7b');
      c.restore(); return;
    }
    const width = b.w * 32, depth = b.h * 16;
    ellipse(c, 6, depth * 0.4, width * 0.63, depth * 0.64, '#20383155');
    round(c, -width / 2 - 3, -depth / 2, width + 6, depth + 9, 5, '#a3a17d', '#596c4d');
    if (b.type === 'castle') {
      round(c, -31, -27, 62, 49, 4, '#bfc2a9', ink);
      round(c, -23, -15, 46, 36, 2, '#f0dcaf');
      for (const xx of [-33, 24]) {
        round(c, xx, -30, 11, 48, 2, '#bdc8b1', ink);
        polygon(c, [[xx - 4, -31], [xx + 5, -44], [xx + 15, -31]], '#286a60', ink);
      }
      round(c, -10, -60, 20, 47, 3, '#f2deaa', ink);
      round(c, -6, -51, 12, 23, 6, '#354f46');
      c.save(); c.translate(0, -39); c.rotate(w.bellUntil > time ? Math.sin(time * 14) * 0.25 : Math.sin(time * 1.4) * 0.025);
      polygon(c, [[-7, 7], [-5, -5], [-2, -8], [3, -8], [6, -5], [8, 7]], '#e6bb68'); ellipse(c, 0, 8, 8, 2.3, '#ffe19a'); ellipse(c, 0, 11, 2, 2, '#805d36'); c.restore();
      polygon(c, [[-16, -59], [0, -78], [16, -59]], '#287667', ink);
      line(c, [[0, -76], [0, -90]], '#a58854', 2);
      polygon(c, [[1, -90], [17 + Math.sin(time * 2) * 2, -86], [1, -80]], '#e9c675');
      round(c, -9, 1, 18, 22, [8, 8, 0, 0], '#4e5d47'); window(c, -19, -6, 8); window(c, 20, -6, 8);
      if (w.research.castle2) { ellipse(c, 0, -70, 5, 5, '#f5df9c'); line(c, [[0, -74], [0, -69], [3, -67]], '#647365', 1.2); }
    } else if (b.type === 'house') {
      round(c, -31, -19, 62, 39, 3, '#f2d6a4', ink);
      round(c, 17, -49, 10, 29, 1, '#8f634f', ink);
      c.save(); c.translate(0, -19); roof(c, 64, 26, '#b55438'); c.restore();
      round(c, -8, -2, 16, 22, [7, 7, 0, 0], '#624730', ink); ellipse(c, 4, 11, 1.4, 1.4, '#ffe1a4');
      for (const xx of [-21, 21]) { window(c, xx, -7, 10); round(c, xx - 7, 9, 14, 5, 1, '#547c44'); }
      for (let i = 0; i < 3; i++) ellipse(c, 22 + Math.sin(time + i) * 3, -55 - (time * 7 + i * 12) % 25, 3 + i, 3 + i, '#f5ebd34a');
    } else if (b.type === 'hall') {
      // A fortified gatehouse, not another cottage: battlements and a broad shield.
      round(c, -29, -30, 58, 52, 2, '#c9c5ad', ink);
      round(c, -10, -4, 20, 27, [9, 9, 0, 0], '#304039');
      for (const xx of [-32, 21]) {
        round(c, xx, -42, 12, 63, 2, '#e0d4b4', ink);
        for (let i = 0; i < 3; i++) round(c, xx - 2 + i * 5, -48, 4, 9, 1, '#dfd2ad', ink);
        line(c, [[xx + 5, -24], [xx + 5, -14]], '#37463d', 2.5);
      }
      line(c, [[-18, -34], [18, -34]], '#a87a30', 5);
      for (const xx of [-14, 14]) { line(c, [[xx, -7], [xx, 18]], '#6b5638', 2); polygon(c, [[xx - 3, -5], [xx, -12], [xx + 3, -5]], '#dce4df', ink); }
      emblem(c, 0, -26, 'shield', '#f2c65b', 12);
    } else if (b.type === 'lodge') {
      polygon(c, [[-29, 20], [-29, -24], [0, -55], [29, -24], [29, 20]], '#cda46b', ink);
      for (const yy of [-18, -8, 2, 12]) line(c, [[-27, yy], [27, yy]], '#8a613a', 2);
      polygon(c, [[-38, -13], [-8, -61], [0, -65], [38, -13], [24, -15], [0, -45], [-24, -15]], '#31694c', ink);
      line(c, [[-31, -18], [0, -58], [30, -18]], '#9ecf80', 2);
      round(c, -8, -1, 16, 22, [5, 5, 0, 0], '#543d2b', ink);
      emblem(c, 0, -23, 'bow', '#b4e397', 10);
      // An outdoor archery target makes the ranged role visible without reading.
      line(c, [[26, 8], [20, 25]], '#695132', 3); line(c, [[26, 8], [32, 25]], '#695132', 3);
      ellipse(c, 27, 6, 11, 12, '#33483b'); ellipse(c, 27, 6, 9, 10, '#f3dda4'); ellipse(c, 27, 6, 6, 7, '#3a7752'); ellipse(c, 27, 6, 2.5, 3, '#f4db86');
      line(c, [[26, 6], [36, -5]], '#f5eac9', 1.8);
    } else if (b.type === 'garden') {
      // Low, white herb clinic with a rose awning, medicine sign and planted beds.
      round(c, -29, -35, 58, 51, 3, '#fff0d4', ink);
      polygon(c, [[-34, -35], [-20, -48], [26, -48], [34, -35]], '#ad5269', ink);
      polygon(c, [[-34, -35], [34, -35], [31, -25], [-31, -25]], '#e8a0b0', ink);
      for (const xx of [-25, -11, 3, 17]) line(c, [[xx, -34], [xx - 2, -26]], '#fff1dc', 3);
      round(c, -7, -6, 14, 23, [5, 5, 0, 0], '#526f52', ink);
      emblem(c, 0, -23, 'heal', '#c6efad', 10);
      for (const xx of [-25, 14]) {
        window(c, xx + 5, -14, 9); round(c, xx - 4, 10, 21, 14, 2, '#775132', ink);
        for (let i = 0; i < 3; i++) {
          const px = xx + i * 5; line(c, [[px, 14], [px, 3]], '#315d3b', 2);
          ellipse(c, px - 2, 7, 4, 2, '#5f9f4b'); ellipse(c, px + 2, 4, 3, 2, '#9fce64'); ellipse(c, px, 1, 2.5, 2.5, '#f7d0df');
        }
      }
    } else if (b.type === 'spire') {
      // A slim violet tower and oversized tuning fork echo the mage's silhouette.
      polygon(c, [[-23, 20], [-20, -39], [0, -49], [20, -39], [23, 20]], '#8c7ec3', '#34344e');
      polygon(c, [[0, -46], [20, -39], [23, 20], [4, 20]], '#5d548f');
      line(c, [[-18, -35], [-18, 13]], '#cec2ef', 2);
      polygon(c, [[-29, -38], [0, -75], [29, -38], [0, -31]], '#504282', '#2d3048');
      line(c, [[-23, -40], [0, -68], [23, -40]], '#c1a2f4', 2);
      line(c, [[-9, -84], [-9, -73], [0, -67], [9, -73], [9, -84]], '#f2cf78', 3);
      ellipse(c, 0, -79, 4, 4, '#e2efff'); ellipse(c, 0, -79, 8, 8, '#d1c1ff30');
      round(c, -7, 1, 14, 19, [7, 7, 0, 0], '#2e314b', '#c2b4e4');
      emblem(c, 0, -19, 'chime', '#cbb6ff', 10);
    } else if (b.type === 'crypt') {
      round(c, -30, -31, 60, 51, [28, 28, 3, 3], '#55706a', '#233d3b');
      round(c, -23, -26, 46, 45, [21, 21, 0, 0], '#293f40', '#becab7');
      for (const xx of [-32, 24]) {
        round(c, xx, -27, 8, 48, 3, '#cbd0b9', ink);
        ellipse(c, xx + 4, -29, 7, 6, '#e4dfc3');
        line(c, [[xx + 1, -30], [xx + 2, -28]], '#26423e', 2); line(c, [[xx + 6, -30], [xx + 6, -28]], '#26423e', 2);
      }
      polygon(c, [[-34, -32], [-23, -49], [23, -49], [34, -32]], '#244c49', ink);
      line(c, [[-24, -47], [24, -47]], '#9bd3be', 3);
      emblem(c, 0, -35, 'skull', '#e6efcf', 11);
      for (const xx of [-15, 15]) {
        line(c, [[xx, -17], [xx, 7]], '#8ea399', 2);
        ellipse(c, xx, -7, 6, 9, '#87f0c53a'); ellipse(c, xx, -7, 3, 5, '#c5ffe3');
      }
      for (const yy of [12, 18, 23]) round(c, -19 - (yy - 12), yy, 38 + (yy - 12) * 2, 5, 1, '#85978a', ink);
    } else if (b.type === 'tower') {
      polygon(c, [[-14, 18], [-10, -34], [10, -34], [14, 18]], '#d0c9ab', ink);
      polygon(c, [[5, -34], [10, -34], [14, 18], [5, 18]], '#969c81');
      round(c, -17, -37, 34, 11, 2, '#90754f', ink);
      for (const xx of [-17, -3, 11]) round(c, xx, -42, 6, 8, 1, '#ded1a8', ink);
      // The exposed crossbow reads as defence even when zoomed out.
      line(c, [[-17, -47], [-10, -53], [10, -53], [17, -47]], '#493d2e', 4);
      line(c, [[-17, -47], [0, -40], [17, -47]], '#e8d6ac', 1.5);
      line(c, [[0, -37], [0, -58]], '#d5ad61', 3); polygon(c, [[-4, -55], [0, -63], [4, -55]], '#e5edf0', ink);
      window(c, 0, -14, 6);
    } else if (b.type === 'beacon') {
      polygon(c, [[-25, 20], [-17, -31], [17, -31], [25, 20]], '#eadba7', ink);
      polygon(c, [[5, -30], [17, -31], [25, 20], [5, 20]], '#b79a56');
      round(c, -24, -38, 48, 9, 2, '#ae7b2f', ink);
      round(c, -17, -65, 34, 28, 4, '#fff0ab', '#805d2e');
      for (const xx of [-17, 0, 17]) line(c, [[xx, -64], [xx, -38]], '#947035', 2.5);
      polygon(c, [[-23, -65], [0, -78], [23, -65]], '#d8a43e', ink);
      c.shadowColor = '#ffe6a1'; c.shadowBlur = 15; ellipse(c, 0, -51, 10, 10, '#fff5ce'); c.shadowBlur = 0;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(c, [[Math.cos(a) * 27, -51 + Math.sin(a) * 27], [Math.cos(a) * 32, -51 + Math.sin(a) * 32]], '#ffe8aa', 2); }
      window(c, 0, -12, 9);
    } else if (b.type === 'conservatory') {
      // A rounded glasshouse with a golden tree; no clinic roof or medicine cross.
      ellipse(c, 0, -21, 34, 36, '#a7ddcf'); ellipse(c, 0, -21, 30, 32, '#d3ecce');
      c.strokeStyle = '#577c69'; c.lineWidth = 2;
      for (const rx of [17, 33]) { c.beginPath(); c.ellipse(0, -21, rx, 35, 0, Math.PI, Math.PI * 2); c.stroke(); }
      line(c, [[-33, -21], [-33, 16], [33, 16], [33, -21]], '#486c59', 2);
      line(c, [[0, -56], [0, -4]], '#f8e2a6', 2);
      line(c, [[0, 13], [0, -20], [-13, -35]], '#76552f', 5); line(c, [[0, -9], [16, -30]], '#76552f', 4);
      for (const [xx, yy, r] of [[-14, -35, 12], [14, -31, 13], [0, -45, 13]]) {
        ellipse(c, xx, yy, r, r * .8, '#659a51'); ellipse(c, xx - 3, yy - 3, r * .7, r * .55, '#afd47b');
        round(c, xx - 3, yy + 1, 6, 8, [3, 3, 1, 1], '#ffe3a0', '#8b703b');
      }
      round(c, -37, 14, 74, 10, 3, '#ceb880', ink);
      line(c, [[-26, -39], [-19, -47]], '#f7fff0', 2.5);
    }
    // Moss and small stones tie all architecture to the clearing.
    ellipse(c, -width * 0.46, depth * 0.45, 7, 3, '#698750'); ellipse(c, width * 0.42, depth * 0.4, 5, 3, '#78915d');
    c.restore();
  };
  A.hero = function(c, hero, w, time, reduced = false) {
    const x = hero.x * A.tile, y = hero.y * A.tile;
    c.save(); c.translate(x, y);
    const idleTime = reduced ? 0 : time;
    if (hero.hp <= 0) { ellipse(c, 0, 0, 8, 3, '#536a4d'); line(c, [[0, 1], [0, -9]], '#dad4aa', 2); ellipse(c, 0, -10 + Math.sin(idleTime * 2) * 2, 3, 3, '#f7e0ad'); c.restore(); return; }
    const path = w.choices[hero.classId], color = path === 'guardian' ? '#9dbed2' : path === 'banner' ? '#d96642' : path === 'traps' ? '#b99a59' : G.classes[hero.classId].color;
    const pose = A.actionPose(hero, time, reduced), power = pose?.power || 0;
    const walk = !reduced && !pose && hero.route?.length ? Math.sin(time * 11 + hero.id) : 0, ink = '#293b39';
    ellipse(c, 1, 2, 10, 4, '#1e342f66');
    if (hero.shieldUntil > time) { c.strokeStyle = '#bedeca90'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -10, 13, 19, 0, 0, Math.PI * 2); c.stroke(); }
    c.save(); A.actionBody(c, hero, pose, hero.classId === 'warrior' ? 'melee' : hero.classId === 'ranger' ? 'bow' : 'cast');
    line(c, [[-3, -3], [-4 - walk * 2, 2]], '#303c35', 3.3); line(c, [[3, -3], [4 + walk * 2, 2]], '#303c35', 3.3);
    polygon(c, [[-6, -21], [6, -21], [9 + walk, -3], [-8 + walk, -3]], color, ink);
    polygon(c, [[2, -18], [7, -16], [9 + walk, -3], [2, -4]], '#18362c38');
    round(c, -5, -29, 10, 11, 4, '#f1c493', ink);
    ellipse(c, 3, -24, 1.1, 1.1, '#263533');
    if (hero.classId === 'warrior') {
      if (path === 'banner') {
        line(c, [[-12, 1], [-12, -57]], '#393c31', 3);
        polygon(c, [[-11, -56], [11, -52 + Math.sin(idleTime * 3) * 2], [6, -41], [-11, -43]], '#df7348', '#482c26');
        polygon(c, [[-4, -52], [0, -48], [-4, -44], [-8, -48]], '#ffe7a3');
      }
      round(c, -7, -33, 14, 8, [6, 6, 1, 1], '#c9d3cf', ink); line(c, [[-8, -26], [8, -26]], '#f4eed4', 2);
      polygon(c, path === 'guardian' ? [[-18, -25], [-2, -25], [-2, -8], [-10, -1], [-18, -8]] : [[-14, -21], [-3, -21], [-3, -9], [-8, -4], [-14, -9]], path === 'guardian' ? '#47738e' : '#e3a83c', ink);
      if (path === 'guardian') { line(c, [[-16, -23], [-4, -23], [-4, -9], [-10, -4], [-16, -9], [-16, -23]], '#e5f4f2', 2); line(c, [[-4, -35], [3, -35]], '#7aafca', 4); }
      line(c, [[-8, -18], [-8, -8]], '#fff1bb', 2); line(c, [[-11, -14], [-5, -14]], '#fff1bb', 1.5);
      c.save(); c.translate(8, -16); c.rotate(pose?.swing || 0); c.translate(-8, 16);
      line(c, [[5, -20], [10, -12]], '#d6a575', 3);
      line(c, [[10, -3], [10, -27]], ink, 4); line(c, [[10, -8], [10, -27]], '#f0f3df', 2.5); line(c, [[6, -9], [14, -9]], '#d9aa51', 2); c.restore();
    } else if (hero.classId === 'ranger') {
      if (path === 'traps') {
        round(c, -15, -23, 10, 18, 3, '#7a5636', ink);
        for (let i = 0; i < 3; i++) line(c, [[-14 + i * 3, -23], [-9 + i * 3, -6]], '#dbcc96', 1);
        ellipse(c, -12, -8, 7, 5, '#d6d6bd'); ellipse(c, -12, -8, 4, 2.5, '#415044');
      }
      polygon(c, [[-8, -25], [-6, -33], [2, -37], [8, -26], [1, -29]], '#31714a', ink);
      line(c, [[1, -33], [6, -42]], '#ffe3a0', 2);
      line(c, [[-10, -9], [-11, -25], [-8, -30]], '#755030', 3);
      c.save(); c.translate(power * 4, 0);
      c.strokeStyle = '#634029'; c.lineWidth = 3; c.beginPath(); c.arc(5, -13, 13, -1.1, 1.1); c.stroke();
      line(c, [[11, -25], [11 - (pose?.draw || 0) * 8, -13], [11, -1]], '#fff0c2', 1.3);
      if (!pose || pose.p < .25 || pose.p > .85) line(c, [[6, -14], [20, -14]], '#e9d0a1', 1.5);
      if (path === 'marksman') {
        c.strokeStyle = '#f3cf77'; c.lineWidth = 3.5; c.beginPath(); c.arc(3, -15, 19, -1.2, 1.2); c.stroke();
        line(c, [[10, -33], [10 - (pose?.draw || 0) * 8, -15], [10, 3]], '#fff5ce', 1.5);
      }
      c.restore();
      if (path === 'marksman') {
        for (const xx of [-13, -9, -5]) line(c, [[xx, -20], [xx - 3, -36], [xx, -33]], '#f4dd9c', 2);
      }
    } else if (hero.classId === 'healer') {
      // White bonnet/apron and a green medical cross, separated from the mage's violet robe.
      polygon(c, [[-8, -28], [-6, -36], [6, -36], [9, -28]], '#fff6e0', ink);
      line(c, [[0, -34], [0, -29]], '#28754d', 2); line(c, [[-2.5, -31.5], [2.5, -31.5]], '#28754d', 2);
      polygon(c, [[-4, -20], [4, -20], [6, -4], [-5, -4]], '#fff1d8', '#87535d');
      line(c, [[-10, -12], [-10, -17], [-5, -17], [-5, -12]], '#473d32', 2);
      round(c, -14, -13, 12, 10, 2, '#fcf1d8', ink);
      line(c, [[-8, -11], [-8, -5]], '#28754d', 2); line(c, [[-11, -8], [-5, -8]], '#28754d', 2);
      c.save(); c.translate(power * 6, -power * 5);
      line(c, [[7 - power * 6, -18 + power * 5], [10, -12]], '#e6bb8f', 3);
      round(c, 8, -16, 4, 5, 1, '#f6e1a2', ink); ellipse(c, 10, -8, 5, 6, '#376f47'); ellipse(c, 9, -9, 2.5, 3.5, '#bce68a');
      A.actionGlow(c, pose, 12, -18, '#ffb4cc'); c.restore();
    } else if (hero.classId === 'necromancer') {
      polygon(c, [[-10, -3], [-9, -24], [0, -39], [9, -24], [11, -3]], '#245951', ink);
      ellipse(c, 0, -25, 5, 7, '#172e31'); line(c, [[-3, -26], [-1, -26]], '#cbffdf', 2); line(c, [[2, -26], [4, -26]], '#cbffdf', 2);
      for (const xx of [-7, 7]) ellipse(c, xx, -20, 4, 3, '#ede3c1');
      for (const yy of [-15, -10]) line(c, [[-4, yy], [0, yy + 2], [4, yy]], '#ddd8b4', 1.8);
      c.save(); c.translate(10, -20); c.rotate(power * .45); c.translate(-10, 20);
      line(c, [[13, 0], [13, -40]], '#c9c3a4', 3);
      ellipse(c, 13, -42, 6, 6, '#e9e3c8'); round(c, 10, -41, 6, 6, 1, '#e9e3c8');
      for (const xx of [11, 15]) ellipse(c, xx, -42, 1.5, 2, '#25564e');
      ellipse(c, 13, -43, 10, 10, '#a4ffe624');
      A.actionGlow(c, pose, 13, -42, '#93e3cb'); c.restore();
    } else {
      polygon(c, [[-8, -29], [-1, -48], [6, -40], [9, -29]], '#7151b0', '#302f4b');
      line(c, [[-9, -28], [10, -28]], '#c9adfb', 4); line(c, [[-5, -33], [7, -33]], '#f4d17b', 2);
      polygon(c, [[0, -18], [2, -14], [5, -13], [2, -11], [0, -7], [-2, -11], [-5, -13], [-2, -14]], '#ffe1a0');
      c.save(); c.translate(10, -20); c.rotate(power * .45); c.translate(-10, 20);
      line(c, [[13, 0], [13, -34]], '#554030', 4); line(c, [[13, 0], [13, -34], [8, -37], [8, -45]], '#e4ba65', 2);
      line(c, [[13, -34], [18, -37], [18, -45]], '#e4ba65', 2);
      ellipse(c, 13, -40, 6, 6, '#d7caff50'); ellipse(c, 13, -40, 3.5, 3.5, '#e6f2ff');
      A.actionGlow(c, pose, 13, -40, '#c5a4ff'); c.restore();
    }
    c.restore();
    if (hero.level >= 3) { c.fillStyle = '#ffe5a3'; c.strokeStyle = ink; c.lineWidth = 2.5; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; const dots = '•'.repeat(Math.min(3, Math.floor(hero.level / 2))), y = path === 'banner' ? -64 : ['mage', 'necromancer'].includes(hero.classId) ? -55 : -46; c.strokeText(dots, 0, y); c.fillText(dots, 0, y); }
    c.restore();
  };
  A.lair = function(c, lair, w, time) {
    c.save(); c.translate(lair.x * A.tile, lair.y * A.tile);
    if (lair.hp <= 0) {
      ellipse(c, 0, 5, 34, 22, '#b6bd8060');
      for (let i = 0; i < 7; i++) { const a = i * 2.4; ellipse(c, Math.cos(a) * 22, Math.sin(a) * 13, 4, 3, '#d6d49a'); ellipse(c, Math.cos(a) * 22, Math.sin(a) * 13 - 6, 3, 3, '#ead9af'); }
      line(c, [[0, 4], [0, -15]], '#9b8e60', 2); ellipse(c, 0, -15, 6, 7, '#e2c478');
      c.restore(); return;
    }
    ellipse(c, 3, 7, 34, 20, '#30423755');
    const pulse = lair.awake ? Math.sin(time * 1.6 + lair.id) : 0;
    if (lair.boss) {
      // The stolen great bell: one unmistakable landmark, even while dormant.
      ellipse(c, 0, 9, 43, 27, '#402f46a0');
      for (const side of [-1, 1]) {
        polygon(c, [[side * 43, 16], [side * 37, -47], [side * 25, -63], [side * 20, 12]], '#566071');
        polygon(c, [[side * 37, -47], [side * 25, -63], [side * 24, -26]], '#89919b');
        line(c, [[side * 31, -48], [side * 31, -35]], '#d8ab71', 2);
      }
      polygon(c, [[-30, 14], [-23, -28], [-13, -45], [13, -45], [23, -28], [30, 14]], '#685b70');
      polygon(c, [[-27, 11], [-19, -28], [-9, -38], [-6, 10]], '#9b7c7f');
      ellipse(c, 0, 14, 31, 9, '#2c3444'); ellipse(c, 0, 13, 23, 5, '#151f2e');
      line(c, [[7, -40], [-2, -23], [7, -15], [1, 9]], lair.awake ? '#f5b77c' : '#b49a8c', 2.5);
      polygon(c, [[-21, -48], [-25, -68], [-10, -57], [0, -81], [10, -57], [25, -68], [21, -48]], '#c7a377');
      polygon(c, [[-17, -49], [0, -68], [17, -49]], '#5a5467');
      ellipse(c, 0, -48, 4, 4, lair.awake ? '#ffd193' : '#b6adb9');
      for (let i = 0; i < 3; i++) {
        const a = time * 0.25 + i * Math.PI * 2 / 3;
        ellipse(c, Math.cos(a) * 34, -25 + Math.sin(a) * 14, 2.5, 2.5, '#e5bd8b');
      }
    } else if (lair.type === 'rust') {
      polygon(c, [[-33, 10], [-28, -18], [-12, -33], [19, -30], [34, 9]], '#8e7350');
      round(c, -25, -19, 49, 31, 10, '#c19665');
      round(c, -14, -5, 26, 24, [12, 12, 0, 0], '#3e4436');
      for (const [xx, yy, r] of [[-21, -18, 12], [17, -27, 15], [29, 1, 8]]) {
        c.save(); c.translate(xx, yy); c.rotate(time * (lair.awake ? 0.2 : 0));
        for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); round(c, -3, -r - 2, 6, 6, 1, '#73694e'); }
        ellipse(c, 0, 0, r, r, '#b69060'); ellipse(c, 0, 0, r * 0.4, r * 0.4, '#655b46'); c.restore();
      }
      if (lair.awake) { ellipse(c, -6, 3, 2, 2, '#f9c766'); ellipse(c, 5, 3, 2, 2, '#f9c766'); }
    } else if (lair.type === 'spore') {
      for (const [xx, yy, r] of [[-19, 4, 19], [15, 6, 17], [0, -11, 28]]) {
        round(c, xx - 5, yy - 15, 11, 27, 5, '#c6bda1');
        ellipse(c, xx, yy - 20 - pulse, r, r * 0.58, '#9c6889');
        ellipse(c, xx - r * 0.2, yy - 25 - pulse, r * 0.6, r * 0.25, '#c08b9f');
        for (let i = 0; i < 3; i++) ellipse(c, xx - 10 + i * 9, yy - 23 - pulse, 3, 2, '#e4cbb2');
      }
    } else if (lair.type === 'sky') {
      polygon(c, [[-32, 18], [-25, -28], [-8, -54], [6, -45], [24, -24], [32, 18]], '#5f7380', '#33434b');
      polygon(c, [[-25, -28], [-8, -54], [-6, -16], [-20, 14]], '#a7b7b8');
      ellipse(c, 0, -16, 30, 12, '#554f3c'); ellipse(c, 0, -18, 24, 8, '#b6a37b');
      for (const xx of [-11, 2, 13]) ellipse(c, xx, -23, 6, 9, '#d2e3d5');
      for (const side of [-1, 1]) polygon(c, [[side * 6, -35], [side * 36, -56], [side * 30, -28], [side * 18, -34]], '#3c6875', '#223f49');
    } else if (lair.type === 'thorn') {
      for (const side of [-1, 1]) {
        polygon(c, [[side * 8, 18], [side * 31, 9], [side * 25, -31], [side * 10, -50], [side * 14, -12]], '#355745', '#293c30');
        line(c, [[side * 25, 10], [side * 20, -27], [side * 5, -40]], '#9ca568', 3);
        for (let i = 0; i < 4; i++) polygon(c, [[side * 22, 8 - i * 11], [side * 38, -4 - i * 11], [side * 21, -2 - i * 11]], '#c8bd89', '#354838');
      }
      round(c, -10, -16, 20, 35, [10, 10, 0, 0], '#203d34');
      ellipse(c, 0, -31, 10, 10, '#d5a979'); ellipse(c, 0, -31, 5, 5, '#7e4749');
    } else {
      round(c, -23, -27, 46, 45, 7, '#788497');
      polygon(c, [[-30, -24], [0, -60], [30, -24]], '#526370');
      round(c, -10, -16, 20, 34, [10, 10, 0, 0], '#35484e');
      ellipse(c, 0, -4, 6, 10, lair.awake ? '#b7bfce' : '#50646b');
      c.save(); c.translate(0, -38); c.rotate(time * (lair.awake ? 0.5 : 0.03));
      for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); polygon(c, [[3, 2], [4, -31], [12, -29], [9, -4]], '#a9b4af'); }
      c.restore(); ellipse(c, 0, -38, 4, 4, '#d9cbb0');
    }
    if (lair.boss) {
      round(c, -22, -101, 44, 17, 5, '#3a2c3fe8');
      line(c, [[-15, -96], [-11, -91], [-7, -98], [-3, -91], [1, -96]], '#edc58c', 1.5);
      c.fillStyle = '#ffe4bd'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText(String(lair.suggestedLevels || ''), 11, -89);
    } else {
      const rank = Math.max(1, (lair.tier || 1) + (lair.level || 1) - 1);
      round(c, -12, -73, 24, 16, 4, '#394441e8'); c.fillStyle = '#f9d5a1'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText(String(rank), 0, -61);
    }
    if (!lair.awake) { c.fillStyle = '#e1ddbd'; c.font = 'italic 13px Georgia'; c.textAlign = 'center'; c.fillText('z z', 28, lair.boss ? -74 : -49 - Math.sin(time) * 2); }
    c.restore();
  };
  A.monsterScale = m => ({ guardian: 1.65, husher: 1.16, sporeling: .94, broodcap: 1.6, siegebreaker: 1.5, bulwark: 1.35, mender: 1.15, binder: 1.15 }[m.type] || 1) * (1 + Math.min(.5, Math.max(0, (m.strength || 1) - 1) * .22));
  A.monster = function(c, m, w, time, reduced = false) {
    if (G.monsterTypes[m.type].skeletal) { A.skeleton(c, { ...m, monster: true }, w, time, reduced); return; }
    c.save(); c.translate(m.x * A.tile, m.y * A.tile);
    const rank = Math.max(1, m.rank || 1), scale = A.monsterScale(m), boss = m.boss || m.type === 'guardian';
    const pose = A.actionPose(m, time, reduced), power = pose?.power || 0, idleTime = reduced ? 0 : time;
    const bob = pose ? 0 : Math.sin(idleTime * (boss ? 3.5 : 7) + m.id) * (boss ? 0.65 : 1.5);
    ellipse(c, 1, 3, 11 * scale, 4 * scale, '#29353b66');
    c.save(); c.scale(scale, scale);
    const spec = G.monsterTypes[m.type];
    A.actionBody(c, m, pose, spec.flying ? 'dive' : spec.spell ? 'cast' : spec.kite ? 'bow' : ['sporeling', 'broodcap'].includes(m.type) ? 'cap' : boss || spec.siege || spec.ward ? 'heavy' : 'melee');
    if (A.specialMonster(c, m, bob, idleTime, pose)) {
      // New families share the same scale, rank badge and health conventions.
    } else if (m.type === 'rattler') {
      for (const side of [-1, 1]) line(c, [[side * 5, -8], [side * 12, -4 + bob], [side * 11, 2]], '#6d6950', 2);
      round(c, -9, -18 + bob, 18, 17, 5, '#b9895d'); round(c, -7, -23 + bob, 14, 7, 3, '#d5b378');
      line(c, [[-12, -15 + bob], [-8, -15 + bob]], '#b8b298', 3);
      line(c, [[6, -16], [10 + power * 9, -15 + bob]], '#706b58', 3); ellipse(c, 8 + power * 9, -13 + bob, 5, 5, '#b4b1a0');
      ellipse(c, -3, -14 + bob, 2, 2, '#f4d590'); ellipse(c, 3, -14 + bob, 2, 2, '#f4d590');
    } else if (m.type === 'sporeling') {
      ellipse(c, 0, -8 + bob, 8, 11, '#d4bdb6'); ellipse(c, 0, -19 + bob, 13, 7, '#b67d9b');
      ellipse(c, -5, -21 + bob, 3, 2, '#e4c2ac'); ellipse(c, 5, -18 + bob, 2, 2, '#eed7ba');
      ellipse(c, -3, -10 + bob, 1.5, 2, '#5a4c59'); ellipse(c, 3, -10 + bob, 1.5, 2, '#5a4c59');
    } else if (boss) {
      // Broad shoulders, hammer hands and a forked bronze crown distinguish the elite.
      for (const side of [-1, 1]) {
        polygon(c, [[side * 5, -11], [side * 11, -9], [side * 13, 3], [side * 5, 3]], '#4b5261');
        c.save(); c.translate(side * power * 5, power * 9);
        polygon(c, [[side * 10, -28 + bob], [side * 21, -24 + bob], [side * 19, -13 + bob], [side * 12, -14 + bob]], '#95818b');
        round(c, side * 18 - 5, -15 + bob, 10, 12, 2, '#c49a72'); c.restore();
      }
      polygon(c, [[-11, -28 + bob], [11, -28 + bob], [13, -10], [0, -5], [-13, -10]], '#68647c');
      polygon(c, [[-7, -26 + bob], [0, -22 + bob], [7, -26 + bob], [5, -13], [0, -9], [-5, -13]], '#c5a277');
      round(c, -8, -40 + bob, 16, 15, 4, '#3c4658');
      polygon(c, [[-9, -38 + bob], [-14, -49 + bob], [-5, -44 + bob], [0, -52 + bob], [5, -44 + bob], [14, -49 + bob], [9, -38 + bob]], '#d9b177');
      line(c, [[-5, -33 + bob], [-2, -32 + bob]], '#ffe0a0', 2); line(c, [[2, -32 + bob], [5, -33 + bob]], '#ffe0a0', 2);
    } else {
      polygon(c, [[-10, 1], [-14, -19 + bob], [-7, -33 + bob], [7, -33 + bob], [14, -19 + bob], [10, 1], [4, -3], [0, 2], [-5, -2]], '#65798a');
      ellipse(c, 0, -18 + bob, 7, 11, '#afbbc2'); ellipse(c, 0, -15 + bob, 3, 6, '#425864');
      if (pose) { line(c, [[7, -18], [14 + power * 5, -22]], '#afbbc2', 3); A.actionGlow(c, pose, 17 + power * 5, -24, '#ffa3bc'); }
    }
    if (rank >= 3 && !boss) {
      for (const side of [-1, 1]) polygon(c, [[side * 8, -21 + bob], [side * 15, -30 + bob], [side * 13, -16 + bob]], '#e1b380');
      line(c, [[-7, -5], [0, -2], [7, -5]], '#e7bd82', 2);
    }
    c.restore();
    const badgeY = -(boss ? 57 : m.type === 'nightwing' ? 53 : ['husher', 'binder', 'mender', 'thornling'].includes(m.type) ? 43 : m.type === 'broodcap' ? 38 : 31) * scale;
    round(c, boss ? -17 : -10, badgeY, boss ? 34 : 20, 15, 4, boss ? '#542e46' : rank >= 3 ? '#75413c' : '#3b4944');
    c.fillStyle = '#ffe8c4'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText(String(rank), boss ? 7 : 0, badgeY + 11);
    if (boss) line(c, [[-12, badgeY + 5], [-10, badgeY + 10], [-7, badgeY + 4], [-4, badgeY + 10], [-2, badgeY + 5]], '#f2c582', 1.2);
    if (m.stunnedUntil > time) { c.fillStyle = '#ffe7ab'; c.font = '15px serif'; c.fillText('✧', 0, badgeY - 4 + bob); }
    c.restore();
  };
})(globalThis);
