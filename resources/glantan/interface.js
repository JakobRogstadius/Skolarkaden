/* Compact intent controls. Inspecting, panning and opening tabs never spend/reset a streak. */
(function(root) {
  'use strict';
  const SC = root.Starlight, G = SC.Glantan;
  const el = (tag, className, text) => { const n = document.createElement(tag); n.className = className; if (text !== undefined) n.textContent = text; return n; };
  const icon = (name, className = '') => { const n = el('span', 'g-icon ' + className); n.innerHTML = G.icon(name); return n; };
  class Interface {
    constructor(renderer) {
      this.renderer = renderer; this.game = renderer.game; this.tab = 'build'; this.selection = null; this.live = [];
      this.node = el('aside', 'g-sidebar'); this.node.setAttribute('aria-label', 'Gläntans handlingar');
      this.tabs = el('div', 'g-tabs'); this.tabs.setAttribute('role', 'tablist');
      for (const [id, name, glyph] of [['build', 'Bygg', 'house'], ['heroes', 'Hjältar', 'people'], ['research', 'Kunskap', 'book'], ['bounties', 'Uppdrag', 'flag']]) {
        const button = el('button', 'g-tab'); button.type = 'button'; button.dataset.tab = id; button.id = 'g-tab-' + id;
        button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'g-panel'); button.append(icon(glyph), el('span', '', name));
        button.onclick = () => { this.tab = id; this.selection = null; this.renderer.selection = null; this.panelKey = ''; this.update(); };
        this.tabs.append(button);
      }
      this.panel = el('div', 'g-panel'); this.panel.id = 'g-panel'; this.panel.setAttribute('role', 'tabpanel');
      this.question = el('section', 'g-question-panel'); this.question.setAttribute('aria-label', 'Betala med rätta svar');
      this.intent = el('div', 'g-intent'); this.intentText = el('strong', 'g-intent-name');
      this.cancel = el('button', 'g-cancel'); this.cancel.type = 'button'; this.cancel.innerHTML = G.icon('close', 17); this.cancel.title = 'Avbryt · följden nollställs'; this.cancel.setAttribute('aria-label', this.cancel.title);
      this.cancel.onclick = () => { this.game.choose(null); this.renderer.blueprint = null; this.panelKey = ''; };
      this.intent.append(this.intentText, this.cancel);
      this.streak = el('div', 'g-streak'); this.streak.setAttribute('role', 'progressbar');
      this.task = el('div', 'g-question'); this.hint = el('div', 'g-question-hint');
      this.feedback = el('div', 'g-feedback'); this.feedback.setAttribute('role', 'status'); this.feedback.setAttribute('aria-live', 'polite');
      this.question.append(this.intent, this.streak, this.task, this.hint, this.feedback);
      this.node.append(this.tabs, this.panel, this.question);
      this.update();
    }
    inspect(selection) {
      this.selection = selection; this.renderer.selection = selection; this.tab = 'inspect'; this.panelKey = ''; this.update();
    }
    heading(title, subtitle = '') {
      this.panel.append(el('h3', 'g-panel-title', title));
      if (subtitle) this.panel.append(el('p', 'g-subtitle', subtitle));
    }
    action(action, options = {}) {
      const w = this.game.world, name = options.name || G.actionName(w, action), spec = options.spec;
      const availability = () => G.availability(w, action, { placement: action.type !== 'build' });
      const reason = availability();
      const button = el('button', 'g-action' + (options.small ? ' g-action-small' : ''));
      button.type = 'button'; button.dataset.action = G.actionKey(action); button.setAttribute('aria-disabled', String(!!reason));
      button.classList.toggle('g-selected', G.actionKey(this.game.pending) === G.actionKey(action));
      button.classList.toggle('g-unavailable', !!reason);
      const glyph = options.icon || spec?.icon || 'star';
      const text = el('span', 'g-action-text'); text.append(el('span', 'g-action-name', name));
      if (options.detail) text.append(el('span', 'g-action-detail', options.detail));
      const cost = G.actionCost(w, action);
      const badge = el('span', 'g-cost', options.done ? '✓' : String(cost));
      badge.title = cost + ' rätt i rad';
      button.append(icon(glyph), text, badge);
      button.title = [spec?.description, reason || (cost + ' rätt i rad')].filter(Boolean).join(' · ');
      button.setAttribute('aria-label', name + ', ' + cost + ' rätt i rad' + (reason ? '. ' + reason : ''));
      this.live.push(() => {
        const why = availability();
        button.setAttribute('aria-disabled', String(!!why)); button.classList.toggle('g-unavailable', !!why);
        button.classList.toggle('g-selected', G.actionKey(this.game.pending) === G.actionKey(action));
        button.title = [spec?.description, why || (cost + ' rätt i rad')].filter(Boolean).join(' · ');
        button.setAttribute('aria-label', name + ', ' + cost + ' rätt i rad' + (why ? '. ' + why : ''));
      });
      button.onclick = () => {
        if (this.game.state !== 'playing') return;
        const reason = availability();
        if (reason) { G.notify(w, reason, 'warn'); return; }
        if (action.type === 'build') {
          this.game.choose(null); this.renderer.blueprint = action.id; this.renderer.hover = null;
          G.notify(w, 'Välj tomt för ' + G.buildings[action.id].name.toLowerCase() + '.');
        } else { this.renderer.blueprint = null; this.game.choose(action); }
        this.panelKey = ''; this.update();
      };
      return button;
    }
    buildPanel() {
      this.heading('Ge gläntan rum', G.population(this.game.world) + ' / ' + G.capacity(this.game.world) + ' invånare');
      const grid = el('div', 'g-action-grid');
      for (const [id, spec] of Object.entries(G.buildings)) {
        if (!spec.cost || spec.group) continue;
        const count = this.game.world.buildings.filter(b => b.type === id && G.alive(b)).length;
        grid.append(this.action({ type: 'build', id }, { spec, detail: id === 'house' ? '+4 platser' : count ? 'Byggt' : { hall: 'Väktare', lodge: 'Spejare', garden: 'Örtvårdare · läker grannar', spire: 'Klangvävare', tower: 'Skjuter på inkräktare' }[id], done: count >= spec.limit }));
      }
      this.panel.append(grid);
      if (this.game.world.research.castle2) {
        this.panel.append(el('h4', 'g-section-title', 'Ett underverk'));
        for (const id of ['beacon', 'conservatory']) this.panel.append(this.action({ type: 'build', id }, { spec: G.buildings[id], detail: 'Max 1 · permanent vägval' }));
      }
    }
    heroPanel() {
      const w = this.game.world;
      this.heading('Gläntans vänner', G.population(w) + ' / ' + G.capacity(w) + ' platser · högst ' + G.POPULATION_LIMIT);
      const grid = el('div', 'g-action-grid');
      for (const [id, spec] of Object.entries(G.classes)) grid.append(this.action({ type: 'recruit', id }, { spec, detail: w.heroes.filter(h => G.alive(h) && h.classId === id).length + ' i gläntan' }));
      this.panel.append(grid);
      const fallen = w.heroes.filter(h => !G.alive(h));
      if (fallen.length) {
        this.panel.append(el('h4', 'g-section-title', 'Återkalla'));
        for (const hero of fallen) this.panel.append(this.action({ type: 'resurrect', target: hero.id }, { name: hero.name, icon: 'revive', detail: G.classes[hero.classId].name + ' · nivå ' + hero.level }));
      }
      this.panel.append(el('h4', 'g-section-title', 'På egna ben'));
      for (const hero of w.heroes.filter(G.alive)) {
        const button = el('button', 'g-hero-row'); button.type = 'button'; button.style.setProperty('--hero-color', G.classes[hero.classId].color);
        button.append(icon(G.classes[hero.classId].icon), el('strong', '', hero.name), el('span', 'g-level', 'Nivå ' + hero.level), el('small', 'g-hero-task', hero.task));
        this.live.push(() => { button.querySelector('.g-hero-task').textContent = hero.task; });
        button.onclick = () => { this.renderer.focus(hero); this.inspect({ kind: 'hero', id: hero.id }); };
        this.panel.append(button);
      }
    }
    researchPanel() {
      const w = this.game.world;
      this.heading('Kunskap som stannar');
      for (const id of ['castle2', 'armor', 'boots']) this.panel.append(this.action({ type: 'research', id }, { spec: G.research[id], detail: G.research[id].description, done: !!w.research[id] }));
      if (!w.research.castle2) return;
      this.panel.append(el('h4', 'g-section-title', 'Vägval · välj ett per par'));
      for (const [classId, ids] of [['warrior', ['guardian', 'breaker']], ['ranger', ['pathfinder', 'marksman']], ['healer', ['bloom', 'ward']], ['mage', ['echo', 'frost']]]) {
        const group = el('div', 'g-tech-branch'); group.append(el('small', 'g-branch-name', G.classes[classId].name));
        for (const id of ids) group.append(this.action({ type: 'research', id }, { spec: G.research[id], detail: G.research[id].description, done: !!w.research[id], small: true }));
        this.panel.append(group);
      }
      this.panel.append(el('h4', 'g-section-title', 'Ett underverk'));
      this.panel.append(this.action({ type: 'research', id: 'mastery' }, { spec: G.research.mastery, detail: 'Vägval · i stället för en unik byggnad', done: !!w.research.mastery }));
    }
    bountyPanel() {
      const w = this.game.world;
      this.heading('Vänner på väg');
      if (!w.bounties.length) this.panel.append(el('p', 'g-empty', 'Tryck på ett bo eller en plats på kartan.'));
      for (const bounty of w.bounties) {
        const target = G.bountyTarget(w, bounty), expedition = w.expeditions.find(e => e.bounty === bounty.id);
        const row = el('div', 'g-bounty-row');
        const view = el('button', 'g-bounty-view'); view.type = 'button';
        const title = target?.type && G.lairTypes[target.type] ? G.lairTypes[target.type].name : { attack: 'Anfall', defend: 'Vaktplats', explore: 'Okänd mark' }[bounty.type];
        view.append(icon(bounty.type === 'attack' ? 'sword' : bounty.type === 'defend' ? 'shield' : 'compass'), el('strong', '', title), el('small', '', (expedition ? expedition.members.length + ' vänner · ' + expedition.reason : 'Söker frivilliga') + ' · ' + '◆'.repeat(bounty.level)));
        this.live.push(() => {
          const group = w.expeditions.find(e => e.bounty === bounty.id);
          view.querySelector('small').textContent = (group ? group.members.length + ' vänner · ' + group.reason : bounty.waitReason || 'Söker frivilliga') + ' · ' + '◆'.repeat(bounty.level);
        });
        view.onclick = () => { this.renderer.focus(bounty); if (target?.wakeAt !== undefined) this.inspect({ kind: 'lair', id: target.id }); };
        const remove = el('button', 'g-cancel'); remove.type = 'button'; remove.innerHTML = G.icon('close', 16); remove.title = 'Ta bort uppdrag'; remove.setAttribute('aria-label', remove.title); remove.onclick = () => { this.game.cancelBounty(bounty.id); this.panelKey = ''; };
        row.append(view, remove); this.panel.append(row);
      }
    }
    meter(value, max, label, read) {
      const wrap = el('div', 'g-detail-meter'); const p = el('progress', ''); p.max = max; p.value = value; p.setAttribute('aria-label', label);
      wrap.append(el('span', '', label), el('strong', '', Math.ceil(value) + ' / ' + Math.ceil(max)), p); this.panel.append(wrap);
      if (read) this.live.push(() => { const [v, m] = read(); p.max = m; p.value = v; wrap.querySelector('strong').textContent = Math.ceil(v) + ' / ' + Math.ceil(m); });
    }
    inspectPanel() {
      const w = this.game.world, selected = this.selection;
      if (!selected) return this.buildPanel();
      if (selected.kind === 'hero') {
        const hero = w.heroes.find(h => h.id === selected.id); if (!hero) return;
        const spec = G.classes[hero.classId];
        this.heading(hero.name, spec.name + ' · nivå ' + hero.level + ' · ' + G.traits[hero.trait].name);
        this.panel.append(el('p', 'g-hero-intent', hero.task));
        this.live.push(() => { this.panel.querySelector('.g-hero-intent').textContent = hero.task; });
        this.meter(hero.hp, hero.maxHp, 'Liv', () => [hero.hp, hero.maxHp]); this.meter(hero.xp, G.xpFor(hero.level), 'Erfarenhet', () => [hero.xp, G.xpFor(hero.level)]);
        this.panel.append(el('p', 'g-subtitle', spec.role));
        const contributions = [hero.kills + ' besegrade', Math.round(hero.healing) + ' läkta liv', hero.scouting + ' upptäckta rutor'];
        this.panel.append(el('p', 'g-contributions', contributions.join(' · ')));
        this.live.push(() => { this.panel.querySelector('.g-contributions').textContent = [hero.kills + ' besegrade', Math.round(hero.healing) + ' läkta liv', hero.scouting + ' upptäckta rutor'].join(' · '); });
        if (!G.alive(hero)) this.panel.append(this.action({ type: 'resurrect', target: hero.id }, { icon: 'revive', detail: 'Erfarenheten finns kvar.' }));
      } else if (selected.kind === 'building') {
        const building = w.buildings.find(b => b.id === selected.id); if (!building) return;
        const spec = G.buildings[building.type]; this.heading(spec.name, spec.description); this.meter(building.hp, building.maxHp, 'Liv', () => [building.hp, building.maxHp]);
        if (!G.alive(building)) { this.panel.append(this.action({ type: 'build', id: building.type }, { spec, name: 'Bygg igen' })); return; }
        if (building.hp < building.maxHp) this.panel.append(this.action({ type: 'repair', target: building.id }, { icon: 'repair', detail: 'Återställer 55 % av fullt liv.' }));
        for (const [id, hero] of Object.entries(G.classes)) if (hero.guild === building.type) this.panel.append(this.action({ type: 'recruit', id }, { spec: hero }));
        for (const [id, tech] of Object.entries(G.research)) if (tech.building === building.type && (!tech.requires || w.research[tech.requires])) this.panel.append(this.action({ type: 'research', id }, { spec: tech, detail: tech.description, done: !!w.research[id] }));
      } else if (selected.kind === 'lair' || selected.kind === 'monster') {
        const target = (selected.kind === 'lair' ? w.lairs : w.monsters).find(b => b.id === selected.id); if (!target) { this.heading('Tyst och stilla'); return; }
        const spec = selected.kind === 'lair' ? G.lairTypes[target.type] : G.monsterTypes[target.type];
        this.heading(spec.name, spec.description || 'På väg mot gläntan.'); this.meter(target.hp, target.maxHp, 'Liv', () => [target.hp, target.maxHp]);
        if (!G.alive(target)) { this.panel.append(el('p', 'g-hero-intent', 'Här klingar det igen.')); return; }
        if (selected.kind === 'lair') {
          const timer = el('p', 'g-lair-timer'); this.panel.append(timer);
          this.live.push(() => { timer.textContent = !target.awake ? 'Vaknar om ' + G.clockText(Math.max(0, target.wakeAt - w.time)) : target.level >= 4 ? 'Fullvuxet bo' : (target.type === 'spore' && !target.spread ? 'Sprider sig om ' : 'Växer om ') + G.clockText(Math.max(0, target.nextGrowth - w.time)); });
          const guards = el('p', 'g-subtitle'); this.panel.append(guards);
          this.live.push(() => { guards.textContent = target.defendersRaised ? w.monsters.filter(m => m.guard && m.lair === target.id && G.alive(m)).length + ' boförsvarare kvar' : G.lairGuards(target).length + ' försvarare vaknar vid anfall'; });
        }
        const bounty = w.bounties.find(b => b.type === 'attack' && b.target === target.id);
        if (bounty) {
          const status = el('p', 'g-hero-intent'); this.panel.append(status);
          this.live.push(() => { const expedition = w.expeditions.find(e => e.bounty === bounty.id); status.textContent = expedition ? expedition.members.length + ' vänner · ' + expedition.reason : bounty.waitReason || 'Söker frivilliga'; });
        }
        if (!bounty || bounty.level < 3) this.panel.append(this.action({ type: 'bounty', id: 'attack', target: target.id, level: bounty ? bounty.level + 1 : 1 }, { name: bounty ? 'Höj belöningen' : 'Locka till anfall', icon: 'flag', detail: bounty ? 'Lockar fler frivilliga.' : 'Hjältarna samlar en expedition.' }));
        else this.panel.append(el('p', 'g-subtitle', 'Högsta belöning · ◆◆◆'));
      } else {
        const known = !!w.explored[G.index(w, selected.x, selected.y)];
        this.heading(known ? 'En plats i gläntan' : 'Bortom stigen');
        this.panel.append(this.action({ type: 'bounty', id: known ? 'defend' : 'explore', x: selected.x, y: selected.y, level: 1 }, { name: known ? 'Be om vakt' : 'Be om utforskning', icon: known ? 'shield' : 'compass', detail: known ? 'Frivilliga håller ett öga på platsen.' : 'Spejare hittar vägen.' }));
      }
    }
    updateQuestion() {
      const g = this.game, target = g.targets[0], cost = G.actionCost(g.world, g.pending);
      const key = [g.revision, target?.id, g.progress, !!target && SC.pinyinHints(g).has(target), !!this.renderer.blueprint].join(':');
      if (key !== this.questionKey) {
        this.questionKey = key; this.question.classList.toggle('g-has-intent', !!g.pending);
        this.intentText.textContent = g.pending ? G.actionName(g.world, g.pending) : this.renderer.blueprint ? 'Välj en tomt på kartan' : 'Välj en handling';
        this.cancel.hidden = !g.pending && !this.renderer.blueprint;
        this.streak.replaceChildren(); this.streak.hidden = !g.pending;
        this.streak.setAttribute('aria-valuenow', g.progress); this.streak.setAttribute('aria-valuemax', cost || 1); this.streak.setAttribute('aria-label', g.progress + ' av ' + cost + ' rätt i rad');
        for (let i = 0; i < cost; i++) this.streak.append(el('i', i < g.progress ? 'g-pip filled' : 'g-pip'));
        if (g.pending) this.streak.append(el('span', 'g-streak-count', g.progress + ' / ' + cost));
        this.task.replaceChildren(); this.hint.textContent = '';
        if (target) {
          if (target.item.diagram) {
            const diagram = el('canvas', 'g-diagram'); diagram.width = 336; diagram.height = 240; diagram.setAttribute('aria-label', target.item.label);
            const context = diagram.getContext('2d'); context.scale(3, 3);
            SC.drawMathDiagram(context, target.item.diagram, { x: 0, y: 0, w: 112, h: 80 }); this.task.append(diagram);
          } else this.task.textContent = target.item.label;
          if (SC.pinyinHints(g).has(target)) this.hint.textContent = [target.item.hint, target.item.translation].filter(Boolean).join(' · ');
        } else this.task.append(icon(this.renderer.blueprint ? 'house' : 'bell', 'g-idle-icon'));
      }
      this.feedback.textContent = g.pending && g.progress >= cost ? 'Betalt · röj tomten' : g.feedbackUntil > g.clock ? g.feedback : '';
      this.feedback.classList.toggle('g-wrong', g.feedback === 'Försök igen');
    }
    update() {
      const g = this.game, w = g.world;
      for (const button of this.tabs.children) button.setAttribute('aria-selected', String(button.dataset.tab === this.tab));
      // Keep buttons mounted while clocks, health and intentions change. Replacing a
      // live panel on a timer steals focus and can discard an in-flight tap.
      const selected = this.selection;
      const target = selected && [...w.buildings, ...w.lairs, ...w.monsters].find(e => e.id === selected.id);
      const key = [this.tab, JSON.stringify(selected),
        w.buildings.map(b => b.id + ':' + G.alive(b)).join(','),
        w.heroes.map(h => h.id + ':' + G.alive(h) + ':' + h.level).join(','),
        JSON.stringify(w.research), JSON.stringify(w.choices),
        w.bounties.map(b => b.id + ':' + b.level).join(','),
        target ? G.alive(target) + ':' + (target.hp < target.maxHp) : '',
        selected?.kind === 'ground' ? w.explored[G.index(w, selected.x, selected.y)] : ''
      ].join('|');
      if (key !== this.panelKey) {
        this.panelKey = key;
        const active = this.panel.contains(document.activeElement) ? document.activeElement.dataset.action : null;
        const scroll = this.panel.scrollTop;
        this.live = []; this.panel.replaceChildren();
        if (this.tab === 'build') this.buildPanel(); else if (this.tab === 'heroes') this.heroPanel(); else if (this.tab === 'research') this.researchPanel(); else if (this.tab === 'bounties') this.bountyPanel(); else this.inspectPanel();
        this.panel.scrollTop = scroll;
        if (active) Array.from(this.panel.querySelectorAll('[data-action]')).find(b => b.dataset.action === active)?.focus({ preventScroll: true });
        this.panel.setAttribute('aria-labelledby', this.tab === 'inspect' ? '' : 'g-tab-' + this.tab);
      }
      for (const update of this.live) update();
      this.updateQuestion();
    }
  }
  G.Interface = Interface;
})(globalThis);
