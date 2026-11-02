/* Consolidate the frozen v2 confirmations, including failed candidates.
 * This does not fit costs or select new encounters. Run after glantan-report.
 */
'use strict';
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const DIR = path.resolve(__dirname, '../docs/glantan-combat');
const read = name => {
  const bytes = fs.readFileSync(path.join(DIR, name));
  return JSON.parse(name.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes);
};
function build() {
  const model = read('calibration-v2-summary.json'), rows = [];
  const add = (key, types, context, stats, extra = {}) => rows.push({
    key, types, context, n: stats.n, wins: stats.wins, delta: stats.delta,
    pairedBootstrap95: stats.pairedBootstrap95,
    rawPairedP: stats.comparisons.map(c => c.oneSidedExactP), ...extra
  });
  const anchors = { mender: 'rattler', binder: 'thornling', bulwark: 'husher' };
  for (const r of model.synergies) {
    const special = r.key.startsWith('thornling+bulwark/');
    const support = r.key.split('/')[0];
    add(r.key, special ? ['thornling', 'bulwark'] : [anchors[support], support], r.opponent, {
      n: r.arms.mixed.n, wins: Object.values(r.arms).map(a => a.monsterWins),
      delta: r.deltaOverBestPure, pairedBootstrap95: r.pairedBootstrap95,
      comparisons: [r.exactPairedVsAnchor, r.exactPairedVsSupport].map(c => ({ oneSidedExactP: c.pOneSided }))
    }, { budgets: r.budgets, arms: r.arms, source: 'calibration-v2-summary.json' });
  }
  const bundle = name => read('data/' + name + '-protocol-report.json.gz').report;
  for (const r of bundle('cal-v2-cross-anchor-sensitivity').confirmations)
    add(r.context, r.context.split('-'), r.key, r.attackerWinSynergyVsBestPure, { counts: r.mixedCounts, budgets: r.actualCosts, source: 'cal-v2-cross-anchor-sensitivity' });
  const cross = bundle('cal-v2-cross-discovery');
  const fromRows = (data, source) => { for (const r of data) add(r.pair + '/' + r.mix, r.pair.split('_'), r.opponent || r.panel, r.synergy, { counts: r.counts, arms: r.byArm, source }); };
  fromRows(cross.screen.confirmations, 'cal-v2-cross-discovery');
  add('nightwing_binder/borderline', ['nightwing','binder'], 'warrior_healer', cross.borderlineConfirmation.synergy, { counts: cross.borderlineConfirmation.counts, arms: cross.borderlineConfirmation.arms, source: 'cal-v2-cross-discovery' });
  fromRows(bundle('cal-v2-final-partner').study.confirmations, 'cal-v2-final-partner');
  fromRows(bundle('cal-v2-remaining-partner').study.confirmations, 'cal-v2-remaining-partner');
  add('siegebreaker_mender/v2', ['siegebreaker','mender'], 'defended-castle75', read('siege-calibrated-v2-summary.json'), { source: 'siege-calibrated-v2-summary.json' });
  // A broader, post-hoc sensitivity check across all current-production v2
  // confirmation comparisons; the original declared batch tests stay archived.
  const tests = rows.flatMap(row => row.rawPairedP.map((p, arm) => ({ row, arm, p }))).sort((a,b) => a.p-b.p);
  let adjusted = 0;
  for (let i=0; i<tests.length; i++) {
    const t = tests[i]; adjusted = Math.min(1, Math.max(adjusted, (tests.length-i)*t.p));
    (t.row.holmAdjustedP ||= [null,null])[t.arm] = adjusted;
  }
  for (const r of rows) { r.practicalPass = r.delta >= .15-1e-12; r.broadSensitivityPass = r.practicalPass && r.holmAdjustedP.every(p => p < .05); }
  const covered = [...new Set(rows.filter(r => r.broadSensitivityPass).flatMap(r => r.types))].sort();
  return {
    sourceSha256: model.sourceSha256, modelVersion: model.version,
    definition: 'Actual monster victories; timeouts are neither side\'s victory. Same-or-higher-cost pure controls. Every reported context has100 fresh paired starts.',
    multiplicity: { method: 'Holm sensitivity across all v2 current-production confirmation comparisons', contexts: rows.length, comparisons: tests.length, alpha: .05, postHocSensitivity: true, note: 'Original predeclared batch criteria remain in source reports. Nominal bootstrap intervals are not simultaneous.' },
    costs: model.costs, counters: model.counters, synergies: rows,
    coveredOrdinaryMonsterTypes: covered,
    unresolved: { broodcap: ['No decisive cost-calibrated weak matchup confirmed.', 'No calibrated partner clears the15-point target on fresh confirmation.'], bulwark: ['Observed77% defeats meets point target; its95% interval crosses75%.'] },
    roleExceptions: { guardian: 'Actual boss-garrison readiness checks.', boneservant: 'Binder-owned summon; corpse, cap and owner-death checks.' },
    scope: 'Conditional level3/rank3 flat-arena evidence. Hero recruitment costs exclude guild/research setup; monster equivalents are not universal prices or game spawn costs.'
  };
}
if (require.main === module) {
  const result = build(); fs.writeFileSync(path.join(DIR, 'acceptance.json'), JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({ contexts: result.synergies.length, passing: result.synergies.filter(r=>r.broadSensitivityPass).length, covered: result.coveredOrdinaryMonsterTypes }));
}
module.exports = { build };
