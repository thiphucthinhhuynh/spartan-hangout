# ADR-0005: PostgreSQL with Prisma ORM

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

The data is strongly relational: users, activities, participation, connections, blocks, reports. Correctness depends on transactions and constraints: capacity (FR23), unique participation (FR21c), one pending request per pair (FR45), one pending report per target (FR51), and cascading deletes on account removal (FR08). PostgreSQL and Prisma are the required stack.

## Decision

- **PostgreSQL** is the only datastore. It holds application data, sessions (ADR-0009) and notifications.
- **Prisma** manages the schema (`schema.prisma`), migrations (`prisma migrate`) and typed queries.
- Use the Prisma query API by default. Use **parameterized `$queryRaw`** (tagged templates) only where the query API can't express the query:
  - the atomic join update (ADR-0010)
  - timezone-aware recommendation matching (FR14d, ADR-0011)
  - the discover ordering by number of shared interests (FR44)
- Multi-row use cases run in interactive transactions (`$transaction(async tx => …)`). The `tx` client is passed down to repositories and to the notifications service.
- Put integrity rules in the database wherever practical: foreign keys with the right `ON DELETE` behavior, `CHECK` constraints, unique and partial-unique indexes. Prisma can't express some of these (CHECK constraints, partial indexes), so they are added as SQL inside the generated migration files.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| MongoDB / document store | Relationships and multi-document transactions are central to this app. A relational model fits better |
| Raw `pg` driver with hand-written SQL everywhere | More boilerplate and no typed results. Prisma still allows raw SQL where it's needed |
| TypeORM / Sequelize / Drizzle | Valid options, but Prisma is the required ORM and has the gentlest learning curve for the team |

## Rationale

PostgreSQL gives the transactional guarantees the risky FRs need. Prisma gives every team member type-safe queries and readable migrations.

## Consequences / tradeoffs

- Raw SQL queries lose some of Prisma's type inference, so their result types must be declared by hand and covered by integration tests.
- SQL added by hand to migrations (CHECKs, partial indexes) has to be kept in sync with `schema.prisma` comments so people know it's there.
- Tests that hit the database need a real PostgreSQL (ADR-0012, ADR-0014).
