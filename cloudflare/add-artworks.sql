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
