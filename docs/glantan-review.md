# Klockgläntan: design review and release checks

Reviewed on 2026-10-28 by an independent game-design AI agent, followed by fixes
and a second simulation review. The reviewer inspected the implemented modules
and exercised the real exercise adapter; browser verification was performed separately.

## Findings incorporated

| Finding | Implemented response |
| --- | --- |
| The starter trio won 90/90 runs with only 6–10 cheap answers. | Outer lairs have stronger structures and mixed garrisons that awaken immediately when attacked. Heroes account for those defenders before volunteering. |
| Idle defenders missed attackers on the opposite side of the castle. | Shared village alarms prioritize castle attackers; guards also notice attacks on nearby buildings. |
| Upgrading a marching bounty attracted no reinforcements. | Marching groups accept volunteers, regroup after serious losses or stalled attacks, and explain insufficient strength. |
| A monster entering a plot erased a 7/8 payment. | Temporary obstruction preserves both partial and completed payment, including across reloads. Construction completes once the plot clears. |
| Tower farming produced unlimited score and excessive passive XP. | Kill/XP score contributions are capped. Weak enemies stop teaching veterans; uninvolved tower spectators earn reduced XP, and healing practice has a progression budget. |
| Switching/cancelling actions rerolled difficult questions for free. | An unanswered question survives intent changes. Payment progress still resets. |
| Incremental bounty upgrades charged the entire new reward again. | Upgrades charge only the increase. |

## Balance evidence

The second review found no deadlock in the tested mixed-army runs. Starter-only,
level-one-bounty strategies won 0/30 revised runs. Mixed armies won all ten seeds
at each difficulty, without an eight-answer investment. Gentle was intentionally
forgiving after recruitment; difficult runs sometimes needed resurrection.

The final, checked-in `dev/glantan-balance.cjs` independently reproduces complete
runs through paid answers. Its army has three warriors, two rangers, two healers,
one mage, housing, both missing guilds, armor and boots. Seeds 0–2:

| Difficulty | Seconds per answer | Wins | Correct answers | Run duration |
| --- | ---: | ---: | ---: | --- |
| Gentle | 10 | 3/3 | 35–37 | 7:33–7:43 |
| Gentle | 20 | 3/3 | 34–36 | 13:24–13:56 |
| Brave | 10 | 3/3 | 41–43 | 9:10–10:12 |

All nine runs needed a maximum purchase streak of four. The reviewer separately
tested ten gentle runs at 80% answer success: all finished in 42–64 attempts
before the final bounty-cost reduction. These are automated balance probes,
not a claim that every human strategy or exercise will take the same time.

## Verification

- World tests cover 90 generated maps, reachability and permanent exploration.
- Purchase tests cover capacity, veteran resurrection, permanent branch choices,
  unique investments, placement and incremental bounties.
- Adapter tests cover every exercise family, wrong answers, intent changes,
  question retention, temporary obstruction, realtime, pause and save compatibility.
- Simulation tests cover awakened defenses, village alarms, reinforcements,
  support XP, bounded spreading, final-monster cleanup and castle defeat.
- Shared app tests cover typed purchase delivery, input lifecycle, pause/resume,
  result screens, same-map replay, score version and Worker acceptance.
- The existing 68-suite regression run passed after extending its DOM fixture
  for the new renderer and rerunning the affected suite.
- Browser checks cover house placement/payment, a broken streak, recruitment,
  research unlocks, paid bounties, diagram readability, reload, desktop, 390×844
  portrait and a 390×480 constrained viewport. Controlled development fixtures
  verify victory, defeat and replay without sending synthetic scores online.

## Running only relevant checks

`node tests/glantan/run.cjs world orders adapter simulation` accepts any subset
of those four domains. `node tests/homework-ui.cjs` checks shared app integration;
`node tests/highscores.cjs` checks the score service and upload-failure replay.
Run `node dev/glantan-balance.cjs gentle 10 0 1 2` after balance/AI changes.
Run `node dev/version-assets.cjs` after changing browser assets.

The GitHub Pages game is independent of the separately deployed Cloudflare
score worker. Its updated generated source is included; no SQL migration is
required. Until that Worker is deployed, the new leaderboard reports its
unavailability and replay still works.
