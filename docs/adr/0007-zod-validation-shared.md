# ADR-0007: Shared Zod schemas for client and server validation

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

Several FRs require the system to "prevent submission until every field is valid and identify each missing or invalid field" (FR02, FR06, FR27), with precise limits: display name 1–50, password ≥ 8 with a letter and a number, title 1–100, description 1–500, participant limit 2–100, messages 1–500, and so on. The server must enforce these too, because the client can't be trusted.

## Decision

- Write one **Zod schema per request** in `packages/shared/src/schemas`. Numeric limits come from `constants.ts`.
- **Client:** forms call `schema.safeParse(values)` and show `error.flatten().fieldErrors` next to each field. The submit button stays disabled until the data is valid.
- **Server:** the `validate({ body, query, params })` middleware parses with the same schema and responds `422 VALIDATION_FAILED` with `fields`.
- **Environment config** is also validated with Zod at startup (`config/env.ts`).
- Rules that need the database or the current time (email already used, start in the future, limit ≥ current count, duplicate pending report) live in services and use the same error shape.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Separate client and server validation | Two definitions of every rule, which will eventually disagree |
| `express-validator` / Joi on the server only | Can't be reused in the browser |
| JSON Schema + Ajv | More verbose, and you don't get TypeScript types from it as naturally |

## Rationale

Zod is part of the required stack. `z.infer` gives TypeScript types for free, and sharing the schemas guarantees the client and server agree.

## Consequences / tradeoffs

- Error message wording is set in the shared schemas, so changing the wording changes both sides at once.
- "Start time in the future" depends on the clock. The client checks it for quick feedback, but the server's check is authoritative.
- Schemas must avoid browser-only or Node-only APIs.
