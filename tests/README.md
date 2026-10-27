# Tests

Run tests with Node 22.13 or later. Everything uses the Node standard library;
there is no installation step or external test framework.

## Everyday commands

| Command | Scope |
| --- | --- |
| `npm test` | Tests affected by committed branch changes, staged edits, unstaged edits and untracked files |
| `npm test -- --list` | Explain that selection without running anything |
| `npm test -- --base=REF` | Use the merge base with a different branch or commit |
| `npm test -- --area=paint` | Paint tests and Paint's cases in shared game integration suites |
| `node tests/games/paint/logic.test.cjs` | One specific test file |
| `npm run test:all` | Every ordinary test, regardless of the current diff |
| `npm test -- --area=paint --extended` | Paint's ordinary checks plus its full layout sweep |
| `npm test -- --extended` | Affected ordinary and extended tests |
| `npm run test:extended` | Every ordinary and extended test |

Use the affected selection while editing and `test:all` before merging. Include
the relevant extended tests when changing layout algorithms, spawning, game
balance or AI. Run the complete extended set for a release or broad shared-game
change. If CI is added, use `test:all` as the merge check; default `npm test` may
correctly select nothing on a clean main checkout. `--area` is a focused manual
selection, not a replacement for checking dependencies of the actual diff.

`--help` lists areas and options. Tests run serially, report individual timings,
and fail the command on an assertion, crash or 120-second per-suite timeout.

## Ownership and selection

| Location | Responsibility |
| --- | --- |
| `games/<game>/*.test.cjs` | One game's rules, renderer, scoring or app integration |
| `shared/*.test.cjs` | Input, language dictionaries, speech, characters, plants and sounds |
| `app/*.test.cjs` | Menu, startup, homework, score HUD, navigation and other application boundaries |
| `app/contracts/*.cjs` | Game-specific uses of shared input, labels and dictionaries; invoked by `game-contracts.test.cjs` |
| `server/*.test.cjs` | Worker, SQLite, score versions, migrations, statistics and artwork retention/deletion |
| `extended/*.test.cjs` | Large deterministic seed, viewport and full-game sweeps |
| `helpers/` | Fixtures and shared sweep implementations; not independently discovered as tests |
| `runner/selection.test.cjs` | Dependency selection, CLI validation and real Git history cases |

`manifest.cjs` is the dependency map. Register every new `*.test.cjs` there with
its owning areas and the production files that can affect its assertions.
Discovery rejects unregistered tests and missing files instead of silently
skipping them. List fixture dependencies too: changing a fixture must select
every suite that uses it. A source ending in `/` matches that entire directory.

Dependencies describe the behavior under test, not every script a VM happens
to load. For example, app fixtures load the real HTML script order, but a change
to Paint does not rerun Chess rules. Conversely, `game.js` supplies shared
behavior as well as City, and Chess consumes answer-selection helpers from
`reversi.js`; those changes correctly select more than one game.

Parameterized game integration suites receive only the affected game IDs from
the runner. With `--all` or direct invocation they check all their games.

| Changed file | Ordinary selection |
| --- | --- |
| `resources/klossar-speech.js` | Klossar pronunciation, Klossar app integration and asset validation (3 suites) |
| `resources/paint.js` | Paint logic, Paint cases in game contracts/launch/homework/score HUD, and asset validation (6 suites) |
| `resources/sounds.js` | Three sound suites and asset validation (4 suites) |
| `tests/games/paint/logic.test.cjs` | That test alone |
| Shared data/input/game code | All dependent games and shared tests |
| An unknown code file or test infrastructure | All ordinary suites; extended too when requested |
| Documentation only | No tests |

The default comparison uses `origin/main`, falling back to local `main`. Without
either reference it runs the full ordinary set. An explicitly invalid `--base`
fails. Renamed and deleted paths participate in selection. Changes to only an
extended test do not run it unless `--extended` is supplied.

Resource changes include the asset/version check. HTML whose only change is
generated `?v=` hashes adds no unrelated UI suites; actual markup changes do.
Branch base, HEAD, index and working copy are checked so a staged markup change
cannot be hidden by another edit. Unknown JavaScript or CSS falls back to the
full set. Static images/audio/fonts still trigger asset validation and any
explicitly registered consumers.

## What was reduced

The original 63 scripts took about 111 seconds in the audit environment. Their
count was not the useful cost metric: 44 finished in under a second. The larger
costs were repeated app simulations and broad seed/viewport matrices.

- Language-data fallback checks now use compact startup cases, instead of
  launching the entire dinosaur UI suite three extra times.
- Mixed catch-all scripts were separated by owner. Shared dictionary and
  keyboard-generation checks no longer rerun just because a game changed.
- Repeated 10,000-draw character distribution checks became one shared,
  deterministic category-boundary test. Game-specific rare-character scoring
  and behavior checks remain.
- Chess and Klossar server score contracts share one parameterized suite.
- Historical source-text checks were removed where current behavior is covered;
  translation language selection is checked through the actual app.

The ordinary set has 78 smaller suites and took about 49 seconds in the same
environment. More files make ownership and selection narrower; they do not
mean every edit runs more tests. The focused Paint command passed in about
3.4 seconds; the seven extended suites together took about 47 seconds.
These timings are indicative, not budgets.

| Extended sweep | Ordinary coverage retained |
| --- | --- |
| Paint and Dinosaur label matrices | Narrow/desktop representative layouts, bounds and overlap checks |
| Home and Beehive full-round matrices | Representative complete rounds plus targeted pause, queue and end-state regressions |
| Reversi full AI matches | Rules/search, forced passes, ties, final scores and short endgames at every difficulty |
| Klossar large deal/round matrices | Representative deals and complete rounds, plus layouts, speech, Chinese labels and deadlock regressions |
| Garden statistical balance matrix | Fixed balance invariants and complete correct-answer rounds |

Extended sweeps keep their original broad deterministic coverage. Repeated
layout and full-round wrappers share sweep implementations with different sample
sizes; Garden retains its statistical balance matrix separately from fixed
balance invariants. Artwork deletion/retention, authorization, migrations, score retries and
versions, speech corrections and game-end regressions remain ordinary tests.

DOM/canvas substitutes exercise behavior and geometry, not native browser
layout. CSS changes still need a focused browser check. Historical entries in
`AUDIT.md` retain the test paths and counts that applied when they were written.
