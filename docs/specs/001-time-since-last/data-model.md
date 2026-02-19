# Data Model: Time Since Last Feed/Poo

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

## Derived Views

- **Last feed**: most recent entry with type = feed.
- **Last poo**: most recent entry with type = poo.
- **Elapsed time**: difference between now and each most recent entry.
