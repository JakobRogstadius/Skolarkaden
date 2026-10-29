/* Small, hand-drawn canvas illustrations. Visual randomness never touches simulation RNG. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan;
  const paths = {
    shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z M12 7v10 M8 11h8',
    bow: 'M5 3q19 9 0 18l5-9Z M4 12h17m-4-3 4 3-4 3',
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
    people: 'M9 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M16 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0M2 21v-5a4 4 0 0 1 8 0v5m4 0v-5a4 4 0 0 1 8 0v5',
    sword: 'm3 21 5-5m-3-3 6 6M8 14 19 3l2 2-1 5L11 18',
    book: 'M12 21c-3-3-7-3-10-2V4c4-1 7-1 10 2 3-3 6-3 10-2v15c-3-1-7-1-10 2ZM12 6v15',
    plus: 'M12 4v16M4 12h16', home: 'm2 11 10-8 10 8M5 9v12h14V9',
    minus: 'M4 12h16', close: 'm5 5 14 14M5 19 19 5', check: 'm4 12 5 5L20 5',
    repair: 'm3 21 9-9m2-9a6 6 0 0 0-3 9 6 6 0 0 0 9-3l-4 1-3-3Z',
    arrow: 'M3 12h18m-6-6 6 6-6 6', revive: 'M5 8a8 8 0 1 1-1 9M3 3v6h6M12 8v8m-4-4h8',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    lock: 'M6 10h12v11H6ZM8 10V7a4 4 0 0 1 8 0v3 M12 14v3',
    crown: 'm3 7 4 4 5-8 5 8 4-4-2 12H5ZM5 22h14'
  };
  G.icon = (name, size = 20) => '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + (paths[name] || paths.star) + '"/></svg>';
  const hash = (x, y, n = 0) => { let v = Math.imul(x + n * 37, 374761393) + Math.imul(y + 11, 668265263); v = Math.imul(v ^ v >>> 13, 1274126177); return ((v ^ v >>> 16) >>> 0) / 4294967296; };
  const ellipse = (c, x, y, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  const line = (c, points, color, width = 2) => { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); };
  const polygon = (c, points, color) => { c.fillStyle = color; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
  const round = (c, x, y, w, h, r, color) => { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };
  const A = G.Art = { tile: 48, hash, ellipse, line, polygon, round };
  A.tree = function(c, x, y, size, seed) {
    c.save(); c.translate(x, y); c.scale(size, size);
    ellipse(c, 4, 3, 15, 7, '#244b3b30');
    round(c, -2, -23, 5, 25, 2, '#766046');
    const colors = ['#365d47', '#47704f', '#598454'];
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
    const greens = [['#819d70', '#79966b', '#879f73'], ['#8b9d70', '#839568', '#939f70'], ['#73978a', '#6d8f82', '#7d9d8d']][w.mood];
    const tile = (x, y) => w.terrain[y * w.width + x];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const type = tile(x, y), px = x * t, py = y * t;
      c.fillStyle = type === 2 ? '#286d9c' : type === 5 ? '#284f3a' : type >= 3 ? '#707b79' : greens[0]; c.fillRect(px, py, t + 1, t + 1);
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
        line(c, [point(x, y), point(x + dx, y + dy)], '#6f825942', 19);
        line(c, [point(x, y), point(x + dx, y + dy)], '#b6b58d', 13);
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
    polygon(c, [[-width / 2 - 5, -2], [0, -height], [width / 2 + 7, -2]], color);
    polygon(c, [[0, -height], [width / 2 + 7, -2], [0, 2]], '#243b3330');
    for (let yy = -height + 10; yy < 0; yy += 8) { const ww = width / 2 * (1 + yy / height); line(c, [[-ww, yy], [ww, yy]], '#20382f35', 1.4); }
    line(c, [[-width / 2 - 4, -2], [0, -height], [width / 2 + 6, -2]], '#f4e2a760', 2);
  }
  function window(c, x, y, size = 9) {
    round(c, x - size / 2, y, size, size * 1.2, 2, '#3c4938');
    round(c, x - size / 2 + 1.5, y + 1.5, size - 3, size * 1.2 - 3, 1, '#f5d897');
    line(c, [[x, y + 1], [x, y + size]], '#746b4f', 1);
  }
  A.building = function(c, b, w, time) {
    const t = A.tile, spec = G.buildings[b.type], x = b.x * t, y = b.y * t;
    c.save(); c.translate(x, y);
    if (b.hp <= 0) {
      ellipse(c, 0, 2, b.w * 17, b.h * 10, '#52634480');
      for (let i = 0; i < 6; i++) round(c, (hash(b.id, i) - 0.5) * 55, (hash(i, b.id) - 0.5) * 28, 9, 7, 2, '#989c7b');
      c.restore(); return;
    }
    const width = b.w * 32, depth = b.h * 16;
    ellipse(c, 6, depth * 0.4, width * 0.63, depth * 0.64, '#233a3638');
    round(c, -width / 2 - 3, -depth / 2, width + 6, depth + 9, 5, '#8c9672');
    if (b.type === 'castle') {
      round(c, -31, -27, 62, 49, 4, '#b6b79b');
      round(c, -23, -15, 46, 36, 2, '#d4c7a3');
      for (const xx of [-33, 24]) {
        round(c, xx, -30, 11, 48, 2, '#a4ad8f');
        polygon(c, [[xx - 4, -31], [xx + 5, -44], [xx + 15, -31]], '#52746a');
      }
      round(c, -10, -60, 20, 47, 3, '#d7c9a1');
      round(c, -6, -51, 12, 23, 6, '#354f46');
      c.save(); c.translate(0, -39); c.rotate(w.bellUntil > time ? Math.sin(time * 14) * 0.25 : Math.sin(time * 1.4) * 0.025);
      polygon(c, [[-7, 7], [-5, -5], [-2, -8], [3, -8], [6, -5], [8, 7]], '#e6bb68'); ellipse(c, 0, 8, 8, 2.3, '#ffe19a'); ellipse(c, 0, 11, 2, 2, '#805d36'); c.restore();
      polygon(c, [[-16, -59], [0, -78], [16, -59]], '#597a6a');
      line(c, [[0, -76], [0, -90]], '#a58854', 2);
      polygon(c, [[1, -90], [17 + Math.sin(time * 2) * 2, -86], [1, -80]], '#e9c675');
      round(c, -9, 1, 18, 22, [8, 8, 0, 0], '#4e5d47'); window(c, -19, -6, 8); window(c, 20, -6, 8);
      if (w.research.castle2) { ellipse(c, 0, -70, 5, 5, '#f5df9c'); line(c, [[0, -74], [0, -69], [3, -67]], '#647365', 1.2); }
    } else if (b.type === 'tower' || b.type === 'beacon') {
      const big = b.type === 'beacon';
      round(c, big ? -18 : -11, -42, big ? 36 : 22, 58, 3, '#b4b998');
      polygon(c, [[-20, -39], [0, -55], [20, -39], [16, -27], [-16, -27]], big ? '#e2bc63' : '#78987e');
      line(c, [[-17, -28], [17, -28]], '#d9cc9f', 3);
      if (big) {
        c.shadowColor = '#f6d279'; c.shadowBlur = 20; ellipse(c, 0, -47, 10, 10, '#f8d88b'); c.shadowBlur = 0;
        c.strokeStyle = '#fce4ae'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -47, 19, 6, time * 0.3, 0, Math.PI * 2); c.stroke();
      } else { line(c, [[-9, -38], [11, -38]], '#4c684d', 3); line(c, [[0, -44], [0, -32]], '#c5aa78', 2); }
      window(c, 0, -13, 6);
    } else if (b.type === 'garden' || b.type === 'conservatory') {
      round(c, -29, -8, 58, 29, 3, '#9c9d6b');
      for (let i = 0; i < 4; i++) {
        const xx = -23 + i * 15; round(c, xx, 1, 11, 19, 2, '#806844');
        ellipse(c, xx + 5, 1, 8, 5, '#bdc082'); ellipse(c, xx + 3, -2, 5, 6, i % 2 ? '#a4c879' : '#91b292');
        ellipse(c, xx + 7, -5, 3, 3, i % 2 ? '#e8c3a4' : '#d29db6');
      }
      round(c, -25, -35, 50, 32, 3, '#cad3ab');
      polygon(c, [[-29, -34], [-5, -58], [29, -34]], '#a5c8b2bb');
      line(c, [[-29, -34], [-5, -58], [29, -34]], '#f1d6a0', 3);
      for (const xx of [-14, 0, 14]) line(c, [[xx, -37], [xx, -7]], '#647d5c', 2);
      if (b.type === 'conservatory') { A.tree(c, 0, -27, 1.15, 1); for (let i = 0; i < 5; i++) ellipse(c, Math.cos(i * 2.3) * 13, -53 + Math.sin(i * 2.3) * 17, 3, 3, '#ffe6a5'); }
    } else {
      const color = b.type === 'house' ? '#a66b4c' : b.type === 'hall' ? '#947d53' : b.type === 'lodge' ? '#557a60' : '#7f89a5';
      round(c, -width / 2, -18, width, depth + 20, 3, '#cfbf94');
      polygon(c, [[width / 2 - 12, -18], [width / 2, -18], [width / 2, depth + 2], [width / 2 - 12, depth + 2]], '#6e72542b');
      c.save(); c.translate(0, -18); roof(c, width, b.type === 'house' ? 24 : 33, color); c.restore();
      round(c, -8, -4, 16, depth / 2 + 8, [6, 6, 0, 0], '#5d6347'); window(c, -21, -9); window(c, 21, -9);
      if (b.type === 'house') { round(c, 17, -43, 9, 17, 1, '#98896c'); for (let i = 0; i < 3; i++) ellipse(c, 22 + Math.sin(time + i) * 3, -49 - (time * 7 + i * 12) % 33, 3 + i, 3 + i, '#ece3c02b'); }
      if (b.type === 'hall') polygon(c, [[-7, -18], [-7, -31], [7, -31], [7, -18], [0, -12]], '#e2bd73');
      if (b.type === 'lodge') { line(c, [[0, -50], [0, -66]], '#c5b383', 2); polygon(c, [[-9, -63], [11, -63], [3, -68]], '#d8c389'); }
      if (b.type === 'spire') {
        line(c, [[0, -42], [0, -70], [-9, -70], [-9, -82]], '#c8c1a1', 3);
        line(c, [[0, -70], [9, -70], [9, -84]], '#c8c1a1', 3);
        ellipse(c, 0, -60, 6, 6, '#d0d3f2'); c.strokeStyle = '#cdd8ed'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, -60, 16, 5, time * 0.4, 0, Math.PI * 2); c.stroke();
      }
    }
    // Moss and small stones tie all architecture to the clearing.
    ellipse(c, -width * 0.46, depth * 0.45, 7, 3, '#698750'); ellipse(c, width * 0.42, depth * 0.4, 5, 3, '#78915d');
    c.restore();
  };
  A.hero = function(c, hero, w, time) {
    const x = hero.x * A.tile, y = hero.y * A.tile;
    c.save(); c.translate(x, y);
    if (hero.hp <= 0) { ellipse(c, 0, 0, 8, 3, '#536a4d'); line(c, [[0, 1], [0, -9]], '#dad4aa', 2); ellipse(c, 0, -10 + Math.sin(time * 2) * 2, 3, 3, '#f7e0ad'); c.restore(); return; }
    const color = G.classes[hero.classId].color, walk = hero.route?.length ? Math.sin(time * 11 + hero.id) : 0;
    ellipse(c, 1, 2, 9, 4, '#243c373a');
    if (hero.shieldUntil > time) { c.strokeStyle = '#bedeca90'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -10, 13, 19, 0, 0, Math.PI * 2); c.stroke(); }
    line(c, [[-3, -3], [-4 - walk * 2, 2]], '#495244', 3.3); line(c, [[3, -3], [4 + walk * 2, 2]], '#495244', 3.3);
    polygon(c, [[-5, -20], [5, -20], [8 + walk, -3], [-7 + walk, -3]], color);
    polygon(c, [[2, -18], [7, -16], [8 + walk, -3], [2, -4]], '#18362c25');
    round(c, -5, -29, 10, 11, 4, '#e8bc91');
    ellipse(c, hero.facing * 3, -24, 1.1, 1.1, '#35473a');
    if (hero.classId === 'warrior') {
      round(c, -6, -31, 12, 6, [5, 5, 1, 1], '#b6b9a2'); line(c, [[-8, -26], [8, -26]], '#d3d3b8', 2);
      polygon(c, [[-13, -18], [-4, -20], [-3, -9], [-8, -5], [-13, -10]], '#d8ae65');
      line(c, [[-8, -17], [-8, -9]], '#f1d998', 1.5); line(c, [[9, -6], [10, -23]], '#dfe1c7', 2.5);
    } else if (hero.classId === 'ranger') {
      polygon(c, [[-7, -27], [-3, -34], [7, -31], [8, -26]], '#527b4e');
      line(c, [[1, -33], [5, -40]], '#cfce9a', 1.5);
      c.strokeStyle = '#76573d'; c.lineWidth = 2; c.beginPath(); c.arc(6, -13, 11, -1, 1); c.stroke(); line(c, [[12, -22], [12, -4]], '#f4dfb4', 1);
    } else if (hero.classId === 'healer') {
      round(c, -7, -32, 14, 6, 3, '#eee6c9'); ellipse(c, -5, -32, 3, 3, '#da9bab');
      round(c, -10, -13, 7, 9, 2, '#93a697'); round(c, -10, -15, 7, 3, 1, '#d4d7b6');
      line(c, [[7, -18], [10, -9]], '#d8b28f', 2.8); ellipse(c, 10, -7, 4, 5, '#6c9968');
    } else {
      round(c, -7, -32, 14, 6, 3, '#7b87aa'); ellipse(c, -3, -28, 3, 2.6, '#d6d6b3'); ellipse(c, 4, -28, 3, 2.6, '#d6d6b3');
      line(c, [[10, -2], [10, -33], [6, -33], [6, -40]], '#c4ba8c', 2); line(c, [[10, -33], [14, -33], [14, -40]], '#c4ba8c', 2);
      ellipse(c, 10, -36 + Math.sin(time * 3) * 1.5, 2.5, 2.5, '#d6d9ff');
    }
    if (hero.level >= 3) { c.fillStyle = '#ffdf91'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('•'.repeat(Math.min(3, Math.floor(hero.level / 2))), 0, -38); }
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
  A.monsterScale = m => (m.type === 'guardian' ? 1.65 : m.type === 'husher' ? 1.16 : m.type === 'sporeling' ? 0.94 : 1) * (1 + Math.min(0.5, Math.max(0, (m.strength || 1) - 1) * 0.22));
  A.monster = function(c, m, w, time) {
    c.save(); c.translate(m.x * A.tile, m.y * A.tile);
    const rank = Math.max(1, m.rank || 1), scale = A.monsterScale(m), boss = m.boss || m.type === 'guardian';
    const bob = Math.sin(time * (boss ? 3.5 : 7) + m.id) * (boss ? 0.65 : 1.5);
    ellipse(c, 1, 3, 11 * scale, 4 * scale, '#29353b66');
    c.save(); c.scale(scale, scale);
    if (m.type === 'rattler') {
      for (const side of [-1, 1]) line(c, [[side * 5, -8], [side * 12, -4 + bob], [side * 11, 2]], '#6d6950', 2);
      round(c, -9, -18 + bob, 18, 17, 5, '#b9895d'); round(c, -7, -23 + bob, 14, 7, 3, '#d5b378');
      line(c, [[-12, -15 + bob], [-8, -15 + bob]], '#b8b298', 3); ellipse(c, 8, -13 + bob, 5, 5, '#b4b1a0');
      ellipse(c, -3, -14 + bob, 2, 2, '#f4d590'); ellipse(c, 3, -14 + bob, 2, 2, '#f4d590');
    } else if (m.type === 'sporeling') {
      ellipse(c, 0, -8 + bob, 8, 11, '#d4bdb6'); ellipse(c, 0, -19 + bob, 13, 7, '#b67d9b');
      ellipse(c, -5, -21 + bob, 3, 2, '#e4c2ac'); ellipse(c, 5, -18 + bob, 2, 2, '#eed7ba');
      ellipse(c, -3, -10 + bob, 1.5, 2, '#5a4c59'); ellipse(c, 3, -10 + bob, 1.5, 2, '#5a4c59');
    } else if (boss) {
      // Broad shoulders, hammer hands and a forked bronze crown distinguish the elite.
      for (const side of [-1, 1]) {
        polygon(c, [[side * 5, -11], [side * 11, -9], [side * 13, 3], [side * 5, 3]], '#4b5261');
        polygon(c, [[side * 10, -28 + bob], [side * 21, -24 + bob], [side * 19, -13 + bob], [side * 12, -14 + bob]], '#95818b');
        round(c, side * 18 - 5, -15 + bob, 10, 12, 2, '#c49a72');
      }
      polygon(c, [[-11, -28 + bob], [11, -28 + bob], [13, -10], [0, -5], [-13, -10]], '#68647c');
      polygon(c, [[-7, -26 + bob], [0, -22 + bob], [7, -26 + bob], [5, -13], [0, -9], [-5, -13]], '#c5a277');
      round(c, -8, -40 + bob, 16, 15, 4, '#3c4658');
      polygon(c, [[-9, -38 + bob], [-14, -49 + bob], [-5, -44 + bob], [0, -52 + bob], [5, -44 + bob], [14, -49 + bob], [9, -38 + bob]], '#d9b177');
      line(c, [[-5, -33 + bob], [-2, -32 + bob]], '#ffe0a0', 2); line(c, [[2, -32 + bob], [5, -33 + bob]], '#ffe0a0', 2);
    } else {
      polygon(c, [[-10, 1], [-14, -19 + bob], [-7, -33 + bob], [7, -33 + bob], [14, -19 + bob], [10, 1], [4, -3], [0, 2], [-5, -2]], '#65798a');
      ellipse(c, 0, -18 + bob, 7, 11, '#afbbc2'); ellipse(c, 0, -15 + bob, 3, 6, '#425864');
    }
    if (rank >= 3 && !boss) {
      for (const side of [-1, 1]) polygon(c, [[side * 8, -21 + bob], [side * 15, -30 + bob], [side * 13, -16 + bob]], '#e1b380');
      line(c, [[-7, -5], [0, -2], [7, -5]], '#e7bd82', 2);
    }
    c.restore();
    const badgeY = -(boss ? 57 : m.type === 'husher' ? 39 : 31) * scale;
    round(c, boss ? -17 : -10, badgeY, boss ? 34 : 20, 15, 4, boss ? '#542e46' : rank >= 3 ? '#75413c' : '#3b4944');
    c.fillStyle = '#ffe8c4'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText(String(rank), boss ? 7 : 0, badgeY + 11);
    if (boss) line(c, [[-12, badgeY + 5], [-10, badgeY + 10], [-7, badgeY + 4], [-4, badgeY + 10], [-2, badgeY + 5]], '#f2c582', 1.2);
    if (m.stunnedUntil > time) { c.fillStyle = '#ffe7ab'; c.font = '15px serif'; c.fillText('✧', 0, badgeY - 4 + bob); }
    c.restore();
  };
})(globalThis);
