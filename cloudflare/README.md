# Skolarkaden highscores

The frontend calls `https://skolarkaden-api.jakob-rogstadius.workers.dev`.
The website remains on GitHub Pages. No API token belongs in the frontend.

## Update the existing installation

### Indexed score dimensions

Run [add-score-dimensions.sql](add-score-dimensions.sql) in **D1 → skolarkaden →
Console**, then deploy the complete generated [worker.mjs](worker.mjs) to
**skolarkaden-api**, keeping the **DB** binding. Updating GitHub alone does not
deploy the Worker. `/health` must return `ok: true` and `score_dimensions: 1`.
An installation already using `settings_json` needs only this new SQL file.

The migration adds `game_version`, `game`, `exercise` and `difficulty` as
[D1 generated columns](https://developers.cloudflare.com/d1/reference/generated-columns/)
derived from `leaderboard_key`. For example, `v2:city:swedish:gentle` produces
`v2`, `city`, `swedish`, `gentle`. They immediately work for every existing
four-part key, including older game versions and records with no settings JSON.
There is no separate backfill UPDATE, and missing historical input/settings
information remains unknown. Do not insert or update the generated columns
directly; change `leaderboard_key` to correct a game's settings.

`idx_highscores_game` stores the derived game/version values followed by score,
timestamp and submission ID in leaderboard order. Exercise and difficulty are
also included for filtering current exercises directly from the index. The Worker
now reads one game/version range for combined boards and uses the dimensions for
popularity queries. The old index remains usable by the previous Worker, so SQL
can be applied before deployment while submissions continue. Database indexes
and generated values also follow manual score edits, deletions and the maths-ID
migration automatically.

Each ALTER is a one-time statement. Inspect `PRAGMA table_xinfo(highscores)`
before running the file; `table_info` omits generated columns. If a run was
interrupted, skip the ALTERs for columns already present, then run the remaining
statements in order. The index creation and `PRAGMA optimize` can be repeated.
The final checks list the columns/indexes and report the count of keys that do
not have four non-empty parts. Those records are preserved and remain excluded
by the Worker's existing validation; investigate them before changing their keys.

Complete raw submissions remain the source for future play-count summaries,
score-frequency tables and each name's five best candidates per exercise,
game and version. No new tracking fields, summary tables or scheduled jobs are
needed yet: all of these summaries can be rebuilt from the retained records.
Do not store a submission-time percentile, because later scores change it.
Popularity/percentile calculations still run on demand, and exact low placements
still require counting higher results. This preparation improves the common
top-ten read; it does not make every query independent of history size.

### Browsable scoreboards and popularity rankings

Deploy the complete generated [worker.mjs](worker.mjs) to **skolarkaden-api**,
keeping the existing **DB** binding, after the dimension migration above. This
does not change game versions. Previously required migrations below still apply
if they have not been run. Updating GitHub Pages alone does not deploy the Worker.

After deployment, `/health` includes `popularity_boards: 1` and `exercise_ratings: 1`, and these public reads work:

- `/stats?group=games`: all games, ranked by saved play count.
- `/stats?group=exercises`: all current exercises, ranked by saved play count.

Each response contains `group` and `entries` with `id`, `plays`, `player_name`
and `score`. Counts include anonymous results and historical game versions;
closing the browser or abandoning a round does not submit a result and therefore
does not increase a count. Retries of the same submission are counted once.
Game counts include retired exercise IDs, but exercise rankings list only current
IDs (run the mathematics migration below to retain their historical counts).

Game record holders are chosen from current game versions and current exercise
IDs, using the same score/time/submission-ID tie-break as the game leaderboard.
Exercise leaders instead use the relative rating described below; their `score`
is always null and their `rating` is separate from raw game points. Zero-play
games and exercises are included, and tied play counts follow menu order.
No IPs, settings or submission IDs are exposed. Responses can be cached for 60 seconds.

The main-menu dialog opens on the currently selected game. Its buttons and
Left/Right keys cycle through menu-order games, then games-by-plays, then
exercises-by-plays, and wrap to the first game. Browsing does not change the game
selected in the menu. The end-of-game dialog and score submission are unchanged.
Before Worker deployment, the game boards still work and the two new lists show
an explicit server-update message instead of misleading partial counts.

### Relative exercise ratings

After applying the dimension migration above, deploy the updated generated Worker;
the rating rule needs no separate SQL migration or game-version bump. `/stats?group=exercises` reports
`ranking_method: "top-five-game-percentiles-v1"`. Until that version is deployed, the
frontend still shows play counts but hides the old incomparable record holders.

The list stays ordered by exercise popularity. Its **LEDARE** column shows
only the leading name. The winner is calculated from its average of the
**five best percentiles** for that exercise; the average is not displayed:

1. Calculate each saved score's percentile within its **game and current game
   version**, combining **all exercises and difficulty levels, including ANONYM**.
   Every result has equal weight, including the candidate's own results. Use the
   same current exercise IDs as the game leaderboard; migrate old math IDs if needed.
2. Use mid-ranks for tied scores:
   `percentile = 100 × (number of lower scores + 0.5 × number of equal scores) / total scores`.
   The equal-score count includes the result itself. Five identical scores alone
   therefore all have percentile 50, not 100.
3. For each non-anonymous name and exercise, take the **five highest percentiles**
   and calculate their arithmetic mean. They can come from one game or several,
   and from any difficulty. Five results for that same name and exercise are
   required; otherwise the name does not yet qualify. There is no recent-only
   window, shrinkage factor or requirement to play different games.
4. Display one winner: highest mean, then whoever completed their selected best
   five first (timestamp, then submission ID for deterministic same-time ordering).
   Round means to eight decimal places before this tie-break to suppress floating
   point noise. Raw cross-game points never break ties.

Percentiles are recalculated from the saved data when requested, so new scores
can change existing percentiles. More attempts provide more opportunities to
improve the best five. Anonymous results affect comparison pools and popularity,
but can never be an exercise winner. Ordinary game scoreboards remain unchanged.

Each exercise entry has `rating` (0–100, or null); a qualifying winner additionally
has `sample_count: 5`. `player_name` is null when nobody qualifies, and `score` is
always null on the exercise overview. Only one winner is returned or displayed.
Names are not authenticated identities: colliding names are grouped and aliases
are separate. No accounts, IP-based identity or remembered names are introduced.

### Named mathematics IDs

The frontend and database now use named mathematics IDs. Deploy the generated
[worker.mjs](worker.mjs) with the existing **DB** binding; `/health` includes
`named_math_ids: 1`. The Worker accepts only the current exercise IDs.

For an installation that still has old IDs, run
[migrate-math-exercise-ids.sql](migrate-math-exercise-ids.sql) in **D1 → skolarkaden → Console**
before deploying this Worker. An already migrated database needs no further SQL update.

| Previous database ID | New database ID | Current exercise |
| --- | --- | --- |
| `math` | `math-addition` | Matematik 1 (+) |
| `math2` | `math-addition-subtraction` | Matematik 2 (+ och −) |
| — | `math-diagrams` | Matematik 3 (enkla diagram) |
| — | `math-simple-equations` | Matematik 4 (enkla ekvationer) |
| `math3` | `math-large-numbers` | Matematik 5 (10–100) |
| `math4` | `math-multiplication` | Matematik 6 (×) |
| `math5` | `math-multiplication-division` | Matematik 7 (× och ÷) |
| `math6` | `math-equations` | Matematik 8 (ekvationer) |

The migration renames the exercise inside `leaderboard_key` and `settings_json`.
It preserves every row and all other fields, works across old game versions,
and is safe to run repeatedly. Null or malformed settings remain untouched.
Old math IDs are rejected rather than translated, and rankings use the current IDs.
Retries must match the stored leaderboard key, name, score and settings exactly;
the Worker does not rewrite metadata during retries. Local best scores remain
independent of the database migration.

### Existing settings column

The stored score format and four-part leaderboard keys are retained. Home stays
on `v1`. One nullable column stores the settings which were previously omitted:

1. In **D1 → skolarkaden → Console**, inspect `PRAGMA table_info(highscores)`.
   If `settings_json` is absent, run [add-score-settings.sql](add-score-settings.sql)
   once: `ALTER TABLE highscores ADD COLUMN settings_json TEXT;`.
   This preserves every existing score; do not recreate or clear the table.
2. In **Workers & Pages → skolarkaden-api → Edit code**, replace the code with the
   complete generated [worker.mjs](worker.mjs). Keep the existing **DB** binding
   and deploy. Updating GitHub Pages alone does not deploy this Worker.
3. `/health` should include `capabilities` with `combined_boards: true`, `game_boards: true`,
   `submission_lookup: true` and `score_settings: 1`.
   `/scores?leaderboard=v1:home` should return `scores`, `rank` and `saved`.

## Finish the existing dashboard setup

1. Open the existing D1 database **skolarkaden → Console**. Apply
   [add-score-dimensions.sql](add-score-dimensions.sql) first if its columns are
   absent, then run [schema.sql](schema.sql). They preserve existing scores and add the rate-limit
   table and indexes. The `highscores.ip` column has already been added by the owner;
   it does not need to be added again. Apply the existing-installation update above
   if `settings_json` is absent. For older installations without the IP column,
   check `PRAGMA table_info(highscores)` and run `ALTER TABLE highscores ADD COLUMN ip TEXT`
   only if `ip` is absent. `CREATE TABLE IF NOT EXISTS` does not add missing columns.
2. Open **Workers & Pages → skolarkaden-api → Edit code**. Replace all of the health
   test code with the entire contents of [worker.mjs](worker.mjs). This generated
   file includes the name filter and needs no imports or package installation.
3. Keep the existing D1 binding named **DB**, pointing to **skolarkaden**. Deploy.
4. Open `/health`. Expected response:
   It reports `ok: true`, `database: "connected"`, `api: "highscores-v1"` and the
   capabilities listed above. The check includes both tables, `ip`, `settings_json`
   and the four generated score dimensions.
5. Open `/scores?leaderboard=v2:city:swedish:gentle`. Initially this returns an empty
   `scores` array. Reading the URL directly does not create a test score.
6. Merge the accompanying frontend change into `main` and let GitHub Pages publish.
   In Skolarkaden, play a game, optionally enter a nickname in your scoreboard row, then press Enter or choose
   **Spela igen** / **Till menyn** to save. Open **Topplista** in another browser with the same game to confirm the result is shared.

The allowed browser origin is `https://jakobrogstadius.github.io` (no path).
If the website moves to a custom domain, update `ALLOWED_ORIGIN` in
`worker-source.mjs`, rebuild and redeploy. Local file/localhost play remains
available, but that origin cannot submit to the production leaderboard.

## Data and behaviour

- Stored score keys contain exactly **game version : game : exercise : difficulty**, e.g.
  `v2:city:swedish:gentle`. Input mode and language are not separate key components.
  The exercise still distinguishes Swedish, English and Chinese exercises.
  Public leaderboard reads use **game version : game** and combine every stored
  exercise/difficulty key with current exercise IDs for that game version.
  The frontend's four-part GET keys also return this combined board; obsolete
  three-part exercise queries are rejected. Every returned score
  includes `exercise` and `difficulty` (`gentle`, `steady`, or `brave`). Player ranks use the same
  combined set; POST continues to store the difficulty that was actually played.
- Each new row also stores validated `settings_json`: game version, game,
  exercise, difficulty, keyboard/voice mode, selected spoken language, effective
  exercise language, uppercase/lowercase, the actual random letter subset, sound
  setting and reduced-motion setting. These are snapshotted when the round starts.
  Presentation can change later without losing the conditions of the score.
  Existing rows keep their known conditions in the key; previously unrecorded
  settings remain unknown. Optional metadata fields can be null.
- Game versions live in `resources/highscore-policy.js`. Increment the affected
  game's value only when a change is likely to materially affect score comparability; deploy Worker and frontend together.
  Old rows remain stored but the current API only accepts current versions.
- The top 10 completed-game results are sorted by score descending, then submission
  time ascending, then submission ID for deterministic ties. GET accepts optional `score` and `submission` query parameters to return the player’s actual rank and mark their row; submission IDs themselves remain private. Nicknames are not accounts and are not unique; one person may
  have several results. Local best scores continue to work independently.
- The result screen only submits on Enter in the name input or the replay/menu buttons. Closing the browser never schedules an upload. Failed saves leave the screen open for retry.
- Each game has a UUID. Duplicate delivery of the same payload succeeds without
  adding another row; changing the payload under an existing UUID is rejected.
  A timed-out submission can be retried while that result remains open; there is
  no persistent offline upload queue.
- `ip` is taken exclusively from Cloudflare's `CF-Connecting-IP` header. A supplied
  JSON `ip` is ignored. Public queries return nickname, score, timestamp and an `is_player` flag, plus rank metadata.
  IP addresses are retained in score rows for future moderation. Ban enforcement
  itself is not implemented. An IP can represent several people or change over time.
- The shared Swedish/English name filter runs in the browser before POST and in the
  Worker before insertion. Blocked names get the normal success response/UI but no
  score row is created. The filter normalizes accents, case, common leetspeak and
  separators. Longer distinctive terms match substrings; ambiguous short terms use
  token matches to avoid, for example, blocking `Stefan` because of `fan`.
  This is a maintained string filter, not an exhaustive moderation model.
- Every displayed nickname is inserted with `textContent`, never HTML. SQL uses
  bound parameters. Requests are limited to 2 KiB, known board components, integer
  scores from 0 to 1,000,000 and optional nicknames of at most 10 letters/spaces, normalized to uppercase. Empty names become `ANONYM`.
- A D1 counter permits up to 120 valid submission attempts per minute per public
  IP, allowing shared school networks. It is a fixed-window limit across Worker
  instances. Daily IP hashes identify counters; expired counters are removed on
  subsequent submissions. The name filter's silent drops do not consume a counter.
- CORS and these checks do not prove that a client-reported score was earned.

## Maintenance and checks

Edit `resources/highscore-policy.js` and `cloudflare/worker-source.mjs`, then run:

```sh
node cloudflare/build.cjs
node tests/highscores.cjs
```

Commit the generated `cloudflare/worker.mjs` alongside its sources. The test checks
that its embedded policy is current and runs the actual SQL against Node's SQLite,
including IP privacy, duplicate submissions, ranking/index use, rate limits and
both name-filter paths. It requires Node 22.13+ (Node 24 recommended). The other
game tests remain available with `npm test`.

Official API references: [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/),
[Worker CORS](https://developers.cloudflare.com/workers/examples/cors-header-proxy/),
[Cloudflare request headers](https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ip).
