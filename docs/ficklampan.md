# Ficklampan

Explore a large illustrated world with a flashlight. Pointer position controls
both the beam and the camera; touch uses drag to explore and tap to select.
Select a question and its matching answer to collect them. A selected surface
keeps its own small light and outline until the next choice. Collected pairs
sit along the bottom of the view, with no separate panel.

The five environments rotate without repeating until all have been played:
Nattmuseet, Skogsbyn, Djuphavsstaden, Rymdhangaren and Dinosauriedalen. Each has 32
hand-mapped surfaces. Unused and collected surfaces show their original
illustrations. Light emitters reveal only their small local glow in the dark.
The space hangar uses a technical science-fiction style with a human engineer;
the dinosaur valley contains an imagined naturalists' field station among living
dinosaurs, with illustrated charts, specimen labels and field notebooks.

Easy, medium and hard use 8, 12 and 16 pairs. Each pair gives 25 points. The
completion award decreases smoothly with active play time; loading and pause
time do not count. The reference time is `60 + 13*n + .35*n*n` seconds for `n`
pairs, and the final score is
`round(25*n + (10000 - 25*n)*2/(1 + elapsed/reference))`.
All difficulties earn 10,000 points at their reference time. These references
are provisional estimates and should be calibrated against real play data.
Fullscreen hides the live score and record while retaining progress and controls.

`resources/ficklampan/game.js` owns the rules, exercise pairs and score;
`renderer.js` owns input, lighting, perspective and native browser labels;
`scenes.js` owns surface and light coordinates in a 1536 × 1024 world.
Only the active background is loaded. Dark scenery and ambient emission are
cached, and the scene redraws on input or feedback rather than continuously.
Answer text stays in the DOM at a minimum of 18 CSS pixels; mathematics images
are rendered separately at device resolution. Long exercises enlarge the world
and wrap text instead of making labels unreadable.

The artwork in `resources/ficklampan/images/` was generated with the built-in
image-generation tool. Museum, forest and underwater images use WebP quality 88;
the space hangar and dinosaur field station use quality 90 at 1536 × 1024. The
new asset names prevent browsers from retaining the previous pictures in cache.
See [artwork prompts](ficklampan-artwork.md) for the two redraws.

The space hangar has one continuous floor, a spacecraft under maintenance and a
clear route to the rear pressure door. Answers cover console displays, cabinet
fronts, technical drawings and cargo panels. Small fixtures and indicators
provide ambient light. The dinosaur field station connects an observation hut,
field laboratory and animal-care shelter. Its answer surfaces are the smooth
paper interiors of charts, labels and notebook pages. Frames, pins and edges
remain visible; the original drawings return when a pair is collected. Eight
small lanterns glow in the dark without lighting the surrounding camp.

Run `npm test -- --area=ficklampan` for focused checks and `npm run test:all`
before merging. The Cloudflare score API must use the regenerated
`cloudflare/worker.mjs` to accept `v1:ficklampan` click-input scores; no SQL
migration or score-version change for existing games is needed.
