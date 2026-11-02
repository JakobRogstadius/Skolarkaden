# Klockgläntan wave study: protocol and reproduction

This follows the [unit combat study](glantan-combat-protocol.md). Unit assays answer whether a counter or partnership exists at a stated budget. This study answers whether actual waves meet a legally acquired army at a useful point in its development. See the [results and retained schedule](glantan-waves-report.md).

## Experimental unit and player model

A trial is a complete seeded campaign using the real `GlantanGame`, advanced in 0.1-second steps. It starts with the normal world and resources. There are no granted heroes, levels, research, damage multipliers or revealed lairs. Purchases use `choose` and actual answer submissions; errors reset the real streak. The ordinary VM fixture supplies an exercise item, so the modeled latency and correctness replace human reading/typing, not economic rules.

The default response model is six seconds on average, uniform ±25% timing variation and 95% independent correctness. Timing and errors use a separate seeded stream from map/combat randomness. The same map seed pairs response streams across policies and versions; different action histories need not submit the same number of answers. Fast and slow sensitivity checks use 3 seconds/98% and 9 seconds/90%. These are explicit assumptions, not inferred player data.

Every policy pays for housing and class buildings, then recruits and researches its declared plan. The policies repair a castle below half health, resurrect fallen heroes, rebuild eligible essential buildings, and use real bell charges under pressure. They choose among revealed objectives by visible tier, level and distance, with the boss last. Exploration chooses a frontier from the explored map. Policies do not receive an unseen lair list for targeting or free army orders.

`dev/glantan-campaign.cjs` contains the exact recruitment order, research branches, tower and defense choices. The confirmation policies are:

- `rangers`: eight rangers; armor, boots, castle upgrade and marksman research.
- `focused`: three warriors, two rangers, two healers and one mage; armor, boots, castle upgrade, banner, marksman, bloom and echo; larger paid attack flags as the army grows.
- `coordinated`: four warriors, three rangers, three healers and two mages; the same mixed research, an early tower and a village defense flag; larger paid attack flags.
- `guarded`: the same recruitment, research and village defense as `coordinated`, but ordinary small attack flags, raised later if expedition readiness explicitly asks for more.

Coordinated flag level is `min(3, max(1, floor((population−2)/2)))`, paid through the same purchase system. This does not directly assign or teleport heroes: existing expedition and defense rules determine who responds. These policies are reproducible strategies, not optimal agents or a distribution of human behavior.

## Selection and confirmation

Exploration began with three map seeds, then used twelve maps balanced across all six family combinations (rust plus two of spore, hush, sky and thorn). The map selector scanned deterministic seeds, accepting maps by family only. It selected a separate confirmation panel with three maps per combination. Its exact selection, seed range and lair positions are in [map-strata-selection.json](glantan-waves/map-strata-selection.json).

| Discovery dataset | Trials | Scope | Local source checkpoint used to construct the archive |
| --- | ---: | --- | --- |
| `discovery` | 60 | Original waves and three early candidates; five policies, three maps | `265df3a` |
| `second` | 48 | Smaller staged waves, awakening/recovery changes and reserve armies | `1da3bee` |
| `strata` | 96 | Twelve-map checks of measured and earlier waves | `1da3bee` |
| `escorts` | 96 | Earlier support units and cohesive formations | `f3781fe` |
| `companies` | 96 | Larger companies with 125/150-second regular intervals | `7824328` |
| `scheduled` | 72 | Remove growth-triggered waves; assault, ranger and guarded policies | `e28c9e0` |
| `coordination` | 72 | Paid larger expeditions at 125/150-second intervals | `ddb8082` |

Those local checkpoint IDs are provenance notes, **not required remotely reachable Git refs**. Each dataset has its exact source contents in the committed, deduplicated source bundle. Failed candidates and timeouts remain in the archive. The discovery panels have different policies and deadlines and must not be pooled into a single win-rate claim.

The chosen `recovery` candidate has the companies roster, a 150-second regular interval, original awakening/growth rates and no extra growth-triggered wave. Its [confirmation plan](glantan-waves/confirmation-plan.json) was frozen before the held-out runs. No production balance or policy was changed after seeing those results.

Confirmation uses 72 primary cases per version: 18 maps × four policies, six-second/95% answers, 1,800-second deadline. Another 24 per version cover the two response sensitivities, two policies and one map per family. The baseline is `f2c03de332401a62194ba4a6ea64ca88c570dca4`; the candidate is the integrated production source. Twelve discovery cases first verified exact prototype-to-production integration. They are parity checks, not independent confirmation observations.

The frozen gates were: at least half the primary coordinated campaigns win with casualties or village pressure; at least two policies win at least one third; ranger victories stay below 85%; fast coordinated play wins at least five of six; slower/error-prone play is harder. These numerical targets operationalize this tuning pass. They do not define balance for every audience or require all strategies to succeed.

## Outcomes and telemetry

