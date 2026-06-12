# Birthday AI Feed + Employees Page Popup — Design Spec

**Date:** 2026-04-17
**Author:** sabarikrishnan2107-ux
**Status:** Approved (pending implementation plan)

## Goals

1. On the admin dashboard's **Insights & Events → AI Feeds** tab, show a festive, professional birthday card for each employee whose `date_of_birth` matches today. Cards decorate with animated balloons 🎈 and cracker/confetti bursts 🎆. Visible only on the employee's birthday.
2. On the **Employees page** (`/employees`), when any employee has a birthday today, auto-open a celebratory **modal popup** once per session saying "Happy Birthday" with balloons, crackers, and the employee's details. Admin can dismiss; won't reopen until next login.

## User Stories

- **Dashboard:** As an admin viewing the dashboard, when an employee has a birthday today, I see a celebratory card at the top of the AI Feeds tab so I can recognize and wish them personally.
- **Employees page:** As an admin opening the Employees listing, I get a one-time popup celebrating today's birthday employees so I don't miss it even if I skip the dashboard.

## Backend

### 1. New scheduled command

- **File:** `backend/app/Console/Commands/AI/AIBirthdayFeed.php`
- **Signature:** `ai:birthday-feed`
- **Behavior (daily at 00:05):**
  1. `date_of_birth` may live on `employees.date_of_birth` (newer form saves here — confirmed in `EmployeeControllerNew.php`) AND/OR on the related `emirates_info.date_of_birth` (legacy, used by existing `BirthDayWish`). The command must match employees whose DOB is today in **either** location. DB driver is **PostgreSQL**.
  2. Query: for each active company, select employees where
     `TO_CHAR(employees.date_of_birth, 'MM-DD') = :today`
     OR
     `employees.id IN (SELECT employee_id FROM emirates_info WHERE TO_CHAR(date_of_birth, 'MM-DD') = :today)`.
  3. Skip employees with no DOB in either location.
  3. Idempotency: skip insert if an `ai_feeds` row already exists today with `type='birthday'` and same `employee_id`.
  4. Insert a row into `ai_feeds` with:
     - `company_id` = employee's company
     - `employee_id` = employee id
     - `type` = `"birthday"`
     - `description` = `"🎉 Today is <Full Name>'s Birthday! Wishing a year full of joy, success, and milestones."`
     - `data` = JSON `{ employee_id, first_name, last_name, full_name, profile_picture, department, branch, designation, age }`
- **Logs:** write start/finish/count to `storage/logs/ai/birthday_feed.log`.

### 2. Kernel schedule

- **File:** `backend/app/Console/Kernel.php`
- Add: `$schedule->command('ai:birthday-feed')->dailyAt('00:05')->withoutOverlapping();`

### 3. Controller validation

- **File:** `backend/app/Http/Controllers/AIFeedsController.php`
- Extend `type` validation enum in `index()` and `aiFeedsByEmployeeId()` from `in:late,early,absent` → `in:late,early,absent,birthday`.
- No other API changes. Today-only filtering is done client-side (simpler, avoids new API param).

## Frontend

### File: `frontend-new/src/components/AIFeeds/All/page.js`

1. **Fetch unchanged.** Same `getAIFeeds` call.
2. **Split rows by type:**
   - `birthdayRowsToday` = rows where `type === "birthday"` AND `created_at` date is today (local date compare, YYYY-MM-DD).
   - `otherRows` = everything else (includes late/early/absent and any non-today birthday rows — non-today birthdays are hidden completely).
3. **Render order:**
   - Top: a horizontally-scrollable strip of festive **BirthdayCard** components, one per employee in `birthdayRowsToday`.
   - Below: existing table with `otherRows`.
4. **Search filter** continues to apply to the table; birthday strip is not filtered by the search box (always visible if present).

### New component: `frontend-new/src/components/AIFeeds/BirthdayCard.jsx`

Props: `{ data }` where `data` is the parsed JSON from the feed row.

Visuals:
- Gradient background: pink → purple → amber (distinct from the table rows).
- Left: round employee avatar with glowing ring.
- Center: greeting title + name + department/branch + designation + "🎂 Birthday" gold pill.
- Right: subtle age chip (if present).
- **Balloons 🎈:** 5–6 balloon elements (unicode or tiny SVG) absolutely positioned behind the content, drifting up-and-sideways via CSS `@keyframes balloon-float` (10–14s loop, staggered delays, different colors).
- **Crackers/Confetti 🎆:** on mount, a burst of ~12 small dots radiating outward via `@keyframes cracker-burst` (1.2s, runs once). A small cracker emoji at top-left and top-right of the card.
- Dark mode aware.
- No external libraries — pure CSS + existing tailwind classes.

