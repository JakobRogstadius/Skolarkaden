/* Klockgläntan: declarative rules. Costs are consecutive correct answers. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan = {};
  G.VERSION = 1;
  G.STEP = 0.1;
  G.POPULATION_LIMIT = 24;
  G.MAX_MONSTERS = 64;
  G.profiles = {
    gentle: { lairs: 6, wake: 105, spawn: 1.32, damage: 0.72, growth: 1.3 },
    steady: { lairs: 7, wake: 78, spawn: 1, damage: 1, growth: 1 },
    brave: { lairs: 8, wake: 58, spawn: 0.84, damage: 1.22, growth: 0.85 }
  };
  G.classes = {
    warrior: { name: 'Väktare', role: 'Skyddar andra i närstrid.', color: '#ecb85a', icon: 'shield', guild: 'hall', cost: 2, hp: 125, damage: 14, range: 1.1, speed: 1.5, cooldown: 1.05, courage: 1.2 },
    ranger: { name: 'Spejare', role: 'Utforskar och skjuter på avstånd.', color: '#a4d694', icon: 'bow', guild: 'lodge', cost: 2, hp: 75, damage: 11, range: 4.3, speed: 1.95, cooldown: 1.3, courage: 0.95 },
    healer: { name: 'Örtvårdare', role: 'Följer och läker sina vänner.', color: '#efa2b4', icon: 'leaf', guild: 'garden', cost: 3, hp: 70, damage: 5, range: 3, speed: 1.65, cooldown: 1.7, courage: 0.85 },
    mage: { name: 'Klangvävare', role: 'Spräcker grupper med klingande toner.', color: '#aab9f4', icon: 'chime', guild: 'spire', cost: 3, hp: 62, damage: 18, range: 3.7, speed: 1.55, cooldown: 1.9, courage: 0.9 }
  };
  G.buildings = {
    castle: { name: 'Klockborgen', icon: 'bell', w: 2, h: 2, hp: 1000, color: '#cebb8d', cost: 0, description: 'Gläntans hjärta. Måste överleva.' },
    house: { name: 'Bostad', icon: 'house', w: 2, h: 1, hp: 230, color: '#dfac75', cost: 2, capacity: 4, limit: 6, description: '+4 platser. Högst 24 invånare.' },
    hall: { name: 'Väktarhus', icon: 'shield', w: 2, h: 2, hp: 400, color: '#c59a5d', cost: 3, limit: 1, description: 'Rekrytera väktare.' },
    lodge: { name: 'Stighem', icon: 'bow', w: 2, h: 2, hp: 320, color: '#7eaa80', cost: 3, limit: 1, description: 'Rekrytera spejare.' },
    garden: { name: 'Örtgård', icon: 'leaf', w: 2, h: 2, hp: 300, color: '#d4979c', cost: 3, limit: 1, description: 'Rekrytera örtvårdare. Läker grannar.' },
    spire: { name: 'Klangverkstad', icon: 'chime', w: 2, h: 2, hp: 290, color: '#959fc5', cost: 4, limit: 1, description: 'Rekrytera klangvävare.' },
    tower: { name: 'Vindtorn', icon: 'tower', w: 1, h: 1, hp: 350, color: '#aebb9e', cost: 3, limit: 4, description: 'Skjuter på inkräktare.' },
    beacon: { name: 'Gryningsfyr', icon: 'sun', w: 2, h: 2, hp: 750, color: '#f1ce77', cost: 8, limit: 1, group: 'landmark', requires: 'castle2', description: 'Unik. Lång räckvidd, skadar grupper.' },
    conservatory: { name: 'Klockträdgård', icon: 'tree', w: 2, h: 2, hp: 600, color: '#c2d6a0', cost: 8, limit: 1, group: 'landmark', requires: 'castle2', description: 'Unik. Alla hjältar återhämtar sig snabbare.' }
  };
  G.research = {
    castle2: { name: 'Stäm klockborgen', icon: 'bell', cost: 4, building: 'castle', description: 'Öppnar fördjupningar. Borgen får +400 liv.' },
    armor: { name: 'Kopparspännen', icon: 'shield', cost: 3, building: 'hall', description: 'Alla hjältar får +20 % liv.' },
    boots: { name: 'Vandrarkängor', icon: 'boot', cost: 3, building: 'lodge', description: 'Alla hjältar rör sig 18 % snabbare.' },
    guardian: { name: 'Sköldvänner', icon: 'shield', cost: 4, building: 'hall', requires: 'castle2', group: 'warrior', description: 'Väktare skyddar allierade i närheten.' },
    breaker: { name: 'Kopparhammare', icon: 'hammer', cost: 4, building: 'hall', requires: 'castle2', group: 'warrior', description: 'Väktare gör dubbel skada på bon.' },
    pathfinder: { name: 'Lyktstigar', icon: 'compass', cost: 4, building: 'lodge', requires: 'castle2', group: 'ranger', description: 'Spejare ser längre och rör sig snabbare.' },
    marksman: { name: 'Törnpilar', icon: 'bow', cost: 4, building: 'lodge', requires: 'castle2', group: 'ranger', description: 'Spejare skjuter längre och gör +40 % skada.' },
    bloom: { name: 'Vandrande vår', icon: 'leaf', cost: 4, building: 'garden', requires: 'castle2', group: 'healer', description: 'Örtvårdare läker flera vänner samtidigt.' },
    ward: { name: 'Mosskappor', icon: 'shield', cost: 4, building: 'garden', requires: 'castle2', group: 'healer', description: 'Läkning ger också ett tillfälligt skydd.' },
    echo: { name: 'Efterklang', icon: 'chime', cost: 4, building: 'spire', requires: 'castle2', group: 'mage', description: 'Magiska toner studsar till fler fiender.' },
    frost: { name: 'Frostton', icon: 'snow', cost: 4, building: 'spire', requires: 'castle2', group: 'mage', description: 'Magiska toner bromsar monster kraftigt.' },
    mastery: { name: 'Den åttonde tonen', icon: 'star', cost: 8, building: 'spire', requires: 'castle2', group: 'landmark', description: 'Unik. Klangvävare på nivå 5 får en mäktig gruppattack.' }
  };
  G.lairTypes = {
    rust: { name: 'Skrammelbo', monster: 'rattler', color: '#bd7350', icon: 'gear', description: 'Samlar skrot och växer sig starkare.', growth: 'upgrade', interval: 175 },
    spore: { name: 'Sporkupa', monster: 'sporeling', color: '#c582aa', icon: 'spore', description: 'Sprider nya bon. Slå till innan nästa sporregn.', growth: 'spread', interval: 205 },
    hush: { name: 'Tystnadskvarn', monster: 'husher', color: '#858fb2', icon: 'moon', description: 'Vaknar sent, men släpper fram tunga monster.', growth: 'upgrade', interval: 190 }
  };
  G.monsterTypes = {
    rattler: { name: 'Skramlare', hp: 39, damage: 7, speed: 1.05, range: 0.9, cooldown: 1.4, color: '#c98150', xp: 10 },
    sporeling: { name: 'Fnysling', hp: 28, damage: 5, speed: 1.25, range: 1, cooldown: 1.5, color: '#cc88b1', xp: 8 },
    husher: { name: 'Tystätare', hp: 82, damage: 14, speed: 0.78, range: 1.2, cooldown: 1.8, color: '#929cbb', xp: 18 }
  };
  // Outer nests defend themselves when disturbed, even before their first raid.
  G.lairGuards = lair => Array(lair.tier).fill(G.lairTypes[lair.type].monster).concat(Array(lair.tier - 1).fill('husher'));
  G.monsterStrength = lair => 1 + (lair.tier - 1) * 0.22 + (lair.level - 1) * 0.2;
  G.names = ['Alva', 'Bosse', 'Cilla', 'Dag', 'Edda', 'Folke', 'Gry', 'Hjalmar', 'Iris', 'Juni', 'Knut', 'Lo', 'Mio', 'Nora', 'Otto', 'Pim', 'Rut', 'Siv', 'Tage', 'Una', 'Vega', 'Vide', 'Ylva', 'Östen'];
  G.traits = [
    { id: 'brave', name: 'Modig', courage: 1.18, speed: 1 },
    { id: 'careful', name: 'Försiktig', courage: 0.87, speed: 1.08 },
    { id: 'loyal', name: 'Omtänksam', courage: 1, speed: 1 },
    { id: 'restless', name: 'Nyfiken', courage: 1.03, speed: 1.08 }
  ];
  G.xpFor = level => 18 + level * level * 9;
  G.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  G.distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  G.alive = entity => entity.hp > 0;
  G.clockText = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
})(globalThis);
