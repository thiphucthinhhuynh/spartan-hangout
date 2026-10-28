# ADR-0001: Modular monolith backend

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

Spartan Hangout has about seven feature areas (accounts, profiles, activities, connections, messaging, notifications, moderation), and they are tightly linked. Joining an activity checks blocks, updates capacity, grants chat access and notifies the organizer, all at once (FR21–FR23). Account removal touches almost every table (FR08), and so does blocking (FR55–FR57). Four students will build and run the system for one semester, at campus scale.

## Decision

Build **one Express application** in one deployable process, organized into feature modules: `auth`, `users`, `activities`, `connections`, `messages`, `notifications`, `moderation`. A small `common/` folder holds middleware, errors, time helpers and the shared relationship (block/connection) policy.

Module rules:

- A module exposes its **service functions**. Other modules call those, and never another module's repository or controller.
- `notifications` and `common` don't depend on any feature module.
- All modules share one PostgreSQL database and one Prisma client.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Microservices (one service per area) | Cross-cutting operations such as join, block and delete account would need distributed transactions or eventual consistency. Each service would need its own deployment, monitoring and network calls. Far more than the project needs |
| Unstructured monolith (one `routes/` folder with everything) | Fast to start, but in a codebase four people share, ownership becomes unclear and coupling grows quickly |
| Organize by technical layer (`controllers/`, `services/`, `repositories/` at the top level) | One feature's files end up spread across many folders. Organizing by feature matches how the requirements and the work assignments are grouped |

## Rationale

- **One database transaction** can cover a whole use case (join + count + notification), which is the simplest way to stay correct.
- Each team member can own a module, which lines up with the FR groups.
- Running locally, debugging and deploying each involve a single process.
- If one area ever needed to be pulled out into its own service, clear module boundaries keep that option open. It isn't expected.

## Consequences / tradeoffs

- Module boundaries are enforced by convention and code review, not by the runtime. Reviewers must reject imports that go directly into another module's repository.
- All modules deploy together, so a bug in one area means redeploying everything. That's acceptable at this scale.
- The `activities` module is the largest. It's split internally into an activity service and a participation service to keep files manageable.
