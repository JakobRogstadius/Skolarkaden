-- Safe to run against the database created in the dashboard tutorial.
CREATE TABLE IF NOT EXISTS highscores (
    submission_id TEXT PRIMARY KEY NOT NULL,
    leaderboard_key TEXT NOT NULL,
    player_name TEXT NOT NULL CHECK (length(player_name) BETWEEN 1 AND 24),
    score INTEGER NOT NULL CHECK (typeof(score) = 'integer' AND score >= 0),
    ip TEXT,
    settings_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_highscores_leaderboard
ON highscores (leaderboard_key, score DESC, created_at ASC);

-- A short-lived counter shared by all Worker instances, not an in-memory limit.
CREATE TABLE IF NOT EXISTS score_rate_limits (
    client_key TEXT PRIMARY KEY NOT NULL,
    window_start INTEGER NOT NULL,
    attempts INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_score_rate_limits_expiry
ON score_rate_limits (expires_at);
