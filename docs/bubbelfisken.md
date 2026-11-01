# Bubbelfisken

An endless swimming game using the selected Skolarkaden exercise. Three question bubbles offer a choice, usually in one column; tight layouts can stagger them. Catching one pops the others; its bubble follows the fish. Answers then arrive sequentially. Catching a correct answer restores **50 percentage points of life** (maximum 100) and moves the pair into the overlapping collection along the bottom. A wrong answer pops the question and every visible answer without stunning the fish.

Life drains per forward metre, independent of steering, agility and collision state. Speed increases continuously with active game time: `starting speed × (1 + elapsed seconds / 150)`. It reaches three times starting speed after five minutes, five times after ten, and continues increasing without a ceiling. Pause time does not count. Levels differ in starting speed, life range and spacing. Correct-answer scheduling considers remaining life and travel distance; accepted synonyms and Chinese translations/readings cannot become false distractors. Small vocabularies can produce multiple correct answers. A missed opportunity or a collision can still end a run.

Mouse: the fish follows the cursor over the play area without clicking. Touch: hold and drag, releasing to stop steering. Keyboard: arrows or WASD. Movement has bounded acceleration; backward (leftward) swimming is 20% faster than forward swimming with both pointer and keyboard controls. Vertical speed is unchanged. The fish faces right; only the collision animation spins it. A collision loses the question and gives two seconds of spinning with steering retained, all collection/collisions disabled and unchanged life consumption. Esc, browser navigation and backgrounding use the shared pause flow.

## Progression and pickups

All distances below are minimum spawn distances in metres, shared by the three difficulty settings. Newly eligible hazards and pickups are introduced before returning to the random hazard pool or rotating pickup pool. A hazard blocked by a question/answer corridor is retried after eight metres; it is not marked as introduced until it actually spawns. Counteracting boosts also wait for their associated object to have spawned.

| Minimum distance | Newly available object | Prerequisite |
| --- | --- | --- |
| 8 m | Yellow bonus balls | — |
| 32 m | Rocks | — |
| 100 m | 25% life refill | — |
| 160 m | Sea urchins | — |
| 240 m | Armor scales | Rocks introduced |
| 320 m | Magnet | Bonus balls introduced |
| 420 m | Predator fish | — |
| 520 m | Growth | Predator fish introduced |
| 680 m | Up/down currents | — |
| 800 m | Agile fins | Currents introduced |
| 960 m | Rock walls | — |
| 1,120 m | Heightened senses | Rock walls introduced |
| 1,320 m | Diving birds | — |
| 1,580 m | Octopuses | — |

Most hazards move left; a few fish approach from behind. Octopuses and expanding ink move left at 30% of reef speed, so the reef, bubbles and fish move through the cloud. Ink fades over 5.2 seconds and covers the HUD as well as the play area. Three cached, faded reef planes scroll at 12%, 30% and 57% of reef speed.

## Level layout

`resources/bubblefish/layout.js` connects short reef sections around a gently changing route: rock banks and arches, urchin slalom, offset wall openings, crossing predator patrols, current channels, bird dives and drifting octopuses. Randomness chooses among these arrangements; it does not independently scatter each obstacle. The route's slope and section spacing reflect the increasing scroll speed and the fish's steering limits.

A bounded space/time search verifies each proposed section against existing hazards. It integrates fish acceleration, horizontal momentum, currents, timed agility/armor expiry and future scrolling. Hazards use the same movement forecast as the live simulation, including predator oscillations, slower octopus drift, approaches from behind and bird turnarounds. Collision checks between time layers catch threats that cross a passage between otherwise safe endpoints. The search reserves enough geometric clearance for the enlarged fish and leaves steering headroom; it does not depend on smashing or eating an obstruction. Unsafe candidates are widened, simplified or deferred.

Question choices, correct answers, pickups and seven-ball trails are placed on reachable routes. Later sections must preserve those routes and keep collectible footprints clear of moving hazards. Wrong answers must leave an escape route and cannot block an already reserved choice. Placement failure retries later instead of accepting a blocked fallback. These checks establish a feasible route from the fish's position at generation time; steering into a dead end or missing the route can still cause a collision.

Uncollected bubbles, balls and pickups have fixed world positions: they scroll with the reef and do not bob or drift vertically. The held question follows the fish, and an active magnet intentionally pulls nearby balls toward it.

Yellow opaque balls award 5 points. A match awards 150 plus a consecutive-match bonus capped at 100; distance awards one point per metre. Eating a fish awards 35 points.

| Pickup | Effect |
| --- | --- |
| Agile fins | Faster movement and acceleration for 8 s |
| Large fish | Enlarged hitbox and animated eating of smaller fish for 8 s |
| Armor scales | Reduced agility, smash rocks and entire wall obstacles for 8 s |
| Magnet | Attract yellow bonus balls only for 8 s |
| Life | Restore 25 percentage points |
| Heightened senses | Blinking directional warnings for approaching threats for 10 s |

Different timed effects coexist. Repeated pickups refresh their duration. Growth/armor expire visibly. Eating and smashing retain the held question and do not stun. Single-item practice never invents an incorrect answer. Correct-answer labels and diagrams use the existing exercise data; Chinese display can switch between pinyin and translations.

## Sound and rendering

The sound module synthesizes and caches local underwater effects through the existing shared AudioContext. It uses quiet watery plips for bubbles/balls, a rising bubble arpeggio for a match, a descending bloop for an incorrect answer, a comic watery tumble for a collision, expanding gulps for growth, scale clinks for armor, cracks and falling rubble for smashing, a wet ink squirt and gentle sonar for danger. Voice limits and per-cue throttling keep repeated collections from becoming loud. Pause/mute/replay dispose or stop sources; no audio downloads or extra AudioContext.

Rendering and audio are separate from the simulation. Scenery is cached; particles, active objects and the achievement pile are bounded. Collision updates use substeps that shorten as speed increases, preventing fast objects from passing through the fish between checks. The step schedule is independent of steering and active boosts. Reduced-motion preference suppresses extra character rotation and background creature animation while keeping movement needed for play.

## Validation and deployment

Run `npm test -- --area=bubblefish --extended` for rules, sound samples, application integration and seeded layout sweeps. Layout tests replay the generated steering routes through the actual simulation, check all three question choices, protect bonus trails from later hazards, and cover portrait/landscape screens, moving threats, expiring boosts and very high speeds. The area also selects homework and score-HUD coverage. `node tests/server/game-scores.test.cjs` checks the new score type against the Worker. Use `dev/bubblefish-fixture.html` → **Bygg bana** to inspect generated sections. For deployment regenerate hashes with `npm run assets` and the Worker with `node cloudflare/build.cjs`.

The deployed score Worker must include the new `bubblefish` game and click-input whitelist; deploy the generated `cloudflare/worker.mjs` along with the frontend. Existing games retain their score versions. No database migration is required.
