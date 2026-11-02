# Klockgläntan: hard-mode wave calibration

2026-11-02. Comparison baseline: `f2c03de332401a62194ba4a6ea64ca88c570dca4`, after the completed unit-balance changes. This study calibrates actual campaigns, including recruitment, housing, research, expedition orders, travel, resurrection and answer errors. It does not give the player a free, fully upgraded army.

The retained hard-mode schedule sends **larger mixed cohorts every 150 seconds per living lair**, and upgrades strengthen the next scheduled cohort instead of launching an extra one. On 18 fresh maps, eight rangers go from **17 victories to 8**. A mixed twelve-hero strategy with village defenders and paid expedition upgrades wins **14**, against **6** for the same recruitment/research plan using small expeditions. All frozen acceptance targets pass. These are conditional scripted-policy results, not measured human win probabilities.

[Protocol and replay instructions](glantan-waves-protocol.md), [frozen confirmation plan](glantan-waves/confirmation-plan.json), [full outcomes](glantan-waves/manifest.json), [summaries](glantan-waves/confirmation-summary.json), and [family/paired analysis](glantan-waves/final-analysis.json).

## What was wrong with the old campaign pressure

The suspicion about encounter size was supported. The old spawn formula releases only **2–8 bodies**. In the fresh-map baseline, the median cohort released in eight-ranger campaigns was only two bodies; for the coordinated mixed policy it was three. Successful cheap armies often removed lairs before advanced units appeared. Large equal-budget combat assays establish conditional matchups and partnerships, but do not establish the difficulty of those much smaller campaign encounters.

Increasing frequency alone disproportionately punished the more expensive mixed armies while cheap rangers still cleared sources early. The useful change was coherent groups, including escorts, with a longer recovery interval. Growth-triggered waves also defeated the intended recovery interval: a regular wave and an upgrade wave could arrive only seconds apart. Removing that extra trigger on hard makes the lair's displayed attack timer a useful planning aid. Other living lairs can still attack in between, and destroying an ordinary lair still releases its final wave.

## Retained wave rules

Only hard (`brave`) changes mechanically. Easy and medium retain the previous rosters, timing and growth-triggered waves. There is no scaling to the player's current army and no hidden adjustment after losses.

| Rule | Previous hard | Retained hard |
| --- | --- | --- |
| First awakening | 90 seconds | 90 seconds |
| Gap between lair awakenings | 78 seconds | 78 seconds |
| Regular interval per lair | About 65–79 seconds, depending on level | 150 seconds |
| Growth interval | Family base 175–205 seconds × 0.9 | Unchanged |
| Growth effect | Increase level and immediately launch a wave | Increase level; keep the next scheduled attack time |
| Ordinary lair destruction | Release final wave; queue overflow at the raider cap | Same rule, with the new roster |
| Initial cohort size | 2–8 | 2–13, depending on family and rank |
| Monster rank and strength | Rank = tier + lair level − 1; strength = 1 + 0.22(tier−1) + 0.20(level−1) | Unchanged |

The 150-second interval is **per source, not global**. Multiple sources can overlap. The existing 64-raider cap still applies; regular overflow is dropped, and final-wave overflow is retried. Summons can enlarge an engaged group. Boss destruction still ends the game immediately, including when another lair has a pending final-wave tail. Guardians, unit skills, combat statistics, hero prices and XP rules were not changed in this follow-up.

The roster columns use rank 1–6, which corresponds to `tier + level − 1`. Rank is not a separate new stat multiplier. In particular, two tier/level combinations at the same rank retain their existing slightly different strength factors.

