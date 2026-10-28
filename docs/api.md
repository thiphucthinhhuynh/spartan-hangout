# REST API (planned)

> Status: **planned**. Nothing here is implemented yet. Design rationale: [ADR-0004](adr/0004-rest-api.md).

## Conventions

| Topic | Convention |
|---|---|
| Base path | `/api/v1` |
| Format | JSON request and response bodies (`Content-Type: application/json`) |
| Auth | Session cookie `sh_sid` ([ADR-0009](adr/0009-session-based-authentication.md)). **Auth column:** `Public` = no session needed; `Student` = any logged-in user; `Admin` = role ADMIN |
| Validation | Request bodies and queries are validated with the shared Zod schema named in each row (`packages/shared/src/schemas`) |
| Times | Responses use ISO-8601 UTC strings. Activity create and edit take `date` (`YYYY-MM-DD`), `startTime` and `endTime` (`HH:mm`) in campus-local time ([ADR-0011](adr/0011-time-and-timezone-handling.md)) |
| Lists | `?page=1&pageSize=20` (max 50) → `{ items, page, pageSize, hasMore }`. Chat and DM threads return the full history and accept `?after=<messageId>` for polling |
| Block-hidden | Resources hidden by a block (FR57) return `404 NOT_FOUND` |
| CSRF | A non-GET request whose `Origin` header is not the web app's origin gets `403 FORBIDDEN` (architecture §13) |
| Common errors | Every `Student`/`Admin` endpoint can also return `401 UNAUTHENTICATED` (no session or session expired, FR10) and `422 VALIDATION_FAILED`. These aren't repeated in the tables below |

## Errors

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Please fix the highlighted fields.", "fields": { "title": "Title must be 1–100 characters." } } }
```

| HTTP | Code | Meaning |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Not logged in, or session expired (FR10) |
| 401 | `INVALID_CREDENTIALS` | Generic login failure (FR09) |
| 403 | `EMAIL_NOT_VERIFIED` | Login attempt before verification (FR09) |
| 403 | `FORBIDDEN` | Logged in but not allowed (not organizer, not participant, not admin, own resource) |
| 404 | `NOT_FOUND` | Doesn't exist, or hidden by a block |
| 409 | `EMAIL_TAKEN` | Email already linked to an account (FR01) |
| 409 | `ACTIVITY_FULL` | `"This activity is full."` (FR23) |
| 409 | `ACTIVITY_NOT_OPEN` | Status isn't Open (FR21a), or isn't Open/Full for leave, edit, cancel or remove |
| 409 | `ACTIVITY_STARTED` | Start time has passed (FR21b, FR24, FR29, FR31, FR33) |
| 409 | `ALREADY_PARTICIPANT` | FR21c |
| 409 | `REMOVED_FROM_ACTIVITY` | The organizer removed this student (FR21d) |
| 409 | `JOIN_NOT_ALLOWED` | A block exists in either direction (FR21e). The wording is [Q12](open-questions.md#q12-reason-shown-when-a-block-prevents-joining) |
| 409 | `LIMIT_BELOW_COUNT` | FR30 |
| 409 | `CHAT_READ_ONLY` | The activity is Cancelled or Completed (FR37) |
| 409 | `CONNECTION_NOT_ALLOWED` | FR45 conditions |
| 409 | `NOT_CONNECTED` | DM without an active connection (FR48) |
| 409 | `DUPLICATE_PENDING_REPORT` | FR51 |
| 410 | `TOKEN_EXPIRED` | Verification link older than 24 h (FR03) |
| 422 | `VALIDATION_FAILED` | One or more invalid fields, listed in `fields` (FR02, FR06, FR27, FR36…) |
| 423 | `ACCOUNT_LOCKED` | FR11 |
| 500 | `INTERNAL_ERROR` | Unexpected error; no details exposed |

---

## Health

| Method & route | Purpose | Auth | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /health` | Liveness and DB check for CI and hosting | Public | – | `200 { status: "ok" }` | `503` if the DB is unreachable |

## Auth module: FR01–FR04, FR09–FR11

