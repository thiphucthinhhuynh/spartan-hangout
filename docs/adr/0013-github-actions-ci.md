# ADR-0013: GitHub Actions for continuous integration

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

Four people will merge pull requests into `main`. Broken builds, type errors or failing tests should be caught before merging, not at demo time.

## Decision

Add one workflow, `.github/workflows/ci.yml`, that runs on every pull request and on every push to `main`:

1. Check out the code and set up the Node LTS version from `.nvmrc`, with an npm cache.
2. `npm ci`
3. `npm run lint`
4. `npm run typecheck` (`tsc --noEmit` in every workspace)
5. `npm run build`
6. `npm test`, with a **PostgreSQL service container** and `prisma migrate deploy` run against the test database first.

The `main` branch is protected: a PR needs CI passing and one teammate's approval.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| No CI, test locally | Easy to forget, and inconsistent across machines |
| Other CI services (CircleCI, GitLab CI) | The repo is on GitHub, and Actions is required and free for this use |
| Automatic deployment from CI | Deferred until the hosting provider is chosen (M14, [Q23](../open-questions.md#q23-hosting-and-email-provider)) |

## Rationale

Required by the stack, built into GitHub, and the service container makes database-backed tests possible without extra setup.

## Consequences / tradeoffs

- CI time grows as tests are added. Keep the test database small and truncate it rather than recreating it.
- The PostgreSQL version must match between `docker-compose.yml` and the workflow.
