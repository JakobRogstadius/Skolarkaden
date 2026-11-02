/* Enemy-pair discovery using the frozen real-engine arena harness.
 * node dev/glantan-enemy-study.cjs --ref 28ba8b8 --seeds 6 --jobs 2 --out /workspace/scratch/23d09e66c6fe/experiments/enemy-baseline.json
 * Optional --offset N, --filter PAIR, --seeds N, --jobs N (1..4),
 * --pairs nightwing+bulwark,nightwing+mender, --contexts /tmp/keys.json,
 * --cases /tmp/fixed-input.json, --save-cases /tmp/input.json, --stage validation.
 * --suite roles --role-set main|extra|siege|all generates role-specific support
 * fractions. Integer duplicate rosters are removed; actual fractions are recorded.
 * Every run saves its exact case input before starting; --prepare-only skips combat.
 * Initial THREAT/COST and budget functions come from glantan-study.cjs unchanged.
 * Mixed armies target half the initial threat in each member type. Both pure
 * controls round UP to at least the achieved mixed budget. If a control reaches
 * the explicit 40-monster design cap, that comparison is ineligible for a synergy
 * claim. Every achieved budget, upward rounding excess, and cap is recorded.
 * Victory means HERO LOSS. Timeouts stay separate from wins. A positive discovery
 * delta is a candidate requiring held-out confirmation, not a significance claim.
 * These fixed weights overvalue trash in the baseline: a representative L3 party
 * beats32rattlers/sporelings but only about8hushers/6bulwarks. A missing candidate
 * in these bands is not evidence of no synergy; threshold-focused follow-up may
 * be needed. No pilot reweighting, new combat model or production mutation occurs.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { THREAT, COST, heroBudget, monsterBudget, runStudy } = require('./glantan-study.cjs');
const PAIRS = [
  ['rattler', 'mender'], ['sporeling', 'broodcap'], ['husher', 'binder'],
  ['nightwing', 'siegebreaker'], ['thornling', 'bulwark'], ['boneservant', 'binder'],
  ['guardian', 'mender'], ['guardian', 'bulwark'], ['binder', 'broodcap']
];
const EXPANDED_PAIRS = [['nightwing', 'bulwark'], ['nightwing', 'mender'], ['siegebreaker', 'mender'], ['siegebreaker', 'bulwark'], ['boneservant', 'mender'], ['boneservant', 'bulwark']];
const ESCORT_PAIRS = [['siegebreaker', 'husher'], ['siegebreaker', 'thornling'], ['siegebreaker', 'nightwing']];
const ROLE_PAIRS = [['husher', 'bulwark'], ['binder', 'thornling'], ['broodcap', 'mender'], ['sporeling', 'mender']];
const SUPPORTED_PAIRS = [...PAIRS, ...EXPANDED_PAIRS, ...ROLE_PAIRS, ...ESCORT_PAIRS];
const PARTIES = {
  balanced: ['warrior', 'ranger', 'healer', 'mage'],
  ranged: ['ranger', 'ranger', 'mage', 'mage'],
  necromancy: ['warrior', 'healer', 'mage', 'necromancer']
};
const CAP = 40;
const round = n => Math.round(n * 1e6) / 1e6;
const unitBudget = type => monsterBudget([{ type, rank: 3 }], THREAT);
const roster = (type, count) => Array.from({ length: count }, () => ({ type, rank: 3 }));

function budgetMatch(pair, target, { shareA = .5, minShareA = 0, maxShareA = 1 } = {}) {
  const [a, b] = pair, va = unitBudget(a), vb = unitBudget(b);
  let best = null;
  for (let na = 1; na < CAP; na++) for (let nb = 1; nb + na <= CAP; nb++) {
    const achieved = na * va + nb * vb;
    const share = na * va / achieved;
    if (share < minShareA || share > maxShareA) continue;
    const score = Math.abs(achieved - target) / target + .2 * Math.abs(share - shareA);
    if (!best || score < best.score) best = { na, nb, achieved, share, score };
  }
  if (!best) throw Error('No integer roster satisfies the requested share bounds.');
  const countA = Math.ceil(best.achieved / va - 1e-9), countB = Math.ceil(best.achieved / vb - 1e-9);
  const mixed = [...roster(a, best.na), ...roster(b, best.nb)];
  const pureA = roster(a, Math.min(CAP, countA)), pureB = roster(b, Math.min(CAP, countB));
  const budgets = { mixed: monsterBudget(mixed, THREAT), pureA: monsterBudget(pureA, THREAT), pureB: monsterBudget(pureB, THREAT) };
  const cap = { mixed: mixed.length === CAP, pureA: countA > CAP, pureB: countB > CAP };
  const roundExcess = { pureA: budgets.pureA - budgets.mixed, pureB: budgets.pureB - budgets.mixed };
  return {
    armies: { mixed, pureA, pureB },
    match: { target: round(target), requestedShareA: shareA, allowedShareA: [minShareA, maxShareA], budgets: Object.fromEntries(Object.entries(budgets).map(([k, v]) => [k, round(v)])), counts: { mixed: mixed.length, mixedA: best.na, mixedB: best.nb, pureA: pureA.length, pureB: pureB.length }, cap, mixedShareA: round(best.share), targetRelativeError: round((best.achieved - target) / target), upwardRoundingExcess: Object.fromEntries(Object.entries(roundExcess).map(([k, v]) => [k, round(v)])), relativeRoundingExcess: { pureA: round(roundExcess.pureA / budgets.mixed), pureB: round(roundExcess.pureB / budgets.mixed) }, integerTolerance: { pureA: round(va), pureB: round(vb) }, eligible: !cap.mixed && !cap.pureA && !cap.pureB && roundExcess.pureA >= -1e-7 && roundExcess.pureB >= -1e-7 && roundExcess.pureA < va + 1e-7 && roundExcess.pureB < vb + 1e-7 }
  };
}
function makeCases({ seeds = 6, offset = 0, filter = '', pairs = PAIRS, contextKeys = null, stage = 'discovery' } = {}) {
  const cases = [];
  for (const pair of pairs) {
    const pairName = pair.join('+');
    if (filter && !pairName.includes(filter)) continue;
    for (const [army, recipe] of Object.entries(PARTIES)) for (const scale of [1, 2]) for (const ratio of [.7, 1, 1.3]) {
      const heroes = Array.from({ length: scale }, () => recipe).flat().map(type => ({ type, level: 3 }));
      const target = heroBudget(heroes) * ratio, { armies, match } = budgetMatch(pair, target);
      const key = `${pairName}/${army}/x${scale}/${ratio}`;
      if (contextKeys && !contextKeys.includes(key)) continue;
      for (let s = 0; s < seeds; s++) {
        const n = offset + s;
        for (const [arm, monsters] of Object.entries(armies)) cases.push({
          id: key + '/' + arm, heroes, monsters, seed: 'enemy-discovery-' + n,
          layout: 'scatter', distance: [3.4, 5.2, 6.8][n % 3], spacing: [.55, .7, .85][Math.floor(n / 3) % 3], mirror: n % 2 === 1,
          mode: pair.includes('siegebreaker') ? 'objective' : 'field', maxSeconds: 100,
          enemyStudy: { key, pair, army, scale, ratio, arm, match, stage, heroBudget: round(heroBudget(heroes)), preexistingCorpses: 0, preexistingSummons: 0 }
        });
      }
    }
  }
  return cases;
}
function makeRoleCases({ seeds = 6, offset = 40000, contextKeys = null, stage = 'discovery', filter = '', roleSet = 'main' } = {}) {
  const cases = [], seen = new Map();
  const mainPlans = [
    { pair: ['husher', 'bulwark'], supportIndex: 1, scales: [1, 2], ratios: [1, 1.3] },
    { pair: ['binder', 'thornling'], supportIndex: 0, scales: [1, 2], ratios: [1, 1.3] },
    { pair: ['broodcap', 'mender'], supportIndex: 1, scales: [1, 2], ratios: [1, 1.3] },
    { pair: ['binder', 'broodcap'], supportIndex: 0, scales: [1, 2], ratios: [1, 1.3], corpses: [{ rank: 3, x: 35, y: 19.3 }, { rank: 3, x: 35, y: 20.7 }] },
    { pair: ['guardian', 'mender'], supportIndex: 1, scales: [3, 4], ratios: [.4, .7] }
  ];
  const extraPlans = [
    { pair: ['sporeling', 'mender'], supportIndex: 1, scales: [1, 2], ratios: [1, 1.3] },
    { pair: ['boneservant', 'bulwark'], supportIndex: 1, scales: [1, 2], ratios: [1, 1.3] },
    { pair: ['siegebreaker', 'bulwark'], supportIndex: 1, scales: [1, 2], ratios: [1, 1.3] }
  ];
  const siegePlans = [{ pair: ['siegebreaker', 'mender'], supportIndex: 1, scales: [1, 2], ratios: [.7, 1], supportShares: [.1, .2, .3], supportMin: .09, supportMax: .31 }];
  const plans = roleSet === 'siege' ? siegePlans : roleSet === 'extra' ? extraPlans : roleSet === 'all' ? [...mainPlans, ...extraPlans] : mainPlans;
  for (const plan of plans) for (const [army, recipe] of Object.entries(PARTIES)) for (const scale of plan.scales) for (const ratio of plan.ratios) for (const supportShare of plan.supportShares || [.15, .3]) {
    if (filter && !plan.pair.join('+').includes(filter)) continue;
    const heroes = Array.from({ length: scale }, () => recipe).flat().map(type => ({ type, level: 3 }));
    const { armies, match } = budgetMatch(plan.pair, heroBudget(heroes) * ratio, { shareA: plan.supportIndex === 0 ? supportShare : 1 - supportShare, minShareA: plan.supportIndex === 0 ? (plan.supportMin ?? .14) : 1 - (plan.supportMax ?? .31), maxShareA: plan.supportIndex === 0 ? (plan.supportMax ?? .31) : 1 - (plan.supportMin ?? .14) });
    const corpseLabel = plan.corpses ? 'shared2corpses' : 'fresh';
    const key = `${plan.pair.join('+')}/${corpseLabel}/support${supportShare}/${army}/x${scale}/${ratio}`;
    // Integer rounding can produce identical armies for two requested support shares.
    const fingerprint = JSON.stringify([plan.pair, army, scale, ratio, armies, corpseLabel]);
    if (seen.has(fingerprint)) { seen.get(fingerprint).push(supportShare); continue; }
    const requestedSupportShares = [supportShare]; seen.set(fingerprint, requestedSupportShares);
    if (contextKeys && !contextKeys.includes(key)) continue;
    const meta = { key, pair: plan.pair, army, scale, ratio, match, stage, heroBudget: round(heroBudget(heroes)), supportIndex: plan.supportIndex, requestedSupportShares, actualSupportShare: round(plan.supportIndex === 0 ? match.mixedShareA : 1 - match.mixedShareA), preexistingCorpses: plan.corpses?.length || 0, preexistingSummons: 0, contextLabel: corpseLabel };
    for (let s = 0; s < seeds; s++) {
      const n = offset + s;
      for (const [arm, monsters] of Object.entries(armies)) cases.push({ id: key + '/' + arm, heroes, monsters, corpses: plan.corpses || [], seed: 'enemy-role-' + n, layout: 'scatter', distance: [3.4, 5.2, 6.8][n % 3], spacing: [.55, .7, .85][Math.floor(n / 3) % 3], mirror: n % 2 === 1, mode: plan.pair.includes('siegebreaker') ? 'objective' : 'field', maxSeconds: 100, enemyStudy: { ...meta, arm } });
    }
  }
  return cases;
}
function makeEscortCases({ seeds = 6, offset = 100000, stage = 'discovery', contextKeys = null } = {}) {
  const parties = { warrior_mage: ['warrior', 'warrior', 'warrior', 'mage', 'mage'], warriors: Array(6).fill('warrior'), ranger_mage: ['ranger', 'ranger', 'ranger', 'mage', 'mage'] };
  const cases = [], seen = new Map();
  for (const pair of ESCORT_PAIRS) for (const [army, recipe] of Object.entries(parties)) for (const scale of [1, 2]) for (const ratio of [.7, 1, 1.3]) for (const escortShare of [.25, .5]) {
    const heroes = Array.from({ length: scale }, () => recipe).flat().map(type => ({ type, level: 3 }));
    const { armies, match } = budgetMatch(pair, heroBudget(heroes) * ratio, { shareA: 1 - escortShare, minShareA: .45, maxShareA: .8 });
    const fingerprint = JSON.stringify([pair, army, scale, ratio, armies]);
    if (seen.has(fingerprint)) { seen.get(fingerprint).push(escortShare); continue; }
    const requestedSupportShares = [escortShare]; seen.set(fingerprint, requestedSupportShares);
    const key = `${pair.join('+')}/escort${escortShare}/${army}/x${scale}/${ratio}`;
    if (contextKeys && !contextKeys.includes(key)) continue;
    for (let s = 0; s < seeds; s++) {
      const n = offset + s;
      for (const [arm, monsters] of Object.entries(armies)) cases.push({ id: key + '/' + arm, heroes, monsters, seed: 'enemy-siege-escort-' + n, layout: 'scatter', distance: [3.4, 5.2, 6.8][n % 3], spacing: [.55, .7, .85][Math.floor(n / 3) % 3], mirror: n % 2 === 1, mode: 'objective', maxSeconds: 100, enemyStudy: { key, pair, army, scale, ratio, arm, match, stage, heroBudget: round(heroBudget(heroes)), contextLabel: 'siege-escort-interception', actualSupportShare: round(1 - match.mixedShareA), requestedSupportShares, preexistingCorpses: 0, preexistingSummons: 0 } });
    }
  }
  return cases;
}
function resampleCases(configs, { seeds = 100, offset = 50000, prefix = 'enemy-role-heldout-', contextKeys = null, stage = 'validation' } = {}) {
  const templates = [...new Map(configs.filter(c => !contextKeys || contextKeys.includes(c.enemyStudy.key)).map(c => [c.id, c])).values()];
  const cases = [];
  for (const template of templates) for (let s = 0; s < seeds; s++) {
    const n = offset + s, config = JSON.parse(JSON.stringify(template));
    config.seed = prefix + n; config.distance = [3.4, 5.2, 6.8][n % 3]; config.spacing = [.55, .7, .85][Math.floor(n / 3) % 3]; config.mirror = n % 2 === 1;
    config.enemyStudy.stage = stage; cases.push(config);
  }
  return cases;
}
function makeRaidCases(configs, { contextKeys, deadlines = [50, 75], seeds = 12, offset = 110000 } = {}) {
  const templates = [...new Map(configs.filter(c => !contextKeys || contextKeys.includes(c.enemyStudy.key)).map(c => [c.id, c])).values()];
  const cases = [];
  for (const template of templates) for (const deadline of deadlines) for (let s = 0; s < seeds; s++) {
    const n = offset + s, c = JSON.parse(JSON.stringify(template));
    c.castleShots = true; c.endOnPartyDeath = false; c.maxSeconds = deadline; c.mode = 'objective';
    c.seed = 'enemy-defended-raid-' + n; c.distance = [3.4, 5.2, 6.8][n % 3]; c.spacing = [.55, .7, .85][Math.floor(n / 3) % 3]; c.mirror = n % 2 === 1;
    c.enemyStudy.originalKey = c.enemyStudy.key; c.enemyStudy.key += '/raid' + deadline; c.id = c.enemyStudy.key + '/' + c.enemyStudy.arm;
    Object.assign(c.enemyStudy, { assay: 'defended-castle-raid', contextLabel: 'defended-castle-raid', deadline, stage: 'discovery', changedControls: { castleShots: true, endOnPartyDeath: false }, predeclaredDeadlines: deadlines }); cases.push(c);
  }
  return cases;
}
function wilson(wins, n) {
  const z = 1.959963984540054, p = wins / n, denominator = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / denominator, spread = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denominator;
  return [round(Math.max(0, center - spread)), round(Math.min(1, center + spread))];
}
function pairedSuperiority(seedEvidence, pure) {
  let better = 0, worse = 0;
  for (const s of seedEvidence) { better += s.mixed === 'loss' && s[pure] !== 'loss'; worse += s.mixed !== 'loss' && s[pure] === 'loss'; }
  const discordant = better + worse; let combination = 1, pOneSided = 0;
  for (let k = 0; k <= discordant; k++) { if (k >= better) pOneSided += combination / 2 ** discordant; combination *= (discordant - k) / (k + 1); }
  return { better, worse, discordant, pOneSided: Math.min(1, pOneSided), method: 'Exact one-sided paired discordance binomial test; timeout is not a monster victory.' };
}
function pairedInterval(deltas, { resamples = 20000, seed = 0x51E6A1 } = {}) {
  if (!deltas.length) throw Error('A paired interval requires at least one paired seed.');
  const n = deltas.length, mean = deltas.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? deltas.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const se = Math.sqrt(variance / n); let state = seed >>> 0;
  const random = () => { let t = state = (state + 0x6D2B79F5) >>> 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const draws = Array.from({ length: resamples }, () => { let sum = 0; for (let i = 0; i < n; i++) sum += deltas[Math.floor(random() * n)]; return sum / n; }).sort((a, b) => a - b);
  return { pairedSeeds: n, delta: round(mean), pairedBootstrap95: [round(draws[Math.floor((resamples - 1) * .025)]), round(draws[Math.floor((resamples - 1) * .975)])], pairedNormal95: [round(Math.max(-1, mean - 1.95996398454 * se)), round(Math.min(1, mean + 1.95996398454 * se))], bootstrapResamples: resamples, bootstrapSeed: seed, method: 'Approximate percentile bootstrap resampling paired seed deltas (or seed-cluster averages), preserving within-seed dependence; nominal95%, not simultaneous coverage. All-tie data can produce a degenerate empirical interval.' };
}
function summarize(results) {
  const groups = new Map();
  for (const r of results) {
    const meta = r.config.enemyStudy;
    if (!groups.has(meta.key)) groups.set(meta.key, { key: meta.key, pair: meta.pair, army: meta.army, scale: meta.scale, ratio: meta.ratio, heroBudget: meta.heroBudget, stage: meta.stage || 'discovery', assay: meta.assay || 'legacy-field-or-objective', deadline: meta.deadline ?? null, originalKey: meta.originalKey || meta.key, castleShots: r.config.castleShots ?? false, endOnPartyDeath: r.config.endOnPartyDeath ?? true, contextLabel: meta.contextLabel || 'fresh', actualSupportShare: meta.actualSupportShare ?? null, requestedSupportShares: meta.requestedSupportShares || null, preexistingCorpses: meta.preexistingCorpses || 0, mode: r.mode, match: meta.match, arms: {} });
    const g = groups.get(meta.key);
    if (!g.arms[meta.arm]) g.arms[meta.arm] = { n: 0, monsterWins: 0, heroWins: 0, timeouts: 0, duration: 0, heroDeaths: 0, castleDamage: 0 };
    const a = g.arms[meta.arm];
    a.n++; a.monsterWins += r.outcome === 'loss'; a.heroWins += r.outcome === 'win'; a.timeouts += r.outcome === 'timeout'; a.duration += r.duration; a.heroDeaths += r.heroes.deaths; a.castleDamage += r.castleDamage;
  }
  const contexts = [...groups.values()].map(g => {
    const arms = Object.fromEntries(Object.entries(g.arms).map(([key, a]) => [key, { ...a, monsterWinRate: round(a.monsterWins / a.n), monsterWinWilson95: wilson(a.monsterWins, a.n), heroWinRate: round(a.heroWins / a.n), timeoutRate: round(a.timeouts / a.n), duration: round(a.duration / a.n), heroDeaths: round(a.heroDeaths / a.n), castleDamage: round(a.castleDamage / a.n) }]));
    const strongestPureRate = Math.max(arms.pureA.monsterWinRate, arms.pureB.monsterWinRate);
    const delta = round(arms.mixed.monsterWins / arms.mixed.n - Math.max(arms.pureA.monsterWins / arms.pureA.n, arms.pureB.monsterWins / arms.pureB.n));
    const bySeed = new Map();
    for (const r of results.filter(r => r.config.enemyStudy.key === g.key)) {
      if (!bySeed.has(r.seed)) bySeed.set(r.seed, {}); bySeed.get(r.seed)[r.config.enemyStudy.arm] = r.outcome;
    }
    const seedEvidence = [...bySeed].map(([seed, arms]) => ({ seed, ...arms, mixedOnlyMonsterWin: arms.mixed === 'loss' && arms.pureA !== 'loss' && arms.pureB !== 'loss' }));
    const mixedOnlyWins = seedEvidence.filter(s => s.mixedOnlyMonsterWin).length;
    const pairedTests = { pureA: pairedSuperiority(seedEvidence, 'pureA'), pureB: pairedSuperiority(seedEvidence, 'pureB') };
    const pairedTwoComparatorPassed = g.match.eligible && pairedTests.pureA.pOneSided < .025 && pairedTests.pureB.pOneSided < .025;
    const conservativeDeltaRange = [round(arms.mixed.monsterWinWilson95[0] - Math.max(arms.pureA.monsterWinWilson95[1], arms.pureB.monsterWinWilson95[1])), round(arms.mixed.monsterWinWilson95[1] - Math.max(arms.pureA.monsterWinWilson95[0], arms.pureB.monsterWinWilson95[0]))];
    return { ...g, arms, pairedTests, pairedTwoComparatorPassed, conservativeDeltaRange, separatedWilsonIntervals: g.match.eligible && conservativeDeltaRange[0] > 0, strongestPureMonsterWinRate: strongestPureRate, deltaOverBestPure: delta, mixedOnlyWins, candidate: g.match.eligible && delta > 0, provisional: g.stage !== 'validation', seedEvidence };
  });
  const pairedReportFamilyAlpha = .05 / Math.max(1, 2 * contexts.length);
  for (const c of contexts) { c.pairedReportFamilyAlpha = pairedReportFamilyAlpha; c.pairedReportFamilyPassed = c.match.eligible && c.pairedTests.pureA.pOneSided < pairedReportFamilyAlpha && c.pairedTests.pureB.pOneSided < pairedReportFamilyAlpha; }
  const order = (a, b) => Number(b.match.eligible) - Number(a.match.eligible) || b.deltaOverBestPure - a.deltaOverBestPure || b.mixedOnlyWins - a.mixedOnlyWins || Math.max(a.match.relativeRoundingExcess.pureA, a.match.relativeRoundingExcess.pureB) - Math.max(b.match.relativeRoundingExcess.pureA, b.match.relativeRoundingExcess.pureB);
  const brief = c => c && ({ key: c.key, pair: c.pair, army: c.army, scale: c.scale, ratio: c.ratio, mode: c.mode, eligible: c.match.eligible, candidate: c.candidate, stage: c.stage, assay: c.assay, deadline: c.deadline, castleShots: c.castleShots, endOnPartyDeath: c.endOnPartyDeath, contextLabel: c.contextLabel, actualSupportShare: c.actualSupportShare, requestedSupportShares: c.requestedSupportShares, preexistingCorpses: c.preexistingCorpses, pairedTests: c.pairedTests, pairedTwoComparatorPassed: c.pairedTwoComparatorPassed, pairedReportFamilyAlpha: c.pairedReportFamilyAlpha, pairedReportFamilyPassed: c.pairedReportFamilyPassed, conservativeDeltaRange: c.conservativeDeltaRange, separatedWilsonIntervals: c.separatedWilsonIntervals, deltaOverBestPure: c.deltaOverBestPure, mixedMonsterWinRate: c.arms.mixed.monsterWinRate, pureAMonsterWinRate: c.arms.pureA.monsterWinRate, pureBMonsterWinRate: c.arms.pureB.monsterWinRate, mixedTimeoutRate: c.arms.mixed.timeoutRate, pureATimeoutRate: c.arms.pureA.timeoutRate, pureBTimeoutRate: c.arms.pureB.timeoutRate, budgets: c.match.budgets, counts: c.match.counts, relativeRoundingExcess: c.match.relativeRoundingExcess, mixedOnlyWins: c.mixedOnlyWins, seeds: c.arms.mixed.n });
  const presentPairs = [...new Map(contexts.map(c => [c.pair.join('+'), c.pair])).values()];
  const byPair = presentPairs.map(pair => ({ pair, best: brief(contexts.filter(c => c.pair.join('+') === pair.join('+')).sort(order)[0]) })).filter(g => g.best);
  const byMonster = Object.keys(THREAT).map(type => {
    const matching = contexts.filter(c => c.pair.includes(type)).sort(order), best = matching[0];
    const heldout = matching.some(c => c.stage === 'validation');
    const status = heldout ? matching.some(c => c.separatedWilsonIntervals) ? 'heldout-positive-separated-intervals' : matching.some(c => c.candidate) ? 'heldout-positive-uncertain' : 'no-heldout-positive-selected-contexts' : matching.some(c => c.candidate) ? 'candidate-needs-heldout' : matching.length ? 'no-positive-candidate-in-tested-bands' : 'untested';
    return { type, status, testedContexts: matching.length, eligibleContexts: matching.filter(c => c.match.eligible).length, positiveCandidates: matching.filter(c => c.candidate).length, best: brief(best) };
  });
  return { pairedTestNote: 'Exact one-sided paired-discordance tests; .025 per comparator controls two comparisons within a context. Report-family flags additionally use .05 divided by twice the number of tested contexts. Raw p-values are retained for any broader correction across reports.', pairedReportFamilyAlpha, intervalNote: 'Wilson intervals describe individual win rates. Endpoint differences are descriptive conservative ranges, not simultaneous or paired confidence intervals.', contexts: contexts.length, eligibleContexts: contexts.filter(c => c.match.eligible).length, cappedOrIneligibleContexts: contexts.filter(c => !c.match.eligible).length, positiveCandidates: contexts.filter(c => c.candidate).length, bestCandidates: contexts.filter(c => c.candidate).sort(order).slice(0, 20).map(brief), byMonster, byPair, comparisons: contexts };
}
function auditUnits(sources, { minRatio = .85, maxRatio = 1.15 } = {}) {
  const groups = new Map(), mixed = [];
  for (const { label, report } of sources) {
    for (const r of report.results || []) {
      const types = [...new Set(r.config.monsters.map(m => m.type))];
      if (types.length !== 1 || !THREAT[types[0]]) continue;
      if (!r.config.heroes.length || r.config.heroes.some(h => h.level !== 3) || r.config.monsters.some(m => m.rank !== 3)) continue;
      const hb = heroBudget(r.config.heroes), mb = monsterBudget(r.config.monsters, THREAT), ratio = mb / hb;
      if (ratio < minRatio || ratio > maxRatio) continue;
      const key = label + '/' + r.id;
      const fingerprint = JSON.stringify({ heroes: r.config.heroes, monsters: r.config.monsters, research: r.config.research, mode: r.mode, difficulty: r.config.difficulty, corpses: r.config.corpses, skeletons: r.config.skeletons, waves: r.config.waves, reinforcements: r.config.reinforcements });
      if (!groups.has(key)) groups.set(key, { source: label, id: r.id, fingerprint, type: types[0], heroTypes: [...new Set(r.config.heroes.map(h => h.type))].sort(), heroCount: r.config.heroes.length, monsterCount: r.config.monsters.length, achievedRatio: round(ratio), research: r.config.research, preexistingCorpses: r.config.corpses?.length || 0, preexistingSummons: r.config.skeletons?.length || 0, mode: r.mode, n: 0, monsterWins: 0, heroWins: 0, timeouts: 0, stage: r.config.enemyStudy?.stage || 'discovery' });
      const g = groups.get(key); g.n++; g.monsterWins += r.outcome === 'loss'; g.heroWins += r.outcome === 'win'; g.timeouts += r.outcome === 'timeout';
    }
    for (const c of report.summary?.comparisons || []) {
      if (!c.match.eligible) continue;
      const ratio = c.match.budgets.mixed / c.heroBudget;
      for (let i = 0; i < c.pair.length; i++) {
        const partner = i ? c.arms.pureA : c.arms.pureB;
        mixed.push({ source: label, id: c.key, type: c.pair[i], partner: c.pair[1 - i], heroComposition: c.army, achievedRatio: round(ratio), nearOne: ratio >= minRatio && ratio <= maxRatio, monsterWins: c.arms.mixed.monsterWins, n: c.arms.mixed.n, monsterWinRate: c.arms.mixed.monsterWinRate, timeoutRate: c.arms.mixed.timeoutRate, marginalWinDeltaOverPartner: round(c.arms.mixed.monsterWinRate - partner.monsterWinRate), deltaOverBestPure: c.deltaOverBestPure, stage: c.stage || 'discovery' });
      }
    }
  }
  const allRows = [...groups.values()].map(g => ({ ...g, monsterWinRate: round(g.monsterWins / g.n), timeoutRate: round(g.timeouts / g.n), monsterWinWilson95: wilson(g.monsterWins, g.n) }));
  // A small discovery sample cannot override held-out evidence for the same army.
  const rows = allRows.filter(g => !allRows.some(other => other.fingerprint === g.fingerprint && other.n > g.n));
  const strongOrder = (a, b) => b.n - a.n || b.monsterWinRate - a.monsterWinRate;
  const weakOrder = (a, b) => b.n - a.n || a.monsterWinRate - b.monsterWinRate;
  const byMonster = Object.keys(THREAT).map(type => {
    const pure = rows.filter(g => g.type === type), strong = pure.filter(g => g.monsterWinRate >= .75).sort(strongOrder)[0] || null;
    const weakPool = pure.filter(g => g.monsterWinRate <= .25).sort(weakOrder);
    const weak = weakPool.find(g => !strong || g.heroTypes.join('+') !== strong.heroTypes.join('+')) || weakPool[0] || null;
    const differentHeroTypes = !!strong && !!weak && strong.heroTypes.join('+') !== weak.heroTypes.join('+');
    const support = mixed.filter(g => g.type === type && g.monsterWinRate >= .75 && g.marginalWinDeltaOverPartner > 0).sort(strongOrder);
    const bestPure = pure.slice().sort((a, b) => b.monsterWinRate - a.monsterWinRate || b.n - a.n)[0] || null;
    const worstPure = pure.slice().sort((a, b) => a.monsterWinRate - b.monsterWinRate || b.n - a.n)[0] || null;
    return { type, nearOnePureContexts: pure.length, bestPure, worstPure, meetsStrongThreshold: !!strong, meetsWeakThreshold: !!weak, meetsBothAgainstDifferentHeroTypes: differentHeroTypes, strong, weak, strongestMixedMarginalNearOne: support.find(g => g.nearOne) || null, strongestMixedMarginalAnyTestedBand: support[0] || null };
  });
  return { definition: { heroLevel: 3, monsterRank: 3, minAchievedThreatRatio: minRatio, maxAchievedThreatRatio: maxRatio, strongMonsterWinRate: .75, weakMonsterWinRate: .25, victory: 'hero loss; timeouts are separate', note: 'Pure and mixed marginal evidence are separate. Mixed team success alone does not establish the individual unit threshold; research and seed count are recorded.' }, fixedInitialThreat: THREAT, byMonster, missingPureStrong: byMonster.filter(g => !g.meetsStrongThreshold).map(g => g.type), missingPureWeak: byMonster.filter(g => !g.meetsWeakThreshold).map(g => g.type), supersededDiscoveryContexts: allRows.filter(g => !rows.includes(g)).map(g => ({ source: g.source, id: g.id, n: g.n })), allPureContexts: rows };
}
async function main(args) {
  if (args.includes('--help')) { console.log(fs.readFileSync(__filename, 'utf8').split("'use strict';")[0]); return; }
  const arg = (name, fallback) => { const at = args.indexOf(name); return at < 0 ? fallback : args[at + 1]; };
  const refArg = arg('--ref', '28ba8b8'), ref = refArg === 'working-tree' ? null : refArg;
  const pairs = arg('--pairs', null) ? arg('--pairs').split(',').map(text => text.split('+')) : PAIRS;
  for (const pair of pairs) if (!SUPPORTED_PAIRS.some(p => p.join('+') === pair.join('+'))) throw Error('Unsupported pair: ' + pair.join('+'));
  const options = { seeds: Number(arg('--seeds', '6')), offset: Number(arg('--offset', '0')), filter: arg('--filter', ''), pairs, contextKeys: arg('--contexts', null) ? JSON.parse(fs.readFileSync(arg('--contexts'), 'utf8')) : null, stage: arg('--stage', 'discovery'), suite: arg('--suite', 'pairs'), roleSet: arg('--role-set', 'main') }, jobs = Number(arg('--jobs', '2'));
  const siegeStatsText = arg('--siege-stats', null);
  if (siegeStatsText) { const stats = siegeStatsText.split(',').map(Number); if (stats.length !== 2 || !stats.every(n => Number.isFinite(n) && n > 0)) throw Error('--siege-stats expects positive hp,damage.'); options.siegeStats = { hp: stats[0], damage: stats[1] }; if (jobs !== 1) throw Error('Configured numeric sweeps require --jobs 1.'); }
  if (!Number.isInteger(options.seeds) || options.seeds < 1 || !Number.isInteger(jobs) || jobs < 1 || jobs > 4) throw Error('Use >=1 seed and 1..4 jobs.');
  const out = path.resolve(arg('--out', '/workspace/scratch/23d09e66c6fe/experiments/enemy-baseline.json'));
  const cases = arg('--cases', null) ? JSON.parse(fs.readFileSync(arg('--cases'), 'utf8')) : options.suite === 'escorts' ? makeEscortCases(options) : options.suite === 'roles' ? makeRoleCases(options) : makeCases(options), begin = Date.now();
  const inputFile = path.resolve(arg('--save-cases', out.replace(/\.json$/, '') + '-cases.json'));
  fs.mkdirSync(path.dirname(inputFile), { recursive: true }); fs.writeFileSync(inputFile, JSON.stringify(cases) + '\n');
  if (args.includes('--prepare-only')) { console.log(JSON.stringify({ prepared: true, cases: cases.length, inputFile })); return; }
  console.log(JSON.stringify({ start: true, cases: cases.length, ref: refArg, jobs, out }));
  const runtimeNames = ['content', 'world', 'engine', 'orders', 'summons', 'traps', 'heroes', 'monsters'];
  const runtimeHash = () => { const hash = crypto.createHash('sha256'); for (const name of runtimeNames) { const filename = 'resources/glantan/' + name + '.js'; hash.update(ref ? execFileSync('git', ['show', ref + ':' + filename], { cwd: path.resolve(__dirname, '..') }) : fs.readFileSync(path.join(__dirname, '..', filename))); } return hash.digest('hex'); };
  const runtimeSha256Before = runtimeHash();
  const configure = options.siegeStats ? G => Object.assign(G.monsterTypes.siegebreaker, options.siegeStats) : null;
  const results = await runStudy(cases, { ref, jobs, configure });
  const runtimeSha256After = runtimeHash();
  const summary = summarize(results);
  const raidAssay = cases.some(c => c.enemyStudy?.assay === 'defended-castle-raid');
  const harnessSha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'glantan-combat.cjs'))).digest('hex');
  const resolvedRef = ref ? execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim() : 'working-tree';
  const report = { protocol: 1, assayProtocol: raidAssay ? 'defended-castle-raid-v1' : 'legacy-field-or-objective', purpose: raidAssay ? 'Separately labelled defended-castle raid assay at predeclared deadlines; party deaths do not end combat.' : options.stage === 'validation' ? 'Held-out validation of previously selected enemy-pair contexts.' : 'Enemy-side pair synergy discovery; positive deltas require held-out confirmation.', ref: refArg, resolvedRef, runtimeSha256Before, runtimeSha256After, runtimeSourcesStable: runtimeSha256Before === runtimeSha256After, harnessSha256, inputFile, caseInputSha256: crypto.createHash('sha256').update(fs.readFileSync(inputFile)).digest('hex'), fixedInitialThreat: THREAT, heroCosts: COST, options, jobs, runtimeOverrides: options.siegeStats ? { monsterTypes: { siegebreaker: options.siegeStats } } : null, rank: 3, heroLevel: 3, designRosterCap: CAP, controls: ['Pure controls spend at least mixed achieved threat within one unit rounding tolerance unless explicitly flagged capped/ineligible.', raidAssay ? 'Attacker victory requires castle destruction by the deadline. Party deaths do not end combat; an alive castle at deadline has held the raid.' : 'A monster win is a hero-party or castle loss; timeouts remain separate.', raidAssay ? 'Defended-castle cases enable castle shots; exact controls are recorded per case.' : 'Legacy siege pairs use a vulnerable objective castle with shots disabled.', 'Environmental corpses are absent unless explicitly labelled in case metadata; labelled corpse resources are identical in all three arms.', 'Initial threat weights are not calibrated; trash may need higher budget bands to reach thresholds.', options.stage === 'validation' ? 'Validation cases must be frozen before running fresh seed ranges.' : 'All discovery candidates require held-out confirmation.'], wallSeconds: round((Date.now() - begin) / 1000), summary, results };
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report) + '\n');
  const briefOut = out.replace(/\.json$/, '') + '-summary.json';
  fs.writeFileSync(briefOut, JSON.stringify({ ...report, results: undefined, summary: { ...summary, comparisons: undefined } }, null, 2) + '\n');
  console.log(JSON.stringify({ finished: true, cases: results.length, wallSeconds: report.wallSeconds, eligibleContexts: summary.eligibleContexts, positiveCandidates: summary.positiveCandidates, perMonster: summary.byMonster.map(m => ({ type: m.type, status: m.status, bestDelta: m.best?.deltaOverBestPure })), out, summary: briefOut }, null, 2));
}
module.exports = { PAIRS, EXPANDED_PAIRS, SUPPORTED_PAIRS, ROLE_PAIRS, ESCORT_PAIRS, PARTIES, wilson, pairedSuperiority, pairedInterval, auditUnits, budgetMatch, makeCases, makeRoleCases, makeEscortCases, resampleCases, makeRaidCases, summarize };
if (require.main === module) main(process.argv.slice(2)).catch(e => { console.error(e); process.exitCode = 1; });
