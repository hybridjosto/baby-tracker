# Phase 0 Research: Two-Click Baby Logging

## Decision: Use SQLite in WAL mode for local storage
**Rationale**: SQLite is embedded, reliable on Raspberry Pi hardware, supports
concurrent reads/writes, and WAL mode improves write performance and durability.
**Alternatives considered**: Flat append-only log (requires custom indexing and
locking), external DB (adds operational complexity).

## Decision: Use a minimal server-rendered web UI with lightweight JS
**Rationale**: Keeps dependencies and build steps minimal while still enabling
fast tap-to-log interactions.
**Alternatives considered**: Full SPA framework (heavier build tooling and
larger payloads).

## Decision: Support add-to-home-screen with PWA metadata
**Rationale**: Enables one-tap launch from the phone home screen without app
store distribution, matching the two-click requirement.
**Alternatives considered**: Browser bookmark only (more taps, less reliable
home-screen placement).

## Decision: Client-generated idempotency key per action
**Rationale**: Prevents accidental duplicate entries during flaky connections
or double taps and aligns with offline-tolerant retries.
**Alternatives considered**: Server-side dedupe by time window (risk of false
positives).

## Decision: Store event times in UTC with display-local rendering
**Rationale**: Avoids timezone ambiguity and simplifies queries and retention.
**Alternatives considered**: Storing local timestamps only (ambiguous when
clock drift occurs).
