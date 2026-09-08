# Skolarkaden highscores

The frontend calls `https://skolarkaden-api.jakob-rogstadius.workers.dev`.
The website remains on GitHub Pages. No API token belongs in the frontend.

## Update the existing installation

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

The previously deployed Worker accepted only four-part GET keys and did not
return player ranks or submission identity. The page now loads those older
endpoints and combines their exercise/difficulty top-ten lists if necessary. Exact low ranks
and identification of an already saved player's row require the updated Worker.
POST retains its existing fields and adds `settings`; older Workers ignore that
extra data, so settings preservation requires the deployment above.

## Finish the existing dashboard setup

1. Open the existing D1 database **skolarkaden → Console**. Run the statements in
   [schema.sql](schema.sql). They preserve existing scores and add the rate-limit
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
   capabilities listed above. The check includes both tables, `ip` and `settings_json`.
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
  exercise/difficulty key for that game version. Existing rows remain included without a migration.
  Older three- and four-part GET keys also return this combined board. Every returned score
  includes `exercise` and `difficulty` (`gentle`, `steady`, or `brave`). Player ranks use the same
  combined set; POST continues to store the difficulty that was actually played.
- Each new row also stores validated `settings_json`: game version, game,
  exercise, difficulty, keyboard/voice mode, selected spoken language, effective
  exercise language, uppercase/lowercase, the actual random letter subset, sound
  setting and reduced-motion setting. These are snapshotted when the round starts.
  Presentation can change later without losing the conditions of the score.
  Existing rows keep their known conditions in the key; previously unrecorded
  settings remain unknown. Old clients are still accepted with those values null.
- Game versions live in `resources/highscore-policy.js`. Increment the affected
  game's value only when a change is likely to materially affect score comparability; deploy Worker and frontend together.
  Old rows remain stored but the current API only accepts current versions.
- The top 10 completed-game results are sorted by score descending, then submission
  time ascending, then submission ID for deterministic ties. GET accepts optional `score` and `submission` query parameters to return the player’s actual rank and mark their row; submission IDs themselves remain private. Nicknames are not accounts and are not unique; one person may
  have several results. Local best scores continue to work independently.
- The result screen only submits on Enter in the name input or the replay/menu buttons. Closing the browser never schedules an upload. Failed saves leave the screen open for retry.
- Each game has a UUID. Duplicate delivery of the same payload succeeds without
  adding another row; changing the payload under an existing UUID is rejected.
  A retry spanning deployment can add missing settings to the same original row.
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
