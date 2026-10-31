/* Klockgläntan: declarative rules. Costs are consecutive correct answers. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan = {};
  G.VERSION = 2;
  G.STEP = 0.1;
  G.POPULATION_LIMIT = 24;
  G.MAX_MONSTERS = 84;
  G.MAX_RAIDERS = 64;
  G.MAX_CORPSES = 128;
  G.profiles = {
    gentle: { lairs: 6, mapScale: 2, firstWake: 120, wake: 105, spawn: 1.32, damage: 0.72, growth: 1.3, bossLevels: 10 },
    steady: { lairs: 7, mapScale: 2.5, firstWake: 105, wake: 88, spawn: 1, damage: 1, growth: 1, bossLevels: 20 },
    brave: { lairs: 8, mapScale: 3, firstWake: 90, wake: 78, spawn: 0.84, damage: 1.22, growth: 0.9, bossLevels: 30 }
  };
  G.classes = {
    warrior: { name: 'Väktare', role: 'Skyddar andra i närstrid.', color: '#ecb85a', icon: 'shield', guild: 'hall', cost: 2, hp: 125, damage: 14, range: 1.1, speed: 1.5, cooldown: 1.05, courage: 1.2 },
    ranger: { name: 'Spejare', role: 'Utforskar och skjuter på avstånd.', color: '#a4d694', icon: 'bow', guild: 'lodge', cost: 2, hp: 75, damage: 11, range: 4.3, speed: 1.95, cooldown: 1.3, courage: 0.95 },
    healer: { name: 'Örtvårdare', role: 'Följer och läker sina vänner.', color: '#ed9fb1', icon: 'heal', guild: 'garden', cost: 3, hp: 70, damage: 5, range: 3, speed: 1.65, cooldown: 1.7, courage: 0.85 },
    mage: { name: 'Klangvävare', role: 'Spräcker grupper med klingande toner.', color: '#ad91ed', icon: 'chime', guild: 'spire', cost: 3, hp: 62, damage: 18, range: 3.7, speed: 1.55, cooldown: 1.9, courage: 0.9 },
    necromancer: { name: 'Skelettmästare', role: 'Väcker upp till två monsterskelett. Svag områdesmagi läker mästaren och de egna skeletten.', color: '#93e3cb', icon: 'skull', guild: 'crypt', cost: 3, hp: 74, damage: 7, range: 3.8, speed: 1.55, cooldown: 2, courage: 0.9 }
  };
  G.buildings = {
    castle: { name: 'Klockborgen', icon: 'bell', w: 2, h: 2, hp: 1000, color: '#cebb8d', cost: 0, description: 'Gläntans hjärta. Måste överleva.' },
    house: { name: 'Bostad', icon: 'house', w: 2, h: 1, hp: 230, color: '#dfac75', cost: 2, capacity: 4, limit: 6, description: '+4 platser. Högst 24 invånare.' },
    hall: { name: 'Väktarhus', icon: 'shield', w: 2, h: 2, hp: 400, color: '#ecb85a', cost: 3, limit: 1, description: 'Rekrytera väktare.' },
    lodge: { name: 'Stighem', icon: 'bow', w: 2, h: 2, hp: 320, color: '#a4d694', cost: 3, limit: 1, description: 'Rekrytera spejare.' },
    garden: { name: 'Örtgård', icon: 'heal', w: 2, h: 2, hp: 300, color: '#ed9fb1', cost: 3, limit: 1, description: 'Rekrytera örtvårdare. Läker grannar.' },
    spire: { name: 'Klangverkstad', icon: 'chime', w: 2, h: 2, hp: 290, color: '#ad91ed', cost: 4, limit: 1, description: 'Rekrytera klangvävare.' },
    crypt: { name: 'Benvalv', icon: 'skull', w: 2, h: 2, hp: 310, color: '#93e3cb', cost: 4, limit: 1, description: 'Rekrytera skelettmästare. Fallna monster blir deras följeslagare.' },
    tower: { name: 'Vindtorn', icon: 'tower', w: 1, h: 1, hp: 350, color: '#aebb9e', cost: 3, limit: 4, description: 'Skjuter på inkräktare.' },
    beacon: { name: 'Gryningsfyr', icon: 'sun', w: 2, h: 2, hp: 750, color: '#f1ce77', cost: 8, limit: 1, group: 'landmark', requires: 'castle2', description: 'Unik. Lång räckvidd, skadar grupper.' },
    conservatory: { name: 'Klockträdgård', icon: 'tree', w: 2, h: 2, hp: 600, color: '#c2d6a0', cost: 8, limit: 1, group: 'landmark', requires: 'castle2', description: 'Unik. Alla hjältar återhämtar sig snabbare.' }
  };
  G.research = {
    castle2: { name: 'Stäm klockborgen', icon: 'bell', cost: 4, building: 'castle', description: 'Öppnar fördjupningar. Borgen får +400 liv.' },
    armor: { name: 'Kopparspännen', icon: 'shield', cost: 3, building: 'hall', description: 'Alla hjältar får +20 % liv.' },
    boots: { name: 'Vandrarkängor', icon: 'boot', cost: 3, building: 'lodge', description: 'Alla hjältar rör sig 18 % snabbare.' },
    guardian: { name: 'Sköldvänner', icon: 'shield', cost: 4, building: 'hall', requires: 'castle2', group: 'warrior', description: 'Väktare skyddar allierade i närheten.' },
    banner: { name: 'Fanbärare', icon: 'flag', cost: 4, building: 'hall', requires: 'castle2', group: 'warrior', description: 'Fanor ger alla vänner inom fyra rutor +25 % skada. Flera fanor staplas inte.' },
    traps: { name: 'Fällor', icon: 'trap', cost: 4, building: 'lodge', requires: 'castle2', group: 'ranger', description: 'Högst fyra fällor per spejare. Fångar och skadar ett markmonster var. Skadan ökar med hjältenivån.' },
    marksman: { name: 'Törnpilar', icon: 'bow', cost: 4, building: 'lodge', requires: 'castle2', group: 'ranger', description: 'Spejare skjuter längre och gör +40 % skada.' },
    bloom: { name: 'Vandrande vår', icon: 'leaf', cost: 4, building: 'garden', requires: 'castle2', group: 'healer', description: 'Örtvårdare läker flera vänner samtidigt.' },
    ward: { name: 'Mosskappor', icon: 'shield', cost: 4, building: 'garden', requires: 'castle2', group: 'healer', description: 'Läkning ger också ett tillfälligt skydd.' },
    echo: { name: 'Efterklang', icon: 'chime', cost: 4, building: 'spire', requires: 'castle2', group: 'mage', description: 'Magiska toner studsar till fler fiender.' },
    frost: { name: 'Frostton', icon: 'snow', cost: 4, building: 'spire', requires: 'castle2', group: 'mage', description: 'Magiska toner bromsar monster kraftigt.' },
    mastery: { name: 'Den åttonde tonen', icon: 'star', cost: 8, building: 'spire', requires: 'castle2', group: 'landmark', description: 'Unik. Klangvävare på nivå 5 får en mäktig gruppattack.' }
  };
  G.lairTypes = {
    rust: { name: 'Skrammelbo', monster: 'rattler', support: 'mender', color: '#bd7350', icon: 'gear', description: 'Rusande skramlare. Efter uppgradering får de skrotläkare bakom fronten.', interval: 175 },
    spore: { name: 'Sporkupa', monster: 'sporeling', support: 'broodcap', color: '#c582aa', icon: 'spore', description: 'Små fnyslingar. Uppgraderade bon skickar jättesvampar som odlar fler i strid.', interval: 205 },
    hush: { name: 'Tystnadskvarn', monster: 'husher', support: 'binder', color: '#858fb2', icon: 'moon', description: 'Magiker på avstånd. Rotbindare låser deras mål när boet växer.', interval: 190 },
    sky: { name: 'Vindnäste', monster: 'nightwing', support: 'siegebreaker', color: '#81b4c6', icon: 'wing', description: 'Flygare kräver avståndsattacker. Murknäckare följer efter när boet växer.', interval: 185 },
    thorn: { name: 'Törnsnår', monster: 'thornling', support: 'bulwark', color: '#a1ab6e', icon: 'bow', description: 'Taggskyttar håller avstånd. Skalväktare skyddar dem efter uppgradering.', interval: 180 }
  };
  G.monsterTypes = {
    rattler: { name: 'Skramlare', role: 'Närstrid. Rusar den sista biten mot sitt mål.', hp: 39, damage: 7, speed: 1.15, range: 0.9, cooldown: 1.4, color: '#c98150', xp: 10, rush: true },
    sporeling: { name: 'Fnysling', role: 'Snabb, svag närstridskämpe. Farlig i grupp.', hp: 28, damage: 5, speed: 1.35, range: 1, cooldown: 1.5, color: '#cc88b1', xp: 8 },
    husher: { name: 'Tystätare', role: 'Avståndsmagiker. Viker undan från närstrid.', hp: 60, damage: 8, speed: 1, range: 4.1, cooldown: 2.4, color: '#929cbb', xp: 16, spell: true, kite: true },
    nightwing: { name: 'Nattvinge', role: 'Flyger över hinder. Kan inte träffas av väktare, skelett eller markfällor.', hp: 34, damage: 6, speed: 1.5, range: 1.2, cooldown: 1.7, color: '#9dc9df', xp: 12, flying: true },
    thornling: { name: 'Taggskytt', role: 'Rörlig skytt. Backar när hjältar kommer nära.', hp: 34, damage: 8, speed: 1.25, range: 3.6, cooldown: 1.6, color: '#bdd084', xp: 12, kite: true },
    mender: { name: 'Skrotläkare', role: 'Läker andra monster. Svag om frontlinjen faller.', hp: 78, damage: 4, speed: 1.05, range: 3.5, cooldown: 2, color: '#f2bd88', xp: 22, medic: true, spell: true },
    binder: { name: 'Rotbindare', role: 'Binder en hjälte eller ett skelett med rötter. Målet kan fortfarande anfalla och får en kort frist mellan bindningar.', hp: 82, damage: 4, speed: 1, range: 4.3, cooldown: 2.4, color: '#c6a3da', xp: 24, bind: true, spell: true },
    siegebreaker: { name: 'Murknäckare', role: 'Tung belägrare. Prioriterar byggnader framför hjältar.', hp: 165, damage: 23, speed: .78, range: 1.35, cooldown: 2.5, color: '#b79869', xp: 28, siege: true },
    broodcap: { name: 'Jättesporsvamp', role: 'Odlar upp till tre levande fnyslingar när den slåss.', hp: 145, damage: 10, speed: .8, range: 1.4, cooldown: 2, color: '#c880b5', xp: 28, brood: true },
    bulwark: { name: 'Skalväktare', role: 'Skyddar andra monster i närheten från 25 % av skadan.', hp: 145, damage: 10, speed: .85, range: 1.2, cooldown: 1.8, color: '#9fae80', xp: 26, ward: true },
    guardian: { name: 'Klockväktare', role: 'Bossvakt med tung närstridsattack. Lämnar inte sitt bo.', hp: 230, damage: 35, speed: 1.12, range: 1.35, cooldown: 1.55, color: '#9b647e', xp: 55 }
  };
  // Guardians are present from birth. Awakening releases separate raiding parties.
  G.lairGuards = lair => lair.boss ? ['guardian', 'guardian'] : [G.lairTypes[lair.type].monster, G.lairTypes[lair.type].monster];
  // Balanced parties at 10/20/30 total levels can clear these fixed guardians.
  // Use dev/glantan-balance.cjs --boss when changing combat or retreat rules.
  G.bossGuards = { gentle: { hp: 230, damage: 35 }, steady: { hp: 360, damage: 43 }, brave: { hp: 500, damage: 50 } };
  G.lairHitPoints = (site, pace) => site.boss ? { gentle: 550, steady: 850, brave: 1150 }[pace] : 100 + (site.tier || 1) ** 2 * 70;
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
