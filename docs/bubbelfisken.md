# Bubbelfisken

An endless swimming game using the selected Skolarkaden exercise. Three question bubbles arrive together. Catching one pops the others; its bubble follows the fish. Answers then arrive sequentially. Catching a correct answer restores **50 percentage points of life** (maximum 100) and moves the pair into the overlapping collection along the bottom. A wrong answer pops the question and every visible answer without stunning the fish.

Life drains per forward metre, independent of steering, agility and collision state. Starting speed gradually rises towards a ceiling. Levels differ in initial/final speed, life range and spacing. Correct-answer scheduling considers remaining life and travel distance; accepted synonyms and Chinese translations/readings cannot become false distractors. Small vocabularies can produce multiple correct answers. A missed opportunity or a collision can still end a run.

Mouse/touch: hold and drag to set a target, with bounded acceleration and movement speed. Keyboard: arrows or WASD. The fish faces right; only the collision animation spins it. A collision loses the question and gives two seconds of spinning with steering retained, all collection/collisions disabled and unchanged life consumption. Esc, browser navigation and backgrounding use the shared pause flow.

## Progression and pickups

Rocks → sea urchins → moving predator fish → up/down currents → rock walls → diving birds → octopuses. Most hazards move left; a few fish approach from behind. Octopuses and expanding ink move left at 30% of reef speed, so the reef, bubbles and fish move through the cloud. Ink fades over 5.2 seconds and covers the HUD as well as the play area. Three cached, faded reef planes scroll at 12%, 30% and 57% of reef speed.

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

Rendering and audio are separate from the simulation. Scenery is cached; particles, active objects and the achievement pile are bounded. Collision updates use substeps. Reduced-motion preference suppresses extra character rotation and background creature animation while keeping movement needed for play.

## Validation and deployment

Run `npm test -- --area=bubblefish` for rules, sound samples and application integration. The area also selects homework and score-HUD coverage. `node tests/server/game-scores.test.cjs` checks the new score type against the Worker. For deployment regenerate hashes with `npm run assets` and the Worker with `node cloudflare/build.cjs`.

The deployed score Worker must include the new `bubblefish` game and click-input whitelist; deploy the generated `cloudflare/worker.mjs` along with the frontend. Existing games retain their score versions. No database migration is required.
