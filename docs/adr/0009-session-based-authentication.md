# ADR-0009: Server-side sessions stored in PostgreSQL

- **Status:** Proposed
- **Date:** 2026-10-27

## Context

- FR09: authenticate with a verified SJSU email and password, using a generic error message.
- FR10: the session lasts until **Log Out** or **30 minutes of inactivity**.
- FR11: lock the account for 15 minutes after 5 failures within 15 minutes.
- FR08e: removing the account ends the student's session.

These are easiest to meet when the server can see and revoke sessions.

## Decision

- On login, generate a random 32-byte token and set it in the cookie `sh_sid` (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production).
- Store **only its SHA-256 hash** in a `session` table (`token_hash`, `user_id`, `created_at`, `last_seen_at`).
- A middleware resolves the cookie to `req.user`. The session is valid while `now - last_seen_at < 30 min`. `last_seen_at` is refreshed at most once a minute (sliding expiry).
- Logout deletes the row. Account removal cascades the deletion (FR08e).
- Lockout counters live on the `user` row (`failed_login_count`, `first_failed_login_at`, `locked_until`).
- Passwords are hashed with argon2id or bcrypt (chosen in M1).
- CSRF: `SameSite=Lax`, JSON-only bodies, and an `Origin` check on non-GET requests.

The session middleware is about 40 lines of our own code, using Prisma and `cookie-parser`.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| JWT access tokens (stateless) | Hard to apply a 30-minute *inactivity* timeout and immediate logout or account-removal revocation without adding server state anyway. Tokens in `localStorage` are exposed to XSS |
| `express-session` + `connect-pg-simple` | Works, but stores sessions as opaque JSON, which makes "delete all sessions for this user" awkward. Our own table is just as small and fits Prisma |
| Passport.js | One local strategy doesn't need a framework |
| SJSU SSO / OAuth | Not in the requirements. FR01–FR04 specify email + password with email verification |

## Rationale

Server-side sessions match FR10 and FR08e directly, are simple to explain, and keep secrets out of JavaScript-readable storage.

## Consequences / tradeoffs

- Every authenticated request does a session lookup (one indexed query). That's fine at this scale.
- Expired session rows pile up. They're harmless because lookups check `last_seen_at`. A cleanup can be added to the scheduled job if needed.
- Because the app is same-origin (dev proxy and production), no CORS configuration is needed.
