# ADR-0006: Controller → Service → Repository, applied selectively

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

Business rules such as join conditions (FR21), lockout (FR11), status transitions (FR20, FR22, FR25, FR30) and block side effects (FR55–FR56) need to be testable without HTTP and kept separate from query details. At the same time, adding a full set of layers to simple features creates boilerplate that a small team pays for on every change.

## Decision

Use **Route → Controller → Service → (Repository) → Prisma**:

| Layer | Responsibility |
|---|---|
| Route | Path, method, `requireAuth` / `requireAdmin`, `validate(schema)` |
| Controller | Read params, body and `req.user`; call one service function; choose the status code; send the DTO. Express 5 forwards rejected promises to the error handler |
| Service | Use cases and business rules, data-dependent authorization, transactions, notifications. Never touches `req`/`res` |
| Repository | Only where it adds value: complex or raw-SQL queries, or queries reused by several services |
| Mapper | DB row → response DTO. Decides which fields are public (email privacy, FR04/FR13) |

**Selective use:** `auth`, `activities` and `connections` get repositories. `users`, `messages`, `notifications` and `moderation` call Prisma directly from their services, because their queries are simple. A repository that would only contain one-line pass-throughs must not be created.

**Dependency injection without a framework:** services are created by factory functions that take their collaborators, including a `clock`. Each module's `index.ts` wires the real ones. Tests can pass fakes.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Logic in route handlers | Fast at first, but mixes HTTP with rules and is hard to unit test, especially rules that depend on time |
| Strict layers everywhere (a repository for every module, interfaces for everything) | Lots of pass-through code with no benefit for simple modules |
| A DI container (InversifyJS, tsyringe) | Unnecessary. Factory functions are enough and easier to understand |

## Rationale

The separation goes where the risk and complexity are. The team gets testable services without boilerplate in the simple modules.

## Consequences / tradeoffs

- Reviewers need judgment: "does this query belong in a repository?" The rule of thumb is raw SQL, more than about 10 lines, or reuse → repository.
- If a simple module grows complex queries later, add a repository to it then.
- Controllers must stay thin. A domain `if` in a controller is a review comment.
