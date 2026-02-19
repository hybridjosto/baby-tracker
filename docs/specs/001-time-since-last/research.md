# Research: Time Since Last Feed/Poo

## Decision: Compute recency from the latest entries in the existing list API

**Rationale**: Reuses existing entry data without adding dependencies or storage
changes while keeping the homepage lightweight.

**Alternatives considered**:
- Adding a new summary endpoint: more backend work with limited benefit.

## Decision: Display human-friendly elapsed time (minutes/hours) on homepage

**Rationale**: Parents need quick comprehension; relative times are easier than
raw timestamps.

**Alternatives considered**:
- Showing raw timestamps only: slower to interpret.
