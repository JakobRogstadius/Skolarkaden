/* Rangers carry four reusable trap slots; each armed trap catches one ground foe. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan, routes = new WeakMap();
  G.trapDamage = level => 14 + level * 6;
  function routeSites(w, lair) {
    let cache = routes.get(w);
    if (!cache || cache.revision !== w.navRevision) { cache = { revision: w.navRevision, lairs: new Map() }; routes.set(w, cache); }
    if (cache.lairs.has(lair.id)) return cache.lairs.get(lair.id);
    const castle = G.castle(w), from = G.freeNear(w, lair), to = G.freeNear(w, castle), route = [from, ...G.path(w, from, to)];
    const distances = [0];
    for (let i = 1; i < route.length; i++) distances.push(distances[i - 1] + G.distance(route[i - 1], route[i]));
    const total = distances.at(-1), sites = [];
    if (total > 0 && G.distance(route.at(-1), to) < 1) for (let i = 0; i < route.length; i++) {
      const p = route[i], progress = distances[i] / total, between = G.distance(p, lair) / (G.distance(p, lair) + G.distance(p, castle));
      if (progress >= .3 && progress <= .7 && between >= .3 && between <= .7 && G.open(w, p.x, p.y)) sites.push({ x: p.x, y: p.y, progress });
    }
    cache.lairs.set(lair.id, sites); return sites;
  }
  G.trapSites = routeSites;
  G.rangerTrapWork = function(w, hero, speed, dt, nearbyOnly = false) {
    if (hero.classId !== 'ranger' || !w.research.traps || hero.retreating) return false;
    const owned = w.traps.filter(t => t.owner === hero.id);
    const abandoned = owned.filter(t => !w.lairs.some(l => l.id === t.lair && G.alive(l))).sort((a, b) => G.distance(hero, a) - G.distance(hero, b))[0];
    if (abandoned && (!nearbyOnly || G.distance(hero, abandoned) < 3)) {
      hero.task = 'Hämtar fällor';
      if (G.distance(hero, abandoned) < .65) { w.traps.splice(w.traps.indexOf(abandoned), 1); w.revision++; }
      else G.move(w, hero, abandoned, speed, dt);
      return true;
    }
    if (owned.length >= 4 || (hero.trapAt || 0) > w.time) return false;
    if (!hero.trapGoal || !w.lairs.some(l => l.id === hero.trapGoal.lair && G.alive(l))) {
      if ((hero.trapPlanAt || 0) > w.time) return false;
      hero.trapPlanAt = w.time + 7;
      const lairs = w.lairs.filter(l => l.seen && G.alive(l)).sort((a, b) => {
        const priority = l => w.traps.filter(t => t.lair === l.id).length * 10 + G.distance(hero, l) * .15 - (l.awake ? 2 : 0);
        return priority(a) - priority(b);
      });
      for (const lair of lairs) {
        const sites = routeSites(w, lair).filter(p => (!nearbyOnly || G.distance(hero, p) < 3) && w.explored[G.index(w, p.x, p.y)] && !w.traps.some(t => G.distance(t, p) < 1.15) && !w.monsters.some(m => G.alive(m) && G.distance(m, p) < 3));
        sites.sort((a, b) => G.distance(hero, a) - G.distance(hero, b));
        if (sites.length) { hero.trapGoal = { ...sites[0], lair: lair.id }; hero.routeKey = ''; break; }
      }
    }
    const goal = hero.trapGoal;
    if (!goal) return false;
    if (nearbyOnly && G.distance(hero, goal) > 3) return false;
    if (!G.open(w, goal.x, goal.y) || w.traps.some(t => G.distance(t, goal) < 1.15)) { hero.trapGoal = null; return false; }
    hero.task = 'Lägger fällor';
    if (G.distance(hero, goal) > .5) G.move(w, hero, goal, speed, dt);
    else {
      w.traps.push({ id: w.nextId++, owner: hero.id, lair: goal.lair, x: goal.x, y: goal.y, level: hero.level, progress: goal.progress, born: w.time });
      hero.trapGoal = null; hero.trapAt = w.time + 5; hero.trapPlanAt = 0; w.revision++;
      G.soundEvent(w, 'build', hero);
    }
    return true;
  };
  G.updateTraps = function(w) {
    for (const trap of [...w.traps]) {
      const owner = w.heroes.find(h => h.id === trap.owner && G.alive(h));
      if (!owner) { w.traps.splice(w.traps.indexOf(trap), 1); continue; }
      const target = w.monsters.find(m => G.alive(m) && !G.flying(m) && G.distance(m, trap) < .6 && G.clearLine(w, trap, m));
      if (!target) continue;
      w.traps.splice(w.traps.indexOf(trap), 1); target.rootedUntil = Math.max(target.rootedUntil || 0, w.time + (target.boss ? 1.2 : 2.8));
      G.effect(w, 'snare', target.x, target.y, { duration: .85, color: '#e6d891' });
      G.damage(w, target, G.trapDamage(trap.level), owner); owner.contributedAt = w.time;
      G.soundEvent(w, 'warrior', target); w.revision++;
    }
  };
})(globalThis);
