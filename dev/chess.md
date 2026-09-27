# Chess (Schack)

The player is White and moves first. Each turn offers up to three good legal
moves, with distinct accepted exercise answers. Reversi's answer separation,
typing and final-result speech handling are reused, including aliases and
toneless pinyin. Move order is shuffled and evaluation scores are hidden.
Hover, focus or touch previews a move; only an answer plays it. Incorrect
answers sample the weakest third of evaluated legal moves. If only one move
is legal, both correct and incorrect answers play it. Short lessons can show
fewer choices. There is no answer timer or turn limit.

The game uses locally vendored **chess.js 1.4.0** for legal moves, check, mate,
stalemate, castling, en passant and all four promotion pieces. Promotions are
separate proposed moves and are identified on their cards. Draws use the
library's insufficient-material detection. Both sides automatically claim
threefold repetition and the fifty-move rule, so a separate claim button is
unnecessary. Checkmate takes precedence over the draw counters. The match
result is shown as **1–0, ½–½ or 0–1**, separately from the arcade score below.
See [FIDE Laws of Chess, articles 5, 9 and 10](https://handbook.fide.com/chapter/E012023).

## Bot

The adviser and opponent use iterative-deepening negamax, alpha-beta pruning,
capture ordering and a bounded capture/promotion/check-evasion quiescence
search. The heuristic uses material, centralisation, pawn advancement and
king safety/endgame activity. Mate scores include distance to mate. Every
completed depth searches all root moves with full windows; an incomplete
depth is discarded. Search yields every 32 nodes and is advanced for about
5 ms per animation frame to keep pause and input responsive.

| Profile | Depth | Node budget | Quality window (centipawns) | Temperature |
| --- | ---: | ---: | ---: | ---: |
| Lätt | 2 | 2,500 | 300 | 100 |
| Medel | 3 | 9,000 | 100 | 35 |
| Svår | 4 | 28,000 | 25 | 10 |
| Player adviser | 4 | 24,000 | — | — |

Difficulty is fixed; the opponent samples within the quality window, weighted
toward stronger moves. Equal-valued moves still vary at the hardest setting.
These are relative strengths, not calibrated Elo ratings. Search operates on
an isolated copy, including the repetition counts. `searchPosition()` is the
single adapter to the pinned library's internal move methods, avoiding SAN
and FEN generation at every search node. Actual gameplay always calls the
public validated `move()` method. Vendor upgrades require the adapter's
perft and public/private parity tests to pass.

## Scoring

The score measures the moves actually played and the final result. Correct
answers let the player select proposed moves; they award no points directly.
Elapsed time, answer streaks and difficulty do not enter the score.

| Component | Points |
| --- | --- |
| Result | Win: 1,000; draw: 400; loss: 0 |
| Captured material | +10 × piece value |
| Lost material | −10 × piece value |
| Move quality | `round(100 × exp(−cumulativeRegret / 1000))` |
| Fewer moves to win | On a win only: `round(6000 / (20 + playerTurns))` |

The final score is the sum, floored at zero. Piece values are pawn 1, knight
3, bishop 3, rook 5 and queen 9. Capturing a queen adds 90; losing one subtracts
90. En passant counts as a pawn capture. A promoted piece has its new value
when captured. The king has no capture value: checkmate awards the win bonus.

For each player move, **regret** is the difference between the best legal
move's evaluation and the played move's evaluation in the adviser's completed
search, in centipawns. Better moves preserve more of the quality bonus. Best,
tied and forced moves have no regret. A correct answer and an incorrect answer
that produce the same move produce the same score. Opponent moves never add
player regret. Quality uses the same adviser at every difficulty.

The 100-point quality reserve is visible from the start. Regret accumulates
throughout the game: extra quiet moves cannot restore or dilute it. Ordinary
evaluations are capped at ±4,000 centipawns for scoring. Mate evaluations are
mapped just outside that range to ±`(5000 − 10 × min(99, distanceToMate))`,
preserving preference for faster wins and delayed losses without charging
the engine's enormous mate sentinel as a material loss.

Winning in 20, 40 or 80 own moves awards an efficiency bonus of 150, 100
or 60 respectively. Thinking, pausing and typing take no points away.
Captures and losses are bounded at 103 material units per side, including
eight promoted queens. Material now has ten times its previous relative
weight, so material differences can outweigh result bonuses across different
games. The safe integer score cap is 2,430.
The component breakdown appears beside the board and in the result screen.

## Score storage and deployment

Chess uses score version `v2`, keeping these scores separate from the previous
match-only scores. The browser and D1 store arcade points as ordinary integers
without rescaling. The Worker accepts only integers from 0 to 2,430 and
rejects submissions using the old chess version. Historical `v1` records in
administrator statistics still display their half-point encoding as 0, ½ or 1.
Other games retain their existing units and versions.

Deploy the regenerated `cloudflare/worker.mjs` to enable online chess scores.
No SQL migration is necessary. GitHub Pages does not deploy the Worker.

## Vendor provenance and tests

`resources/chess-rules.js` contains the unmodified CommonJS distribution of
[chess.js 1.4.0](https://www.npmjs.com/package/chess.js/v/1.4.0), wrapped in an
IIFE exporting `Starlight.ChessRules`; its source-map comment is removed.
The full BSD-2-Clause licence is in the file and in `dev/chess-js-LICENSE.txt`.
The npm tarball SHA-1 is `edc1439492d1a0d7f530ba72b2b5398baece28a1`.

`tests/chess.cjs` covers reference perft positions, move legality, draw rules,
mate search, repetition preservation, difficulty variation, distinct answer
choices and turn handling. `tests/chess-scoring.cjs` covers score arithmetic,
result bonuses, cumulative regret, answer/time independence and actual
captures, including en passant and promotion. `tests/chess-scores.cjs`
exercises the real Worker against SQLite, including version separation and
score limits. `tests/homework-ui.cjs` covers app input, pause, score display,
submission and replay. Run `npm test` for the complete regression suite.
