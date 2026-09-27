# Reversi

The player is black and starts on the standard 8×8 board. A legal move must
outflank at least one opposing disc. All bracketed lines flip. A player with no
legal move passes; the game ends only when neither player can move. There is no
turn limit or answer timer. Count occupied discs at the end; the player's black
disc count is the submitted score. Empty squares are not awarded as bonuses.

On each player turn the adviser supplies up to three highest-valued legal moves,
with random tie-breaking and shuffled display order. Each move has an exercise
with a different accepted answer (including aliases, spoken forms and pinyin).
If the position or lesson cannot supply three, fewer options are shown. Card
interaction previews placement and flips; only answering commits a move. An
incorrect answer chooses randomly from the weakest third of evaluated legal
moves, including ties. With only one legal move, both outcomes play that move.

The pure engine uses iterative-deepening negamax with alpha-beta pruning. It
yields every 64 nodes; gameplay runs it for approximately 5 ms per frame. A
completed depth evaluates every root move with a full window, so their values
are comparable. An interrupted depth is discarded. The heuristic values corners,
mobility, frontier discs, and phase-dependent disc counts; it penalizes squares
beside empty corners. Terminal evaluations use the actual disc difference.

| Profile | Depth | Node budget | Quality window | Softmax temperature |
| --- | ---: | ---: | ---: | ---: |
| Lätt | 2 | 2,200 | 150 | 45 |
| Medel | 3 | 7,500 | 70 | 18 |
| Svår | 5 | 35,000 | 20 | 5 |
| Player adviser | 4 | 22,000 | — | — |

Difficulty stays fixed. The opponent samples moves within its quality window,
weighted toward better choices. Even Svår varies between equivalent moves.
These profiles are relative strength settings, not externally calibrated ratings.

Typing and speech are disabled outside the player's answer phase. Pending input
is cleared on every board change and pause. Reversi speech waits for a final
recognition result, prioritizes complete answers, and treats multiple matched
choices as a retry. A final unmatched answer triggers the poor-move rule,
including Chinese; it is not filtered out by the shared real-time-game policy.

`node tests/reversi.cjs` checks rules, search, difficulty variation, accepted
answer separation, game completion and turn handling. The app and renderer
tests cover menu/result/highscore integration and DOM presentation.

Reversi uses score version `v1`. Deploy the regenerated `cloudflare/worker.mjs`
to enable its online scoreboards and submissions. No SQL migration is needed;
pushing GitHub Pages does not deploy the Cloudflare Worker.