Record victory, castle loss and unresolved deadline timeout separately. Report counts and denominators for every policy, response profile and family. Compare the before/after result on the same map rather than treating paired campaigns as independent. Pointwise Wilson intervals in the descriptive summary do not account for adaptive discovery or multiple comparisons and are not population confidence guarantees for humans.

The harness records every paid purchase, successful answers, errors, bells, death events, clearances and damage. Each cohort records its family, tier, lair level, spawn time, destruction-wave status, delivered roster and first detected contact. Contact captures all living hero classes/levels/health/positions, purchased research, and nearby heroes/monsters. Minute snapshots show progression. Raider peaks, minimum castle fraction and first-death timing are sampled at one-second intervals; they are not continuous extrema. Idle time before the plan finishes includes normal gaps without a pending purchase and is not itself a deadlock metric.

A first contact can be detected by damage or the engine's wave-engaged marker. Living members at that moment can differ from the original roster, including because of summons or casualties. Contact summaries pool encounters and can overrepresent long games. Later time bands also condition on still-running campaigns. They describe what was faced; they are not extra independent campaign observations.

The archived discovery/confirmation logger counted binder-raised boneservants as deferred original wave members. The archived source is preserved for exact replay. The report corrects cohort totals by excluding `boneservant` from cumulative `roster`; original rank is recovered from the recorded lair tier and level, not a summon-influenced histogram. Contact membership intentionally includes summons. The current harness excludes boneservants at spawn. A separate `telemetry-check` dataset and [regression record](glantan-waves/telemetry-regression.json) prove that a campaign with 25 such summons has identical gameplay and other telemetry. Only `roster`, `ranks`, `sent` and `deferredSpawns` differ. Balance selection used outcomes, not those inflated counts.

## Reproduce the evidence

Use Node 22.13 or later and an ordinary Git checkout of this branch. No npm dependencies are needed for these tools. The [manifest](glantan-waves/manifest.json) records file hashes, exact case files and source identity. `source-snapshots.json.gz` stores content-addressed source blobs for all nine gameplay modules, the campaign harness, the candidate module, the VM fixture and its exercise/input dependencies. The replay helper uses the current batch runner with those exact archived sources.

Verify every raw archive, case array and source snapshot:

```sh
node dev/glantan-wave-replay.cjs verify
```

Prepare a new detached worktree with the exact confirmation sources. The destination must not exist. This leaves the current checkout untouched:

```sh
node dev/glantan-wave-replay.cjs prepare confirmation-after ../glantan-replay
cd ../glantan-replay
node dev/glantan-wave-study.cjs --cases replay-cases.json --out replay-output.jsonl --jobs 4
```

From the original checkout, compare all records. Only the outer source label is ignored, because archived working-tree sources do not need a remote commit:

```sh
node dev/glantan-wave-replay.cjs compare confirmation-after ../glantan-replay/replay-output.jsonl
```

Use any dataset ID from the manifest in place of `confirmation-after`. Twelve `parity` cases were actually materialized and reproduced with this procedure; [archive-replay-check.json](glantan-waves/archive-replay-check.json) records the result. Do not run old candidate overrides directly on the final production defaults: doing so can inherit the final no-growth-wave setting and change an exploratory candidate. Use its snapshot.

For a new current-source study, provide a JSON array of `{id, variant, config}`. `variant: "baseline"` means no experimental override; it does not automatically mean the historical original game. For example:

```json
[{"id":"example","variant":"baseline","config":{"seed":"wave-map-2000","pace":"brave","policy":"coordinated","seconds":6,"accuracy":0.95,"jitter":0.25,"limit":1800,"trace":true}}]
```

```sh
node dev/glantan-wave-study.cjs --cases cases.json --out results.jsonl --jobs 4
node dev/glantan-wave-report.cjs results.jsonl
```

The runner checkpoints complete records and fsyncs them. Resuming rejects changed cases, source identity, variant module, duplicate IDs and corrupt partial output. The current runner also rechecks source identity after completion; source files must remain frozen during a batch. A `--ref` pins gameplay modules while using the current harness, so it must not be mistaken for a historical full-tool checkout. The committed snapshot helper avoids that ambiguity.

The reporter groups by source, variant, difficulty, policy, mean interval, accuracy, jitter and deadline. For comparisons across different discovery panels, report each dataset separately even when these fields match. Repeating fixed seeds is a reproducibility check, not a larger independent sample.

## Engineering checks

Run `npm run test:all` for ordinary regressions. The actual campaigns are the relevant opt-in extended balance study; they are not added to everyday tests. The six boss checks (`node dev/glantan-balance.cjs --boss`) and combat runner self-test remain useful when changing combat. The [ten fixed-roster parity pairs](glantan-waves/unit-parity.json) confirm that this wave-only change leaves those unit encounters identical; they are not a rerun of the full earlier unit matrix.

A later calibration should first freeze a new target answer profile and player-policy set, then select new discovery and confirmation seeds. Keep the current confirmation maps as regressions rather than calling them unseen again. Human playtesting should check whether the modeled pacing and purchase/order choices are representative before interpreting these simulated success rates as a player-facing difficulty promise.
