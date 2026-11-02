# Klockgläntan combat study — protocol

Baseline: `28ba8b8a447182e495ae869777539f4d6abe363d` (2026-11-01).
The goal is useful counters, complementary army compositions and predictable
progression. Combat measurements do not estimate children's campaign win rates.

## Controls and comparisons

`dev/glantan-combat.cjs` runs the actual fixed-step simulation, including local
target selection, action cooldowns, movement, retreat, healing, summons and wave
formations. It freezes natural lair escalation, recruitment and experience gains.
The standing attack order bypasses strategic expedition recruitment/readiness;
heroes still select nearby combat targets through the production AI. Castle
shots are disabled by default. Field experiments keep the real retreat destination, while
objective experiments allow enemies to destroy a normal 1,000-HP castle.

The original `mode:'objective'` batches retain the duel loss condition (all
heroes dead or castle destroyed), with castle fire disabled. Those results are
labelled objective-pressure **proxies**. A separate defended-castle assay uses
`mode:'objective', castleShots:true, endOnPartyDeath:false`: killing the party
does not itself count as destroying the objective, and the castle can keep
fighting. Its declared 50/75-second windows test whether a raid breaches the
defence in time. These controls are recorded per case and never pooled with the
original proxy outcomes. Neither mode simulates paid resurrection decisions.

Paired cases share independent formation and combat random streams. Discovery
uses six seeded starts varying separation (3.4/5.2/6.8 tiles), spacing,
orientation and positional jitter. These small batches find candidates; they
are not confirmatory evidence. Validation uses new seed ranges and additional
levels, army sizes, formations and purchased branches. A timeout is never a win.

Two costs must not be conflated:

* **Marginal recruitment budget:** 2 per warrior/ranger and 3 per
  healer/mage/necromancer. Core armies spend 12, including mixtures with half
  allocated to each class (e.g. three warriors plus two healers).
* **Acquisition budget:** also includes guilds, housing and research. This is
  reported separately. A two-guild combination has extra setup cost; the core
  combat results alone do not establish equal total acquisition value.

The initial nominal level factor is
`sqrt((1 + .17*(level-1))*(1 + .16*(level-1)))`, derived from the game's HP and
damage scaling. This is a normalization hypothesis, not an assertion that range,
healing, spells, summons or utility are equivalent to raw damage.

Monsters have no purchase price. Initial threat weights below were declared
before tuning and stay frozen across comparisons. They are not XP rewards and
do not change the game's spawning costs. Actual rank scaling uses the real
spawn function: canonical rank `r` maps to tier `min(3,r)` and lair level
`r-tier+1`. The runner records actual stats. Boss guardians additionally have
difficulty-specific stats and require separate lair checks.

| Monster | Nominal base threat |
| --- | ---: |
| Rattler | 0.75 |
| Sporeling | 0.50 |
| Husher | 1.25 |
| Nightwing | 0.75 |
| Thornling | 0.90 |
| Mender | 1.40 |
| Binder | 2.20 |
| Boneservant | 0.85 |
| Siegebreaker | 2.00 |
| Broodcap | 2.50 |
| Bulwark | 2.00 |
| Guardian | 4.00 |

Test achieved enemy/hero budget ratios near .7, 1 and 1.3. Integer armies cannot
always match exactly; retain achieved budgets. Homogeneous enemy controls round
up from a mixed army's budget, never down, and capped comparisons are ineligible
for synergy claims. Do not retrospectively fit these weights to conceal an
overpowered unit. Pilot calibration errors are reported as limitations.

## Independent reference-cost calibration

The later v2 study replaces the initial threat guesses for its own comparisons.
It does not change recruitment prices, spawning or XP in the game. Its units are
**rank-3 monster equivalents against level-3 heroes**; do not multiply them by
the earlier level/rank factors or mix the two scales in one comparison.

Three predeclared hero armies each cost 12: two warriors, one ranger, one healer
and one mage; three warriors and two mages; three rangers and two healers. For
each ordinary damage type, fit a monotone count-versus-victory curve to these
equally weighted reference armies. Interpolate the count giving 50% absolute
monster victories and assign each monster `12 / count` reference points.
Timeouts remain in the denominator and are not victories. Menders, binders and
bulwarks instead receive conditional substitution estimates in rattler,
thornling and husher armies respectively. Siege uses a separate defended-castle
assay. These estimates are context-dependent; transferring a support price to
another anchor is an explicit sensitivity assumption.

Training uses 18 seeds covering every distance (3.8/5.6/7), spacing (.6/.8/1)
and mirror combination. Validation uses 36 fresh seeds from the same geometry
distribution. A bounded two-column formation accommodates large enemy armies.
Freeze fitted prices and exact rosters before validation. Do not use the
desired 75% counters or 15-point synergies to fit prices. The earlier v1 study
used incomplete geometry coverage and is preserved as superseded evidence.

