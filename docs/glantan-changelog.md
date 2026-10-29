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
