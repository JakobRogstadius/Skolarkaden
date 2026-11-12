/* Klockgläntan: declarative rules. Costs are consecutive correct answers. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan = {};
  G.VERSION = 2;
  G.STEP = 0.1;
  G.ACTION_DURATION = .4;
  G.POPULATION_LIMIT = 24;
  G.MAX_MONSTERS = 87; // 64 raiders + 23 guards across nine hard-mode lairs and two spreading nests.
  G.MAX_RAIDERS = 64;
  G.MAX_CORPSES = 128;
  G.CORPSE_LIFETIME = 45;
  G.NECROMANCER_LIMIT = 1;
  G.counterRules = {
    corrosionMaxStacks: 3, corrosionPerStack: .26, corrosionDuration: 7, rustRadius: 4.5, cleanseRadius: 2.8, cleanseProtection: 2.5,
    mistRadius: 3.5, mistSpotRadius: 1.7, mistClearDuration: 5, sporeDamage: 2,
    echoRadius: 3.5, echoAbsorb: .65, echoDirectAbsorb: .45, echoCap: .25, echoDuration: 4,
    thornWoundCap: .5, thornRecoveryDelay: 5, thornRecoveryRate: .1, thornWoundFraction: .4,
    arrowGuardRadius: 2.8, arrowInterceptDamage: .45, arrowSelfDamage: .5, boneArrowDamage: .35
  };
  G.lairCounters = {
    rust: { primary: 'mage', secondary: 'healer', punishes: 'warrior' },
    spore: { primary: 'healer', secondary: 'warrior', punishes: 'ranger' },
    hush: { primary: 'necromancer', secondary: 'ranger', punishes: 'mage' },
    sky: { primary: 'ranger', secondary: 'mage', punishes: 'necromancer' },
    thorn: { primary: 'warrior', secondary: 'necromancer', punishes: 'healer' }
  };
  G.profiles = {
    gentle: { lairs: 5, mapScale: 2, firstWake: 120, wake: 105, spawn: 1.32, damage: 0.72, growth: 1.3, bossLevels: 10, bossGuardCount: 1 },
    steady: { lairs: 7, mapScale: 2.5, firstWake: 105, wake: 88, spawn: 1, damage: 1, growth: 1, bossLevels: 20, bossGuardCount: 2 },
    brave: { lairs: 9, mapScale: 3, firstWake: 150, wake: 105, spawn: 0.84, damage: 1.22, growth: 0.9, bossLevels: 30, bossGuardCount: 3, raidInterval: 210, growthWaves: false }
  };
  G.classes = {
    warrior: { name: 'Riddare', role: 'Slåss nära och stoppar pilar med sin sköld.', color: '#ecb85a', icon: 'shield', guild: 'hall', cost: 2, hp: 125, damage: 14, range: 1.1, speed: 1.5, cooldown: 1.05, courage: 1.2 },
    ranger: { name: 'Bågskytt', role: 'Utforskar och skjuter på avstånd.', color: '#a4d694', icon: 'bow', guild: 'lodge', cost: 2, hp: 75, damage: 11, range: 4.3, speed: 1.95, cooldown: 1.3, courage: 0.95 },
    healer: { name: 'Läkare', role: 'Läker vänner, tvättar bort rost och skingrar dimma.', color: '#ed9fb1', icon: 'heal', guild: 'garden', cost: 3, hp: 70, damage: 5, range: 3, speed: 1.65, cooldown: 1.7, courage: 0.85 },
    mage: { name: 'Trollkarl', role: 'Träffar flera monster med magi.', color: '#ad91ed', icon: 'chime', guild: 'spire', cost: 3, hp: 62, damage: 18, range: 3.7, speed: 1.55, cooldown: 1.9, courage: 0.9 },
    necromancer: { name: 'Skelettmagiker', role: 'Har en skelettvän som stoppar pilar. Bryter spöksköldar och tar över fiendeskelett.', color: '#93e3cb', icon: 'skull', guild: 'crypt', cost: 3, hp: 74, damage: 8, range: 3.8, speed: 1.55, cooldown: 2, courage: 0.9 }
  };
  G.buildings = {
    castle: { name: 'Klockborgen', icon: 'bell', w: 2, h: 2, hp: 1000, color: '#cebb8d', cost: 0, description: 'Gläntans hjärta. Måste överleva.' },
    house: { name: 'Bostad', icon: 'house', w: 2, h: 1, hp: 230, color: '#dfac75', cost: 2, capacity: 4, limit: 6, description: '+4 platser. Högst 24 invånare.' },
    hall: { name: 'Riddarhus', icon: 'shield', w: 2, h: 2, hp: 400, color: '#ecb85a', cost: 3, limit: 1, description: 'Rekrytera riddare.' },
    lodge: { name: 'Båghus', icon: 'bow', w: 2, h: 2, hp: 320, color: '#a4d694', cost: 3, limit: 1, description: 'Rekrytera bågskyttar.' },
    garden: { name: 'Läkarhus', icon: 'heal', w: 2, h: 2, hp: 300, color: '#ed9fb1', cost: 3, limit: 1, description: 'Rekrytera läkare. Läker grannar.' },
    spire: { name: 'Trollhus', icon: 'chime', w: 2, h: 2, hp: 290, color: '#ad91ed', cost: 4, limit: 1, description: 'Rekrytera trollkarlar.' },
    crypt: { name: 'Benhus', icon: 'skull', w: 2, h: 2, hp: 310, color: '#93e3cb', cost: 4, limit: 1, description: 'Rekrytera skelettmagiker. Fallna monster blir deras följeslagare.' },
    tower: { name: 'Piltorn', icon: 'tower', w: 1, h: 1, hp: 350, color: '#aebb9e', cost: 3, limit: 4, description: 'Skjuter på inkräktare.' },
    beacon: { name: 'Soltorn', icon: 'sun', w: 2, h: 2, hp: 750, color: '#f1ce77', cost: 8, limit: 1, group: 'landmark', requires: 'castle2', description: 'Unik. Lång räckvidd, skadar grupper.' },
    conservatory: { name: 'Viloträdgård', icon: 'tree', w: 2, h: 2, hp: 600, color: '#c2d6a0', cost: 8, limit: 1, group: 'landmark', requires: 'castle2', description: 'Unik. Alla hjältar återhämtar sig snabbare.' }
  };
  G.research = {
    castle2: { name: 'Större borg', icon: 'bell', cost: 4, building: 'castle', description: 'Öppnar fördjupningar. Borgen får +400 liv.' },
    armor: { name: 'Stark rustning', icon: 'shield', cost: 3, building: 'hall', description: 'Alla hjältar får +20 % liv.' },
    boots: { name: 'Snabba skor', icon: 'boot', cost: 3, building: 'lodge', description: 'Alla hjältar rör sig 18 % snabbare.' },
    guardian: { name: 'Sköldvänner', icon: 'shield', cost: 4, building: 'hall', requires: 'castle2', group: 'warrior', description: 'Riddare skyddar allierade i närheten.' },
    banner: { name: 'Stridsflagga', icon: 'flag', cost: 4, building: 'hall', requires: 'castle2', group: 'warrior', description: 'Fanor ger alla vänner inom fyra rutor +25 % skada. Flera fanor staplas inte.' },
    traps: { name: 'Fällor', icon: 'trap', cost: 4, building: 'lodge', requires: 'castle2', group: 'ranger', description: 'Högst fyra fällor per bågskyttar. Fångar och skadar ett markmonster var. Skadan ökar med hjältenivån.' },
    marksman: { name: 'Starka pilar', icon: 'bow', cost: 4, building: 'lodge', requires: 'castle2', group: 'ranger', description: 'Bågskytt skjuter längre och gör +40 % skada.' },
    bloom: { name: 'Läk flera', icon: 'leaf', cost: 4, building: 'garden', requires: 'castle2', group: 'healer', description: 'Läkare läker flera vänner samtidigt.' },
    ward: { name: 'Läk och skydda', icon: 'shield', cost: 4, building: 'garden', requires: 'castle2', group: 'healer', description: 'Läkning ger också ett tillfälligt skydd.' },
    echo: { name: 'Studsande magi', icon: 'chime', cost: 4, building: 'spire', requires: 'castle2', group: 'mage', description: 'Magiska toner studsar till fler fiender.' },
    frost: { name: 'Ismagi', icon: 'snow', cost: 4, building: 'spire', requires: 'castle2', group: 'mage', description: 'Magiska toner bromsar monster kraftigt.' },
    mastery: { name: 'Stor magi', icon: 'star', cost: 8, building: 'spire', requires: 'castle2', group: 'landmark', description: 'Unik. Trollkarl på nivå 5 får en mäktig gruppattack.' }
  };
  G.lairTypes = {
    rust: { name: 'Skrotbo', monster: 'rattler', support: 'mender', color: '#bd7350', icon: 'gear', description: 'Rost gör slag och pilar svaga. Läkare tvättar bort den. Gruppmagi träffar klungan.', interval: 175 },
    spore: { name: 'Svampbo', monster: 'sporeling', support: 'broodcap', color: '#c582aa', icon: 'spore', description: 'Svampar gömmer sig i giftig dimma. Läkare blåser bort dimman. Riddare tål att gå nära.', interval: 205 },
    hush: { name: 'Spökbo', monster: 'husher', support: 'binder', color: '#858fb2', icon: 'moon', description: 'Spöksköldar äter trollmagi. Skelettmagiker bryter skyddet. Pilar träffar ett mål i taget.', interval: 190 },
    sky: { name: 'Fågelbo', monster: 'nightwing', support: 'windcaller', color: '#81b4c6', icon: 'wing', description: 'Fåglar flyger och dyker. Vind blåser bort ben och skelett. Pilar når fåglarna, gruppmagi träffar flocken.', interval: 185 },
    thorn: { name: 'Taggbo', monster: 'thornling', support: 'bulwark', color: '#a1ab6e', icon: 'bow', description: 'Taggar fastnar och hindrar läkning en stund. Riddare stoppar pilar. Skelett får inga taggsår.', interval: 180 }
  };
  G.monsterTypes = {
    rattler: { name: 'Skramlare', role: 'Närstrid. Rusar den sista biten mot sitt mål.', hp: 48, damage: 7, speed: 1.15, range: 0.9, cooldown: 1.4, color: '#c98150', xp: 10, rush: true },
    sporeling: { name: 'Liten svamp', role: 'Snabb, svag närstridskämpe. Farlig i grupp.', hp: 28, damage: 5, speed: 1.35, range: 1, cooldown: 1.5, color: '#cc88b1', xp: 8 },
    husher: { name: 'Sköldspöke', role: 'Avståndsmagiker. Viker undan från närstrid.', hp: 60, damage: 8, speed: 1.8, range: 4.1, cooldown: 2.4, color: '#929cbb', xp: 16, spell: true, kite: true },
    nightwing: { name: 'Nattfågel', role: 'Flyger och dyker. Landar ibland så att svärd kan nå den.', hp: 44, damage: 8, speed: 1.5, range: 1.2, cooldown: 1.7, color: '#9dc9df', xp: 12, flying: true },
    windcaller: { name: 'Vindfågel', role: 'Blåser bort ben och knuffar skelett.', hp: 80, damage: 5, speed: 1.1, range: 3.8, cooldown: 2.2, color: '#8ccbd9', xp: 20, wind: true, spell: true, kite: true },
    thornling: { name: 'Taggskytt', role: 'Rörlig skytt. Backar när hjältar kommer nära.', hp: 34, damage: 8, speed: 1.25, range: 5.4, cooldown: 1.6, color: '#bdd084', xp: 12, kite: true },
    mender: { name: 'Skrotläkare', role: 'Läker andra monster. Svag om frontlinjen faller.', hp: 78, damage: 4, speed: 1.05, range: 3.5, cooldown: 2, color: '#f2bd88', xp: 22, medic: true, spell: true },
    binder: { name: 'Benspöke', role: 'Binder hjältar med rötter och väcker högst fyra röda skelett ur benrester. Skeletten faller när benspöken besegras.', hp: 82, damage: 4, speed: 1, range: 4.3, cooldown: 2.4, color: '#c6a3da', xp: 24, bind: true, spell: true, raises: 4 },
    boneservant: { name: 'Bensoldat', role: 'Rött fiendeskelett. Strider i närkamp och följer sin benspöke. Lämnar inga nya benrester.', hp: 52, damage: 7.4, speed: 1.85, range: 1.05, cooldown: 1.3, color: '#e47770', xp: 4, skeletal: true },
    siegebreaker: { name: 'Murknäckare', role: 'Slår hårt mot byggnader men tål lite. Närstridskämpar stoppar den; slår svagt tillbaka och behöver följe.', hp: 90, damage: 42, speed: .78, range: 1.35, cooldown: 2.5, color: '#b79869', xp: 28, siege: true, retaliation: .35 },
    broodcap: { name: 'Stor svamp', role: 'Gömmer vänner i giftig dimma och odlar små svampar.', hp: 150, damage: 14, speed: .8, range: 1.4, cooldown: 2, color: '#c880b5', xp: 24, brood: true },
    bulwark: { name: 'Skalriddare', role: 'Skyddar andra monster i närheten från 25 % av skadan.', hp: 150, damage: 14, speed: .85, range: 1.2, cooldown: 1.8, color: '#9fae80', xp: 26, ward: true },
    guardian: { name: 'Klockriddare', role: 'Bossvakt med tung närstridsattack. Lämnar inte sitt bo.', hp: 230, damage: 35, speed: 1.12, range: 1.35, cooldown: 1.55, color: '#9b647e', xp: 55 }
  };
  // Guardians are present from birth. Awakening releases separate raiding parties.
  G.lairGuards = lair => Array(lair.guardCount).fill(lair.boss ? 'guardian' : G.lairTypes[lair.type].monster);
  G.lairWave = lair => ({ basic: lair.level + 1 + (lair.tier === 3 ? 1 : 0), advanced: Math.max(0, lair.level - 2) });
  // Columns are ranks 1–6 (tier + level - 1). Cohorts remain at most 13
  // bodies so their existing three-column march stays within the rally radius.
  G.hardWaves = {
    rust: { rattler: [4,6,8,9,10,10], mender: [0,1,1,1,2,2], siegebreaker: [0,0,0,1,1,1] },
    spore: { sporeling: [2,3,4,4,4,5], broodcap: [1,1,2,2,3,3] },
    hush: { husher: [2,3,4,5,6,7], boneservant: [1,1,2,2,3,3], binder: [0,0,1,1,1,2] },
    sky: { nightwing: [3,5,7,9,10,11], windcaller: [0,1,1,1,2,2] },
    thorn: { thornling: [2,4,6,8,9,10], bulwark: [0,1,1,1,1,2] }
  };
  G.waveRoster = (w, lair) => {
    if (w.pace === 'brave') return Object.entries(G.hardWaves[lair.type]).flatMap(([type, counts]) => Array(counts[Math.min(5, lair.tier + lair.level - 2)]).fill(type));
    const family = G.lairTypes[lair.type], sizes = G.lairWave(lair);
    if (lair.type === 'spore') return [...Array(Math.max(1, sizes.basic - 1)).fill('sporeling'), ...Array(Math.max(1, sizes.advanced)).fill('broodcap')];
    if (lair.type === 'hush') return [...Array(sizes.basic).fill('husher'), 'boneservant', ...Array(sizes.advanced).fill('binder')];
    return [...Array(sizes.basic).fill(family.monster), ...Array(sizes.advanced).fill(family.support)];
  };
  G.waveInterval = (w, lair) => G.profiles[w.pace].raidInterval || Math.max(50, (82 - lair.level * 5 + (lair.level >= 2 ? 22 : 0)) * G.profiles[w.pace].spawn);
  // Per-guardian stats; difficulty also controls their number.
  // Use dev/glantan-balance.cjs --boss when changing combat or retreat rules.
  G.bossGuards = { gentle: { hp: 230, damage: 35 }, steady: { hp: 360, damage: 43 }, brave: { hp: 400, damage: 40 } };
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
  G.distance = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); };
  G.distanceSquared = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
  // Stable single-pass selection: equal scores keep the original list order.
  // Infinity excludes a candidate without allocating and sorting a new list.
  G.best = (items, score) => {
    let best, lowest = Infinity;
    for (const item of items) { const value = score(item); if (value < lowest) { lowest = value; best = item; } }
    return best;
  };
  G.alive = entity => entity.hp > 0;
  G.clockText = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
})(globalThis);
