# ADR-0003: React SPA organized by feature

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

The required frontend stack is React, TypeScript, React Router and TanStack Query. The UI mockups show a mobile-first app with a bottom tab bar (Discover, My plans, Inbox, Profile) and several screens for each feature area. Every page needs a logged-in user except login and registration (FR10).

## Decision

- A **single-page application** built with **Vite**. Vite is the build tool that compiles TypeScript and JSX; it is not an application framework.
- **React Router** (data-router API) for routes, nested layouts (`AppShell` with header and bottom nav) and an auth guard.
- Code is **organized by feature** under `src/features/<feature>/`. Each feature has its pages, components and an `api.ts` of TanStack Query hooks. Truly shared UI lives in `src/components/` and helpers in `src/lib/`.
- **Styling:** CSS Modules (built into Vite) plus global CSS custom properties for the design tokens in the mockups (SJSU blue `#0055A2`, gold `#E5A823`, and so on). No CSS framework.
- **Responsive, mobile-first:** one web app for phones, tablets and desktops (open question Q25). Phone styles come first, and media queries at 768px and 1024px add the tablet rail and desktop sidebar layouts (architecture §12.3). There is no separate native app.
- **Forms:** controlled inputs with `useState`, validated with the shared Zod schemas (ADR-0007) through a tiny `zodForm` helper. No form library.
- **Dates:** the built-in `Intl.DateTimeFormat` with `timeZone: 'America/Los_Angeles'` (ADR-0011).

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Next.js / Remix (server-rendered React frameworks) | They add a second server runtime that overlaps with Express. The app is behind a login, so there's no SEO need for server rendering |
| Create React App | Deprecated |
| Organize by type (`pages/`, `components/`, `hooks/`) | Spreads one feature across folders and makes ownership less clear |
| Tailwind / component libraries (MUI, Chakra) | Extra frameworks. The mockups use a small set of components that are easy to write with CSS Modules |
| React Hook Form / Formik | Not needed for forms of this size. Zod already provides the validation |

## Rationale

The setup uses the required libraries and nothing more. Organizing by feature mirrors the backend modules and the team's work split.

## Consequences / tradeoffs

- The team writes its own small UI components (Button, Chip, Card, Dialog, SpotsBar). This costs a little time in M0 and M4.
- No SSR, so the first load shows a brief loading state while `GET /auth/me` resolves.
- If forms become painful later, adopting a form library would need a new ADR.
