-- Safe to rerun. Existing score rows and columns are unchanged.
CREATE INDEX IF NOT EXISTS idx_highscores_created ON highscores (created_at DESC, submission_id DESC);
CREATE INDEX IF NOT EXISTS idx_highscores_ip_created ON highscores (ip, created_at);
PRAGMA optimize;
