# Feature Specification: Two-Click Baby Logging

**Feature Branch**: `001-two-click-log`  
**Created**: 2026-01-02  
**Status**: Draft  
**Input**: User description: "Babypoo and feeding tracker web app privately hosted on a Raspberry Pi feature should be two click to add items. So one click to open the app from the phone home page, second click to add either a poo or a feed item using SQL light to store the data and using tail scale to expose the url to the"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Two-Click Add (Priority: P1)

Parents can open the app from their phone home screen and log a feed or poo in
one additional tap.

**Why this priority**: This is the core daily workflow and must be fast during
night or one-handed use.

**Independent Test**: From the home screen, a parent can open the app and add a
feed or poo entry in two taps, and the entry appears in the log.

**Acceptance Scenarios**:

1. **Given** the parent is on their phone home screen, **When** they open the app
   and tap "Feed", **Then** a feed entry is saved with the current time.
2. **Given** the parent is on their phone home screen, **When** they open the app
   and tap "Poo", **Then** a poo entry is saved with the current time.

---

### User Story 2 - See Recent Activity (Priority: P2)

Parents can quickly see the most recent feed and poo entries to answer
"when was the last one?".

**Why this priority**: Confidence and coordination depend on seeing recent
activity at a glance.

**Independent Test**: After adding entries, the parent can view a list of recent
items with type and time.

**Acceptance Scenarios**:

1. **Given** there are existing entries, **When** the parent opens the app,
   **Then** the recent feed and poo entries are visible in time order.

---

### User Story 3 - Fix Mistakes (Priority: P3)

Parents can correct an incorrect entry (e.g., wrong type or time) without
re-adding everything.

**Why this priority**: Quick logging can lead to occasional mistakes that need
correction for accuracy.

**Independent Test**: The parent can edit or delete a recent entry and see the
updated log.

**Acceptance Scenarios**:

1. **Given** a recent entry exists, **When** the parent edits the entry,
   **Then** the updated values are saved and displayed.
2. **Given** a recent entry exists, **When** the parent deletes the entry,
   **Then** it no longer appears in the log.

### Edge Cases

- What happens when the phone has no connectivity to the Raspberry Pi?
- How does the system handle accidental double taps on the same action?
- What happens when the device clock is incorrect?

### Assumptions

- The app is added to the phone home screen as a shortcut for one-tap access.
- The service is accessible only over a private network connection between the
  phone and the Raspberry Pi.
- Data is stored locally on the Raspberry Pi in a lightweight embedded database.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow adding a feed entry in two taps from the
  phone home screen (open app, tap "Feed").
- **FR-002**: The system MUST allow adding a poo entry in two taps from the
  phone home screen (open app, tap "Poo").
- **FR-003**: The system MUST default new entries to the current time without
  requiring additional input.
- **FR-004**: The system MUST display a chronological list of recent feed and
  poo entries on app open.
- **FR-005**: The system MUST allow editing and deleting recent entries.
- **FR-006**: The system MUST store data locally on the Raspberry Pi and keep
  it accessible only over a private connection.
- **FR-007**: The system MUST persist entries across restarts and power loss.
- **FR-008**: The system MUST prevent accidental duplicate entries from rapid
  repeated taps.

### Key Entities *(include if feature involves data)*

- **Entry**: A single logged event with type (feed or poo), timestamp, and
  optional notes.
- **Caregiver**: The person adding or viewing entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of new entries can be created in two taps or fewer.
- **SC-002**: A new entry is visible in the recent list within 2 seconds of
  submission.
- **SC-003**: Users can find the last feed or poo time within 5 seconds of
  opening the app.
- **SC-004**: At least 90% of logging attempts succeed on the first try under
  normal home network conditions.
