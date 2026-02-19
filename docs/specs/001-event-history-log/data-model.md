# Data Model: 24h History Visualization & Log

## Entities

### Entry

- **id**: unique identifier
- **user_slug**: owning user identifier
- **type**: feed | poo
- **timestamp_utc**: event time in UTC
- **client_event_id**: idempotency key
- **notes**: optional text
- **amount_ml**: optional numeric amount
- **created_at_utc**: server write time
- **updated_at_utc**: last update time

## Relationships

- A **User** (identified by `user_slug`) has many **Entry** records.

## Validation Rules

- `type` must be `feed` or `poo`.
- `timestamp_utc` must be a valid timestamp string.
- `user_slug` must match the slug format used for routes.

## Derived Views

- **24h window**: entries within the last 24 hours from "now" (client display time).
- **Log list**: entries ordered newest to oldest.