The 36-seed validation panel checks prediction error and discovers possible
counters. Selecting its best contexts does not make those contexts confirmed:
they receive a separate 100-seed confirmation. Partnership discovery also
varies support ratios and tests both pure controls, rounding their budgets up.
An observed 75% rate is a point target; report its uncertainty separately and
do not claim that the population rate is at least 75% when its interval crosses
that threshold. Exploratory bootstrap intervals are nominal, not simultaneous.

Unresolved types receive additional predeclared discovery screens. For example,
the brood counter screen enumerates all 46 integer hero compositions costing
12 and confirms its best context only if the screen reaches the frozen gate.
Preserve failures and timeout-heavy contexts alongside successes. Reusing an
identical cached result is valid, but counts as a reused record, not another
independent simulation.

## Intended mechanisms to investigate

| Type | Intended opportunity | Intended vulnerability | Candidate partner |
| --- | --- | --- | --- |
| Warrior | Holds ground against physical pressure | Flying enemies; concentrated magic | Healer, ranged damage |
| Ranger | Reaches flyers and exposed ranged targets | Protected targets; enemies closing the gap | Warrior, mage |
| Healer | Sustains a damage-dealing frontline | Burst or magic pressure; insufficient team offense | Warrior |
| Mage | Clustered enemies and protected physical targets | Dispersed ranged fire or close pressure | Warrior, healer |
| Necromancer | Attrition with available remains | Corpse-starved openings; ranged pressure | Ranger, warrior |
| Rattler | Closing on fragile ranged heroes | Durable frontline | Mender |
| Sporeling | Numerous fast attackers | Area damage | Broodcap, binder |
| Husher | Ranged magic and clustered targets | Exposed to ranged focus | Binder |
| Nightwing | Ground melee and terrain barriers | Ranged attacks | Siege pressure |
| Thornling | Dispersed physical ranged pressure | Durable melee approaching | Bulwark |
| Mender | Sustained damage on a strong frontline | Burst and area damage; weak solo offense | Rattler, guardian |
| Binder | Immobilization and remains to raise | Focus fire and corpse competition | Broodcap, melee escorts |
| Boneservant | Expendable melee body | Area damage; its master's death | Binder, mender |
| Siegebreaker | Threatens buildings if kept alive | Close interception; low HP without escorts | Mender |
| Broodcap | Prolonged fights with replenishing bodies | Fast area damage | Binder |
| Bulwark | Protects a ranged/support group | Magic or concentrating on its protection source | Thornling |
| Guardian | Dangerous close combat | A sufficiently invested complementary party | Mender |

These are hypotheses, not measured conclusions. Friendly skeletons are
owned summons, not separately purchasable heroes; their cost and value belong
to their necromancer. Enemy skeletons require both direct-body checks and
master-dependent checks. Siege is judged by objective pressure, not solely by
duel damage. Pre-existing remains/summons must be distinguished from fresh fights.

## Decision rules

Initial design targets are at least 75% victory in a relevant favorable family,
at most 25% in an unfavorable family, and at least 15 percentage points of
synergy over the stronger homogeneous comparator. Support is also evaluated by
replacing another equally priced contribution in a fixed background army.
Effects must survive fresh validation; confidence intervals must exclude no
advantage. Both monotype comparisons must support a synergy claim. These are
per-family criteria, not requirements that every mixture dominate everywhere.

For a genuinely decisive unfavorable encounter, require **opponent victories**,
not merely a low own-victory rate. A 0% win / 0% loss / 100% timeout result is
unresolved. Report all three outcomes. The exploratory screen using <=25% own
wins is weaker than this decisive-loss requirement and is labelled accordingly.

For context `c`, define synergy as
`Delta(A,B,c) = P(mixed wins | c) - max(P(pure A wins | c), P(pure B wins | c))`.
Evaluate both pure controls at the same or a conservatively higher achieved
budget. Resample matched seed triples for a confidence interval on Delta; test
both comparisons with paired discordance tests. Use separate discovery and
confirmation seeds and correct the declared confirmation family for multiple
comparisons. Never pick a new favorable context from confirmation failures and
call it confirmed without another fresh sample.

The initial half-budget mixes are a screen, not a required recipe. Subsequent
support tests examine smaller contingents and record actual integer fractions.
Freeze exact achieved rosters before confirmation. A requested 15% support share
must not be reported as 15% if integer allocation actually bought 35% support.

