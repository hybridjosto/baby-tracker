# Data Model: User Homepages & Bottom Actions

## Entity: Entry

- **Purpose**: Logged feed/poo event attributed to a user slug.
- **Fields**:
  - `id`: Unique identifier
  - `user_slug`: URL-friendly user identifier (letters, numbers, hyphens)
  - `type`: Enum {feed, poo}
  - `timestamp`: Event time (UTC ISO 8601 or epoch)
  - `notes` (optional): Short text
  - `amount` (optional): Numeric quantity for feeds
  - `created_at`: Server time of entry creation

## Entity: User (implicit)

- **Purpose**: A caregiver identified by `user_slug`.
- **Storage**: Implicit, derived from entry records; no separate table.

## Relationships

- A user has many entries (one-to-many).

## Validation Rules

- `user_slug` must match `[a-z0-9-]+` and be 1-24 characters.
- `type` must be one of `feed` or `poo`.
- `timestamp` required if provided by client; defaults to server time if omitted.
- `notes` length <= 140 characters.
