# Feature Specification: Wee Event Logging

**Feature Branch**: `001-wee-events`  
**Created**: 2026-01-03  
**Status**: Draft  
**Input**: User description: "i also want to log wee events"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log Wee Event (Priority: P1)

As a parent, I want to log a wee event with a single tap so I can track it alongside
feeds and poo events.

**Why this priority**: Wee tracking is a core daily activity and should be as easy
as existing logs.

**Independent Test**: Can be fully tested by logging a wee event and confirming it
appears in recent history and the log list for the user.

**Acceptance Scenarios**:

1. **Given** I am on my homepage, **When** I tap the wee button, **Then** a wee
   entry is created and visible in my recent history.
2. **Given** I log a wee event, **When** I open the event log, **Then** the wee
   entry appears with the correct timestamp.

---

### User Story 2 - Distinguish Wee Events (Priority: P2)

As a parent, I want wee events to be clearly labeled so I can distinguish them
from feed and poo entries.

**Why this priority**: Clear labels reduce confusion when reviewing logs.

**Independent Test**: Can be tested by logging a wee event and confirming it is
shown with a distinct label in the chart and list views.

**Acceptance Scenarios**:

1. **Given** a wee entry exists, **When** I view the homepage chart, **Then** the
   wee event is visually distinguished from feed and poo.
2. **Given** a wee entry exists, **When** I view the log list, **Then** it is
   labeled as "wee".

### Edge Cases

- What happens when only wee entries exist and no feed/poo entries?
- How does the system handle multiple wee events with identical timestamps?
- What happens if a wee event is logged while offline and retried later?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create a wee entry with a single tap.
- **FR-002**: System MUST store wee entries alongside existing feed and poo entries.
- **FR-003**: System MUST display wee entries in the homepage history view.
- **FR-004**: System MUST display wee entries in the event log list.
- **FR-005**: System MUST label wee entries distinctly from feed and poo.

### Key Entities *(include if feature involves data)*

- **Entry**: A recorded feed, poo, or wee event with a timestamp and type.
- **User**: The parent identifier used to scope entries on the homepage.

### Assumptions

- Existing entry storage supports extending the event type list.
- The homepage remains the primary entry point for logging.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can log a wee event in under 5 seconds from the homepage.
- **SC-002**: Wee events appear in both the homepage history and log list 100% of
  the time in tested scenarios.
- **SC-003**: Users can distinguish wee events from other types without confusion
  in 90% of observed uses.
