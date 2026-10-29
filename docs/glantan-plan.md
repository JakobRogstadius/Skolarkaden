# Klockgläntan — implementation plan

## Agreed design

- Continuous realtime simulation, including during exercises. Mouse/touch selects an intention; consecutive correct answers pay for it. Incorrect answers and changing the selected action reset purchase progress. No banked currency.
- Castle destruction loses. Destroy all lairs and remaining monsters to win. Lairs awaken, upgrade and/or spread over time; early pressure is modest.
- Autonomous warrior, ranger, healer and mage classes; experience for supporting and exploring as well as combat. Heroes volunteer for bounties based on incentives and risk and assemble temporary expeditions. Paid resurrection preserves experience.
- Grid building placement; housing supplies population with a hard total ceiling. Some technology choices are mutually exclusive within a run. Eight-answer investments are capped landmarks, elite access or exclusive mastery, never ordinary unlimited production.
- Exploration permanently reveals terrain and enemy activity. Generated finite maps with same-seed replay (implementation choice under the user's delegation).
- Reuse Skolarkaden exercises, typed/voice input, accessibility and game lifecycle. Swedish UI with concise labels, contextual information and minimal persistent prose.
- Modular code, incremental implementation, targeted tests, maintain this plan. Independent master game designer review and a playable published result.

## Theme and scope

Klockgläntan is a small moss-and-brass settlement keeping its bell alive against creatures that hoard sound. Practical, individually named heroes and ringing reclaimed bells give the game character. The existing four roles remain recognisable. Final thematic mechanics follow design review, with one clear central addition rather than many unrelated systems.

## Stages

1. [complete] Read existing integration contracts; establish isolated branch, content model and deterministic world/economy.
2. [complete] Add hero decisions, combat, expeditions, lair development, research, population, resurrection and terminal outcomes.
3. [complete] Add illustrated canvas world, compact responsive controls, shared exercise adapter, map exploration and camera.
4. [complete] Add persistence/replay, coherent sound/feedback, difficulty tuning and shared application/score integration.
5. [complete] Run focused domain/integration checks, browser playthroughs and long simulation checks. Obtain designer review; fix concrete findings.
6. [complete] Verify affected shared behaviour and publish the reviewed playable version. Document any deployment limits truthfully.

## Module ownership

- `resources/glantan/content.js`: balance, buildings, classes, research and enemy definitions.
- `resources/glantan/world.js`: seeded maps, navigation, exploration and geometric helpers.
- `resources/glantan/engine.js`: world state and simulation orchestration.
- `resources/glantan/orders.js`: validated purchases, capacity and progression rules.
- `resources/glantan/heroes.js`, `monsters.js`: independent actor systems.
- `resources/glantan/game.js`: exercise/lifecycle adapter and persistence.
- `resources/glantan/art.js`, `renderer.js`, `interface.js`, `styles.css`: presentation, camera and interaction.

## Verification ownership

Tests under `tests/glantan/` run independently: world/navigation, purchases/progression, simulation/AI and exercise adapter. Run only domains affected by each step. At final integration run shared game-launch, input, viewport and score policy tests affected by registration. Browser verification covers mouse/touch layouts, selecting an intent, correct/incorrect answer streaks, realtime activity, construction, recruitment, research and replay.

## Progress / review

- Working from current upstream `main` at `210f847` in a separate checkout/branch; existing user checkouts untouched.
- Existing hosting: GitHub Pages, with a separately deployed Cloudflare score worker. Gameplay is static and can be published independently of worker deployment.
- Master game designer agent commissioned for early critique and a second review of the built game.

- Foundation verification passed: 90 seeded maps with reachable lairs; population/resurrection/unique research rules; exercise streak reset, continuous time, bell, pause and save/load.
- First real-browser playthrough reaches recruitment and renders the map successfully. Correcting shell layout so the answer field stays visible, and improving terrain/fog readability.
- Designer concept feedback adopted: cheap recovery, optional eight-answer purchases, bell charges earned across broken streaks, finite spreading and automatic final cleanup. A second reviewer is auditing the implemented simulation.

- Desktop browser verification: housing built from two consecutive answers, incorrect answer resets the streak, four-answer research unlocks exclusive branches, attack bounty created. Replaced timed DOM rebuilds with live status bindings to preserve taps/focus.
- Save compatibility includes exercise content, so changing a homework assignment cannot resume the previous exercise. All exercise families pass the shared-answer adapter check.
- Score farming is bounded. New-game replay/menu remains available if the separately hosted score service is offline or awaiting deployment.

- Implemented and regression-tested all six findings from the actual-build designer review. Second review confirms viable mixed-army wins, no reproduced expedition deadlocks, and optional eight-answer investments. See [review and measurements](glantan-review.md).
- Final balance probe is independently runnable in `dev/glantan-balance.cjs`; nine full paid-answer runs passed across easy/slow and hard play. Shared 68-suite verification passed after updating the new-renderer DOM fixture and rerunning its affected suite.
- Browser verified desktop, phone portrait, constrained keyboard-sized viewport, diagram tasks, victory/defeat and same-map replay. Developer fixtures never submit synthetic scores.
- Published through PR #10, merged as `74570b0ac492415c528af92ad7b29a55c0cf6d81`. GitHub Pages run `40780621721` completed successfully. The public game was launched and verified with a paid recruit and partial research purchase.
- Cloudflare leaderboard source is prepared separately; its deployment remains outstanding. The live leaderboard reports that it is not ready for this game; gameplay, local saves and replay work independently.

## Follow-up playability pass — 2026-10-29

1. [complete] Verify current release and deployment access. GitHub is current; Cloudflare remains an account-owner deployment with the existing DB binding.
2. [complete] Let an unfinished campaign restart from pause, on the same or a new map. Preserve save/resume exercise progress and provide a safe cancellation path. New campaigns save immediately; the overall answer streak survives reload.
3. [complete] Designer found two reproducible autonomy bugs: assigned village guards ignored castle alarms; released expeditions stopped defending themselves after a lair fell. Both have targeted fixes and regression tests. The reviewer independently reran both reproductions and checked that the changes do not trigger unsolicited distant attacks.
4. [in progress] Adapter, simulation, shared app, static references and leaderboard navigation checks pass. Seven paid-answer campaign probes finish successfully. Browser verified both restart choices, cancellation preserving a 1/4 payment, and Escape/focus/layout at 390×480. Publication is the remaining step.
