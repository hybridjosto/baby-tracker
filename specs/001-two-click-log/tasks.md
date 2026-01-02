---

description: "Task list template for feature implementation"
---

# Tasks: Two-Click Baby Logging

**Input**: Design documents from `/specs/001-two-click-log/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - not included because they were not explicitly requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project directories in `src/app/`, `src/web/`, `src/lib/`, `tests/integration/`, `tests/unit/`
- [X] T002 Initialize Python project dependencies in `/Users/josh/my-code/baby/pyproject.toml`
- [X] T003 [P] Add basic server entrypoint in `src/app/main.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add configuration loader for env vars in `src/app/config.py`
- [X] T005 Create SQLite schema in `src/app/storage/schema.sql`
- [X] T006 Implement SQLite connection + migrations init in `src/app/storage/db.py`
- [X] T007 Implement entry repository helpers in `src/app/storage/entries.py`
- [X] T008 Create entry service layer in `src/app/services/entries.py`
- [X] T009 Create API blueprint and routing scaffold in `src/app/routes/entries.py`
- [X] T010 Add error handling and logging utilities in `src/lib/logging.py`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Two-Click Add (Priority: P1) 🎯 MVP

**Goal**: Two-tap feed/poo logging with idempotency

**Independent Test**: From the home screen, open the app, tap Feed or Poo, and
see the new entry appear in the recent list

### Implementation for User Story 1

- [X] T011 [P] [US1] Add entry validation helpers in `src/lib/validation.py`
- [X] T012 [US1] Add create-entry service logic in `src/app/services/entries.py`
- [X] T013 [US1] Implement POST `/api/entries` in `src/app/routes/entries.py`
- [X] T014 [US1] Create main UI template with two action buttons in `src/web/templates/index.html`
- [X] T015 [US1] Add client JS to submit feed/poo with idempotency key in `src/web/static/app.js`
- [X] T016 [US1] Add PWA manifest + icons reference in `src/web/static/manifest.json`

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - See Recent Activity (Priority: P2)

**Goal**: Show recent feed/poo entries on app open

**Independent Test**: Open the app and confirm recent entries appear in time order

### Implementation for User Story 2

- [X] T017 [US2] Add list-entries service logic in `src/app/services/entries.py`
- [X] T018 [US2] Implement GET `/api/entries` in `src/app/routes/entries.py`
- [X] T019 [US2] Render recent list in `src/web/templates/index.html`
- [X] T020 [US2] Load and display recent list in `src/web/static/app.js`

**Checkpoint**: User Story 2 should be functional and independently testable

---

## Phase 5: User Story 3 - Fix Mistakes (Priority: P3)

**Goal**: Edit or delete a recent entry

**Independent Test**: Update or remove an entry and verify the list reflects changes

### Implementation for User Story 3

- [X] T021 [US3] Add update/delete service logic in `src/app/services/entries.py`
- [X] T022 [US3] Implement PATCH/DELETE `/api/entries/{id}` in `src/app/routes/entries.py`
- [X] T023 [US3] Add edit/delete UI actions in `src/web/templates/index.html`
- [X] T024 [US3] Wire edit/delete actions in `src/web/static/app.js`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T025 [P] Update run/backup notes in `/Users/josh/my-code/baby/specs/001-two-click-log/quickstart.md`
- [X] T026 [P] Add top-level usage notes in `/Users/josh/my-code/baby/README.md`
- [ ] T027 Run quickstart validation steps described in `/Users/josh/my-code/baby/specs/001-two-click-log/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can proceed in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependency on US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependency on US1/US2

### Dependency Graph

- Setup → Foundational → US1, US2, US3 → Polish

## Parallel Execution Examples

### User Story 1

```text
T011 (validation helpers) + T014 (UI template) + T016 (manifest) can run in parallel.
T012 depends on T011. T013 depends on T012. T015 depends on T014 and T013.
```

### User Story 2

```text
T017 (list service) can run in parallel with T019 (UI list markup).
T018 depends on T017. T020 depends on T018 and T019.
```

### User Story 3

```text
T021 (update/delete service) can run in parallel with T023 (UI actions).
T022 depends on T021. T024 depends on T022 and T023.
```

## Implementation Strategy

- Deliver MVP by completing US1 after Foundational tasks.
- Add US2 to make the log immediately useful for daily coordination.
- Add US3 for corrections once core logging and viewing are stable.
