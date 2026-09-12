-- Existing D1 databases: run once, BEFORE deploying the updated Worker.
-- Inspect PRAGMA table_xinfo(highscores) first (table_info hides generated columns).
-- If resuming a partially completed run, skip only the ALTERs for columns already present.
-- The CREATE INDEX and PRAGMA optimize statements can be rerun.
-- No rows are rewritten or deleted. Existing and future four-part keys populate
-- these generated columns automatically, even when settings_json is NULL.

ALTER TABLE highscores ADD COLUMN game_version TEXT GENERATED ALWAYS AS
    (substr(leaderboard_key, 1, instr(leaderboard_key, ':') - 1)) VIRTUAL;
ALTER TABLE highscores ADD COLUMN game TEXT GENERATED ALWAYS AS
    (substr(leaderboard_key, length(game_version) + 2,
        instr(substr(leaderboard_key, length(game_version) + 2), ':') - 1)) VIRTUAL;
ALTER TABLE highscores ADD COLUMN exercise TEXT GENERATED ALWAYS AS
    (substr(leaderboard_key, length(game_version) + length(game) + 3,
        instr(substr(leaderboard_key, length(game_version) + length(game) + 3), ':') - 1)) VIRTUAL;
ALTER TABLE highscores ADD COLUMN difficulty TEXT GENERATED ALWAYS AS
    (substr(leaderboard_key, length(game_version) + length(game) + length(exercise) + 4)) VIRTUAL;

-- Index values are built for ALL existing rows and maintained on insert/update/delete.
-- Preserve the old leaderboard index so the previous Worker can still run.
CREATE INDEX IF NOT EXISTS idx_highscores_game
ON highscores (game, game_version, score DESC, created_at ASC, submission_id ASC, exercise, difficulty);
PRAGMA optimize;

-- Verification: a normal database has other_key_formats = 0. Other formats are
-- retained, not guessed or silently relabelled; the Worker keeps excluding them.
SELECT count(*) AS total_scores,
    count(CASE WHEN game_version = '' OR game = '' OR exercise = '' OR difficulty = ''
        OR instr(difficulty, ':') > 0 THEN 1 END) AS other_key_formats FROM highscores;
PRAGMA table_xinfo(highscores);
PRAGMA index_list(highscores);
