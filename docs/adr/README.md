# Architecture Decision Records

An ADR records one architectural decision that meaningfully affects the project: the context, what was decided, which alternatives were considered, and the tradeoffs accepted.

All ADRs below are **Proposed**. They become **Accepted** once the team has reviewed them. To change a decision later, add a new ADR that supersedes the old one; don't edit the old one's outcome.

| # | Title | Status |
|---|---|---|
| [0001](0001-modular-monolith.md) | Modular monolith backend | Proposed |
| [0002](0002-monorepo-with-npm-workspaces.md) | Monorepo with npm workspaces | Proposed |
| [0003](0003-react-frontend-architecture.md) | React SPA organized by feature | Proposed |
| [0004](0004-rest-api.md) | REST + JSON API with polling (no WebSockets) | Proposed |
| [0005](0005-postgresql-with-prisma.md) | PostgreSQL with Prisma ORM | Proposed |
| [0006](0006-controller-service-repository.md) | Controller → Service → Repository, applied selectively | Proposed |
| [0007](0007-zod-validation-shared.md) | Shared Zod schemas for client and server validation | Proposed |
| [0008](0008-tanstack-query-for-server-state.md) | TanStack Query for server state; React state for UI state | Proposed |
| [0009](0009-session-based-authentication.md) | Server-side sessions stored in PostgreSQL | Proposed |
| [0010](0010-atomic-join-for-capacity.md) | Atomic conditional update to enforce activity capacity | Proposed |
| [0011](0011-time-and-timezone-handling.md) | Time and timezone handling | Proposed |
| [0012](0012-docker-compose-for-local-development.md) | Docker Compose for local development | Proposed |
| [0013](0013-github-actions-ci.md) | GitHub Actions for continuous integration | Proposed |
| [0014](0014-testing-approach.md) | Testing approach: Vitest + Supertest | Proposed |

## Template

```markdown
# ADR-NNNN: Title

- **Status:** Proposed | Accepted | Superseded by ADR-XXXX
- **Date:** YYYY-MM-DD

## Context
What problem or force makes a decision necessary? Cite FRs where relevant.

## Decision
What we will do.

## Alternatives considered
Each option and why it was not chosen.

## Rationale
Why this decision fits this project.

## Consequences / tradeoffs
What gets easier, what gets harder, what we must remember.
```
