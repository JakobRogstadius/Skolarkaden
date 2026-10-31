# Klockgläntan — expanded kingdoms

Release changelog, 2026-10-29.

## Opening and world

- Start with only the castle and one house. Build the first guilds and recruit the first heroes yourself.
- Increase both map dimensions by the requested percentage:

| Difficulty | Increase per dimension | Width × height | Boss party guideline |
| --- | --- | --- | --- |
| Easy | +100% (2×) | 72 × 56 tiles | About 10 combined hero levels |
| Medium | +150% (2.5×) | 90 × 70 tiles | About 20 combined hero levels |
| Hard | +200% (3×) | 108 × 84 tiles | About 30 combined hero levels |

- Add blocking rivers, lakes, mountain ridges and dense forests, with bridges and passes connecting the regions.
- Give the empty village time to establish its first guild: the first lair awakens after 120/105/90 seconds on easy/medium/hard.

## Monsters and heroes

- Every lair starts with two defenders that roam around it. Awakening starts separate waves of monsters marching toward the village.
- Each map contains one boss lair with powerful guardians. A level-one hero is in serious danger but can escape; the party guidelines assume healthy heroes with a front line and healing support.
- Communicate danger through monster size, armour, rank marks, guardian crowns and a distinctive boss lair.
- Keep heroes apart and give idle guards patrol routes. Gathering and defending heroes also move between useful positions.
- Fix expedition leaders waiting for companions ahead of them, crowds stuck at shared path waypoints, distant raiders triggering village guards too early, and scouts missing small remaining fog pockets.
- Reveal a lair when its home guardian is spotted, so a retreating scout can still identify the danger.
- Make movement, attacks and healing respect blocked terrain and prevent buildings from sealing the last passage.

## Presentation and sound

- Move the action panel to the left and align it with the answer area. Keep questions and input usable on phone-sized and keyboard-constrained layouts.
- Draw water in distinct blue, with recessed banks and ripples; give mountains and dense forest clear obstacle silhouettes.
- Add 21 original layered sound effects for construction, recruitment, combat, healing, research, warnings, the bell and game outcomes.
- Mix combat by distance and direction, limit simultaneous voices, prioritize exercise feedback and warnings, and reduce sound during voice input.
- Stop sounds reliably on mute, pause, backgrounding and exit; exclude pending sounds from saved games.
- Cache navigation, terrain and fog work for the larger maps. The scouting search chose identical destinations in 96 comparisons while running about 10× faster.

## Saves, review and verification

- Use a separate save schema for expanded kingdoms. Earlier saved games are retained separately; the leaderboard score version is unchanged.
- Complete independent reviews by agents acting as master game designer, visual designer, sound engineer and software engineer, and address their actionable findings.
- Check 90 seeded maps, seven game test domains, shared app integration and desktop/mobile layouts.
- Complete paid-answer campaigns on all three difficulties with no hero deaths and full castle health. Controlled mixed parties defeat bosses at the guideline levels without casualties; half-strength parties retreat.
- Integrate the new checks with the repository's selective test runner and moved test files. All 92 ordinary suites pass after synchronization with current `main`.

See [review evidence and limitations](glantan-review.md), including reproducible balance commands and screenshots. Speaker/headphone audition and physical touch-keyboard testing were not part of the checks.

## Background music — 2026-10-31

- Add an original, quiet woodland theme for soft strings and harp, with a seamless 40-second stereo loop and a gentle fade-in.
- Keep music below exercise feedback; use the existing sound toggle and speech ducking. Pause, backgrounding and game outcomes stop the music, while resume continues the phrase.
- Render locally and cache one music buffer per shared AudioContext, with no downloads, extra playback timers or changes to game balance and saves.

## Visual clarity — 2026-10-31

- Give the nine buildings distinct silhouettes and functional equipment: a fortified shield gatehouse, archery target, herb clinic, violet tuning-fork tower, mounted crossbow, sun lantern and domed bell-tree glasshouse.
- Differentiate all four heroes with stronger outlines and equipment. Healers wear white bonnets and aprons with green medical crosses and carry medicine bags; mages wear pointed violet hats and carry luminous tuning-fork staffs.
- Match guild and hero colours in the action buttons. Use the same healing symbol on the clinic, healer equipment and recruitment controls.
- Increase terrain, architecture and control contrast while retaining the woodland palette; reduce the dark edge vignette.
- Mark every enemy in red on the minimap, distinguish dormant/awake lairs with red shades, and retain the larger boss-lair diamond. Keep tall building and hero silhouettes selectable and hero labels clear of hats.

