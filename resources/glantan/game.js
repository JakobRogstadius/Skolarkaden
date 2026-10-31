/* Shared Skolarkaden exercise adapter. The world never waits for an answer. */
(function(root) {
  'use strict';
  const SC = root.Starlight, G = SC.Glantan;
  const SAVE_KEY = 'skolarkaden-klockglantan-v2';
  function readSave(options) {
    try {
      const saved = JSON.parse(root.localStorage?.getItem(SAVE_KEY) || 'null');
      if (!saved || saved.world?.version !== G.VERSION || saved.world.outcome || saved.mode !== options.mode || saved.pace !== options.pace || saved.lang !== options.lang || saved.practiceKey !== options.practiceKey) return null;
      const w = saved.world;
      const scale = G.profiles[options.pace]?.mapScale;
      if (w.width !== 36 * scale || w.height !== 28 * scale || !Array.isArray(w.terrain) || w.terrain.length !== w.width * w.height || !Array.isArray(w.explored) || w.explored.length !== w.terrain.length || !Array.isArray(w.heroes) || !Array.isArray(w.buildings) || !Array.isArray(w.lairs) || !w.buildings.some(b => b.type === 'castle' && b.hp > 0)) return null;
      if (w.heroes.some(h => !G.classes[h.classId]) || w.lairs.some(l => !G.lairTypes[l.type])) return null;
      if (saved.pending?.type === 'research') saved.pending.id = ({ breaker: 'banner', pathfinder: 'traps' })[saved.pending.id] || saved.pending.id;
      return saved;
    } catch (_) { return null; }
  }
  class GlantanGame {
    constructor({ queue = new SC.AnswerQueue(), onEvent = () => {}, random = Math.random, sounds = null } = {}) {
      Object.assign(this, { queue, onEvent, random, state: 'menu', revision: 0, targets: [], pending: null });
      this.soundscape = sounds ? new G.Soundscape(sounds) : null;
    }
    emit(type, detail = {}) { this.onEvent({ type, ...detail }); }
    start({ mode = 'letters', pace = 'gentle', lang = 'sv-SE', items = null, uppercase = false, seed = null, fresh = false, homeworkId = null } = {}) {
      const source = items || (mode === 'letters' ? null : SC.vocabulary(mode, lang));
      const practiceKey = JSON.stringify([homeworkId, source?.map(i => [i.answer, i.label, i.translation]) || 'letters']);
      const saved = !fresh && !seed ? readSave({ mode, pace, lang, practiceKey }) : null;
      this.practiceKey = practiceKey;
      this.mode = mode; this.pace = pace; this.lang = lang; this.uppercase = saved?.uppercase ?? uppercase;
      this.items = saved?.items || SC.beginPractice(this, items);
      if (!this.items.length) throw new Error('Övningen behöver minst ett svar.');
      this.simulation = new G.Simulation({ seed: seed || Date.now().toString(36).slice(-6) + Math.floor(this.random() * 999).toString(36), pace, saved: saved?.world });
      this.world = this.simulation.world;
      this.state = 'playing'; this.targets = []; this.pending = null; this.heldTarget = saved?.heldTarget || null;
      this.progress = 0; this.streak = saved?.streak ?? saved?.progress ?? 0; this.bestStreak = saved?.bestStreak || 0;
      this.shots = saved?.shots || 0; this.hits = saved?.hits || 0; this.questionSerial = saved?.questionSerial || 0;
      this.clock = this.elapsed = this.world.time; this.score = this.world.score; this.lastSave = this.clock;
      this.feedback = ''; this.feedbackUntil = 0; this.resumed = !!saved;
      this.queue.clear();
      const savedReason = saved?.pending && G.availability(this.world, saved.pending);
      if (saved?.pending && (!savedReason || G.temporaryObstruction(saved.pending, savedReason))) {
        this.pending = saved.pending; this.progress = saved.progress || 0;
        if (saved.target?.item?.answer !== undefined) this.targets = [saved.target];
        else if (this.progress < G.actionCost(this.world, this.pending)) this.nextQuestion();
      }
      this.save(); this.revision++; this.emit('glantan-ready');
    }
    getTargets() { return this.targets; }
    getAvailableTargets() { return this.canAnswer() ? this.targets : []; }
    getActiveEntries() { return []; }
    getTaskStates() { return new Map(); }
    canAnswer() { return this.state === 'playing' && !!this.pending && this.progress < G.actionCost(this.world, this.pending) && this.targets.length > 0; }
    choose(action) {
      if (this.state !== 'playing') return false;
      action = G.normalizeAction(this.world, action);
      if (G.actionKey(action) === G.actionKey(this.pending)) return true;
      if (action) {
        const reason = G.availability(this.world, action);
        if (reason) { G.notify(this.world, reason, 'warn'); return false; }
      }
      // Intent switching resets payment, never rerolls an unanswered exercise.
      this.heldTarget = this.targets[0] || this.heldTarget;
      this.pending = action ? { ...action } : null;
      this.progress = 0; this.targets = []; this.feedback = ''; this.queue.clear();
      if (this.pending) { if (this.heldTarget) this.targets = [this.heldTarget]; else this.nextQuestion(); }
      this.revision++; this.emit('glantan-ready'); this.save();
      return true;
    }
    nextQuestion() {
      const previous = this.targets[0]?.item?.answer;
      let base;
      for (let i = 0; i < 8; i++) {
        base = this.items[Math.floor(this.random() * this.items.length)];
        if (base.answer !== previous || this.items.length === 1) break;
      }
      const item = SC.isMath(this.mode) ? SC.makeMath(base.answer, this.random, SC.mathLevel(this.mode)) : { ...base };
      item.label = SC.lessonLabel(item.label, this.mode, this.uppercase);
      this.targets = [{ id: 'glantan-' + (++this.questionSerial), item, appearedAt: this.clock }];
      this.heldTarget = this.targets[0];
      this.queue.clear(); this.revision++;
    }
    answer(entry) {
      if (!this.canAnswer()) return;
      this.shots++;
      const correct = SC.matches(entry.text, this.targets[0].item, this.mode, this.lang, entry.source);
      if (!correct) {
        G.soundEvent(this.world, 'wrong', null, true);
        this.progress = 0; this.streak = 0; this.feedback = 'Försök igen'; this.feedbackUntil = this.clock + 2;
        this.queue.clear(); this.revision++; this.emit('miss', { entry, points: 0 }); this.save(); return;
      }
      this.hits++; this.progress++; this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.feedback = ''; this.heldTarget = null; G.answerCharge(this.world);
      const cost = G.actionCost(this.world, this.pending);
      if (this.progress < cost) G.soundEvent(this.world, 'correct', null, true);
      if (this.progress >= cost) {
        this.targets = []; this.queue.clear(); this.completePurchase();
        if (this.pending) G.soundEvent(this.world, 'correct', null, true);
      } else this.nextQuestion();
      this.revision++; this.emit('hit', { entry, points: 0 }); this.emit('glantan-ready'); this.save();
    }
    completePurchase() {
      const action = this.pending, result = G.purchase(this.world, action);
      if (!result.ok && G.temporaryObstruction(action, result.reason)) {
        this.feedback = 'Betalt · röj tomten'; this.feedbackUntil = Infinity; return;
      }
      this.pending = null; this.progress = 0; this.targets = []; this.queue.clear();
      if (result.ok) { this.feedback = G.actionName(this.world, action) + ' ✓'; this.feedbackUntil = this.clock + 2; this.emit('glantan-purchase', { action, entity: result.entity }); }
      else G.notify(this.world, result.reason, 'warn');
      this.revision++; this.emit('glantan-ready'); this.save();
    }
    ringBell() {
      if (this.state !== 'playing' || !G.ringBell(this.world)) return false;
      this.revision++; this.emit('glantan-bell'); this.save(); return true;
    }
    cancelBounty(id) {
      if (this.state !== 'playing') return;
      this.world.bounties = this.world.bounties.filter(b => b.id !== id); this.world.revision++; this.save();
    }
    pause() { if (this.state === 'playing') { this.state = 'paused'; this.soundscape?.stop(); if (this.world.sounds) this.world.sounds.length = 0; this.queue.clear(); this.save(); this.emit('pause'); } }
    resume() { if (this.state === 'paused') { this.state = 'playing'; this.emit('glantan-ready'); this.emit('resume'); } }
    menu() { this.save(); this.state = 'menu'; this.soundscape?.stop(); this.queue.clear(); }
    save() {
      try {
        if (!this.world || this.world.outcome) return;
        root.localStorage?.setItem(SAVE_KEY, JSON.stringify({ world: this.world, practiceKey: this.practiceKey, uppercase: this.uppercase, mode: this.mode, pace: this.pace, lang: this.lang, items: this.items, shots: this.shots, hits: this.hits, streak: this.streak, bestStreak: this.bestStreak, pending: this.pending, progress: this.progress, target: this.targets[0] || null, heldTarget: this.heldTarget, questionSerial: this.questionSerial }));
      } catch (_) { /* Storage may be unavailable; gameplay remains functional. */ }
    }
    clearSave() { try { root.localStorage?.removeItem(SAVE_KEY); } catch (_) {} }
    update(dt) {
      if (this.state !== 'playing') return;
      this.simulation.update(dt); this.clock = this.elapsed = this.world.time; this.score = this.world.score;
      if (this.world.outcome) {
        this.state = this.world.outcome; this.targets = []; this.pending = null; this.queue.clear(); this.clearSave();
        if (this.world.sounds) this.world.sounds.length = 0;
        G.soundEvent(this.world, this.state === 'won' ? 'victory' : 'defeat', null, true);
        this.emit('end', { won: this.state === 'won', score: this.score, hits: this.hits, shots: this.shots, bestStreak: this.bestStreak }); return;
      }
      if (this.pending) {
        const reason = G.availability(this.world, this.pending);
        if (reason && !G.temporaryObstruction(this.pending, reason)) { this.choose(null); G.notify(this.world, reason, 'warn'); }
        else if (!reason && this.progress >= G.actionCost(this.world, this.pending)) this.completePurchase();
      }
      if (this.canAnswer() && this.queue.length) { const entry = this.queue.take(); if (entry) this.answer(entry); }
      else if (!this.pending) this.queue.clear();
      if (this.clock - this.lastSave >= 5) { this.save(); this.lastSave = this.clock; }
    }
  }
  SC.GlantanGame = GlantanGame;
})(globalThis);