| Method & route | Purpose | Auth | Request | Response | Important errors |
|---|---|---|---|---|---|
| `POST /auth/register` | Start registration; create an inactive account and email the link | Public | `registerSchema`: `{ email, password, displayName, interests: ActivityType[], availability: { dayOfWeek, start: "HH:mm", end: "HH:mm" }[] }` | `201 { message }` | `422 VALIDATION_FAILED` (each invalid field; a non-`@sjsu.edu` email is reported on `fields.email` with the reason, FR01), `409 EMAIL_TAKEN` (also for an account still waiting for verification, [Q15](open-questions.md#q15-registering-again-with-an-unverified-email)) |
| `POST /auth/verify-email` | Activate the account from the emailed link | Public | `{ token }` | `200 { message }` | `410 TOKEN_EXPIRED`, `404 NOT_FOUND` (unknown, used, or replaced by a newer link) |
| `POST /auth/resend-verification` | Send a new link (FR03); earlier unused links stop working | Public | `{ email }` | `202 { message }` (same response whether the email exists or not) | `422 VALIDATION_FAILED` |
| `POST /auth/login` | Authenticate and start a session | Public | `loginSchema`: `{ email, password }` | `200 MeDto` + `Set-Cookie: sh_sid` (HttpOnly, SameSite=Lax, Max-Age 30 min renewed on use) | `401 INVALID_CREDENTIALS` (unknown email or wrong password, same message), `403 EMAIL_NOT_VERIFIED` (only after a correct password), `423 ACCOUNT_LOCKED` (5 failures in 15 min; minutes remaining in the message) |
| `POST /auth/logout` | End the session | Student | – | `204` (clears cookie) | – |
| `GET /auth/me` | Current user, used by the client's auth guard | Student | – | `200 MeDto { id, displayName, role }` | `401` |

## Users module: FR05–FR08, FR12–FR13

| Method & route | Purpose | Auth | Request | Response | Important errors |
|---|---|---|---|---|---|
| `GET /users/me` | View own profile (FR12) | Student | – | `200 OwnProfileDto { id, email, displayName, interests, availability, updatedAt }` | – |
| `PATCH /users/me` | Edit display name, interests, availability (FR05–FR06). Email can't be edited: an `email` key is ignored | Student | `profileUpdateSchema`: one or more of `{ displayName, interests, availability }`, same rules as registration; `availability` replaces all slots | `200 OwnProfileDto` (`updatedAt` = time of this edit) | `422 VALIDATION_FAILED` (each invalid field; nothing is saved) |
| `DELETE /users/me` | Permanently remove the account (FR07–FR08) | Student | `{ password }` | `204` (clears cookie) | `401 INVALID_CREDENTIALS` (wrong password) |
| `GET /users/:id` | View another student's profile (FR13) | Student | – | `200 PublicProfileDto { id, displayName, interests: { type, shared }[], availability, connectionState }`. **No email.** `connectionState` is `none` or `connected` until connection requests arrive (M9) | `404 NOT_FOUND`, the same body whether the student is missing, unverified, blocked in either direction (FR57), or the id is malformed |

## Activities module: activities (FR14–FR18, FR20, FR26–FR32)

| Method & route | Purpose | Auth | Request | Response | Important errors |
|---|---|---|---|---|---|
| `POST /activities` | Create an activity; the creator becomes organizer and first participant (FR26–FR28) | Student | `activityCreateSchema`: `{ title, description, type, date, startTime, endTime, location, participantLimit }` | `201 ActivityDetailDto` | `422 VALIDATION_FAILED` (each field; start in the past; end ≤ start) |
| `GET /activities` | Search (FR16–FR17) | Student | query `activitySearchSchema`: `type?, fromDate?, toDate?, earliestStart?, latestStart?, location?, page?, pageSize?` | `200 { items: ActivityCardDto[] … }`, soonest first; empty `items` → UI shows "No activities found." | `422` |
| `GET /activities/recommended` | Recommended list (FR14–FR15) | Student | `page?, pageSize?` | `200 { items: ActivityCardDto[] … }`, soonest first; empty → "No matching activities found." | – |
| `GET /activities/mine` | The student's own joined and organized activities ("My plans", the FR18 entry point) | Student | `role=joined\|organizing`, `when=upcoming\|past` | `200 { items: ActivityCardDto[] … }` | – |
| `GET /activities/:id` | Activity detail view (FR18) | Student | – | `200 ActivityDetailDto` | `404` (missing; or Cancelled/Completed and the viewer isn't a participant or the organizer, FR20/FR32) |
| `PATCH /activities/:id` | Organizer edits (FR29–FR30); notifies participants of title, type, date, time or location changes (FR40a) | Student (organizer) | `activityUpdateSchema`: any create field | `200 ActivityDetailDto` | `403 FORBIDDEN`, `409 ACTIVITY_NOT_OPEN`, `409 ACTIVITY_STARTED`, `409 LIMIT_BELOW_COUNT`, `422` |
| `POST /activities/:id/cancel` | Organizer cancels (FR31–FR32); notifies participants | Student (organizer) | `{ reason?: string ≤ 200 }` | `200 ActivityDetailDto (status CANCELLED)` | `403`, `409 ACTIVITY_NOT_OPEN`, `409 ACTIVITY_STARTED` |

## Activities module: participation (FR19, FR21–FR25, FR33–FR34)

| Method & route | Purpose | Auth | Request | Response | Important errors |
|---|---|---|---|---|---|
| `GET /activities/:id/participants` | Participant list; the organizer is labeled (FR19) | Student | – | `200 ParticipantDto[] { userId, displayName, isOrganizer }` | `404` |
| `POST /activities/:id/join` | Join (FR21–FR23) | Student | – | `200 ActivityDetailDto` | `409 ACTIVITY_FULL`, `ACTIVITY_NOT_OPEN`, `ACTIVITY_STARTED`, `ALREADY_PARTICIPANT`, `REMOVED_FROM_ACTIVITY`, `JOIN_NOT_ALLOWED` |
| `POST /activities/:id/leave` | Leave after confirming in the UI (FR24–FR25) | Student (non-organizer participant) | – | `200 ActivityDetailDto` | `403` (organizer can't leave), `404` (not a participant), `409 ACTIVITY_NOT_OPEN`, `ACTIVITY_STARTED` |
| `DELETE /activities/:id/participants/:userId` | Organizer removes a participant (FR33–FR34) | Student (organizer) | `{ reason?: string ≤ 200 }` | `204` | `403` (not organizer, or target is the organizer), `404`, `409 ACTIVITY_NOT_OPEN`, `ACTIVITY_STARTED` |

`ActivityCardDto`: `{ id, title, type, startAt, endAt, location, openSpots, status, organizer: { id|null, displayName } }`. FR15 and FR17 require title, type, date, start and end time, location, and open spots.
`ActivityDetailDto`: the card fields plus `{ description, participantLimit, participantCount, cancellationReason, viewerRole: 'organizer'|'participant'|'none', canJoin, joinBlockedReason, canLeave, canEdit, canCancel, canReport }` (FR18).

## Messages module: activity chat and updates (FR35–FR39)

| Method & route | Purpose | Auth | Request | Response | Important errors |
|---|---|---|---|---|---|
| `GET /activities/:id/messages` | Read the group chat, oldest first (FR35–FR36). Messages from students the viewer blocked are left out (FR55c) | Student (current participant) | `after?` (message id, for polling) | `200 ActivityMessageDto[] { id, kind, body, createdAt, sender: { id|null, displayName } }` | `403` (not a participant), `404` |
| `POST /activities/:id/messages` | Send a chat message (FR36) | Student (current participant) | `messageSchema`: `{ body }` 1–500 | `201 ActivityMessageDto` | `403`, `409 CHAT_READ_ONLY`, `422` |
| `POST /activities/:id/updates` | Organizer posts an "Update" and notifies participants (FR38–FR39) | Student (organizer) | `messageSchema`: `{ body }` 1–500 | `201 ActivityMessageDto (kind UPDATE)` | `403`, `409 ACTIVITY_NOT_OPEN`, `422` |

## Messages module: direct messages (FR47–FR49)

| Method & route | Purpose | Auth | Request | Response | Important errors |
|---|---|---|---|---|---|
| `GET /conversations` | List conversations, most recent first (FR49) | Student | – | `200 ConversationSummaryDto[] { otherUser, lastMessage, lastMessageAt }` | – |
| `GET /conversations/:userId/messages` | Read a DM thread (FR47–FR48) | Student (connected) | `after?` | `200 DirectMessageDto[] { id, body, createdAt, sender }` | `409 NOT_CONNECTED`, `404` |
| `POST /conversations/:userId/messages` | Send a DM; notifies the recipient (FR47, FR49) | Student (connected) | `messageSchema`: `{ body }` | `201 DirectMessageDto` | `409 NOT_CONNECTED`, `404`, `422` |

## Notifications module: FR40–FR42

| Method & route | Purpose | Auth | Request | Response | Important errors |
|---|---|---|---|---|---|
| `GET /notifications` | List, newest first (FR42) | Student | `page?, pageSize?` | `200 { items: NotificationDto[] … }`. `NotificationDto { id, type, activityId, activityTitle, conversationUserId, body, createdAt, read }` | – |
| `GET /notifications/unread-count` | Badge count (FR42) | Student | – | `200 { count }` | – |
| `POST /notifications/:id/read` | Mark read when opened (FR42) | Student (recipient) | – | `204` | `404` |

## Connections module: FR43–FR46

| Method & route | Purpose | Auth | Request | Response | Important errors |
|---|---|---|---|---|---|
| `GET /connections/discover` | Students sharing ≥ 1 interest, ordered by shared count then name (FR43–FR44); empty → "No students found." | Student | `page?, pageSize?` | `200 { items: StudentCardDto[] { id, displayName, sharedInterests } … }` | – |
| `POST /connections/requests` | Send a request; notifies the recipient (FR45) | Student | `{ recipientId }` | `201 { id }` | `409 CONNECTION_NOT_ALLOWED` (self, already connected, pending either way, blocked), `404` |
| `GET /connections/requests` | Pending requests | Student | `direction=incoming\|outgoing` | `200 ConnectionRequestDto[]` | – |
| `POST /connections/requests/:id/accept` | Accept; creates the connection and notifies the sender (FR46) | Student (recipient) | – | `204` | `404` |
| `POST /connections/requests/:id/decline` | Decline; deletes the request, sender not notified (FR46) | Student (recipient) | – | `204` | `404` |
| `GET /connections` | The student's connections (the "connection list" in FR13) | Student | – | `200 StudentCardDto[]` | – |

## Moderation module: FR50–FR57

| Method & route | Purpose | Auth | Request | Response | Important errors |
|---|---|---|---|---|---|
| `POST /reports` | Report a student or an activity (FR50–FR52) | Student | `reportSchema`: `{ targetUserId?` **or** `targetActivityId?, reason, description? ≤ 500 }` | `201 { message }` confirmation | `403` (own profile or own activity), `404`, `409 DUPLICATE_PENDING_REPORT`, `422` (no reason) |
| `POST /blocks` | Block a student after confirming in the UI (FR54–FR56) | Student | `{ userId }` | `204` | `403` (self), `404` |
| `GET /admin/reports` | View all reports with details (FR53) | Admin | `status?=PENDING\|REVIEWED`, `page?, pageSize?` | `200 { items: ReportDto[] … }` | `403` |
| `POST /admin/reports/:id/review` | Mark a Pending report Reviewed; records the admin and time (FR53) | Admin | – | `200 ReportDto` | `403`, `404`, `409` (already reviewed) |

---

## Endpoint ↔ module summary

| Module | Routes |
|---|---|
| auth | `/auth/*` |
| users | `/users/me`, `/users/:id` |
| activities | `/activities`, `/activities/recommended`, `/activities/mine`, `/activities/:id`, `/activities/:id/cancel`, `/activities/:id/participants…`, `/activities/:id/join`, `/activities/:id/leave` |
| messages | `/activities/:id/messages`, `/activities/:id/updates`, `/conversations…` |
| notifications | `/notifications…` |
| connections | `/connections…` |
| moderation | `/reports`, `/blocks`, `/admin/reports…` |

Routes are registered in this order inside `activities.routes.ts` so that `/activities/recommended` and `/activities/mine` are matched before `/activities/:id`.