Validation: all 92 ordinary suites pass. Browser checks cover the complete visual roster at desktop and 390×844 layouts, hero controls and selection on the mage's hat. [Artwork overview](klockglantan-visual-clarity-1793433554156.jpg) shows all building and hero types together in the development-only review scene.

## Combat roles and necromancy — 2026-10-31

- Add **Skelettmästare**, recruited at the new **Benvalv**. Killed monsters leave visible, inspectable bone piles. Each master raises up to two skeletons at the source monster's level; summons follow, fight, retreat with their master and use no housing. Their master's weak area attack heals only that master and its own skeletons.
- Give warriors an exclusive choice between **Fanbärare** (+25% nearby group damage) and **Sköldvänner** (nearby group protection). Banners and warm cloaks distinguish the offensive path; broad blue shields and armour distinguish the defensive path.
- Give rangers an exclusive choice between **Törnpilar** (+40% arrow damage and greater range) and **Fällor**. Longbows and prominent quivers distinguish archers; nets, trap gear and brown equipment distinguish trappers.
- Trappers walk out to lay at most four traps each, 30–70% along an explored route between village and lair. Each trap catches one ground monster, deals `14 + 6 × ranger level at placement` damage and immobilizes it for 2.8 seconds (1.2 for boss guards). Surviving traps are collected after their lair falls.
- Replace faint magic bolts with layered cast runes, bright trails, impact rings and sparks, with separate colours for friendly magic, healing, soul magic and enemy spells. Reduced-motion rendering retains clear static attack links and impacts.
- Win immediately when **Tystnadens hjärta**, the boss lair, is destroyed. Other nests and surviving monsters no longer require cleanup. The HUD, help and boss inspection explain the objective.
- Select three of five enemy families per map. Eleven monster types, including boss guardians, have distinct silhouettes, level badges and inspectable role descriptions. Flyers cross obstacles and require arrows, magic or towers; warriors, skeletons and ground traps cannot hit them.
- Upgraded lairs immediately release mixed waves: melee + healer, mushrooms + brood-spawning giant, ranged magic + immobilizer, flying attacks + siege creature, or ranged thorns + armoured escort. Charging, kiting, healing, rooting, building attacks and bounded brood growth give the families different tactics.
- Give stronger mixed waves time to regroup between attacks. Enemy roots leave a short movement window so multiple binders cannot hold one hero forever.
- Preserve existing version-two saves and in-progress exercise purchases. Former hammer and scouting branches migrate to Fanbärare and Fällor without losing the held question or partial payment.

Validation: 93 ordinary test suites; 90 deterministic maps; focused ownership, life-drain, trap, flight, support-role and victory checks; controlled boss parties at 10/20/30 combined levels. Browser checks cover both branch appearances, active combat, skeleton inspection, and a complete three-answer necromancer recruitment at 390×844.

Final paid-answer campaign probes (seeds 0–2, one correct answer per 10 seconds):

| Army / difficulty | Wins | Duration | Fallen heroes |
| --- | ---: | --- | ---: |
| Necromancer + trapper, easy | 3/3 | 15:34–18:55 | 0 |
| Standard mixed army, medium | 3/3 | 17:00–20:26 | 0–3 |
| Larger mixed army + beacon, hard | 3/3 | 26:01–37:02 | 1–15 |

These are deterministic automated strategies, not universal completion times. Hard maps can require resurrection and rebuilding. Reproduce with `node dev/glantan-balance.cjs steady 10 0 1 2`, `node dev/glantan-balance.cjs brave 10 0 1 2`, or `GLANTAN_SPECIALISTS=1 node dev/glantan-balance.cjs gentle 10 0 1 2`.

![Necromancer, branching heroes, mixed monsters and visible magic](klockglantan-combat-1793437747961.jpg)
