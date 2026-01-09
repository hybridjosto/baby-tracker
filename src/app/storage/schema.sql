CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_slug TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('feed', 'poo', 'wee')),
    timestamp_utc TEXT NOT NULL,
    client_event_id TEXT NOT NULL UNIQUE,
    notes TEXT,
    amount_ml INTEGER,
    feed_duration_min INTEGER,
    caregiver_id INTEGER,
    created_at_utc TEXT NOT NULL,
    updated_at_utc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_timestamp_utc ON entries (timestamp_utc DESC);

CREATE TABLE IF NOT EXISTS baby_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    dob TEXT,
    feed_interval_min INTEGER,
    updated_at_utc TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO baby_settings (id) VALUES (1);
