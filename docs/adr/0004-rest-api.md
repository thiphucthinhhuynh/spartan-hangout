# ADR-0004: REST + JSON API with polling (no WebSockets)

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

The client and server need a contract. Most operations are resource-oriented CRUD plus a few actions: join, leave, cancel, accept, review. Chat (FR35–FR36), direct messages (FR47) and notifications (FR42) need to show new data reasonably quickly, but the FRs don't require real-time delivery.

## Decision

- A **REST API over JSON** under `/api/v1`, grouped by module (see [api.md](../api.md)).
- Nouns for resources (`/activities/:id`). `POST` sub-resources for actions that aren't plain CRUD (`/activities/:id/join`, `/activities/:id/cancel`, `/connections/requests/:id/accept`).
- One error envelope for every failure: `{ error: { code, message, fields } }`.
- Response DTO types live in `@sh/shared`.
- **Polling, not WebSockets:** the client refetches open chat and DM threads about every 5 s, and the unread notification count about every 30 s, using TanStack Query `refetchInterval`. Chat endpoints accept `?after=<messageId>` so each poll is cheap.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| GraphQL | Adds schema tooling and a new query language for a small, stable set of screens |
| tRPC | Couples the client tightly to the server's TypeScript. REST with shared Zod and DTO types gives most of the type safety while staying a standard HTTP API that anyone can test with Supertest or curl |
| WebSockets / Socket.IO for chat and notifications | Not required by any FR. Adds connection management, authentication on the socket, and harder testing and deployment |
| Server-Sent Events | Lighter than WebSockets, but still a long-lived connection to manage. Polling is enough at campus scale |

## Rationale

REST is familiar to every team member, maps directly onto the FR actions, and is easy to test with Supertest. Polling meets the FRs with no extra infrastructure.

## Consequences / tradeoffs

- New chat messages appear after up to about 5 seconds. That's acceptable for activity coordination.
- Polling sends some empty requests. The cost is negligible at this scale, and it stops when the tab is hidden.
- If real-time delivery ever becomes a requirement, a new ADR can add it alongside REST. Writes would still go through REST.
