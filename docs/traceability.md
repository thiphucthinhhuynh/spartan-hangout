# Requirements Traceability

Maps every functional requirement (FR01–FR57, from the *Functional Level Requirements* document) to the planned design. No requirements are added here.

**Verification area** shows where automated or manual verification is *planned*. The specific test cases are the team's separate testing assignment ([roadmap task 137](roadmap.md#m14--testing-stabilization--release)).
Abbreviations: **Unit-S** = shared Zod schema unit tests · **Unit-Svc** = service unit tests (fake clock/collaborators) · **Int** = API integration tests (Supertest + test DB) · **Manual** = manual UI test from the team's test-case document.

**Status** stays `Planned` until the feature is merged, then becomes `Implemented`, then `Verified` once its tests pass (task 140).

| FR | Summary | Module | API endpoint(s) | Milestone | Verification area | Status |
|---|---|---|---|---|---|---|
| FR01 | Register only with `@sjsu.edu`; reject other domains and already-linked emails with a reason | auth | `POST /auth/register` | M1 | Unit-S, Int | Planned |
| FR02 | Registration fields and rules (name 1–50, password rule, ≥ 1 interest, ≥ 1 valid slot); identify each invalid field | auth, shared | `POST /auth/register` | M1 | Unit-S, Int, Manual | Planned |
| FR03 | Send verification link; inactive until used; 24-hour expiry; request a new link | auth | `POST /auth/register`, `POST /auth/verify-email`, `POST /auth/resend-verification` | M1 | Unit-Svc, Int | Planned |
| FR04 | Create an active profile after verification; email not shown to others | auth, users | `POST /auth/verify-email`, `GET /users/:id` | M1 (M3 for the public view) | Int | Planned |
| FR05 | Edit display name, interests, availability; email not editable | users | `PATCH /users/me` | M3 | Int, Manual | Planned |
| FR06 | Validate edits like registration; update in place; record last-updated; save nothing if invalid | users | `PATCH /users/me` | M3 | Unit-S, Int | Planned |
| FR07 | Remove account from the profile page with a permanent-removal warning and password | users | `DELETE /users/me` | M13 | Int, Manual | Planned |
| FR08 | Removal effects (a)–(e); email reusable afterwards | users (+ activities, connections, messages via services) | `DELETE /users/me` | M13 | Int | Planned |
| FR09 | Authenticate verified email + password; generic error; no login if unverified | auth | `POST /auth/login` | M2 | Unit-Svc, Int | Planned |
| FR10 | Session lasts until Log Out or 30 minutes idle; then login is required | auth (common/auth) | `POST /auth/logout`, `GET /auth/me`, all protected routes | M2 | Unit-Svc, Int | Planned |
| FR11 | 15-minute lock after 5 failures in 15 minutes; reset on success or expiry | auth | `POST /auth/login` | M2 | Unit-Svc, Int | Planned |
| FR12 | View own profile with email, interests, availability, edit and remove actions | users | `GET /users/me` | M3 (remove action M13) | Int, Manual | Planned |
| FR13 | View others' profiles (from the participant list, Discover, connections, conversations); shared interests marked; Connect, Report, Block; no email | users | `GET /users/:id` | M3 (actions M9, M11, M12) | Int, Manual | Planned |
| FR14 | Recommended list conditions (a)–(f) | activities | `GET /activities/recommended` | M5 | Int | Planned |
| FR15 | Recommended ordering, fields shown, open detail, "No matching activities found.", reflects profile changes | activities | `GET /activities/recommended` | M5 | Int, Manual | Planned |
| FR16 | Search by any combination of type, date range, start-time range, location; clear criteria | activities, shared | `GET /activities` | M5 | Unit-S, Int, Manual | Planned |
| FR17 | Search results: Open, future, no blocked organizers; ordering; fields; "No activities found." | activities | `GET /activities` | M5 | Int | Planned |
| FR18 | Activity detail view from every entry point with all listed fields and status | activities | `GET /activities/:id`, `GET /activities/mine` | M4 (My plans M6) | Int, Manual | Planned |
| FR19 | Detail view lists participants, organizer labeled; names open profiles | activities (participation) | `GET /activities/:id/participants` | M6 | Int, Manual | Planned |
| FR20 | Status becomes Completed after the end time; Completed/Cancelled hidden from lists but viewable by members | activities, jobs | `GET /activities/:id`, scheduled job | M4 | Unit-Svc, Int | Planned |
| FR21 | Join only when conditions (a)–(e) hold; otherwise show the reason | activities (participation), common/relationships | `POST /activities/:id/join` | M6 | Unit-Svc, Int | Planned |
| FR22 | On join: add participant, count +1, Full at limit, chat access, notify organizer | activities (participation), notifications | `POST /activities/:id/join` | M6 | Int | Planned |
| FR23 | Concurrent last-spot joins: exactly one succeeds, others get "This activity is full." | activities (participation) | `POST /activities/:id/join` | M6 | Int (concurrency) | Planned |
| FR24 | Non-organizer participants can leave Open/Full, not-started activities after confirming; no Leave for the organizer | activities (participation) | `POST /activities/:id/leave` | M6 | Int, Manual | Planned |
| FR25 | On leave: remove, count −1, Full→Open, lose chat access, notify organizer; may rejoin | activities (participation), notifications | `POST /activities/:id/leave` | M6 | Int | Planned |
| FR26 | Create activity with the listed fields and limits | activities, shared | `POST /activities` | M4 | Unit-S, Int | Planned |
| FR27 | Prevent submission until valid; start in the future; end after start on the same date; identify each invalid field | activities, shared, common/time | `POST /activities` | M4 | Unit-S, Unit-Svc, Int | Planned |
| FR28 | Unique ID, status Open, organizer is first participant (count 1), discoverable | activities | `POST /activities` | M4 | Int | Planned |
| FR29 | Only the organizer edits, only while Open/Full and not started; Cancelled/Completed read-only | activities | `PATCH /activities/:id` | M4 | Unit-Svc, Int | Planned |
| FR30 | Edit validation; limit ≥ count; update in place; last-updated; status recompute; updated everywhere | activities | `PATCH /activities/:id` | M4 | Unit-Svc, Int | Planned |
| FR31 | Only the organizer cancels an Open/Full, not-started activity after confirming; optional reason ≤ 200 | activities | `POST /activities/:id/cancel` | M7 | Int, Manual | Planned |
| FR32 | Cancel effects: Cancelled status, hidden from lists, "Cancelled" label, chat read-only, notify participants, irreversible | activities, notifications, messages | `POST /activities/:id/cancel` | M7 | Int | Planned |
| FR33 | Organizer removes a non-organizer participant of an Open/Full, not-started activity after confirming; optional reason | activities (participation) | `DELETE /activities/:id/participants/:userId` | M6 | Int, Manual | Planned |
| FR34 | Removal effects: count −1, Full→Open, lose chat access, can't rejoin, notified with reason | activities (participation), notifications | `DELETE /activities/:id/participants/:userId` | M6 | Int | Planned |
| FR35 | Group chat per activity, only for current participants and the organizer | messages | `GET/POST /activities/:id/messages` | M8 | Int | Planned |
| FR36 | Messages 1–500 characters; sender name and time; oldest → newest | messages, shared | `POST /activities/:id/messages`, `GET /activities/:id/messages` | M8 | Unit-S, Int | Planned |
| FR37 | Chat read-only once Cancelled/Completed | messages | `POST /activities/:id/messages` | M8 | Int | Planned |
| FR38 | Only the organizer of an Open/Full activity posts updates of 1–500 characters | messages | `POST /activities/:id/updates` | M8 | Int | Planned |
| FR39 | Update shown in chat labeled "Update" with organizer and time; notifies other participants | messages, notifications | `POST /activities/:id/updates` | M8 | Int, Manual | Planned |
| FR40 | Notify participants on (a) listed field edits, (b) cancellation, (c) updates; notify removed students | notifications (called by activities, messages) | `PATCH /activities/:id`, `POST …/cancel`, `POST …/updates`, `DELETE …/participants/:userId` | M4 (a), M6 (removal), M7 (b), M8 (c) | Int | Planned |
| FR41 | Notify the organizer when a student joins or leaves | notifications (called by activities) | `POST …/join`, `POST …/leave` | M6 | Int | Planned |
| FR42 | Notification fields; newest-first list; unread count; mark read on open | notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read` | M7 | Int, Manual | Planned |
| FR43 | Discover page of active students sharing ≥ 1 interest; excludes self, blocked, connected | connections | `GET /connections/discover` | M9 | Int | Planned |
| FR44 | Discover ordering; fields shown; opens profile; "No students found." | connections | `GET /connections/discover` | M9 | Int, Manual | Planned |
| FR45 | Send a connection request with the listed restrictions; notify the recipient | connections, notifications | `POST /connections/requests` | M9 | Unit-Svc, Int | Planned |
| FR46 | Accept (create connection, notify sender) or Decline (delete, no notification) | connections, notifications | `POST /connections/requests/:id/accept`, `…/decline`, `GET /connections/requests` | M9 | Int | Planned |
| FR47 | One-to-one DMs with connected students; 1–500 characters; sender and time | messages, shared | `GET/POST /conversations/:userId/messages` | M10 | Unit-S, Int | Planned |
| FR48 | Only the two connected students can view or send; no access without an active connection | messages, common/relationships | `GET/POST /conversations/:userId/messages` | M10 | Int | Planned |
| FR49 | Notify the recipient of a new DM with a link; conversations ordered by most recent | messages, notifications | `POST /conversations/:userId/messages`, `GET /conversations` | M10 | Int, Manual | Planned |
| FR50 | Report action on every profile and activity detail except your own | moderation | `POST /reports` | M11 | Int, Manual | Planned |
| FR51 | Report reason required from the list; description ≤ 500; no second report while one is Pending | moderation, shared | `POST /reports` | M11 | Unit-S, Int | Planned |
| FR52 | Store the report as Pending with the listed fields; confirm to the reporter; don't notify the reported party | moderation | `POST /reports` | M11 | Int | Planned |
| FR53 | Administrators view all reports and mark Pending as Reviewed (who and when); admin-only access | moderation | `GET /admin/reports`, `POST /admin/reports/:id/review` | M11 | Int, Manual | Planned |
| FR54 | Block from a profile after confirming; no self-block; the blocked student isn't notified | moderation | `POST /blocks` | M12 | Int, Manual | Planned |
| FR55 | Block effects: end connection and requests; no requests or DMs to the blocker; hide blocked student's chat messages from the blocker | moderation, connections, messages, common/relationships | `POST /blocks`, `/connections/requests`, `/conversations/*`, `GET /activities/:id/messages` | M12 (filter built in M8) | Int | Planned |
| FR56 | Remove the blocked student from the blocker's upcoming activities; prevent joining; notification says only "removed" | moderation, activities (participation) | `POST /blocks`, `POST /activities/:id/join` | M12 | Int | Planned |
| FR57 | Each is hidden from the other's Discover, search and Recommended; profiles can't be opened | common/relationships (used by activities, connections, users) | `GET /activities`, `GET /activities/recommended`, `GET /connections/discover`, `GET /users/:id` | M12 (checks built in from M3 on) | Int | Planned |

## Coverage check

- FR01–FR57: **57 of 57** listed above.
- Every milestone M1–M13 implements at least one FR. M0 is the foundation and M14 is verification and release.
- Mockup screens map to these FRs: p.1 → FR09 · p.2 → FR14–FR17 · p.3 → FR26–FR27 · p.4 → FR18–FR19, FR21 · p.5 → FR23 · p.6 → FR22. UI elements with no FR are listed in [open-questions Q7](open-questions.md#q7-other-ui-elements-with-no-requirement) and are **not** traced as requirements.
