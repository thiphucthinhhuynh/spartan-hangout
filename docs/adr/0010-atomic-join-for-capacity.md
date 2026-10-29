# ADR-0010: Atomic conditional update to enforce activity capacity

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

FR23: "If multiple students attempt to take the last open spot at the same time, the system shall accept only one student and reject the others with the message 'This activity is full.'" The team's US08 design diagrams already include an "atomically verify activity capacity" / "reserve spot atomically" step. A naive *read count → check → insert* sequence lets two requests both see one free spot.

## Decision

Inside the join transaction, after the FR21 condition checks:

```sql
UPDATE activity
SET participant_count = participant_count + 1,
    status = CASE WHEN participant_count + 1 = participant_limit THEN 'FULL' ELSE status END
WHERE id = $1
  AND status = 'OPEN'
  AND participant_count < participant_limit
  AND start_at > now()
RETURNING *;
```

- `updated_at` is not touched: it is the "last updated" time of organizer edits (FR30), and a join isn't an edit. (Changed during M6.)
- 0 rows → roll back, return `409 ACTIVITY_FULL` ("This activity is full."). If the reason is actually a status change or start time, the service reports that more specific reason.
- 1 row → insert the `participation` row (its PK `(activity_id, user_id)` blocks duplicates), create the organizer notification, commit.

Leave, remove and limit edits use the same pattern: one conditional `UPDATE` that changes the count and recomputes the status in the same statement. Backstop: `CHECK (participant_count <= participant_limit)`.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| `SELECT … FOR UPDATE` then update | Also correct, but takes two round trips and is easier to get wrong (forgetting the lock) |
| `SERIALIZABLE` isolation with retry | Correct but needs retry loops. Overkill for one hot row |
| Count `participation` rows instead of storing a count | The count must still be locked to be safe, and FR22/FR25 already speak of a participant count |
| Application-level mutex | Breaks with more than one process and doesn't protect against other writers |

## Rationale

A single conditional `UPDATE` is atomic in PostgreSQL. A concurrent second update waits for the row lock, re-checks the `WHERE` clause against the committed row, and matches nothing. It's correct, fast and easy to read.

## Consequences / tradeoffs

- Needs `$queryRaw` (Prisma can't express the `CASE`), so the result type is declared by hand.
- `participant_count` is denormalized. Every path that changes participation must also update the count in the same transaction. A future integration test should check that the count matches the number of rows.
- A concurrency test (several parallel joins for the last spot → exactly one success) is planned for the future testing work (ADR-0014).
