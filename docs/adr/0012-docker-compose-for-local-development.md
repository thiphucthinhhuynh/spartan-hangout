# ADR-0012: Docker Compose for local development

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

Four developers, likely on different operating systems (including WSL), need the same PostgreSQL version. Future integration tests need a database that can be wiped freely, separate from development data.

## Decision

- `docker-compose.yml` runs **one PostgreSQL service** (`postgres:17-alpine`, the same image CI uses), with a named volume and port 5432.
- An init script creates two databases: `spartan_hangout` (development) and `spartan_hangout_test` (tests).
- The API and web app run on the host (`npm run dev`) for fast hot reload. They are **not** containerized for development.
- Verification emails use a **console transport** in development (the link is printed in the API log), so no mail container is needed.
- `.env.example` documents every variable. `.env` is git-ignored.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Everyone installs PostgreSQL natively | Versions and setup steps differ by OS, causing "works on my machine" problems |
| Run the apps inside Compose too | Slower file watching (especially on WSL/macOS) and harder debugging, with no real benefit for this team |
| Hosted dev database | Requires network access, gets shared and polluted between developers, and costs money |
| Add a mail-catcher container | Not needed. Printing the link to the console is enough to complete verification locally |

## Rationale

Docker Compose is part of the required stack. One container gives everyone an identical database with a single command.

## Consequences / tradeoffs

- Developers need Docker installed.
- Production has no Compose file. Deployment is decided separately (M14).
- `npm run db:reset` must point at the dev database. Tests must only ever use `DATABASE_URL_TEST`.
