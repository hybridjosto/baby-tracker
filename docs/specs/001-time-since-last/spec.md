# Feature Specification: Time Since Last Feed/Poo

**Feature Branch**: `001-time-since-last`  
**Created**: 2026-01-03  
**Status**: Draft  
**Input**: User description: "the homepage should show time since last feed and poo"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Recency Check (Priority: P1)

As a parent, I want the homepage to show the time since the last feed and the
last poo so I can immediately see how recently each occurred.

**Why this priority**: This is the fastest way to assess baby needs at a glance.

**Independent Test**: Can be fully tested by loading the homepage with known
entries and verifying the displayed time-since values match those entries.

**Acceptance Scenarios**:

1. **Given** at least one feed and one poo entry exist, **When** I open the
   homepage, **Then** I see the elapsed time since the most recent feed and poo.
2. **Given** new entries are added, **When** I refresh the homepage, **Then** the
   time-since values update to reflect the latest entries.

---

### User Story 2 - No Recent Data Handling (Priority: P2)

As a parent, I want clear messaging when no feed or poo has been logged yet so I
understand why a time-since value is missing.

**Why this priority**: The UI should be clear even on first use or after resets.

**Independent Test**: Can be tested by opening the homepage with no entries and
confirming placeholders explain the missing values.

**Acceptance Scenarios**:

1. **Given** no feed entries exist, **When** I open the homepage, **Then** I see a
   clear "no feed logged yet" message.
2. **Given** no poo entries exist, **When** I open the homepage, **Then** I see a
   clear "no poo logged yet" message.

### Edge Cases

- What happens when multiple entries share the same timestamp?
- How does the display behave if a timestamp is invalid?
- What happens when only one of feed/poo has any entries?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the elapsed time since the most recent feed on
  the homepage.
- **FR-002**: System MUST display the elapsed time since the most recent poo on
  the homepage.
- **FR-003**: System MUST update the displayed elapsed times when the homepage is
  refreshed.
- **FR-004**: System MUST show a clear placeholder message when no feed entries
  exist.
- **FR-005**: System MUST show a clear placeholder message when no poo entries
  exist.

### Key Entities *(include if feature involves data)*

- **Entry**: A recorded feed or poo event with a timestamp and type.
- **User**: The parent identifier used to scope entries on the homepage.

### Assumptions

- Entries are already stored and available to query for the current user.
- The homepage remains the primary entry point for quick status checks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify time since last feed and last poo within 5
  seconds of opening the homepage.
- **SC-002**: The displayed elapsed times match the most recent entries for the
  user in 100% of tested cases.
- **SC-003**: Users encountering no data understand why in under 10 seconds.
