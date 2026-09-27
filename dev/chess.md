# Chess (Schack)

The player is White and moves first. Each turn offers the bot's best legal move
and two distinct moves sampled uniformly from the remaining top ten, with
distinct accepted exercise answers. Ties are shuffled before taking the top
ten. With fewer legal moves or distinct answers, show fewer choices while
always retaining a best move. Reversi's answer separation,
typing and final-result speech handling are reused, including aliases and
toneless pinyin. Move order is shuffled and evaluation scores are hidden.
Hover, focus or touch previews a move; only an answer plays it. Incorrect
answers sample the weakest third of evaluated legal moves. If only one move
is legal, both correct and incorrect answers play it. Short lessons can show
fewer choices. There is no answer timer or turn limit. Move cards show only
the exercise prompt or diagram, never hints, answers, pinyin or translations,
even after waiting or pausing. Accepted answers and aliases are unchanged.

Knights are drawn as hungry dinosaurs. When either side's knight captures,
the victim jumps, the dinosaur approaches with an open jaw, and the captured
piece shrinks into its mouth during three chews. The dinosaur then settles
fully opaque onto its destination square, matching the board piece's size,
pose and facing direction without a fade. The 1.55-second effect has no scream
or chewing sounds. The board and score are committed once, before the visual
effect; the next turn waits for it to finish. Game time controls the animation,
so pause freezes it. Reduced motion keeps the dinosaur stationary while the
captured piece disappears.

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

The score combines points for the chosen move, captures, lost pieces and the
final result. An incorrect answer deducts 10 move points and triggers a weak
move. Elapsed time, answer streaks and difficulty do not enter the score.

| Component | Points |
| --- | --- |
| Result | Win: 1,000; draw: 400; loss: 0 |
| Captured material | +10 × piece value |
| Lost material | −10 × piece value |
| Move quality | Best offered choice: +10; second: +5; third: 0; wrong answer: −10 |
| Fewer moves to win | On a win only: `round(6000 / (20 + playerTurns))` |

The score starts at zero. The total is the sum, floored at zero; negative move
points remain in the running component and reduce later gains. Piece values
are pawn 1, knight 3, bishop 3, rook 5 and queen 9. Capturing a queen adds 90; losing one subtracts
90. En passant counts as a pawn capture. A promoted piece has its new value
when captured. The king has no capture value: checkmate awards the win bonus.

Rank is relative to the moves actually offered, not to all legal moves, and
is independent of the shuffled A/B/C order. Equal bot evaluations earn equal
points: count the strictly better offered moves to determine the award. Thus
two tied best choices both earn 10, and two tied second choices both earn 5.
If all choices tie, each earns 10. A forced correct move earns 10; a wrong
answer still costs 10 even when it produces that same forced move. Opponent
moves never add move-choice points. The adviser is the same at every difficulty.

Move-choice points accumulate throughout the game, replacing the former
100-point quality reserve and cumulative-regret formula. The earned or lost
move points are shown in the status message after the move is played. Before
answering, cards show neither their ranking nor their point award.

Winning in 20, 40 or 80 own moves awards an efficiency bonus of 150, 100
or 60 respectively. Thinking, pausing and typing take no points away.
Captures and losses are bounded at 103 material units per side, including
eight promoted queens. Material now has ten times its previous relative
weight, so material differences can outweigh result bonuses across different
games. Scores use the general safe submission limit of 1,000,000; the previous
2,430-point limit no longer applies now that move points accumulate.
The component breakdown appears in the result screen.

## Score storage and deployment

Chess keeps score version `v2` at the owner's request, so the existing arcade
scores remain on the same leaderboard. The browser and D1 store arcade points as ordinary integers
without rescaling. The Worker accepts only integers from 0 to 1,000,000 and
rejects submissions using old chess versions. Historical `v1` records in
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
result bonuses, offered-choice ranks, ties, wrong-answer penalties, time
independence and actual captures, including en passant and promotion.
`tests/chess-scores.cjs` exercises the real Worker against SQLite, including version separation and
score limits. `tests/homework-ui.cjs` covers app input, pause, score display,
submission and replay. `tests/chess-renderer.cjs` checks that every exercise's
move cards keep hints and answers hidden after waiting, pausing and resuming,
while prompts, diagrams, previews and answer input still work.
It also covers dinosaur captures of every piece type on both sides, silent
captures, the solid final pose, pause/resume, board edges, reduced motion and cleanup.
`tests/dinosaur-sounds.cjs` covers shared voice synthesis and cancellation.
Run `npm test` for the complete regression suite.
