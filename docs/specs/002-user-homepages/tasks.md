# Tasks: User Homepages & Bottom Actions

**Input**: Design documents from `/specs/002-user-homepages/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - none requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Add user slug validation helper in src/lib/validation.py
- [X] T002 Update SQLite schema to include user_slug and index in src/app/storage/schema.sql

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Update DB initialization/migration to add user_slug to existing DBs in src/app/storage/db.py
- [X] T004 Update storage read/write to include user_slug in src/app/storage/entries.py
- [X] T005 Update service validation to require and validate user_slug in src/app/services/entries.py

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Two-click logging with bottom actions (Priority: P1) 🎯 MVP

**Goal**: Make feed/poo logging possible in two taps with large bottom-fixed actions

**Independent Test**: Open a user page on mobile and log feed/poo in two taps

### Implementation for User Story 1

- [X] T006 [US1] Add bottom action bar layout in src/web/templates/index.html
- [X] T007 [US1] Increase action button size and spacing in src/web/templates/index.html
- [X] T008 [US1] Ensure UI interactions still trigger logging in src/web/static/app.js

**Checkpoint**: User Story 1 functional with large bottom actions

---

## Phase 4: User Story 2 - User-specific homepages (Priority: P2)

**Goal**: Support `/[user]` homepages that attribute entries to a user slug

**Independent Test**: Visit `/suz` and `/josh` and confirm entries are attributed correctly

### Implementation for User Story 2

- [X] T009 [US2] Add user homepage route with slug validation in src/app/main.py
- [X] T010 [US2] Add user-scoped list/create endpoints in src/app/routes/entries.py
- [X] T011 [US2] Filter list queries by user_slug in src/app/services/entries.py
- [X] T012 [US2] Inject active user slug into the page in src/web/templates/index.html
- [X] T013 [US2] Use user-scoped API paths in src/web/static/app.js

**Checkpoint**: User Story 2 functional with user-specific pages

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T014 Update usage docs with user homepage URLs in README.md
- [ ] T015 Run quickstart validation and record results in specs/002-user-homepages/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent but complements US1

### Within Each User Story

- Models/storage before services
- Services before routes/UI
- Core implementation before integration

### Parallel Opportunities

- Phase 1: T001 and T002 can run in parallel
- Phase 2: T003 and T004 can run in parallel; T005 depends on T004
- User Story 1: T006 and T007 can run in parallel; T008 depends on both
- User Story 2: T009 and T010 can run in parallel; T011 depends on T010; T012 and T013 depend on T009

---

## Parallel Example: User Story 1

```bash
Task: "Add bottom action bar layout in src/web/templates/index.html"
Task: "Increase action button size and spacing in src/web/templates/index.html"
```

---

## Parallel Example: User Story 2

```bash
Task: "Add user homepage route with slug validation in src/app/main.py"
Task: "Add user-scoped list/create endpoints in src/app/routes/entries.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently
3. Add User Story 2 → Test independently
4. Run Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
