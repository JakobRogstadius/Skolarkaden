/* Picture-led controls reuse world artwork; this module never changes world state. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan, A = G.Art;
  const el = (tag, className = '', text) => { const n = document.createElement(tag); n.className = className; if (text !== undefined) n.textContent = text; return n; };
  const icon = (name, className = '') => { const n = el('span', 'g-icon ' + className); n.innerHTML = G.icon(name); return n; };
  const roles = { warrior: 'Närstrid', ranger: 'Skjuter pilar', healer: 'Läker hjältar', mage: 'Anfaller med magi', necromancer: 'Väcker skelett' };
  const buildingLabels = { house: 'Bostad', hall: 'Väktare', lodge: 'Spejare', garden: 'Läkare', spire: 'Magiker', crypt: 'Skelettmästare', tower: 'Vindtorn', beacon: 'Gryningsfyr', conservatory: 'Klockträdgård', castle: 'Klockborgen' };
  const techLabels = { castle2: 'Större borg', armor: 'Mer liv', boots: 'Spring snabbare', guardian: 'Sköldvänner', banner: 'Fanbärare', marksman: 'Starkare pilar', traps: 'Fällor', bloom: 'Läk flera', ward: 'Läk och skydda', echo: 'Studsande magi', frost: 'Bromsa monster', mastery: 'Stark gruppmagi' };
  const techEffects = {
    castle2: ['tower', 'plus', 'heart'], armor: ['people', 'plus', 'heart'], boots: ['people', 'arrow', 'boot'],
    guardian: ['people', 'shield'], banner: ['people', 'sword', 'plus'], marksman: ['bow', 'plus'], traps: ['trap', 'lock'],
    bloom: ['heart', 'heart', 'heart'], ward: ['heart', 'shield'], echo: ['chime', 'arrow', 'chime'], frost: ['snow', 'boot'], mastery: ['chime', 'people']
  };
  const techBrief = { castle2: 'Fler förbättringar', armor: 'Alla hjältar', boots: 'Alla hjältar', guardian: 'Skyddar gruppen', banner: 'Stärker gruppens anfall', marksman: 'Mer skada · längre räckvidd', traps: 'Fångar och skadar', bloom: 'Flera hjältar samtidigt', ward: 'Skydd efter läkning', echo: 'Träffar flera monster', frost: 'Monster går långsammare', mastery: 'Magiker på nivå 5' };
  const monsters = {
    rattler: ['sword', 'Rusande närstrid'], sporeling: ['people', 'Anfaller i grupp'], husher: ['chime', 'Anfaller med magi'],
    nightwing: ['wing', 'Flyger'], thornling: ['bow', 'Skjuter och backar'], mender: ['heal', 'Läker monster'],
    binder: ['skull', 'Väcker skelett · binder hjältar'], boneservant: ['sword', 'Fiendeskelett'], siegebreaker: ['hammer', 'Anfaller byggnader'], broodcap: ['spore', 'Skapar fler svampar'],
    bulwark: ['shield', 'Skyddar monster'], guardian: ['crown', 'Stark bossvakt']
  };
  function portrait(w, kind, type, options = {}) {
    const wrap = el('span', 'g-portrait' + (options.small ? ' g-portrait-small' : ''));
    const canvas = el('canvas'); canvas.width = canvas.height = 160; canvas.setAttribute('aria-hidden', 'true');
    const spec = kind === 'building' ? G.buildings[type] : kind === 'hero' ? G.classes[type] : kind === 'monster' ? G.monsterTypes[type] : kind === 'lair' ? G.lairTypes[type] : null;
    wrap.setAttribute('role', 'img'); wrap.setAttribute('aria-label', options.label || spec?.name || ({ corpse: 'Benrester', skeleton: 'Skelett', trap: 'Fälla' }[kind]));
    const c = canvas.getContext('2d'), world = { ...w, choices: { ...w.choices }, research: { ...w.research } };
    if (options.branch) { world.choices[G.research[options.branch].group] = options.branch; world.research[options.branch] = true; }
    const entity = { id: 0, hp: 100, maxHp: 100, facing: 1, level: 1, rank: 1, route: [], ...(options.entity || {}), actionCue: null, x: 0, y: 0 };
    c.scale(2, 2); c.translate(40, kind === 'corpse' ? 32 : kind === 'trap' ? 46 : 69);
    const heroHeight = world.choices[type] === 'banner' ? 72 : ['mage', 'necromancer'].includes(type) ? 64 : entity.level >= 3 ? 54 : 46;
    const scale = kind === 'building' ? ['castle', 'spire', 'beacon'].includes(type) ? .64 : .85 : kind === 'lair' ? entity.boss ? .6 : .8 : kind === 'monster' ? 63 / (8 - A.monsterBadgeY({ ...entity, type })) : kind === 'hero' ? 64 / heroHeight : kind === 'corpse' ? 1.7 : kind === 'trap' ? 2.2 : kind === 'skeleton' ? 63 / (8 - A.skeletonBadgeY) : 1.1;
    c.scale(scale, scale);
    if (kind === 'building') A.building(c, { ...entity, type, w: spec.w, h: spec.h }, world, 0);
    else if (kind === 'hero') A.hero(c, { ...entity, classId: type }, world, 0);
    else if (kind === 'lair') A.lair(c, { ...entity, type, tier: 1, awake: false, ...options.entity, x: 0, y: 0 }, world, 0);
    else if (kind === 'monster') A.monster(c, { ...entity, type }, world, 0);
    else A[kind](c, entity, world, 0);
    wrap.append(canvas); return wrap;
  }
  function level(n) { const badge = el('span', 'g-rank', n); badge.setAttribute('aria-label', 'Nivå ' + n); return badge; }
  function symbols(names, label) {
    const strip = el('span', 'g-symbols'); strip.setAttribute('role', 'img'); strip.setAttribute('aria-label', label);
    for (const name of names) strip.append(icon(name));
    return strip;
  }
  function actionLabel(w, a) {
    if (!a) return '';
    if (a.type === 'build') return buildingLabels[a.id];
    if (a.type === 'research') return techLabels[a.id];
    if (a.type === 'resurrect') return 'Väck ' + (w.heroes.find(h => h.id === a.target)?.name || 'hjälten');
    if (a.type === 'repair') return 'Laga';
    if (a.type === 'bounty') return { attack: 'Anfall här', defend: 'Vakta här', explore: 'Utforska här' }[a.id];
    return G.actionName(w, a);
  }
  function actionPicture(w, a) {
    if (a.type === 'build') {
      const group = el('span', 'g-building-picture'); group.append(portrait(w, 'building', a.id));
      const role = Object.keys(G.classes).find(id => G.classes[id].guild === a.id);
      if (role) group.append(portrait(w, 'hero', role, { small: true }));
      return group;
    }
    if (a.type === 'recruit') return portrait(w, 'hero', a.id);
    if (a.type === 'resurrect') { const hero = w.heroes.find(h => h.id === a.target); return portrait(w, 'hero', hero.classId, { entity: { ...hero, hp: 100 } }); }
    if (a.type === 'research') {
      const spec = G.research[a.id], wrap = el('span', 'g-upgrade-picture');
      if (G.classes[spec.group]) wrap.append(portrait(w, 'hero', spec.group, { branch: a.id }));
      else wrap.append(icon(spec.icon, 'g-large-icon'));
      wrap.append(symbols(techEffects[a.id], techBrief[a.id])); return wrap;
    }
    return icon(a.type === 'repair' ? 'repair' : a.id === 'defend' ? 'shield' : a.id === 'explore' ? 'compass' : 'flag', 'g-large-icon');
  }
  function renderHelp(host, w) {
    host.replaceChildren();
    const steps = el('div', 'g-help-steps');
    const step = (title, picture, text) => { const row = el('section', 'g-help-step'); row.append(picture, el('h3', '', title), el('p', '', text)); steps.append(row); };
    step('Bygg', actionPicture(w, { type: 'build', id: 'hall' }), 'Välj en byggnad. Svara rätt i rad för att bygga.');
    step('Hjältar', portrait(w, 'hero', 'healer'), 'Bygg hjältens hus. Välj sedan hjälten.');
    step('Uppdrag', symbols(['flag', 'people', 'arrow'], 'En flagga visar hjältarnas mål'), 'Sätt en flagga på kartan. Hjältarna går när de är redo.');
    step('Vinn', portrait(w, 'lair', 'hush', { entity: { boss: true } }), 'Skydda borgen. Förstör bossboet för att vinna.');
    host.append(steps);
    const rules = el('div', 'g-help-rules');
    rules.append(el('p', '', 'Fel svar eller ett nytt val börjar om svarsföljden.'), el('p', '', 'Spelet fortsätter medan du svarar. Tryck på paus för en rast.'));
    const bell = el('div', 'g-help-bell'); bell.append(icon('bell'), symbols(['heart', 'shield', 'snow'], 'Läker, stärker och hejdar monster'), el('p', '', 'Sex rätta svar laddar klockan. Ring för att hjälpa hjältarna.')); rules.append(bell);
    host.append(rules);
    const more = el('details', 'g-more'); more.append(el('summary', '', 'Mer'), el('p', '', 'Dra kartan för att flytta. Använd + och − för att zooma. Spelet sparas automatiskt.'));
    if (w.seed) more.append(el('p', '', 'Karta: ' + w.seed)); host.append(more);
  }
  G.UI = { el, icon, portrait, level, symbols, roles, buildingLabels, techLabels, techBrief, monsters, actionLabel, actionPicture, renderHelp };
})(globalThis);
