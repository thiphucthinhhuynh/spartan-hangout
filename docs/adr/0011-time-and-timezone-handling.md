# ADR-0011: Time and timezone handling

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

- Availability slots are a **day of the week plus start and end times** (FR02). These are wall-clock values, not instants.
- Recommendations require an activity's whole time span to fall inside a slot "for the day of the week on which the activity occurs" (FR14d).
- Activities must start in the future, and end after the start on the **same date** (FR27).
- Many rules depend on "has started" or "has ended" (FR20, FR21b, FR24, FR29, FR31, FR33).
- A 24-hour link expiry (FR03), a 30-minute idle timeout (FR10) and a 15-minute lockout (FR11) also depend on time.

SJSU is in San José, so every user shares one campus timezone. The FRs don't state a timezone ([Q20](../open-questions.md#q20-timezone)).

## Decision

- Store **instants** (`start_at`, `end_at`, every `*_at`) as `timestamptz` in UTC.
- Store **availability** as `day_of_week` (0–6) plus `start_minute` and `end_minute` (minutes after local midnight).
- One configured **campus timezone**, `CAMPUS_TIMEZONE=America/Los_Angeles`.
- **Input:** activity forms send `date`, `startTime` and `endTime` in campus-local time. The server converts them to UTC with a small helper in `common/time.ts` built on `Intl.DateTimeFormat`, so it handles daylight saving time.
- **Matching (FR14d):** done in SQL with `EXTRACT(DOW FROM start_at AT TIME ZONE :tz)` and the local minute of day.
- **Display:** the client formats with `Intl.DateTimeFormat(..., { timeZone: 'America/Los_Angeles' })`.
- **Clock injection:** services get `clock.now()` instead of calling `new Date()` directly, so time-based rules can be tested.
- No date library.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Store local times without a timezone | Breaks "now" comparisons and daylight saving time |
| Use each browser's local timezone | A student visiting from elsewhere would see the wrong times for a campus event |
| A date library (date-fns-tz, Luxon, Day.js) | Built-in `Intl` and PostgreSQL `AT TIME ZONE` cover the needs. If the helper turns out to be error-prone, adding a library would need a new ADR |

## Rationale

One campus timezone matches the domain. UTC storage keeps comparisons correct, and storing availability as wall-clock values matches how students think about their schedules.

## Consequences / tradeoffs

- Activities that cross midnight can't be created, because FR27 requires the same date.
- The local→UTC helper must be unit-tested around the March and November daylight-saving changes. This is noted for the future testing work.
- If the app ever served several campuses, the timezone would have to become a per-activity field.
