/* Inspecting, panning and opening details never spend or reset an answer streak. */
(function(root) {
  'use strict';
  const SC = root.Starlight, G = SC.Glantan, U = G.UI, { el, icon } = U;
  const branches = [['warrior', ['guardian', 'banner']], ['ranger', ['marksman', 'traps']], ['healer', ['bloom', 'ward']], ['mage', ['echo', 'frost']]];
  class Interface {
    constructor(renderer) {
      this.renderer = renderer; this.game = renderer.game; this.tab = 'build'; this.selection = null; this.live = [];
      this.node = el('aside', 'g-sidebar'); this.node.setAttribute('aria-label', 'Gläntans handlingar');
      this.tabs = el('div', 'g-tabs'); this.tabs.setAttribute('role', 'tablist');
      for (const [id, name, glyph] of [['build', 'Bygg', 'house'], ['heroes', 'Hjältar', 'people'], ['research', 'Förbättra', 'hammer'], ['bounties', 'Uppdrag', 'flag']]) {
        const button = el('button', 'g-tab'); button.type = 'button'; button.dataset.tab = id; button.id = 'g-tab-' + id;
        button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'g-panel'); button.append(icon(glyph), el('span', '', name));
        button.onclick = () => { this.tab = id; this.selection = null; this.renderer.selection = null; this.panelKey = ''; this.update(); };
        this.tabs.append(button);
      }
      this.panel = el('div', 'g-panel'); this.panel.id = 'g-panel'; this.panel.setAttribute('role', 'tabpanel');
      this.question = el('section', 'g-question-panel'); this.question.setAttribute('aria-label', 'Betala med rätta svar');
      this.intent = el('div', 'g-intent'); this.intentPicture = el('span', 'g-intent-picture'); this.intentText = el('strong', 'g-intent-name');
      this.cancel = el('button', 'g-cancel'); this.cancel.type = 'button'; this.cancel.innerHTML = G.icon('close'); this.cancel.setAttribute('aria-label', 'Avbryt valet');
      this.cancel.onclick = () => { this.game.choose(null); this.renderer.blueprint = null; this.panelKey = ''; this.update(); };
      this.intent.append(this.intentPicture, this.intentText, this.cancel);
      this.streak = el('div', 'g-streak'); this.streak.setAttribute('role', 'progressbar');
      this.task = el('div', 'g-question'); this.hint = el('div', 'g-question-hint');
      this.feedback = el('div', 'g-feedback'); this.feedback.setAttribute('role', 'status'); this.feedback.setAttribute('aria-live', 'polite');
      this.question.append(this.intent, this.streak, this.task, this.hint, this.feedback);
      this.node.append(this.tabs, this.panel, this.question); this.update();
    }
    inspect(selection) { this.selection = selection; this.renderer.selection = selection; this.tab = 'inspect'; this.panelKey = ''; this.update(); }
    heading(title, subtitle = '') {
      this.panel.append(el('h3', 'g-panel-title', title));
      if (subtitle) this.panel.append(el('p', 'g-subtitle', subtitle));
    }
    more(lines, key = 'info') {
      const details = el('details', 'g-more'); details.dataset.details = key; details.append(el('summary', '', 'Mer'));
      for (const line of lines.filter(Boolean)) details.append(typeof line === 'string' ? el('p', '', line) : line);
      this.panel.append(details); return details;
    }
    action(action, options = {}) {
      const w = this.game.world; action = G.normalizeAction(w, action);
      const spec = options.spec, name = options.name || U.actionLabel(w, action);
      const availability = () => G.availability(w, action, { placement: action.type !== 'build' });
      const button = el('button', 'g-action' + (options.small ? ' g-action-small' : '')); button.type = 'button'; button.dataset.action = G.actionKey(action);
      const text = el('span', 'g-action-text'); text.append(el('span', 'g-action-name', name));
      if (options.detail) text.append(el('span', 'g-action-detail', options.detail));
      const cost = G.actionCost(w, action), badge = el('span', 'g-cost'); badge.setAttribute('aria-hidden', 'true');
      const visual = options.icon ? icon(options.icon, 'g-large-icon') : U.actionPicture(w, action);
      button.append(visual, text, badge);
      const group = action.type === 'research' ? G.research[action.id].group : action.type === 'build' ? G.buildings[action.id].group : null;
      const refresh = () => {
        const reason = availability(), locked = !!group && w.choices[group] && w.choices[group] !== action.id;
        const done = action.type === 'research' ? !!w.research[action.id] : !!options.done;
        button.setAttribute('aria-disabled', String(!!reason)); button.classList.toggle('g-unavailable', !!reason);
        button.classList.toggle('g-selected', G.actionKey(this.game.pending) === G.actionKey(action)); button.classList.toggle('g-chosen', done);
        button.classList.toggle('g-locked', !!locked);
        const badgeKey = locked ? 'lock' : done ? 'done' : cost;
        if (badge.dataset.state !== String(badgeKey)) { badge.dataset.state = badgeKey; badge.replaceChildren(); if (!locked && !done) badge.append(el('span', '', cost)); badge.append(icon(locked ? 'lock' : 'check')); }
        button.title = [spec?.name, spec?.description || spec?.role, reason || cost + ' rätt i rad'].filter(Boolean).join(' · ');
        button.setAttribute('aria-label', name + ', ' + (done ? 'klart' : cost + ' rätt i rad') + (reason ? '. ' + reason : ''));
      };
      refresh(); this.live.push(refresh);
      button.onclick = () => {
        if (this.game.state !== 'playing') return;
        const reason = availability();
        if (reason) { if (!button.classList.contains('g-chosen') && !button.classList.contains('g-locked')) G.notify(w, reason, 'warn'); return; }
        if (action.type === 'build') {
          this.game.choose(null); this.renderer.blueprint = action.id; this.renderer.hover = this.renderer.placementPoint = null;
        } else {
          this.renderer.blueprint = null;
          if (this.game.choose(action) && action.type === 'bounty' && action.id !== 'attack') {
            const point = this.game.pending; this.selection = this.renderer.selection = { kind: 'ground', x: point.x, y: point.y };
          }
        }
        this.panelKey = ''; this.update();
      };
      return button;
    }
    buildPanel() {
      const w = this.game.world, grid = el('div', 'g-action-grid g-build-grid'), entries = Object.entries(G.buildings);
      const guilds = new Set(Object.values(G.classes).map(role => role.guild));
      if (!w.buildings.some(b => G.alive(b) && guilds.has(b.type))) entries.sort((a, b) => (a[0] === 'hall' ? -2 : a[0] === 'lodge' ? -1 : 0) - (b[0] === 'hall' ? -2 : b[0] === 'lodge' ? -1 : 0));
      for (const [id, spec] of entries) {
        if (!spec.cost || spec.group) continue;
        const count = w.buildings.filter(b => b.type === id && G.alive(b)).length;
        const button = this.action({ type: 'build', id }, { spec, done: count >= spec.limit });
        if (id === 'house') {
          const capacity = U.symbols(['people', 'plus'], 'Fyra nya platser');
          capacity.append(el('span', 'g-capacity-bonus', '4')); button.append(capacity);
        }
        if (id === 'tower') button.append(U.symbols(['bow'], 'Skjuter på monster'));
        grid.append(button);
      }
      this.panel.append(grid);
      this.more(entries.filter(([, s]) => s.cost && !s.group).map(([, s]) => s.name + ': ' + s.description));
      if (w.research.castle2) this.landmarkChoices();
    }
    heroPanel() {
      const w = this.game.world, grid = el('div', 'g-action-grid');
      for (const [id, spec] of Object.entries(G.classes)) grid.append(this.action({ type: 'recruit', id }, { spec, detail: U.roles[id] }));
      this.panel.append(grid);
      const fallen = w.heroes.filter(h => !G.alive(h));
      if (fallen.length) {
        this.panel.append(el('h4', 'g-section-title', 'Väck hjälten'));
        for (const hero of fallen) this.panel.append(this.action({ type: 'resurrect', target: hero.id }, { name: hero.name, detail: 'Nivå ' + hero.level }));
      }
      for (const hero of w.heroes.filter(G.alive)) {
        const button = el('button', 'g-hero-row'); button.type = 'button';
        const health = el('progress'); health.max = hero.maxHp; health.value = hero.hp; health.setAttribute('aria-label', hero.name + ', liv');
        const status = el('span', 'g-hero-state');
        button.append(U.portrait(w, 'hero', hero.classId, { entity: hero, small: true }), el('strong', '', hero.name), U.level(hero.level), health, status);
        this.live.push(() => { health.value = hero.hp; health.max = hero.maxHp; this.heroState(status, hero); });
        button.onclick = () => { this.renderer.focus(hero); this.inspect({ kind: 'hero', id: hero.id }); }; this.panel.append(button);
      }
      this.more(Object.values(G.classes).map(s => s.name + ': ' + s.role));
    }
    choiceGroup(classId, ids) {
      const group = el('section', 'g-tech-branch'), label = el('div', 'g-choice-heading');
      label.append(U.portrait(this.game.world, 'hero', classId, { small: true }), el('strong', '', G.classes[classId].name), el('span', '', 'Välj en'));
      group.append(label); const pair = el('div', 'g-action-grid g-choice-pair');
      for (const id of ids) pair.append(this.action({ type: 'research', id }, { spec: G.research[id], detail: U.techBrief[id], small: true }));
      group.append(pair); this.panel.append(group);
      this.more(ids.map(id => G.research[id].name + ': ' + G.research[id].description), classId);
    }
    landmarkChoices() {
      this.panel.append(el('h4', 'g-section-title', 'Välj en'));
      const grid = el('div', 'g-action-grid g-landmarks');
      for (const id of ['beacon', 'conservatory']) grid.append(this.action({ type: 'build', id }, { spec: G.buildings[id], detail: id === 'beacon' ? 'Anfaller grupper' : 'Hjältar läker snabbare', done: this.game.world.landmarkBuilt && this.game.world.choices.landmark === id }));
      grid.append(this.action({ type: 'research', id: 'mastery' }, { spec: G.research.mastery, detail: U.techBrief.mastery }));
      this.panel.append(grid); this.more([G.buildings.beacon.description, G.buildings.conservatory.description, G.research.mastery.description], 'landmarks');
    }
    researchPanel() {
      const w = this.game.world;
      for (const id of ['castle2', 'armor', 'boots']) this.panel.append(this.action({ type: 'research', id }, { spec: G.research[id], detail: U.techBrief[id] }));
      this.more(['castle2', 'armor', 'boots'].map(id => G.research[id].name + ': ' + G.research[id].description));
      if (!w.research.castle2) return;
      for (const [classId, ids] of branches) this.choiceGroup(classId, ids);
      this.landmarkChoices();
    }
    expeditionStatus(node, bounty) {
      const w = this.game.world, group = w.expeditions.find(e => e.bounty === bounty.id), reason = group?.reason || bounty.waitReason || '';
      const label = /läkekraft/.test(reason) ? 'Behöver en läkare' : /fler vänner/.test(reason) ? 'Behöver fler hjältar' : /Höj/.test(reason) ? 'Höj flaggan' : '';
      const key = [group?.state, group?.members.join(','), label, bounty.level].join(':'); if (node.dataset.state === key) return;
      node.dataset.state = key; node.replaceChildren();
      const flags = U.symbols(Array(bounty.level).fill('flag'), 'Uppdragets styrka: ' + bounty.level); node.append(flags);
      const party = el('span', 'g-party');
      for (const id of group?.members || []) { const hero = w.heroes.find(h => h.id === id); if (hero) party.append(U.portrait(w, 'hero', hero.classId, { small: true })); }
      if (!party.children.length) party.append(icon('people'));
      party.append(icon(group?.state === 'march' ? 'arrow' : 'clock')); node.append(party);
      if (label) node.append(el('span', 'g-needed', label));
      node.setAttribute('aria-label', label || (group?.state === 'march' ? 'Hjältarna är på väg' : 'Samlar hjältar'));
    }
    bountyPanel() {
      const w = this.game.world;
      if (!w.bounties.length) { const empty = el('div', 'g-empty'); empty.append(U.symbols(['flag', 'arrow', 'compass'], 'Sätt en flagga på kartan'), el('p', '', 'Välj en plats på kartan')); this.panel.append(empty); }
      for (const bounty of w.bounties) {
        const target = G.bountyTarget(w, bounty), row = el('div', 'g-bounty-row'), view = el('button', 'g-bounty-view'); view.type = 'button';
        const name = target?.boss ? 'Bossboet' : G.lairTypes[target?.type]?.name || { attack: 'Anfall', defend: 'Vakt', explore: 'Utforska' }[bounty.type];
        view.append(icon(bounty.type === 'attack' ? 'sword' : bounty.type === 'defend' ? 'shield' : 'compass'), el('strong', '', name));
        const status = el('span', 'g-expedition'); view.append(status); this.live.push(() => this.expeditionStatus(status, bounty));
        view.onclick = () => { this.renderer.focus(bounty); if (target?.wakeAt !== undefined) this.inspect({ kind: 'lair', id: target.id }); };
        const remove = el('button', 'g-cancel'); remove.type = 'button'; remove.append(icon('close')); remove.setAttribute('aria-label', 'Ta bort uppdrag'); remove.onclick = () => { this.game.cancelBounty(bounty.id); this.panelKey = ''; };
        row.append(view, remove); this.panel.append(row);
      }
      this.more(['Du visar målet med en flagga. Hjältarna går när de är redo. Höj flaggan för att locka en större grupp.']);
    }
    heroState(node, hero) {
      const name = !G.alive(hero) ? 'Vilar' : hero.retreating ? 'Flyr' : '';
      const glyph = !G.alive(hero) ? 'revive' : hero.retreating ? 'boot' : /läk/i.test(hero.task) ? 'heart' : /strid|anfall/i.test(hero.task) ? 'sword' : hero.route?.length ? 'arrow' : 'shield';
      if (node.dataset.state !== glyph + name) { node.dataset.state = glyph + name; node.replaceChildren(icon(glyph)); if (name) node.append(el('span', '', name)); }
      node.setAttribute('aria-label', hero.task || name);
    }
    meter(entity, kind = 'health') {
      const wrap = el('div', 'g-detail-meter'), p = el('progress');
      const refresh = () => { p.max = kind === 'xp' ? G.xpFor(entity.level) : entity.maxHp; p.value = kind === 'xp' ? entity.xp : entity.hp; p.setAttribute('aria-label', (kind === 'xp' ? 'Erfarenhet' : 'Liv') + ': ' + Math.ceil(p.value) + ' / ' + Math.ceil(p.max)); };
      wrap.append(icon(kind === 'xp' ? 'star' : 'heart'), p); this.panel.append(wrap); refresh(); this.live.push(refresh); return p;
    }
    inspectHeading(kind, entity, title, subtitle = '') {
      const head = el('div', 'g-inspect-heading'), labels = el('div'); labels.append(el('h3', 'g-panel-title', title));
      if (subtitle) labels.append(el('p', 'g-subtitle', subtitle));
      head.append(U.portrait(this.game.world, kind, entity.classId || entity.type, { entity }), labels);
      if (kind !== 'monster' && kind !== 'skeleton' && kind !== 'corpse' && (entity.level || entity.rank)) head.append(U.level(entity.level || entity.rank));
      this.panel.append(head);
    }
    followers(hero) {
      const w = this.game.world, count = hero.monster ? G.monsterTypes[hero.type].raises : hero.classId === 'necromancer' ? G.NECROMANCER_LIMIT : 4, kind = hero.monster ? 'monster' : hero.classId === 'necromancer' ? 'skeleton' : 'trap', row = el('div', 'g-slots'); this.panel.append(row);
      this.live.push(() => {
        const units = hero.monster ? G.enemySkeletons(w, hero) : kind === 'skeleton' ? G.ownedSkeletons(w, hero) : w.traps.filter(t => t.owner === hero.id), key = units.map(s => s.id + ':' + s.level).join(',');
        if (row.dataset.state === key) return; row.dataset.state = key; row.replaceChildren();
        for (let i = 0; i < count; i++) {
          const slot = el('span', 'g-slot' + (units[i] ? '' : ' g-slot-empty'));
          slot.append(units[i] ? U.portrait(w, kind, units[i].type, { small: true, entity: units[i] }) : icon(kind !== 'trap' ? 'skull' : 'trap')); row.append(slot);
        }
        row.setAttribute('aria-label', units.length + ' av ' + count + (kind !== 'trap' ? ' skelett' : ' fällor'));
      });
    }
    inspectPanel() {
      const w = this.game.world, selected = this.selection;
      if (!selected) return this.buildPanel();
      if (selected.kind === 'hero') {
        const hero = w.heroes.find(h => h.id === selected.id); if (!hero) return;
        const spec = G.classes[hero.classId]; this.inspectHeading('hero', hero, hero.name, spec.name);
        const state = el('p', 'g-hero-state'); this.panel.append(state); this.live.push(() => this.heroState(state, hero));
        this.meter(hero); this.meter(hero, 'xp'); this.panel.append(el('p', 'g-role-summary', U.roles[hero.classId]));
        const branch = w.choices[hero.classId]; if (G.research[branch]) { const badge = el('div', 'g-branch-badge'); badge.append(icon(G.research[branch].icon), el('span', '', U.techLabels[branch])); this.panel.append(badge); }
        if (hero.classId === 'necromancer' || hero.classId === 'ranger' && w.research.traps) this.followers(hero);
        if (!G.alive(hero)) this.panel.append(this.action({ type: 'resurrect', target: hero.id }));
        const stats = el('p'); this.live.push(() => { stats.textContent = 'Liv ' + Math.ceil(hero.hp) + '/' + hero.maxHp + ' · Erfarenhet ' + hero.xp + '/' + G.xpFor(hero.level) + '. ' + hero.kills + ' besegrade · ' + Math.round(hero.healing) + ' läkta liv · ' + hero.scouting + ' upptäckta rutor.'; });
        const task = el('p'); this.live.push(() => { task.textContent = hero.task; });
        this.more([spec.role, branch && G.research[branch]?.description, G.traits[hero.trait].name, task, stats]);
      } else if (['skeleton', 'corpse', 'trap'].includes(selected.kind)) {
        const entity = (selected.kind === 'skeleton' ? w.skeletons : selected.kind === 'corpse' ? w.corpses : w.traps).find(e => e.id === selected.id); if (!entity) return;
        const owner = w.heroes.find(h => h.id === entity.owner);
        this.inspectHeading(selected.kind, entity, { skeleton: 'Skelett', corpse: 'Benrester', trap: 'Fälla' }[selected.kind]);
        if (selected.kind === 'skeleton') this.meter(entity);
        if (owner) { const row = el('div', 'g-owner'); row.append(U.portrait(w, 'hero', owner.classId, { small: true }), el('span', '', owner.name)); this.panel.append(row); }
        if (selected.kind === 'corpse') {
          const chain = el('div', 'g-picture-chain'); chain.append(U.portrait(w, 'corpse', null, { entity }), U.portrait(w, 'hero', 'necromancer'), icon('arrow'), U.portrait(w, 'skeleton', null, { entity })); this.panel.append(chain);
          this.more(['En skelettmästare väcker benresterna. Skelettet får monstrets nivå. Varje mästare kan ha ett skelett. Benrester försvinner efter 45 sekunder.']);
        } else if (selected.kind === 'trap') {
          this.panel.append(U.symbols(['trap', 'arrow', 'lock', 'heart'], 'Fångar och skadar ett markmonster'));
          this.more([G.trapDamage(entity.level) + ' skada. Fångar ett markmonster i 2,8 sekunder (bossvakter: 1,2). Hämtas när boet är förstört.']);
        }
      } else if (selected.kind === 'building') {
        const building = w.buildings.find(b => b.id === selected.id); if (!building) return;
        const spec = G.buildings[building.type]; this.inspectHeading('building', building, spec.name); this.meter(building);
        if (!G.alive(building)) this.panel.append(this.action({ type: 'build', id: building.type }, { spec, name: 'Bygg igen' }));
        else {
          if (building.hp < building.maxHp) this.panel.append(this.action({ type: 'repair', target: building.id }, { detail: '+55 % liv' }));
          for (const [id, hero] of Object.entries(G.classes)) if (hero.guild === building.type) this.panel.append(this.action({ type: 'recruit', id }, { spec: hero, detail: U.roles[id] }));
          for (const [id, tech] of Object.entries(G.research)) if (!tech.group && tech.building === building.type && (!tech.requires || w.research[tech.requires])) this.panel.append(this.action({ type: 'research', id }, { spec: tech, detail: U.techBrief[id] }));
          if (w.research.castle2) for (const [classId, ids] of branches) if (G.classes[classId].guild === building.type) this.choiceGroup(classId, ids);
          if (w.research.castle2 && ['castle', 'spire'].includes(building.type)) this.landmarkChoices();
        }
        this.more([spec.description]);
      } else if (selected.kind === 'lair' || selected.kind === 'monster') {
        const isLair = selected.kind === 'lair', target = (isLair ? w.lairs : w.monsters).find(e => e.id === selected.id); if (!target) return;
        const spec = isLair ? G.lairTypes[target.type] : G.monsterTypes[target.type];
        this.inspectHeading(selected.kind, target, target.boss && isLair ? 'Bossboet' : spec.name); this.meter(target);
        if (!G.alive(target)) { this.panel.append(icon('check', 'g-complete')); return; }
        if (isLair) this.lairStatus(target, spec);
        else {
          const [glyph, label] = U.monsters[target.type]; const ability = el('p', 'g-role-summary'); ability.append(icon(glyph), el('span', '', label)); this.panel.append(ability);
          if (spec.raises) this.followers(target);
          if (G.flying(target)) { this.panel.append(el('p', 'g-important', 'Kan inte nås med svärd')); const counters = el('div', 'g-picture-chain'); for (const id of ['ranger', 'mage', 'necromancer']) counters.append(U.portrait(w, 'hero', id, { small: true })); this.panel.append(counters); }
        }
        const bounty = w.bounties.find(b => b.type === 'attack' && b.target === target.id);
        if (bounty) { const status = el('div', 'g-expedition'); this.panel.append(status); this.live.push(() => this.expeditionStatus(status, bounty)); }
        if (!bounty || bounty.level < 3) this.panel.append(this.action({ type: 'bounty', id: 'attack', target: target.id, level: bounty ? bounty.level + 1 : 1 }, { name: bounty ? 'Höj flaggan' : 'Anfall här' }));
        const details = [isLair ? spec.description : spec.role];
        if (target.boss && isLair) details.push('Tystnadens hjärta. Samla cirka ' + target.suggestedLevels + ' hjältenivåer' + (w.pace === 'brave' ? ' med rustning, fanor och gruppläkning.' : '.'));
        const numbers = el('p'); this.live.push(() => { numbers.textContent = 'Liv ' + Math.ceil(target.hp) + '/' + target.maxHp; }); details.push(numbers);
        if (isLair) { const growth = el('p'); this.live.push(() => { growth.textContent = target.awake && target.level < 4 ? (target.type === 'spore' && !target.spread ? 'Nytt bo om ' : 'Växer om ') + G.clockText(Math.max(0, target.nextGrowth - w.time)) : ''; }); details.push(growth); }
        this.more(details);
      } else {
        const known = !!w.explored[G.index(w, selected.x, selected.y)];
        if (known && !G.walkable(w, selected.x, selected.y)) { this.heading({ 2: 'Vatten', 3: 'Klippblock', 4: 'Berg', 5: 'Tät skog' }[G.tile(w, selected.x, selected.y)] || 'Hinder'); return; }
        this.panel.append(this.action({ type: 'bounty', id: known ? 'defend' : 'explore', x: selected.x, y: selected.y, level: 1 }));
      }
    }
    lairStatus(target, spec) {
      const w = this.game.world;
      if (target.boss) { const goal = el('p', 'g-boss-warning'); goal.append(icon('crown'), el('span', '', 'Förstör boet för att vinna')); this.panel.append(goal); }
      const timer = el('div', 'g-lair-timer'), clock = el('strong'); timer.append(icon('clock'), el('span', '', target.awake ? 'Anfall' : 'Vaknar'), clock); this.panel.append(timer);
      this.live.push(() => { clock.textContent = G.clockText(Math.max(0, (target.awake ? target.nextSpawn : target.wakeAt) - w.time)); });
      const wave = G.lairWave(target), formation = el('div', 'g-wave'); formation.setAttribute('aria-label', 'Anfall: ' + wave.basic + ' ' + G.monsterTypes[spec.monster].name + (wave.advanced ? ' och ' + wave.advanced + ' ' + G.monsterTypes[spec.support].name : ''));
      for (const [type, count] of [[spec.monster, wave.basic], [spec.support, wave.advanced]]) if (count) {
        const group = el('span', 'g-wave-group'); group.append(U.portrait(w, 'monster', type, { entity: { rank: target.tier + target.level - 1, strength: G.monsterStrength(target) } }), el('strong', '', '× ' + count)); formation.append(group);
      }
      this.panel.append(formation);
      const guardTitle = el('div', 'g-guard-title'); guardTitle.append(icon('shield'), el('span', '', 'Vakter')); const refill = el('span', 'g-guard-refill'); guardTitle.append(refill); this.panel.append(guardTitle);
      const slots = el('div', 'g-slots'); this.panel.append(slots);
      this.live.push(() => {
        const guards = w.monsters.filter(m => m.guard && m.lair === target.id && G.alive(m)), key = guards.map(m => m.id).join(',');
        refill.textContent = guards.length < target.guardCount ? '↻ ' + G.clockText(Math.max(0, target.nextGuardAt - w.time)) : '';
        refill.setAttribute('aria-label', guards.length < target.guardCount ? 'Nya vakter om ' + G.clockText(Math.max(0, target.nextGuardAt - w.time)) : 'Alla vakter är här');
        if (slots.dataset.state === key) return; slots.dataset.state = key; slots.replaceChildren();
        for (let i = 0; i < target.guardCount; i++) { const slot = el('span', 'g-slot' + (guards[i] ? '' : ' g-slot-empty')); slot.append(U.portrait(w, 'monster', target.boss ? 'guardian' : spec.monster, { small: true, entity: guards[i] || { rank: target.boss ? 3 + ['gentle', 'steady', 'brave'].indexOf(w.pace) : target.tier + target.level - 1 } })); slots.append(slot); }
        slots.setAttribute('aria-label', guards.length + ' av ' + target.guardCount + ' vakter');
      });
      if (!target.boss) { const death = el('div', 'g-death-wave'); death.setAttribute('aria-label', 'Monster lämnar boet när det förstörs'); death.append(U.portrait(w, 'lair', target.type, { small: true, entity: { ...target, hp: 0 } }), icon('arrow'), U.portrait(w, 'monster', spec.monster, { small: true, entity: { rank: target.tier + target.level - 1, strength: G.monsterStrength(target) } })); this.panel.append(death); }
    }
    updateQuestion() {
      const g = this.game, target = g.targets[0], cost = G.actionCost(g.world, g.pending);
      const key = [g.revision, target?.id, g.progress, !!target && SC.pinyinHints(g).has(target), this.renderer.blueprint].join(':');
      if (key !== this.questionKey) {
        this.questionKey = key; this.question.classList.toggle('g-has-intent', !!g.pending); this.question.classList.toggle('g-placing', !!this.renderer.blueprint);
        const action = g.pending || (this.renderer.blueprint ? { type: 'build', id: this.renderer.blueprint } : null);
        this.intentText.textContent = action ? U.actionLabel(g.world, action) : 'Välj';
        this.intentPicture.replaceChildren(); if (action) this.intentPicture.append(U.actionPicture(g.world, action)); else this.intentPicture.append(icon('arrow'));
        this.cancel.hidden = !action;
        this.streak.replaceChildren(); this.streak.hidden = !g.pending;
        this.streak.setAttribute('aria-valuenow', g.progress); this.streak.setAttribute('aria-valuemax', cost || 1); this.streak.setAttribute('aria-label', g.progress + ' av ' + cost + ' rätt i rad');
        for (let i = 0; i < cost; i++) this.streak.append(el('i', i < g.progress ? 'g-pip filled' : 'g-pip'));
        if (g.pending) this.streak.append(el('span', 'g-streak-count', cost + ' rätt i rad'));
        this.task.replaceChildren(); this.hint.textContent = '';
        if (target) {
          if (target.item.diagram) {
            const diagram = el('canvas', 'g-diagram'); diagram.width = 336; diagram.height = 240; diagram.setAttribute('aria-label', target.item.label);
            const context = diagram.getContext('2d'); context.scale(3, 3); SC.drawMathDiagram(context, target.item.diagram, { x: 0, y: 0, w: 112, h: 80 }); this.task.append(diagram);
          } else this.task.textContent = target.item.label;
          if (SC.pinyinHints(g).has(target)) this.hint.textContent = [target.item.hint, target.item.translation].filter(Boolean).join(' · ');
        }
      }
      const paid = g.pending && g.progress >= cost;
      const feedback = paid ? 'paid' : g.feedbackUntil > g.clock ? g.feedback : '';
      if (this.feedbackKey !== feedback) {
        this.feedbackKey = feedback; this.feedback.replaceChildren();
        if (paid) { this.feedback.append(icon('clock')); this.feedback.setAttribute('aria-label', 'Betalt. Byggnaden väntar på fri plats.'); }
        else { this.feedback.textContent = feedback; this.feedback.removeAttribute('aria-label'); }
        this.feedback.classList.toggle('g-wrong', g.feedback === 'Försök igen');
      }
    }
    update() {
      const g = this.game, w = g.world;
      for (const button of this.tabs.children) button.setAttribute('aria-selected', String(button.dataset.tab === this.tab));
      const selected = this.selection, target = selected && [...w.buildings, ...w.lairs, ...w.monsters, ...w.skeletons, ...w.corpses, ...w.traps].find(e => e.id === selected.id);
      const key = [this.tab, JSON.stringify(selected), w.buildings.map(b => b.id + ':' + G.alive(b)).join(','), w.heroes.map(h => h.id + ':' + G.alive(h) + ':' + h.level).join(','), JSON.stringify(w.research), JSON.stringify(w.choices), w.bounties.map(b => b.id + ':' + b.level).join(','), target ? [G.alive(target), target.hp < target.maxHp, target.level, target.awake].join(':') : '', selected?.kind === 'ground' ? w.explored[G.index(w, selected.x, selected.y)] : ''].join('|');
      if (key !== this.panelKey) {
        const samePanel = this.panelIdentity === this.tab + JSON.stringify(selected); this.panelIdentity = this.tab + JSON.stringify(selected); this.panelKey = key;
        const active = this.panel.contains(document.activeElement) ? document.activeElement.dataset.action : null, scroll = samePanel ? this.panel.scrollTop : 0;
        const open = samePanel ? Array.from(this.panel.querySelectorAll('details[open]')).map(d => d.dataset.details) : [];
        this.live = []; this.panel.replaceChildren();
        if (this.tab === 'build') this.buildPanel(); else if (this.tab === 'heroes') this.heroPanel(); else if (this.tab === 'research') this.researchPanel(); else if (this.tab === 'bounties') this.bountyPanel(); else this.inspectPanel();
        for (const d of this.panel.querySelectorAll('details')) d.open = open.includes(d.dataset.details);
        this.panel.scrollTop = scroll;
        if (active) Array.from(this.panel.querySelectorAll('[data-action]')).find(b => b.dataset.action === active)?.focus({ preventScroll: true });
        if (this.tab === 'inspect') { this.panel.removeAttribute('aria-labelledby'); this.panel.setAttribute('aria-label', 'Valt på kartan'); }
        else { this.panel.removeAttribute('aria-label'); this.panel.setAttribute('aria-labelledby', 'g-tab-' + this.tab); }
      }
      for (const update of this.live) update(); this.updateQuestion();
    }
  }
  G.Interface = Interface;
})(globalThis);
