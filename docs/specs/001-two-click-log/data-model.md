# Data Model: Two-Click Baby Logging

## Entity: Entry

**Purpose**: Represents a single logged event (feed or poo).

**Fields**:
- `id` (integer, primary key)
- `type` (enum: feed | poo)
- `timestamp_utc` (integer or ISO 8601 string, required)
- `client_event_id` (string, required, unique) - idempotency key
- `notes` (string, optional)
- `amount_ml` (integer, optional)
- `created_at_utc` (integer or ISO 8601 string, required)
- `updated_at_utc` (integer or ISO 8601 string, required)

**Validation rules**:
- `type` must be feed or poo.
- `client_event_id` must be unique.
- `timestamp_utc` must be present and parseable as UTC.

**Indexes**:
- `timestamp_utc` for recent activity queries.
- `client_event_id` unique index for idempotency.

## Entity: Caregiver (optional)

**Purpose**: Identifies who logged the entry when multiple parents use the app.

**Fields**:
- `id` (integer, primary key)
- `display_name` (string, required)

**Relationships**:
- One caregiver can create many entries.
- Entry may reference caregiver via `caregiver_id` if enabled.

## State Transitions

- New entry: created -> stored -> visible in recent list
- Edit entry: stored -> updated -> visible in recent list
- Delete entry: stored -> deleted -> removed from recent list
