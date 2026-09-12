-- New databases: run this file. Existing databases must first run
-- add-score-dimensions.sql (and add-score-settings.sql if settings_json is absent).
-- CREATE TABLE IF NOT EXISTS does not add columns to an existing table.
CREATE TABLE IF NOT EXISTS highscores (
    submission_id TEXT PRIMARY KEY NOT NULL,
    leaderboard_key TEXT NOT NULL,
    player_name TEXT NOT NULL CHECK (length(player_name) BETWEEN 1 AND 24),
    score INTEGER NOT NULL CHECK (typeof(score) = 'integer' AND score >= 0),
    ip TEXT,
    settings_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Keep leaderboard_key authoritative, including for older Workers and manual edits.
    game_version TEXT GENERATED ALWAYS AS (substr(leaderboard_key, 1, instr(leaderboard_key, ':') - 1)) VIRTUAL,
    game TEXT GENERATED ALWAYS AS (substr(leaderboard_key, length(game_version) + 2,
        instr(substr(leaderboard_key, length(game_version) + 2), ':') - 1)) VIRTUAL,
    exercise TEXT GENERATED ALWAYS AS (substr(leaderboard_key, length(game_version) + length(game) + 3,
        instr(substr(leaderboard_key, length(game_version) + length(game) + 3), ':') - 1)) VIRTUAL,
    difficulty TEXT GENERATED ALWAYS AS (substr(leaderboard_key, length(game_version) + length(game) + length(exercise) + 4)) VIRTUAL
);
CREATE INDEX IF NOT EXISTS idx_highscores_leaderboard
ON highscores (leaderboard_key, score DESC, created_at ASC);
-- One ordered range for the combined game board. Trailing dimensions allow
-- filtering retired exercises/invalid difficulties directly from the index.
CREATE INDEX IF NOT EXISTS idx_highscores_game
ON highscores (game, game_version, score DESC, created_at ASC, submission_id ASC, exercise, difficulty);

-- A short-lived counter shared by all Worker instances, not an in-memory limit.
CREATE TABLE IF NOT EXISTS score_rate_limits (
    client_key TEXT PRIMARY KEY NOT NULL,
    window_start INTEGER NOT NULL,
    attempts INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_score_rate_limits_expiry
ON score_rate_limits (expires_at);
