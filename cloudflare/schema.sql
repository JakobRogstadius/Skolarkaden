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
-- Administrator statistics: weekly ranges/latest ten, and IP counts/name lookups.
CREATE INDEX IF NOT EXISTS idx_highscores_created ON highscores (created_at DESC, submission_id DESC);
CREATE INDEX IF NOT EXISTS idx_highscores_ip_created ON highscores (ip, created_at);
CREATE INDEX IF NOT EXISTS idx_highscores_homework ON highscores (exercise) WHERE exercise = 'homework';

-- A short-lived counter shared by all Worker instances, not an in-memory limit.
CREATE TABLE IF NOT EXISTS score_rate_limits (
    client_key TEXT PRIMARY KEY NOT NULL,
    window_start INTEGER NOT NULL,
    attempts INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_score_rate_limits_expiry
ON score_rate_limits (expires_at);

-- Safe to run again. The six latest pictures form one shared gallery.
CREATE TABLE IF NOT EXISTS artworks (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT NOT NULL UNIQUE,
    player_name TEXT NOT NULL CHECK (length(player_name) BETWEEN 1 AND 10),
    image TEXT NOT NULL CHECK (length(image) <= 900000),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Tiny receipts prevent timed-out retries from restoring an already-retired picture.
-- Image data exists only in artworks; receipts contain a digest, not a picture/name/IP.
CREATE TABLE IF NOT EXISTS artwork_receipts (
    submission_id TEXT PRIMARY KEY NOT NULL,
    payload_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_artwork_receipts_created ON artwork_receipts(created_at);