Accessibility: decorative elements have `aria-hidden="true"`; card exposes a text announcement via `role="status"` or plain readable text.

### Employees Page Popup

**File:** `frontend-new/src/app/employees/page.js` — integrate a new modal component.

**New component:** `frontend-new/src/components/Employees/BirthdayPopup.jsx`

Behavior:
- On mount of the Employees page, call a lightweight endpoint (reuse `getAIFeeds({ per_page: 50, type: 'birthday' })` then filter client-side to today's rows).
- If at least one birthday row is found AND `sessionStorage.getItem('birthdayPopupDismissed-<YYYY-MM-DD>')` is NOT set, show the modal.
- On close (X button, ESC key, or overlay click), write `sessionStorage.setItem('birthdayPopupDismissed-<YYYY-MM-DD>', '1')` so it won't re-open this session (also self-scoped per day).

Modal layout:
- Centered overlay (semi-transparent dark backdrop).
- Card: rounded, gradient pink → purple → amber, ~500px wide, max-height 80vh, scrollable if many birthdays.
- Header: large "🎉 Happy Birthday! 🎂" title with a subtle pulse animation.
- Body: for each birthday employee — circular avatar with glowing ring, full name (large), department / branch / designation (muted), "Wishing you joy, success, and a year full of milestones." message line.
- Decorative:
  - **Balloons 🎈:** 6–8 balloons floating up across the modal background via `@keyframes balloon-float` (staggered delays, multi-color, looping).
  - **Crackers/Confetti 🎆:** full-modal confetti burst on open via `@keyframes confetti-fall` and a radial cracker burst near the title (runs once on open).
  - Two 🎆 emoji at the top corners of the card.
- Footer: single "Close" button styled as primary.
- Dark mode aware.
- Pure CSS animations, no external libraries.
- Accessible: focus trap, ESC closes, `role="dialog"`, `aria-labelledby`, decorative elements `aria-hidden`.

## Data flow

```
Cron (00:05) → AIBirthdayFeed command → inserts ai_feeds (type='birthday', data=JSON)
                                          ↓
                            Admin opens dashboard → AI Feeds tab
                                          ↓
                        getAIFeeds() fetches rows (unchanged API)
                                          ↓
              Frontend splits: today's birthday rows → festive cards
                               other rows → existing table
                                          ↓
                       Tomorrow: today-date filter hides yesterday's birthdays
```

## Error handling

- **Command:** wrap per-employee insert in try/catch, log failures, continue to next employee. Exit 0 even if some fail.
- **Frontend:** if `data` JSON is missing/malformed, fall back to rendering the plain description in the card (no crash).
- **No DOB employees:** silently skipped by SQL filter.

## Testing

- **Command:**
  - Manual: `php artisan ai:birthday-feed` with a test employee whose DOB month/day = today → verify one row inserted in `ai_feeds`.
  - Run twice → verify no duplicate (idempotency).
- **Frontend — AI Feeds tab:**
  - Load AI Feeds tab with a seeded birthday row for today → verify festive card appears above table with balloon + cracker animations.
  - Seed a birthday row with `created_at` = yesterday → verify it is NOT shown.
  - Search box filters table but not birthday strip.
- **Frontend — Employees page popup:**
  - Seed a birthday row for today → open `/employees` → verify modal auto-opens with balloons + crackers.
  - Close modal → navigate away and return → modal does not reopen (session storage).
  - Clear session storage → modal reopens.
  - No birthday today → no modal appears.

## Out of scope

- Upcoming/weekly birthday preview (per user: today-only).
- Email/WhatsApp notification (already handled by separate `birthday:wish` command).
- Clicking a birthday card to open the employee profile (future enhancement).
- Popup on other pages (only dashboard AI Feeds tab + Employees page for now).

## Open questions

None. User has confirmed:
- Integration into AI Feeds tab (not new tab).
- Balloons + crackers both required.
- Today-only, auto-hidden next day.
- Employees page shows a one-time modal per session, professional, balloons + crackers.
