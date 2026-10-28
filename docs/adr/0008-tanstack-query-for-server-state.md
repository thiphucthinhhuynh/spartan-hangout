# ADR-0008: TanStack Query for server state; React state for UI state

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

Most of what the UI shows comes from the server: activities, participants, profiles, connections, notifications and messages. Many actions change several views at once. Joining, for example, changes the activity detail, My plans and Recommended (FR14e). Lists must reflect profile changes the next time they're shown (FR15). Chat and notifications need periodic refresh (ADR-0004).

## Decision

- **TanStack Query** owns all server state. Each feature's `api.ts` defines `useQuery` and `useMutation` hooks. All query keys are defined in `lib/queryKeys.ts`.
- **Mutations invalidate** the affected keys. Examples:
  - join/leave → `['activity', id]`, `['activities','mine']`, `['activities','recommended']`, `['participants', id]`
  - profile edit → `['me']`, `['activities','recommended']`, `['connections','discover']`
- **Polling** with `refetchInterval` for open chat and DM threads and for the unread count.
- **Auth state** is just the `['me']` query. A `401` clears the cache and redirects to `/login`.
- **Local UI state** (dialogs, form fields, tabs, filters being edited) uses `useState` and `useReducer`. Search criteria are kept in URL search params.
- **No global client store.**

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Redux / Redux Toolkit (incl. RTK Query) | Adds a global store and boilerplate. Server caching is already handled by TanStack Query |
| Zustand / Context-based stores | No client-only shared state needs one. Context is used only where providers require it |
| Plain `useEffect` + `fetch` | Every view would reimplement caching, deduplication, refetching and invalidation |

## Rationale

The required library already solves caching, refetching, polling and invalidation, and the app's remaining state is local to components.

## Consequences / tradeoffs

- Invalidation lists need care. A missed key shows stale data until the next refetch. Keeping keys in one file reduces mistakes.
- Optimistic updates are not planned. After a mutation the UI waits for the server, which keeps capacity and status rules authoritative.
