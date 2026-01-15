CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_slug TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp_utc TEXT NOT NULL,
    client_event_id TEXT NOT NULL UNIQUE,
    notes TEXT,
    amount_ml INTEGER,
    expressed_ml INTEGER,
    formula_ml INTEGER,
    feed_duration_min REAL,
    caregiver_id INTEGER,
    created_at_utc TEXT NOT NULL,
    updated_at_utc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_timestamp_utc ON entries (timestamp_utc DESC);

CREATE TABLE IF NOT EXISTS baby_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    dob TEXT,
    feed_interval_min INTEGER,
    custom_event_types TEXT,
    updated_at_utc TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO baby_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    interval_min INTEGER NOT NULL CHECK (interval_min > 0),
    message TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    last_sent_at_utc TEXT,
    next_due_at_utc TEXT NOT NULL,
    created_at_utc TEXT NOT NULL,
    updated_at_utc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_next_due_at_utc
    ON reminders (next_due_at_utc);

INSERT INTO reminders (
    name,
    kind,
    interval_min,
    message,
    active,
    next_due_at_utc,
    created_at_utc,
    updated_at_utc
)
SELECT
    'Nappy check',
    'nappy',
    180,
    'Time for a nappy check.',
    1,
    datetime('now', '+180 minutes'),
    datetime('now'),
    datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM reminders);

INSERT INTO reminders (
    name,
    kind,
    interval_min,
    message,
    active,
    next_due_at_utc,
    created_at_utc,
    updated_at_utc
)
SELECT
    'Feed',
    'food',
    180,
    'Time for a feed.',
    1,
    datetime('now', '+180 minutes'),
    datetime('now'),
    datetime('now')
WHERE (SELECT COUNT(*) FROM reminders) = 1;
