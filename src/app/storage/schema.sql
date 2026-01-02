CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_slug TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('feed', 'poo')),
    timestamp_utc TEXT NOT NULL,
    client_event_id TEXT NOT NULL UNIQUE,
    notes TEXT,
    amount_ml INTEGER,
    caregiver_id INTEGER,
    created_at_utc TEXT NOT NULL,
    updated_at_utc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_timestamp_utc ON entries (timestamp_utc DESC);
