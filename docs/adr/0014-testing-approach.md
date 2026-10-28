# ADR-0014: Testing approach: Vitest + Supertest

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

The architecture must stay testable. The **detailed product test cases** (feature tests, robustness tests, exact test data, step-by-step instructions) are a **separate CMPE 131 team assignment** and are deliberately not designed in this ADR. This ADR only fixes the tools and where tests go.

## Decision

- **Vitest** is the test runner for `packages/shared`, `apps/api` and `apps/web`.
- **Supertest** runs HTTP-level integration tests against `createApp()`, which `app.ts` exports separately from `server.ts`, so tests don't need to bind a port.
- Integration tests use a real PostgreSQL database (`spartan_hangout_test`, ADR-0012) with migrations applied. Tables are truncated between test files.
- Tests sit near the code they test:
  - `packages/shared/src/**/*.test.ts`: schema rules
  - `apps/api/src/**/*.test.ts`: service and helper unit tests, using injected fakes and the `clock`
  - `apps/api/test/integration/*.test.ts`: endpoint tests
  - `apps/web/src/**/*.test.ts`: pure helpers (formatting, `zodForm`)
- **M0** only sets up the runner, the test database and one smoke test (`GET /health`). Real tests are added milestone by milestone, and the comprehensive cases come from the team's testing assignment.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Jest | Works, but needs extra configuration for ESM and TypeScript. Vitest fits the Vite-based frontend and the same config style |
| Mocking Prisma for every test | Misses real SQL behavior: constraints, raw queries, the FR23 race. Integration tests use a real database instead |
| Browser end-to-end tools (Playwright, Cypress) | Extra tooling that isn't in the required stack. Revisit only if the team's testing assignment calls for it |
| A component-testing library (React Testing Library) | Undecided. See [Q24](../open-questions.md#q24-frontend-component-testing) |

## Rationale

Both tools are in the required stack. Business logic in services with injected dependencies, `createApp()` without a listening server, and a disposable test database together give the team every hook it will need later.

## Consequences / tradeoffs

- Integration tests need Docker locally (CI uses a service container).
- Integration tests run one file at a time against a shared test database (`--no-file-parallelism` or a single worker), so they're slower than unit tests.