| Family and unit | Rank 1 | Rank 2 | Rank 3 | Rank 4 | Rank 5 | Rank 6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Rust: rattler | 4 | 6 | 8 | 10 | 11 | 11 |
| Rust: mender | 0 | 1 | 1 | 2 | 2 | 2 |
| Spore: sporeling | 4 | 6 | 6 | 7 | 8 | 8 |
| Spore: broodcap | 0 | 0 | 1 | 2 | 2 | 2 |
| Spore: husher | 0 | 1 | 2 | 2 | 2 | 3 |
| Hush: husher | 2 | 4 | 5 | 6 | 7 | 8 |
| Hush: bulwark | 0 | 1 | 1 | 1 | 1 | 1 |
| Hush: binder | 0 | 0 | 0 | 0 | 1 | 1 |
| Sky: nightwing | 3 | 5 | 7 | 9 | 9 | 10 |
| Sky: mender | 0 | 1 | 1 | 1 | 2 | 2 |
| Sky: siegebreaker | 0 | 0 | 0 | 1 | 1 | 1 |
| Thorn: thornling | 2 | 4 | 6 | 8 | 9 | 10 |
| Thorn: bulwark | 0 | 1 | 1 | 1 | 1 | 2 |

This brings the previously tested partnerships into the campaign: healers behind rattlers, hushers with the brood family, protected ranged troops, and healing escorts for later siege. Thirteen bodies fit within the existing three-column formation's rally radius. A regression sends that largest cohort through a river passage without changing movement AI. The lair panel now shows all roster components, including three-species waves.

## Armies actually available at contact

The main calibration assumes a mean **six seconds per answer, 95% correctness and ±25% timing variation**, with errors resetting the real purchase streak. It is an explicit target scenario, not an observation of how quickly people play. The agent pays for every action and earns all levels through the game.

For the coordinated mixed policy, the observed medians at a wave's first detected contact were:

| Game time | Contacts | Living heroes in world | Heroes within 10 tiles | Hero level | Purchased upgrades | Living members of that wave |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0–3 minutes | 34 | 3 | 2 | 1 | 0 | 4 |
| 3–6 minutes | 80 | 7 | 4 | 3 | 0 | 5 |
| 6–9 minutes | 102 | 12 | 3 | 3 | 2 | 6 |
| 9–12 minutes | 150 | 12 | 4 | 4 | 7 | 8 |
| 12–15 minutes | 148 | 12 | 4 | 5 | 7 | 9 |
| 15–18 minutes | 110 | 12 | 5 | 6 | 7 | 11 |

These pool observed contacts, including destruction waves, rather than independent samples. Contacts can follow casualties, movement or summons; the last column is not the initial roster size. Later periods include only campaigns still running. The full data retain every hero's class, level, health and position, upgrades, nearby units, original cohort rank and damage. Missing contact telemetry is not proof that a wave never fought.

The ranger policy develops earlier: its median contact in minutes 3–6 has eight heroes, four upgrades and hero level three. The coordinated policy has seven heroes and no upgrades at that stage. Calibrating against the final army from the start would therefore obscure the real acquisition disadvantage of mixed forces.

## Fresh-map confirmation

The candidate and acceptance targets were frozen before testing these maps. Each primary policy receives the same 18 maps: three maps from each of the six possible family combinations. Map selection used family membership, not outcomes. The answer-error and timing stream is also paired by map. Campaigns stop at victory, castle loss or 30 minutes; deadline timeouts remain a separate outcome.

| Strategy | Composition and orders | Previous win/loss/timeout | Retained win/loss/timeout | Retained victory rate, nominal 95% interval |
| --- | --- | --- | --- | --- |
| Eight rangers | 8 rangers; normal small attack flags | 17 / 0 / 1 | **8 / 10 / 0** | 44%; 25–66% |
| Mixed eight, coordinated | 3 warriors, 2 rangers, 2 healers, 1 mage; paid larger expeditions | 5 / 13 / 0 | **4 / 14 / 0** | 22%; 9–45% |
| Mixed twelve, coordinated | 4 warriors, 3 rangers, 3 healers, 2 mages; tower, village defense flag, paid larger expeditions | 13 / 4 / 1 | **14 / 3 / 1** | 78%; 55–91% |
| Mixed twelve, small expeditions | Same recruitment/research/tower/defense plan; small attack flags until readiness requests more | 10 / 3 / 5 | **6 / 4 / 8** | 33%; 16–56% |

All eighteen coordinated mixed runs had hero deaths, with a median of **nine death events**, including repeated deaths after resurrection. Eight had some castle damage. Median successful completion took **21.0 minutes**, versus 19.8 previously. Median nominal purchase cost was 123 answer-cost points, and median correct answers actually submitted was 132.5; errors and recovery purchases are included. These are whole-campaign totals, not the initial army's price.

