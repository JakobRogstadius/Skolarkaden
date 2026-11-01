/* Combat silhouettes and layered spells; no simulation state is changed here. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan, A = G.Art, T = A.tile;
  const { ellipse, line, polygon, round } = A, ink = '#253c39', bone = '#f0e6c8';
  A.actionPose = function(unit, time, reduced = false) {
    const cue = unit.actionCue, age = cue && time - cue.at;
    if (!cue || unit.hp <= 0 || age < 0 || age >= G.ACTION_DURATION) return null;
    const p = reduced ? .4 : age / G.ACTION_DURATION, power = Math.sin(p * Math.PI);
    return { ...cue, p, power, reduced, swing: power * 1.8, draw: Math.max(0, 1 - p / .35) };
  };
  A.actionBody = function(c, unit, pose, style) {
    if (pose && !pose.reduced) {
      const reach = style === 'work' ? 0 : style === 'cast' || style === 'bow' ? -4 : style === 'heavy' ? 12 : 8;
      c.translate(pose.dx * reach * pose.power, (pose.dy * reach * .65 + (style === 'work' ? 8 : style === 'dive' ? 9 : style === 'cap' ? -6 : 0)) * pose.power);
      c.rotate(pose.dx * pose.power * (style === 'heavy' ? .16 : .09));
      if (style === 'cap') c.scale(1 + pose.power * .16, 1 - pose.power * .12);
    }
    c.scale(pose && Math.abs(pose.dx) > .05 ? (pose.dx < 0 ? -1 : 1) : unit.facing || 1, 1);
  };
  A.castOrigin = function(unit, pose, bodyPower = pose?.power || 0) {
    // Match the glowing staff tip / casting hand in heroBody and monsterBody.
    // The weapon uses the sampled sprite pose; the body keeps its continuous
    // turn and lean. Return world pixels, before the camera transform.
    const type = unit.classId || unit.type, power = bodyPower;
    let x, y, pivotX = 0, pivotY = 0, turn = 0;
    if (type === 'mage' || type === 'necromancer') { x = 13; y = type === 'mage' ? -40 : -42; pivotX = 10; pivotY = -20; turn = power * .45; }
    else if (type === 'mender') { x = 13; y = -35; pivotX = 8; pivotY = -18; turn = power * .45; }
    else if (type === 'binder') { x = 13; y = -32; pivotX = 10; pivotY = -22; turn = power * .5; }
    else if (type === 'healer') { x = 12 + power * 6; y = -18 - power * 5; }
    else if (type === 'husher') { x = 17 + power * 5; y = -24; }
    else return null;
    if (turn) {
      const dx = x - pivotX, dy = y - pivotY, cos = Math.cos(turn), sin = Math.sin(turn);
      x = pivotX + dx * cos - dy * sin; y = pivotY + dx * sin + dy * cos;
    }
    x *= pose && Math.abs(pose.dx) > .05 ? (pose.dx < 0 ? -1 : 1) : unit.facing || 1;
    if (pose && !pose.reduced) {
      const cos = Math.cos(pose.dx * pose.power * .09), sin = Math.sin(pose.dx * pose.power * .09), xx = x;
      x = x * cos - y * sin - pose.dx * 4 * pose.power;
      y = xx * sin + y * cos - pose.dy * 2.6 * pose.power;
    }
    const scale = unit.classId ? 1 : A.monsterScale(unit), groundX = unit.x * T, groundY = unit.y * T;
    return { x: groundX + x * scale, y: groundY + y * scale, groundX, groundY };
  };
  A.actionGlow = function(c, pose, x, y, color) {
    if (!pose) return;
    if (pose.kind === 'heal') color = '#c9ff9e';
    const radius = 6 + pose.power * 5;
    ellipse(c, x, y, radius + 4, radius + 4, color + '40');
    ring(c, x, y, radius, ink, 4, 1); ring(c, x, y, radius, color, 2, 1);
    ellipse(c, x, y, 3, 3, '#fff9df');
    if (pose.kind === 'heal') {
      line(c, [[x - 4, y], [x + 4, y]], color, 2); line(c, [[x, y - 4], [x, y + 4]], color, 2);
    }
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3 + pose.p * 2;
      line(c, [[x + Math.cos(a) * (radius + 3), y + Math.sin(a) * (radius + 3)], [x + Math.cos(a) * (radius + 7), y + Math.sin(a) * (radius + 7)]], color, 2);
    }
  };
  function skull(c, x, y, size = 1, color = bone) {
    c.save(); c.translate(x, y); c.scale(size, size);
    ellipse(c, 0, -2, 6, 6, color); round(c, -4, 0, 8, 6, 2, color);
    for (const side of [-1, 1]) ellipse(c, side * 2.5, -2, 1.7, 2, '#294b44');
    line(c, [[-1.5, 3], [-1.5, 6]], '#567066', 1); line(c, [[1.5, 3], [1.5, 6]], '#567066', 1); c.restore();
  }
  function level(c, n, y, color = '#dbf4d8') {
    round(c, -9, y, 18, 13, 4, '#213e38e6');
    c.fillStyle = color; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText(String(n), 0, y + 10);
  }
  A.corpse = function(c, corpse) {
    c.save(); c.translate(corpse.x * T, corpse.y * T);
    ellipse(c, 0, 2, 12, 6, '#203b3d55');
    line(c, [[-9, 4], [8, -1]], '#43564c', 4); line(c, [[-8, -1], [9, 4]], '#43564c', 4);
    line(c, [[-9, 4], [8, -1]], bone, 2); line(c, [[-8, -1], [9, 4]], bone, 2);
    skull(c, 0, -3, .75); level(c, corpse.level, 9, '#e9ddc2'); c.restore();
  };
  A.skeleton = function(c, unit, w, time, reduced = false, cache = null) {
    c.save(); c.translate(unit.x * T, unit.y * T);
    const pose = A.actionPose(unit, time, reduced);
    ellipse(c, 0, 2, 9, 3.5, '#203c365f');
    c.save(); A.actionBody(c, unit, pose, 'melee');
    if (cache) cache.body(c, 'skeleton', unit, w, time, reduced, pose);
    else A.skeletonBody(c, unit, w, time, reduced, pose);
    c.restore(); level(c, unit.monster ? unit.rank : unit.level, unit.monster ? A.monsterBadgeY(unit) : A.skeletonBadgeY, unit.monster ? '#ffb0a3' : '#dbf4d8'); c.restore();
  };
  A.skeletonBody = function(c, unit, w, time, reduced, pose) {
    const bone = unit.monster ? '#e47770' : '#f0e6c8', accent = unit.monster ? '#782e46' : '#54c5a1';
    const walk = unit.artWalk ?? (!reduced && !pose && time - (unit.movedAt ?? -1) < .2 ? Math.sin(time * 11 + unit.id) : 0);
    line(c, [[-3, -10], [-5 - walk * 2, -4], [-5 - walk * 2, 1]], ink, 4);
    line(c, [[3, -10], [5 + walk * 2, -4], [5 + walk * 2, 1]], ink, 4);
    line(c, [[-3, -10], [-5 - walk * 2, -4], [-5 - walk * 2, 1]], bone, 2);
    line(c, [[3, -10], [5 + walk * 2, -4], [5 + walk * 2, 1]], bone, 2);
    line(c, [[0, -24], [0, -10]], ink, 5); line(c, [[0, -24], [0, -10]], bone, 2);
    for (const y of [-21, -17, -13]) line(c, [[-5, y - 1], [-5, y + 1], [0, y + 2], [5, y + 1], [5, y - 1]], bone, 1.8);
    line(c, [[-5, -23], [-9, -16], [-8, -10]], bone, 2.5);
    c.save(); c.translate(7, -21); c.rotate(pose?.swing || 0); c.translate(-7, 21);
    line(c, [[5, -23], [10, -17], [12, -21]], bone, 2.5);
    line(c, [[12, -12], [12, -31]], unit.monster ? '#f5ada1' : '#b4c2ba', 2.5); line(c, [[9, -17], [15, -17]], accent, 2);
    c.restore();
    skull(c, 0, -29, 1, bone); polygon(c, [[-5, -24], [5, -24], [4, -20], [-5, -22]], accent);
    if (unit.monster) polygon(c, [[-6, -36], [-8, -42], [-2, -36], [2, -36], [8, -42], [6, -36]], accent, ink);
  };
  A.trap = function(c, trap, w) {
    c.save(); c.translate(trap.x * T, trap.y * T);
    const abandoned = !w.lairs.some(l => l.id === trap.lair && G.alive(l));
    ellipse(c, 0, 2, 12, 7, '#253c3b60'); ellipse(c, 0, 0, 11, 7, '#43564b'); ellipse(c, 0, 0, 8, 4, '#87966a');
    for (const side of [-1, 1]) for (let i = -1; i <= 1; i++) polygon(c, [[i * 6 - 2, side * 6], [i * 6, side * 1.5], [i * 6 + 2, side * 6]], abandoned ? '#8d9f90' : '#ffe5ae', ink);
    line(c, [[-4, 0], [4, 0]], '#ddbc70', 1.5);
    if (abandoned) { c.fillStyle = '#fff1c5'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('↶', 0, -10); }
    c.restore();
  };
  A.specialMonster = function(c, m, bob, time, pose) {
    const color = G.monsterTypes[m.type].color, power = pose?.power || 0;
    if (m.type === 'nightwing') {
      c.save(); c.translate(0, -27 + bob);
      const wing = (m.artWing ?? Math.sin(time * 11 + m.id) * 7) + power * 15, span = 28 - power * 9;
      for (const side of [-1, 1]) {
        polygon(c, [[side * 4, 0], [side * span, -15 + wing], [side * (span - 3), 5 + wing], [side * 17, 0], [side * 10, 9]], '#37596f', '#243b4a');
        line(c, [[side * 4, 0], [side * span, -15 + wing], [side * 17, 0]], '#9bcce1', 1.5);
      }
      ellipse(c, 0, 0, 7, 10, color); polygon(c, [[-7, -4], [-8, -14], [-2, -7], [3, -7], [8, -14], [7, -4]], '#4b7893');
      for (const x of [-3, 3]) ellipse(c, x, -3, 1.5, 2, '#ffcb8c'); c.restore();
    } else if (m.type === 'broodcap') {
      ellipse(c, 0, -9 + bob, 10, 13, '#dfc9ad');
      ellipse(c, 0, -24 + bob, 18, 10, '#925379'); ellipse(c, -3, -27 + bob, 13, 6, '#d288ad');
      for (const [x, y] of [[-11, -25], [0, -29], [11, -24]]) ellipse(c, x, y + bob, 3.5, 2, '#ffe3b0');
      for (const x of [-4, 4]) ellipse(c, x, -12 + bob, 2, 2, '#54404e');
      for (const x of [-13, 13]) { line(c, [[x, 2], [x, -4]], '#dac7b0', 3); ellipse(c, x, -5, 5, 3, '#bd79a0'); }
    } else if (m.type === 'siegebreaker') {
      for (const side of [-1, 1]) for (const y of [-14, -5]) line(c, [[side * 10, y], [side * 18, y + 2 + bob], [side * 18, y + 8]], '#514c35', 3);
      ellipse(c, 0, -12 + bob, 16, 12, '#76613e'); ellipse(c, -2, -15 + bob, 12, 9, '#b59b67');
      line(c, [[0, -24 + bob], [0, -4 + bob]], '#4a4b36', 2);
      round(c, -7, -7 + bob, 14, 10, 4, '#5f5c45', ink);
      polygon(c, [[-6, -2 + bob], [0, -15 + bob], [6, -2 + bob]], '#eee0ac', ink);
    } else if (m.type === 'bulwark') {
      polygon(c, [[-12, -25 + bob], [12, -25 + bob], [15, -6], [7, 1], [-7, 1], [-15, -6]], '#4b6859', ink);
      for (const side of [-1, 1]) {
        c.save(); c.translate(side === 1 ? power * 8 : 0, -power * 2);
        polygon(c, [[side * 7, -24], [side * 18, -21], [side * 18, -6], [side * 11, -1], [side * 7, -7]], '#a1ac8a', ink); c.restore();
      }
      round(c, -7, -29 + bob, 14, 11, 3, '#c3be98', ink); line(c, [[-4, -24 + bob], [4, -24 + bob]], '#6e3935', 2);
      line(c, [[0, -18], [0, -6]], '#eadca9', 2); line(c, [[-4, -12], [4, -12]], '#eadca9', 2);
    } else if (['mender', 'binder', 'thornling'].includes(m.type)) {
      polygon(c, [[-8, -26 + bob], [8, -26 + bob], [12, 0], [-12, 0]], color, ink);
      round(c, -6, -32 + bob, 12, 13, 4, m.type === 'mender' ? '#d4bd8b' : '#b6c49b', ink);
      for (const x of [-3, 3]) ellipse(c, x, -26 + bob, 1.5, 1.5, '#5d3535');
      if (m.type === 'mender') {
        c.save(); c.translate(8, -18); c.rotate(power * .45); c.translate(-8, 18);
        line(c, [[13, 1], [13, -35]], '#69543d', 3); ellipse(c, 13, -35, 7, 7, '#70563d');
        line(c, [[13, -39], [13, -31]], '#ffe2a3', 2); line(c, [[9, -35], [17, -35]], '#ffe2a3', 2);
        A.actionGlow(c, pose, 13, -35, '#ffb38a'); c.restore();
        round(c, -13, -13, 9, 10, 2, '#e2c28e', ink);
      } else if (m.type === 'binder') {
        polygon(c, [[-8, -32], [-11, -41], [-1, -35], [7, -42], [9, -31]], '#57634c', ink);
        c.save(); c.translate(10, -22); c.rotate(power * .5); c.translate(-10, 22);
        line(c, [[13, 1], [10, -22], [18, -32], [13, -39], [8, -35]], '#c5b58b', 3);
        skull(c, 13, -32, .85, '#e47770');
        A.actionGlow(c, pose, 13, -32, '#ff8d9f'); c.restore();
        line(c, [[-11, -4], [-18, 0], [-22, -7]], '#8c9768', 2);
      } else {
        polygon(c, [[-8, -30], [0, -39], [8, -30]], '#42684b', ink);
        c.save(); c.translate(power * 4, 0);
        line(c, [[11, -29], [20, -18], [11, -4]], '#d4ba85', 2.5);
        line(c, [[11, -29], [11 - (pose?.draw || 0) * 8, -16], [11, -4]], '#fff0c3', 1.5);
        if (!pose || pose.p < .25 || pose.p > .85) { line(c, [[7, -16], [25, -16]], '#efdca8', 2); polygon(c, [[25, -19], [30, -16], [25, -13]], '#d87965'); }
        c.restore();
      }
    } else return false;
    return true;
  };
  function ring(c, x, y, radius, color, width = 2, flatten = .55) {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.ellipse(x, y, Math.max(.1, radius), Math.max(.1, radius * flatten), 0, 0, Math.PI * 2); c.stroke();
  }
  A.slash = function(c, e, progress, reduced) {
    const p = reduced ? .4 : progress, x = e.x * T, y = e.y * T - 18, tx = e.toX * T, ty = e.toY * T - 18;
    const angle = Math.atan2(ty - y, tx - x), radius = G.clamp(Math.hypot(tx - x, ty - y) * .75, 20, 60);
    const color = e.color || '#ffe5a1', start = angle - 1.15 + p * 1.7, end = start + 1.25;
    c.lineCap = 'round';
    for (const offset of e.claw ? [-5, 4] : [0]) {
      for (const [stroke, width] of [[ink, e.heavy ? 9 : 7], [color, e.heavy ? 6 : 4], ['#fff8df', 1.5]]) {
        c.strokeStyle = stroke; c.lineWidth = width; c.beginPath(); c.arc(x, y + offset, radius, start, end); c.stroke();
      }
    }
    const hit = Math.sin(Math.min(1, p * 1.6) * Math.PI), size = (e.heavy ? 14 : 9) * hit;
    if (size > 0) {
      polygon(c, [[tx, ty - size], [tx + size * .3, ty - size * .3], [tx + size, ty], [tx + size * .3, ty + size * .3], [tx, ty + size], [tx - size * .3, ty + size * .3], [tx - size, ty], [tx - size * .3, ty - size * .3]], '#fff5d0', ink);
      if (e.heavy) ring(c, tx, ty + 18, 12 + p * 25, color, 2);
    }
  };
  A.bolt = function(c, e, progress, reduced) {
    const p = reduced ? .55 : Math.min(1, progress * 1.5), x = e.x * T, y = e.y * T - 18, tx = e.toX * T, ty = e.toY * T - 18;
    const color = e.color || '#ffe5a1';
    if (reduced) { line(c, [[x, y], [tx, ty]], ink, 4); line(c, [[x, y], [tx, ty]], color, 2); }
    c.save(); c.translate(x + (tx - x) * p, y + (ty - y) * p); c.rotate(Math.atan2(ty - y, tx - x));
    line(c, [[-22, 0], [0, 0]], ink, e.heavy ? 7 : 5); line(c, [[-22, 0], [0, 0]], color, e.heavy ? 4 : 2.5);
    polygon(c, [[6, 0], [-3, -4], [-1, 0], [-3, 4]], '#fff5d4', ink);
    line(c, [[-16, -4], [-12, 0], [-16, 4]], color, 2); c.restore();
  };
  A.spell = function(c, e, p, reduced, origin = null) {
    const x = origin?.x ?? e.x * T, y = origin?.y ?? e.y * T - 22, tx = e.toX * T, ty = e.toY * T - 12;
    const groundX = origin?.groundX ?? e.x * T, groundY = origin?.groundY ?? e.y * T;
    const color = e.color || '#c5a4ff', life = ['life', 'mend', 'drain'].includes(e.school), soul = ['soul', 'drain'].includes(e.school);
    const flight = Math.min(1, p / .55), impact = G.clamp((p - .4) / .6, 0, 1);
    c.save();
    if (reduced) {
      line(c, [[x, y], [tx, ty]], '#1f3436', 6); line(c, [[x, y], [tx, ty]], color, 3);
      ring(c, tx, ty + 12, Math.max(14, (e.radius || 1) * T * .55), color, 3);
      ellipse(c, tx, ty, 4, 4, '#fff8e5'); c.restore(); return;
    }
    // Ground runes anchor the cast; a bright core keeps it readable on grass.
    c.globalAlpha *= 1 - p * .7;
    ring(c, groundX, groundY, 16 + p * 6, color, 2);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + p;
      line(c, [[groundX + Math.cos(a) * 21, groundY + Math.sin(a) * 12], [groundX + Math.cos(a) * 26, groundY + Math.sin(a) * 15]], color, 2);
    }
    c.globalAlpha = Math.min(1, (1 - p) * 3);
    if (flight < 1 || p < .68) {
      const trail = [];
      for (let i = 0; i <= 18; i++) {
        const f = Math.max(0, flight - .26 + i / 18 * .26), arc = Math.sin(f * Math.PI) * (life ? 22 : 8);
        trail.push([x + (tx - x) * f, y + (ty - y) * f - arc]);
      }
      // Layered translucent strokes keep the bright halo without asking the
      // canvas to blur every stroke and every particle on each animation frame.
      line(c, trail, '#233f4680', 11);
      line(c, trail, color + '26', 15); line(c, trail, color + '50', 10);
      line(c, trail, color, 6); line(c, trail, '#fff9e8', 2.2);
      const [headX, headY] = trail.at(-1); ellipse(c, headX, headY, soul ? 6 : 4, soul ? 4 : 4, '#fff9e5');
      for (let i = 0; i < 7; i++) {
        const f = Math.max(0, flight - i * .035), a = i * 1.9 + p * 9;
        ellipse(c, x + (tx - x) * f + Math.cos(a) * 6, y + (ty - y) * f - Math.sin(f * Math.PI) * (life ? 22 : 8) + Math.sin(a) * 6, 2.2 - i * .18, 2.2 - i * .18, color);
      }
    }
    if (impact > 0) {
      const radius = Math.max(13, (e.radius || 1) * T * .68), spread = radius * (.2 + impact * .8);
      c.globalAlpha = (1 - impact) * .75;
      const glow = c.createRadialGradient(tx, ty, 0, tx, ty, spread);
      glow.addColorStop(0, color + '70'); glow.addColorStop(1, color + '00');
      ellipse(c, tx, ty, spread, spread, glow);
      c.globalAlpha = (1 - impact) * .95;
      ring(c, tx, ty + 12, spread, color, 3 * (1 - impact) + 1);
      ring(c, tx, ty + 12, spread * .72, '#fff4d9', 1.3);
      for (let i = 0; i < 9; i++) {
        const a = i * Math.PI * 2 / 9, xx = tx + Math.cos(a) * spread, yy = ty + Math.sin(a) * spread * .6 - Math.sin(impact * Math.PI) * 12;
        if (life && i % 3 === 0) { line(c, [[xx - 3, yy], [xx + 3, yy]], color, 2); line(c, [[xx, yy - 3], [xx, yy + 3]], color, 2); }
        else polygon(c, [[xx, yy - 4], [xx + 2, yy], [xx, yy + 4], [xx - 2, yy]], i % 2 ? color : '#fff3cd');
      }
    }
    c.restore();
  };
  A.ritual = function(c, e, p, reduced) {
    const x = e.x * T, y = e.y * T, radius = e.type === 'snare' ? 18 : 23, color = e.color || '#e6ebd3';
    ring(c, x, y, radius * (reduced ? 1 : .6 + p * .6), color, 2);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, xx = x + Math.cos(a) * radius, yy = y + Math.sin(a) * radius * .5;
      if (e.type === 'snare') line(c, [[xx, yy], [x + Math.cos(a) * 7, y - 20], [x, y - 26]], color, 1.6);
      else line(c, [[xx, yy], [xx, yy - (reduced ? 13 : Math.sin(p * Math.PI) * 25)]], color, 2);
    }
  };
  A.status = function(c, unit, w) {
    if (unit.rootedUntil > w.time) {
      const x = unit.x * T, y = unit.y * T;
      ring(c, x, y, 15, '#e9d79c', 2);
      for (const side of [-1, 1]) line(c, [[x + side * 14, y], [x + side * 6, y - 18], [x - side * 9, y - 4]], '#f4dfab', 1.8);
    }
    if (unit.classId === 'warrior' && (w.research.banner || w.research.guardian)) ring(c, unit.x * T, unit.y * T + 1, 14, w.research.banner ? '#f5b563' : '#c4e7ff', 1.5);
  };
})(globalThis);
