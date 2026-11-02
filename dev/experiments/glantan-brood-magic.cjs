/* Read-only brood spell-vulnerability prototype used in archived experiments.
 * Pass configure(multiplier) to createHarness({ configure }). The original
 * source revision is part of each archive; skeleton melee remains physical.
 */
'use strict';
function configure(multiplier) {
  if (!Number.isFinite(multiplier) || multiplier <= 0) throw Error('Positive spell multiplier required.');
  return G => {
    let spellOwner = null;
    const strike = G.necromancerStrike, damage = G.damage;
    G.necromancerStrike = function(w, hero, target, amount) {
      const previous = spellOwner;
      spellOwner = hero;
      try { return strike(w, hero, target, amount); }
      finally { spellOwner = previous; }
    };
    G.damage = function(w, target, amount, attacker) {
      const magical = attacker?.classId === 'mage' || attacker?.classId === 'healer' || (spellOwner && attacker === spellOwner);
      return damage(w, target, amount * (target?.type === 'broodcap' && magical ? multiplier : 1), attacker);
    };
  };
}
module.exports = { configure };
