# Feature Specification: 24h History Visualization & Log

**Feature Branch**: `001-event-history-log`  
**Created**: 2026-01-02  
**Status**: Draft  
**Input**: User description: "the homepage should show a nice visualisation of recent events on a rolling 24h of history chart. the event log should be available as a scrollable list on a separate page."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 24h Timeline Overview (Priority: P1)

As a parent, I want the homepage to show a clear 24-hour rolling chart of recent
feeding and poo events so I can quickly understand patterns at a glance.

**Why this priority**: The homepage is the primary touchpoint; rapid insight is the
core value of the tracker.

**Independent Test**: Can be fully tested by loading the homepage with known events
and confirming the chart reflects only the last 24 hours.

**Acceptance Scenarios**:

1. **Given** events within the last 24 hours, **When** I open the homepage, **Then** I
   see a chart showing those events by time and type.
2. **Given** events older than 24 hours exist, **When** I open the homepage, **Then**
   those older events are excluded from the chart.

---

### User Story 2 - Scrollable Event Log (Priority: P2)

As a parent, I want a separate page with a scrollable list of recent events so I
can review exact entries and timestamps.

**Why this priority**: A detailed log complements the chart and helps with
accuracy when checking specific events.

**Independent Test**: Can be fully tested by opening the log page and verifying the
list is scrollable and shows events in time order.

**Acceptance Scenarios**:

1. **Given** multiple events exist, **When** I open the log page, **Then** I can
   scroll through the list and see entries in reverse chronological order.

### Edge Cases

- What happens when there are no events in the last 24 hours?
- How does the system handle events with identical timestamps?
- What happens when the log list grows beyond the viewport height?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a homepage chart representing events from the
  most recent 24 hours only.
- **FR-002**: System MUST visually distinguish event types (feed vs poo) within the
  chart.
- **FR-003**: Users MUST be able to access a separate event log page from the
  homepage.
- **FR-004**: System MUST show the event log as a scrollable list ordered newest to
  oldest.
- **FR-005**: System MUST include each event's timestamp and type in the log list.

### Key Entities *(include if feature involves data)*

- **Event Entry**: A recorded feeding or poo event with timestamp and type.
- **User**: The parent identifier used to scope events to a specific user path.

### Assumptions

- Existing event records are available for the current user to render the chart
  and log.
- Users can reach the log page from the homepage without additional setup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can load the homepage and understand the last 24 hours of
  activity within 10 seconds.
- **SC-002**: 100% of events displayed on the homepage chart are within the most
  recent 24 hours.
- **SC-003**: Users can reach and scroll the event log page in under 2 clicks from
  the homepage.
- **SC-004**: Users can locate a specific event in the log within 15 seconds for
  a typical 50-entry list.
