# Feature Specification: User Homepages & Bottom Actions

**Feature Branch**: `002-user-homepages`  
**Created**: 2026-01-02  
**Status**: Draft  
**Input**: User description: "make the buttons bigger and at the bottom of the screen. give two homepages to allow for user capture eg ip:8000/suz will log as user suz, ip:8000/josh will log as josh etc."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Two-click logging with bottom actions (Priority: P1)

As a parent on a phone, I can open the app and log a feed or poo with two taps using
large action buttons fixed at the bottom of the screen.

**Why this priority**: This is the core quick-log flow and directly supports the
minimum viable experience.

**Independent Test**: Can be fully tested by opening a user page on a phone-sized
viewport and logging a feed or poo in two taps.

**Acceptance Scenarios**:

1. **Given** the user page is open on a phone, **When** the user taps the feed button,
   **Then** a feed entry is logged and appears in the recent list.
2. **Given** the user page is open on a phone, **When** the user taps the poo button,
   **Then** a poo entry is logged and appears in the recent list.

---

### User Story 2 - User-specific homepages (Priority: P2)

As a parent, I can open a user-specific homepage URL (e.g., `/suz` or `/josh`) so
entries are attributed to that person without extra steps.

**Why this priority**: It reduces friction for multiple caregivers using the same
device and keeps entries attributed correctly.

**Independent Test**: Can be tested by visiting two different user URLs and
verifying entries are attributed to the correct user in each view.

**Acceptance Scenarios**:

1. **Given** a user-specific URL exists, **When** the user opens `/suz`, **Then**
   new entries are attributed to user "suz".
2. **Given** a different user-specific URL exists, **When** the user opens `/josh`,
   **Then** new entries are attributed to user "josh".

---

### Edge Cases

- What happens when a user URL is missing or invalid?
- How does the system handle user names with unsupported characters?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display primary action buttons at the bottom of the screen
  on mobile-sized viewports.
- **FR-002**: System MUST make the feed and poo action buttons large enough to be
  easily tapped with one hand.
- **FR-003**: System MUST allow logging a feed or poo entry in two taps from a
  user-specific homepage.
- **FR-004**: System MUST support user-specific homepages at `/[user]` that
  associate new entries with that user.
- **FR-005**: System MUST show recent entries for the active user on their homepage.

### Key Entities *(include if feature involves data)*

- **User**: A named person identified by a short URL-friendly slug.
- **Entry**: A logged feed or poo event associated with a user and a timestamp.

### Assumptions

- User identifiers are short, URL-friendly slugs (letters, numbers, hyphens).
- A missing or invalid user slug shows a friendly message and does not log entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of log attempts on a phone can be completed in two taps.
- **SC-002**: 95% of users can correctly identify where to tap to log within 3
  seconds of opening their homepage.
- **SC-003**: Entries logged from `/[user]` pages are attributed to the correct user
  100% of the time in basic usage tests.
