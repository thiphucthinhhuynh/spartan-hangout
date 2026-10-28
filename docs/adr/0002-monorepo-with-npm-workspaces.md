# ADR-0002: Monorepo with npm workspaces

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

The frontend and backend must agree on request shapes, validation rules (FR02, FR06, FR27 require the same per-field errors on both sides), enum values (activity types, statuses, report reasons) and user-facing messages that the FRs quote word for word (`"This activity is full."`). Keeping two separate copies would let them drift apart.

## Decision

Use one Git repository with **npm workspaces**:

- `apps/web`: React SPA
- `apps/api`: Express API
- `packages/shared` (`@sh/shared`): Zod schemas, enums, constants, messages and DTO types. Its only dependency is `zod`.

Root scripts (`dev`, `build`, `lint`, `test`) run across workspaces.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Two repositories (frontend and backend) | Shared code would need publishing or copy-paste; one change would need two coordinated PRs |
| pnpm / Yarn workspaces, Nx, Turborepo | They work, but they're one more tool for everyone to install and learn. npm workspaces come with Node and are enough for three packages |
| No shared package (duplicate the types) | Drift is likely, and FR wording and limits would be defined in two places |

## Rationale

The simplest setup that gives one source of truth for validation and types. It needs no tooling beyond npm.

## Consequences / tradeoffs

- The shared package must stay environment-neutral: no Node APIs and no DOM APIs.
- Changing a shared schema affects both apps in the same PR, which is the point, but reviewers should check both sides.
- The build order matters (shared before the apps). The root `build` script handles that.