The mixed twelve comparison isolates paying for larger attack flags within the same recruitment, research and village-defense policy. It gives a useful strategic distinction. It does not show that twelve heroes are universally optimal, that every eight-hero mixture fails, or that the mixed policy is a solved optimal strategy. The ranger result shows nine paired maps changing from victory to loss; its previous timeout also becomes a loss. The coordinated policy gains two victories and loses one, with one timeout preserved.

Family results below are **retained wins/losses/timeouts**, three maps per cell:

| Map families, always including rust | Eight rangers | Mixed eight | Coordinated twelve | Small-expedition twelve |
| --- | --- | --- | --- | --- |
| Hush + sky | 2/1/0 | 1/2/0 | 3/0/0 | 1/0/2 |
| Hush + spore | 2/1/0 | 0/3/0 | 2/1/0 | 0/2/1 |
| Hush + thorn | 0/3/0 | 0/3/0 | 3/0/0 | 1/1/1 |
| Sky + spore | 2/1/0 | 1/2/0 | 3/0/0 | 1/0/2 |
| Sky + thorn | 0/3/0 | 1/2/0 | 1/1/1 | 1/1/1 |
| Spore + thorn | 2/1/0 | 1/2/0 | 2/1/0 | 2/0/1 |

Sky + thorn remains the hardest sampled combination for the coordinated policy. Three maps per family cannot establish a precise family-specific win rate. The pointwise Wilson intervals above are descriptive; they are not paired significance tests, simultaneous confidence guarantees or human-population estimates.

## Answer-pace limits

A separate response-profile check reuses one primary confirmation map from each family combination:

| Mean answer interval / correctness | Previous ranger victories | Retained ranger victories | Previous coordinated victories | Retained coordinated victories |
| --- | ---: | ---: | ---: | ---: |
| 3 seconds / 98% | 6/6 | 6/6 | 6/6 | 6/6 |
| 9 seconds / 90% | 1/6 | 0/6 | 0/6 | 0/6 |

Hard is winnable for the tested six-second competent policy and reliably winnable in the fast check. It is **not calibrated to be accessible at nine seconds with 10% errors**. If that is the intended hard-mode audience, the target needs changing and a new wave schedule needs fresh confirmation. Even six wins out of six does not establish universal success. No easy/medium difficulty retuning was inferred from this study.

## Discovery, validation and remaining scope

The archive contains 540 discovery campaign records, 12 exact prototype-to-production parity records and 192 held-out before/after records: **744 campaign records**, plus a separate telemetry regression. Discovery retains the failed candidates: faster small waves, earlier escorts, larger companies with growth-triggered reinforcements, different recovery intervals, and different paid recruitment/expedition policies. The failed warrior/mage/healer assault policies are preserved; controlled pair synergies alone did not make them good campaigns, partly because they lacked ranger scouting.

All five frozen acceptance targets pass: at least half the coordinated runs win with real pressure; two distinct strategies win at least a third of maps; ranger victory rate is below 85%; the fast coordinated policy wins at least five of six; and slower/error-prone play is harder. These thresholds guided candidate selection and are not claims of a globally optimal balance.

Validation: **97/97 ordinary suites**, all six boss-strength checks, the combat-harness self-test, 12/12 exact prototype integration replays, 12/12 exact replays from the archived source bundle, and ten fixed-roster before/after combat pairs with identical results. Added regressions cover easy/medium growth waves, hard scheduled growth, saved final-wave overflow, a thirteen-body river crossing, and accurate three-species previews.

An independent review found that the historical campaign logger included binder-raised boneservants in its cumulative cohort count. Raw records and their exact logger are preserved. The report excludes that distinct summon type from released-cohort totals; actual contact counts still include all living members. The corrected logger reproduces a summon-heavy campaign exactly outside the four affected bookkeeping fields. No balance parameter was changed after confirmation.

The next useful evidence is observed human answer pacing and play choices, especially exploration, recovery and expedition management. This implementation provides a reproducible hard-mode target conditional on those choices; it does not substitute simulated players for human playtesting.
