# Open Questions

These are ambiguities, conflicts between the UI mockups and the FRs, and architecture choices that **need a team decision**. None of them has been silently decided.

Where the other docs need *some* value in order to stay consistent, they use the **working assumption** shown here and mark it tentative. Changing an assumption means updating the docs listed under "Affects".

Status values: **Open** · **Decided** (record the decision and date) · **Withdrawn**.

| # | Topic | Type | Status |
|---|---|---|---|
| Q1 | [What "Discover" means](#q1-what-discover-means) | UI ↔ FR conflict | Open |
| Q2 | [Create screen lacks description and end time](#q2-create-screen-lacks-description-and-end-time) | UI ↔ FR conflict | Decided 2026-10-27 |
| Q3 | [One activity, multiple categories?](#q3-one-activity-multiple-categories) | UI ↔ FR conflict | Decided 2026-10-27 |
| Q4 | [Activity type list](#q4-activity-type-list) | Unclear requirement | Decided 2026-10-27 |
| Q5 | [Location: free text or a list, and the detail line](#q5-location-free-text-or-a-list-and-the-detail-line) | UI ↔ FR conflict | Decided 2026-10-27 |
| Q6 | [Activity images](#q6-activity-images) | UI without FR | Decided 2026-10-27 |
| Q7 | [Other UI elements with no requirement](#q7-other-ui-elements-with-no-requirement) | UI without FR | Open |
| Q8 | [Login screen shows only an email field](#q8-login-screen-shows-only-an-email-field) | UI ↔ FR conflict | Decided 2026-10-27 |
| Q9 | [Search UI vs FR16 criteria](#q9-search-ui-vs-fr16-criteria) | UI ↔ FR conflict | Open |
| Q10 | [Featured activities vs Recommended Activities](#q10-featured-activities-vs-recommended-activities) | UI ↔ FR conflict | Open |
| Q11 | [No unblock and no disconnect](#q11-no-unblock-and-no-disconnect) | Unclear requirement | Open |
| Q12 | [Reason shown when a block prevents joining](#q12-reason-shown-when-a-block-prevents-joining) | FR ↔ FR tension | Open |
| Q13 | [Account removal side effects](#q13-account-removal-side-effects) | Unclear requirement | Open |
| Q14 | [Administrator accounts](#q14-administrator-accounts) | Unclear requirement | Open |
| Q15 | [Registering again with an unverified email](#q15-registering-again-with-an-unverified-email) | Unclear requirement | Decided 2026-10-27 |
| Q16 | [Lockout and enumeration details](#q16-lockout-and-enumeration-details) | Unclear requirement | Decided 2026-10-27 |
| Q17 | [Links for notifications that are not about an activity](#q17-links-for-notifications-that-are-not-about-an-activity) | Unclear requirement | Open |
| Q18 | [Whitespace-only messages and fields](#q18-whitespace-only-messages-and-fields) | Unclear requirement | Open |
| Q19 | [Requirement numbering across documents](#q19-requirement-numbering-across-documents) | Documentation | Open |
| Q20 | [Timezone](#q20-timezone) | Unclear requirement | Decided 2026-10-27 |
| Q21 | [Inbox vs notifications bell](#q21-inbox-vs-notifications-bell) | UI ↔ FR gap | Open |
| Q22 | [Organizer updates after an activity starts](#q22-organizer-updates-after-an-activity-starts) | Unclear requirement | Open |
| Q23 | [Hosting and email provider](#q23-hosting-and-email-provider) | Architecture | Open |
| Q24 | [Frontend component testing](#q24-frontend-component-testing) | Architecture | Open |
| Q25 | [Target devices](#q25-target-devices) | Architecture / UX | Decided 2026-10-27 |
| Q26 | [Password hashing algorithm](#q26-password-hashing-algorithm) | Architecture | Decided 2026-10-27 |
| Q27 | [Background polling and the 30-minute idle timeout](#q27-background-polling-and-the-30-minute-idle-timeout) | Architecture | Open (needed by M7) |

---

### Q1. What Discover means

- **Source:** In the UI mockups (p.2–p.6), the **Discover** tab is the *activity* feed. In FR13 and FR43–FR45, the **Discover page** lists *students* who share interests.
- **Options:**
  (a) The Discover tab has two sections, Activities and People.
  (b) The Discover tab shows activities, and student discovery gets another name (for example "People") reached from Profile or Inbox.
  (c) Rename one of them in the FR document.
- **Working assumption:** activities at `/`, students at `/people`, both reachable from the Discover tab.
- **Affects:** architecture §12.2, roadmap M5 and M9.

### Q2. Create screen lacks description and end time

- **Source:** The Create Activity mockup (p.3) has title, category, date, time, location and limit. FR26 also requires a **description (1–500)** and an **end time**.
- **Decision (2026-10-27):** follow FR26. The Create form keeps the mockup layout and adds Description (1–500 characters) and End time. The UI design file should be updated to match.
- **Affects:** api.md `POST /activities`, roadmap M4.

### Q3. One activity, multiple categories?

- **Source:** The Discover mockup shows a card tagged "Social · Food". FR26 says "an activity type", which is singular, and FR14c and FR16 match on one type.
- **Decision (2026-10-27):** one type per activity, as FR26 says. The mockup's "Social · Food" card is illustrative.
- **Affects:** data-model `activity.type`.

### Q4. Activity type list

- **Source:** The FRs refer to "the Activity Type list" but never list the values. The UI shows Study, Sports, Food, Social and Gaming. The proposal also mentions hiking.
- **Decision needed:** the final list, and whether it's fixed (an enum) or managed by admins. Admin management isn't in the FRs.
- **Decision (2026-10-27):** a fixed list of the five UI values: Study, Sports, Food, Social, Gaming. Defined in `packages/shared/src/enums.ts` and as the Prisma `ActivityType` enum. Adding a type later needs a migration.

### Q5. Location: free text or a list, and the detail line

- **Source:** The Create mockup shows Location as a **dropdown** with a chevron. FR26 says free text of 1–100 characters, and FR16 matches any part of it. The detail mockup shows a second line, "2nd floor · Group Study Room 225", but there's no field for it in FR26.
- **Options:** free text; a list of campus places plus free text; a list only. Separately: drop the second line, or add an optional "location details" field. Adding the field would need an FR change.
- **Decision (2026-10-27):** a single free-text `location` field of 1–100 characters (FR26), e.g. "King Library, 2nd floor, Room 225". No dropdown and no separate detail line.

### Q6. Activity images

- **Source:** Every mockup shows a photo for each activity. No FR mentions images or uploads.
- **Options:** (a) no images, (b) a fixed default illustration per activity type shipped with the frontend (no upload), (c) organizer uploads, which is new scope and needs storage.
- **Decision (2026-10-27):** a built-in illustration per activity type (the type's icon on a type-colored background, plus a "Study together"-style label) wherever the mockups show a photo. No uploads and no file storage.

### Q7. Other UI elements with no requirement

These appear in the mockups but have no FR. They are **not planned** unless the team adds requirements:

| Element | Mockup |
|---|---|
| Bookmark / save activity | p.4 |
| "Add to calendar" | p.6 |
| "3 near you" (location awareness) | p.2 |
| "Free · SJSU students only" | p.4 |
| "Bring your laptop, notes & a water bottle." tip line | p.4 (could just be part of the description) |
| Host's year and major ("Junior · Computer Science") and a verified badge | p.4. Profiles have no year or major field (FR02) |
| "Featured activities", "Today, Wednesday, Oct 21" grouping | p.2 (see Q10) |
| "Hey, Spartan!" greeting (uses no name) | p.2. Harmless copy, will be implemented as shown |

### Q8. Login screen shows only an email field

- **Source:** p.1 shows "Sign in with your SJSU email" with one email field and "Continue". FR09 requires email **and password**.
- **Options:** a two-step form (email, then password), or one form with both fields.
- **Decision (2026-10-27):** one form with both fields. The page keeps the mockup's layout and "Continue with SJSU email" button, with a password field added under the email field.

### Q9. Search UI vs FR16 criteria

- **Source:** p.2 shows one free-text box ("What do you want to do?") and category chips. FR16 specifies structured criteria: type, date range, start-time range and location text. There is **no keyword or title search** in the FRs.
- **Decision needed:** what the text box searches. Options: location only (as in FR16); title as well, which is a new requirement; or replace it with a filter panel.
- **Working assumption:** the chips set `type`. The box opens `/search`, which has the FR16 fields. No title search.

### Q10. Featured activities vs Recommended Activities

- **Source:** p.2 shows "Featured activities · 3 near you · Today". FR14–FR15 define a **Recommended Activities** list (interests + availability, soonest first) and an empty-state message.
- **Working assumption:** the Discover home shows the FR14 Recommended list, labeled "Recommended for you".

### Q11. No unblock and no disconnect

- **Source:** FR54–FR57 define blocking but not unblocking. FR48 mentions a connection that "has ended", but the only way a connection ends is through a block (FR55a).
- **Working assumption:** neither unblock nor disconnect is built. If wanted, they are new requirements.

### Q12. Reason shown when a block prevents joining

- **Source:** FR21 says a failed join "shall display the reason". FR54 says the blocked student "shall not be notified", and FR56 hides the reason for a block-caused removal.
- **Decision needed:** the exact message, for example a generic "You can't join this activity."
- **Working assumption:** error code `JOIN_NOT_ALLOWED` with generic text that doesn't mention blocking.

### Q13. Account removal side effects

- **Source:** FR08.
- **Questions:**
  - When the deleted student is removed from joined activities (FR08b), does the organizer get a "left" notification (FR41)?
  - Past activities the deleted student organized: keep them, showing the organizer as "Deleted Student", or delete them?
  - Reports filed *by* or *about* the deleted student: keep them for admins?
  - Conversations: should the other student still see the history with "Deleted Student"? FR48 would block access, since the connection is gone.
- **Working assumption:** organizers are notified; past activities are kept with the organizer shown as "Deleted Student"; reports are kept with null references; DM history becomes inaccessible because the connection no longer exists.

### Q14. Administrator accounts

- **Source:** FR53 defines what Administrators do, but not how they're created or how they log in.
- **Working assumption:** admins are normal accounts with `role = ADMIN`, set by a seed or a command-line script. They log in through the same login page. The admin UI is limited to listing reports and marking them Reviewed (FR53), with no enforcement actions.

### Q15. Registering again with an unverified email

- **Source:** FR01 rejects "an email address already linked to an account". FR03 keeps unverified accounts inactive and lets the user request a new link.
- **Decision needed:** can someone who never verified register again (to fix a typo in their name or password), or must they use "resend link"? Do unverified accounts expire?
- **Decision (2026-10-27):** a pending account counts as "already linked" (FR01). Registering again returns `EMAIL_TAKEN`, with a message saying the account is waiting for verification, and the page offers "Send a new verification link". Unverified accounts don't expire.

### Q16. Lockout and enumeration details

- **Questions:**
  - FR09 forbids revealing whether the email or the password was wrong, but showing "account locked" (FR11) reveals that the account exists. Is that acceptable?
  - Should failed attempts against **non-existent** emails also be "locked" to keep behavior uniform?
  - Should there also be per-IP rate limiting? It isn't in the FRs and would need a small library.
- **Decision (2026-10-27):**
  - A locked account is told so: "Too many failed login attempts. Try again in N minutes." (`423 ACCOUNT_LOCKED`). The fifth failure already returns this message.
  - Only real accounts are counted and locked. Unknown emails always get the generic `INVALID_CREDENTIALS` message, after a dummy password check so the response time is the same.
  - No IP rate limiting for now; revisit in the M14 security review.
  - An unverified account is only reported as unverified after a correct password, so a wrong password never reveals that the account exists.

### Q17. Links for notifications that are not about an activity

- **Source:** FR42 says each notification stores "the title of the related activity" and "a link to the related activity". Connection-request notifications (FR45) and DM notifications (FR49) aren't about an activity. FR49 does say DM notifications link to the conversation.
- **Working assumption:** activity fields are nullable. Connection notifications link to the other student's profile or the requests page, and DM notifications link to the conversation.

### Q18. Whitespace-only messages and fields

- **Source:** FR36 and FR38 reject "empty" messages. Is `"   "` empty? The same question applies to title, display name and location.
- **Working assumption:** all text inputs are trimmed before validation, so whitespace-only text counts as empty.

### Q19. Requirement numbering across documents

- **Source:** The HLR document numbers user stories differently from the FR document (for example, HLR US09 is "Join" but FR US08 is "Join"). In the Design document, the diagram titled "Sequence Diagram – US08 (Join)" actually shows the *connection request* flow.
- **Working assumption:** these docs use the **FR document's** numbering. The team may want to fix the Design document's sequence diagram.

### Q20. Timezone

- **Source:** No FR states a timezone, but FR14d, FR20, FR21b and FR27 all depend on local dates and times.
- **Decision (2026-10-27):** a single campus time zone, `America/Los_Angeles` ([ADR-0011](adr/0011-time-and-timezone-handling.md)). Forms say "Times are in San José (campus) time".

### Q21. Inbox vs notifications bell

- **Source:** The mockups have an **Inbox** tab and a **bell** icon in the header. The FRs define notifications (FR42) and DM conversations (FR49) but not where they appear.
- **Working assumption:** the bell opens `/notifications` and shows the unread badge. Inbox lists DM conversations (and connection requests).

### Q22. Organizer updates after an activity starts

- **Source:** FR38 lets the organizer post updates to an "Open or Full" activity. Unlike FR24, FR29, FR31 and FR33, it does **not** say "that has not started". FR37 makes the chat read-only only once the activity is Cancelled or Completed.
- **Working assumption:** follow the FR literally. Updates and chat are allowed until the activity is Completed or Cancelled.

### Q23. Hosting and email provider

- **Decision needed (by M14):** where to deploy (any host that can run one Node process alongside a managed PostgreSQL), and which SMTP provider sends verification emails. SJSU email filtering may affect delivery.
- **Constraint:** free or low-cost tiers. No architecture change is expected either way.

### Q24. Frontend component testing

- **Source:** The planned testing tools are Vitest and Supertest ([ADR-0014](adr/0014-testing-approach.md)). Rendering React components in tests would also need a DOM environment (`jsdom`) and a library such as React Testing Library.
- **Decision needed:** whether the team's testing assignment needs automated UI tests. If it does, add a short ADR.

### Q25. Target devices

- **Source:** The mockups are phone-sized only. The proposal calls it an "app", and the stack is a web app.
- **Decision (2026-10-27):** Spartan Hangout is a **responsive, mobile-first full-stack web app**, not a native mobile app. Phones keep the mockup layout, and tablets and desktops get layouts designed for them rather than a stretched phone UI. Breakpoints and layout rules are in [architecture §12.3](architecture.md#123-styling-and-responsive-layout).

### Q26. Password hashing algorithm

- **Decision needed (M1):** argon2id (stronger, but a native module that can be awkward to build on some machines) or bcrypt (very common; `bcryptjs` is pure JavaScript).
- **Decision (2026-10-27):** argon2id via the `argon2` package, using its prebuilt binaries (its source-build install script is denied in `package.json` `allowScripts`, so no C++ toolchain is needed).

### Q27. Background polling and the 30-minute idle timeout

- **Source:** FR10 ends a session after 30 minutes of *inactivity*. The architecture (§12.4) polls the unread-notification count every 30 seconds from M7 on, and open chats every 5 seconds. Every API request currently counts as activity, so an open tab would keep the session alive forever.
- **Options:**
  (a) Polling requests send a header (e.g. `X-Background-Refresh: 1`) and the session middleware doesn't count them as activity.
  (b) Only count requests that change something (non-GET) as activity.
  (c) Accept it: an open tab counts as an active session.
- **Working assumption:** none yet; decide before M7 (task 93). Option (a) is the smallest change.