Evaluate naturally summon-only boneservants through their binder, including
their corpse cost, ownership, cap and death when their master falls. Evaluate
boss guardians through actual nest garrisons, leash and readiness thresholds.
Standalone body experiments remain diagnostic, but an independently purchasable
guardian/skeleton partnership is not a requirement of the existing game. These
are explicit role exceptions to the literal "every single type" pairing rule,
not claims that the literal rule passed.

Retain duration, casualties, surviving HP, damage, effective healing, action
counts and retreat. Distinguish unresolved attrition from no contact or
withdrawal. Inspect the mechanism before changing numbers. Additional abilities
must not bypass shared cooldowns; a purchased ability should not consistently
reduce the same army's effectiveness through bad scheduling.

Numerical tuning precedes redesign unless the needed role is absent. Keep
changes readable and bounded, preserve save compatibility, and check several
composition options remain useful. Validate changes with focused regressions,
fresh combat experiments, real boss encounters and the existing paid-answer
campaign driver. Report failed or inconclusive requirements explicitly.

## Reproduction

```
node dev/glantan-combat.cjs --self-test
node dev/glantan-study.cjs --suite pilot --ref 28ba8b8 --out /tmp/pilot.json
node dev/glantan-study.cjs --suite core --ref 28ba8b8 --out /tmp/baseline.json
node dev/glantan-study.cjs --suite core --out /tmp/current.json
node dev/glantan-study.cjs --suite levels --seeds 6 --offset 1000 --out /tmp/levels.json
node dev/glantan-balance.cjs --boss
node dev/glantan-balance.cjs gentle 10 0 1
GLANTAN_REF=28ba8b8 GLANTAN_COMPARE=1 node dev/glantan-balance.cjs brave 10 0 1
GLANTAN_REF=28ba8b8 GLANTAN_ESCORTS=1 node dev/glantan-balance.cjs brave 10 0 1
node dev/glantan-evidence.cjs cases docs/glantan-combat/data/baseline-hero-validation.json.gz /tmp/cases.json
node dev/glantan-study.cjs --cases /tmp/cases.json --ref 28ba8b8 --out /tmp/replay.json
node dev/glantan-report.cjs
node dev/glantan-acceptance.cjs
python dev/glantan-plots.py
node dev/glantan-calibration.cjs --dir /tmp/calibration-v2 --seeds 18 --validation-seeds 36 --jobs 2
node dev/glantan-calibration.cjs --support-audit --dir /tmp/calibration-v2 --jobs 2
node dev/glantan-calibration.cjs --confirm-frozen --dir /tmp/calibration-v2 --jobs 2
```

Raw reports include exact input rosters and seeds for replay. Large matrices
are opt-in development experiments; ordinary regression tests remain focused.
The committed compressed evidence retains exact input templates, geometry,
seeds, individual outcomes, aggregate combat metrics and source-report hashes.
`manifest.json` lists every archived batch. Plotting alone requires Matplotlib;
the simulation, evidence unpacker and statistics use Node's standard library.
Instrumentation version 2 corrects newly raised enemy skeleton starting stats
after their spawn overrides. Legacy outcomes, timing, damage and HP were checked
for parity. Optional castle-fire/terminal-condition flags default to the old
controls, so archived inputs still replay with their original semantics.

The calibration extensions retain exact input configurations and per-start
outcomes. Some auxiliary partnership runners captured summary combat metrics
only; unavailable per-unit fields are null and their original summary records
are preserved separately. Eleven absent log rows were recovered by exact
deterministic replay, checked against the original aggregates, and explicitly
counted as additional executions without inflating sample sizes. The manifest
separates recorded cases, cached reuse and simulator executions.

Rejected brood prototypes use `configure(multiplier)` from
`dev/experiments/glantan-brood-magic.cjs`, passed to `createHarness` with the
archived source revision (`40ef9d2` has the retained siege rules). Unpack the
corresponding archive to recover exact inputs, then run each with that harness.
Do not replay a numeric prototype with unmodified production code and interpret
the different outcomes as a failed deterministic replay.

To replay the retained siege confirmation with current production code:

```
node dev/glantan-evidence.cjs cases docs/glantan-combat/data/siege-production-validation.json.gz /tmp/siege-cases.json
node dev/glantan-study.cjs --cases /tmp/siege-cases.json --jobs 2 --out /tmp/siege-current.json
```

Historical numeric candidates used the baseline plus
`dev/experiments/glantan-siege-interception.patch`, applied in a separate
checkout, with explicit `--siege-stats 165,23`, `110,34.5` or `90,42` overrides
in `glantan-enemy-study.cjs`. Their archives record the source recipe and exact
inputs. Do not use current production defaults as if they were the original
165/23 implementation. The original source remains accessible by baseline ref.
