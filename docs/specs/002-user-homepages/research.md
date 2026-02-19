# Research: User Homepages & Bottom Actions

## Decision 1: User attribution via URL slug

- **Decision**: Use a URL slug (`/[user]`) as the active user context for logging
  and viewing entries.
- **Rationale**: Zero-friction attribution with no login, matches the two-tap goal.
- **Alternatives considered**: Manual user picker on the home page, per-device
  default user setting.

## Decision 2: Bottom-fixed large action buttons

- **Decision**: Place feed/poo buttons in a bottom-fixed action bar and increase
  hit target size for one-hand use.
- **Rationale**: Consistent placement on mobile, supports two-tap logging.
- **Alternatives considered**: Floating action button, top-aligned buttons.

## Decision 3: User data model

- **Decision**: Store user slug on each entry; avoid a separate user table for now.
- **Rationale**: Minimal schema changes and space-efficient storage.
- **Alternatives considered**: Dedicated user table with foreign keys.
