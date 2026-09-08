-- Run once on an existing installation before deploying the updated Worker.
-- This keeps every existing score and its leaderboard key unchanged.
ALTER TABLE highscores ADD COLUMN settings_json TEXT;
