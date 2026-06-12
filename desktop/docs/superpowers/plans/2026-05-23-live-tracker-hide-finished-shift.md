# Live Tracker — Hide Finished-Shift Employees — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide an employee from the Live Tracker once their last ping is older than 30 minutes OR they have clocked out for the day, applied for every shift type with no per-shift-type math.

**Architecture:** A pure PHP helper (`LiveTrackerPresence`) decides visibility from a ping timestamp + a clocked-out user list + `now`. `RealTimeLocationController::index()` (live mode only) queries today's clocked-out users and applies the helper to the snapshot — this fixes the mobile app for free (it polls). A pure JS module (`presence.js`) maps + reconciles snapshot rows; the web map gains a ~60s reconcile fetch so finished/stale markers are removed (today it never removes any).

**Tech Stack:** Laravel 9+ (PHP 8), PHPUnit; Next.js (React) frontend, no JS test runner.

> **Git policy for this repo:** The user performs ALL git commits and pushes. Do **not** run `git commit` or `git push`. Where a step says **Commit**, stop and hand the staged change to the user to commit.

> **Production-DB safety:** `backend/phpunit.xml` has the sqlite/in-memory lines commented out, so PHPUnit runs against the default connection (shared production DB). Therefore the only automated test here is a **pure unit test that extends `PHPUnit\Framework\TestCase` directly** — it never boots Laravel and never opens a DB connection. Do not add `RefreshDatabase` or DB-touching feature tests.

**Spec:** `docs/superpowers/specs/2026-05-23-live-tracker-hide-finished-shift-design.md`

---

## File Structure

- **Create** `backend/app/Support/LiveTrackerPresence.php` — pure visibility rule (freshness + clocked-out). No DB, no framework state.
- **Create** `backend/tests/Unit/LiveTrackerPresenceTest.php` — unit tests for the rule (extends PHPUnit `TestCase`, no DB).
- **Modify** `backend/app/Http/Controllers/RealTimeLocationController.php` — apply the rule in `index()` live-tracker mode.
- **Create** `frontend-new/src/components/Map/presence.js` — pure helpers: map a snapshot row to an employee, freshness check, snapshot reconcile.
- **Modify** `frontend-new/src/components/Map/Index.jsx` — use the mapper on initial load, add a ~60s reconcile interval, and add a defensive freshness guard in the SSE handler.

---

## Task 1: Pure visibility rule + unit test

**Files:**
- Create: `backend/app/Support/LiveTrackerPresence.php`
- Test: `backend/tests/Unit/LiveTrackerPresenceTest.php`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Unit/LiveTrackerPresenceTest.php`:

```php
<?php

namespace Tests\Unit;

use App\Support\LiveTrackerPresence;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class LiveTrackerPresenceTest extends TestCase
{
    private Carbon $now;

    protected function setUp(): void
    {
        parent::setUp();
        $this->now = Carbon::parse('2026-05-23 12:00:00');
    }

    public function test_fresh_ping_within_window_is_visible(): void
    {
        $dt = $this->now->copy()->subMinutes(10)->toDateTimeString();
        $this->assertTrue(LiveTrackerPresence::isVisible($dt, '100', $this->now, 30, []));
    }

    public function test_stale_ping_beyond_window_is_hidden(): void
    {
        $dt = $this->now->copy()->subMinutes(31)->toDateTimeString();
        $this->assertFalse(LiveTrackerPresence::isVisible($dt, '100', $this->now, 30, []));
    }

    public function test_ping_exactly_on_window_boundary_is_visible(): void
    {
        $dt = $this->now->copy()->subMinutes(30)->toDateTimeString();
        $this->assertTrue(LiveTrackerPresence::isVisible($dt, '100', $this->now, 30, []));
    }

    public function test_clocked_out_user_is_hidden_even_when_fresh(): void
    {
        $dt = $this->now->copy()->subMinutes(1)->toDateTimeString();
        $this->assertFalse(LiveTrackerPresence::isVisible($dt, '100', $this->now, 30, ['100']));
    }

    public function test_numeric_userid_matches_string_clocked_out_list(): void
    {
        $dt = $this->now->copy()->subMinutes(1)->toDateTimeString();
        $this->assertFalse(LiveTrackerPresence::isVisible($dt, 100, $this->now, 30, ['100']));
    }

    public function test_null_or_empty_datetime_is_hidden(): void
    {
        $this->assertFalse(LiveTrackerPresence::isVisible(null, '100', $this->now, 30, []));
        $this->assertFalse(LiveTrackerPresence::isVisible('', '100', $this->now, 30, []));
    }

    public function test_unparseable_datetime_is_hidden(): void
    {
        $this->assertFalse(LiveTrackerPresence::isVisible('not-a-date', '100', $this->now, 30, []));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=LiveTrackerPresenceTest`
Expected: FAIL — `Class "App\Support\LiveTrackerPresence" not found`.

- [ ] **Step 3: Write minimal implementation**

Create `backend/app/Support/LiveTrackerPresence.php`:

```php
<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Pure visibility rule for the Live Tracker.
 *
 * An employee marker is shown only when their latest ping is fresh AND they
 * have not clocked out for the day. No database access and no per-shift-type
 * logic lives here, so it is safe to unit-test in isolation.
 */
class LiveTrackerPresence
{
    /** Default freshness window in minutes. */
    public const DEFAULT_FRESH_MINUTES = 30;

    /**
     * @param string|null $datetime           The ping's `datetime` (server-time string).
     * @param mixed       $userId             The ping's UserID (== employees.system_user_id).
     * @param Carbon      $now                Reference "now".
     * @param int         $freshMinutes       Freshness window in minutes.
     * @param array       $clockedOutUserIds  String system_user_ids clocked out today.
     */
    public static function isVisible(?string $datetime, $userId, Carbon $now, int $freshMinutes, array $clockedOutUserIds): bool
    {
        if (in_array((string) $userId, $clockedOutUserIds, true)) {
            return false;
        }

        return self::isFresh($datetime, $now, $freshMinutes);
    }

    public static function isFresh(?string $datetime, Carbon $now, int $freshMinutes): bool
    {
        if (empty($datetime)) {
            return false;
        }

        try {
            $ts = Carbon::parse($datetime);
        } catch (\Throwable $e) {
            return false;
        }

        return $ts->greaterThanOrEqualTo($now->copy()->subMinutes($freshMinutes));
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=LiveTrackerPresenceTest`
Expected: PASS — 7 passing tests.

- [ ] **Step 5: Commit (hand off to user)**

Stage the two files and stop for the user to commit:

```bash
git add backend/app/Support/LiveTrackerPresence.php backend/tests/Unit/LiveTrackerPresenceTest.php
# Hand off — the user runs the commit, e.g.:
# git commit -m "feat(live-tracker): pure visibility rule (freshness + clocked-out)"
```

---

## Task 2: Apply the rule in the snapshot endpoint

**Files:**
- Modify: `backend/app/Http/Controllers/RealTimeLocationController.php`

The change is in `index()`, **live-tracker mode only** (the branch after the `UserID` single-user block). It must NOT affect the single-user trail mode, `logLocation`, or `listLocationLogs`, and must NOT apply when a `date` is explicitly requested (that is the historical snapshot use).

- [ ] **Step 1: Add the imports**

At the top of `backend/app/Http/Controllers/RealTimeLocationController.php`, below `use App\Models\RealTimeLocation;`, add:

```php
use App\Models\Attendance;
use App\Support\LiveTrackerPresence;
```

- [ ] **Step 2: Filter the snapshot rows**

In `index()`, find this block (the live-tracker mode):

```php
        $latestIds = $latestIdsQuery->pluck('id');

        $rows = RealTimeLocation::query()
            ->whereIn('id', $latestIds)
            ->orderBy('id', 'desc')
            ->get();

        $userIds = $rows->pluck('UserID')->filter()->unique()->values();
```

Replace it with:

```php
        $latestIds = $latestIdsQuery->pluck('id');

        $rows = RealTimeLocation::query()
            ->whereIn('id', $latestIds)
            ->orderBy('id', 'desc')
            ->get();

        // Live view only (no explicit date): hide employees whose latest ping is
        // stale (> freshMinutes) or who have clocked out for the day. A requested
        // `date` is a historical snapshot and is returned unfiltered.
        if (! $request->filled('date')) {
            $freshMinutes = (int) $request->input('fresh_minutes', LiveTrackerPresence::DEFAULT_FRESH_MINUTES);
            $freshMinutes = max(1, min(1440, $freshMinutes));
            $now = now();

            $clockedOut = Attendance::query()
                ->where('company_id', $companyId)
                ->whereDate('date', $now->toDateString())
                ->whereNotNull('out')
                ->whereNotIn('out', ['---', ''])
                ->pluck('employee_id')
                ->map(fn ($v) => (string) $v)
                ->all();

            $rows = $rows->filter(function ($row) use ($now, $freshMinutes, $clockedOut) {
                return LiveTrackerPresence::isVisible($row->datetime, $row->UserID, $now, $freshMinutes, $clockedOut);
            })->values();
        }

        $userIds = $rows->pluck('UserID')->filter()->unique()->values();
```

- [ ] **Step 3: Sanity-check the edit compiles**

Run: `php -l app/Http/Controllers/RealTimeLocationController.php`
Expected: `No syntax errors detected`.

- [ ] **Step 4: Re-run the unit test (still green, nothing broken)**

Run: `php artisan test --filter=LiveTrackerPresenceTest`
Expected: PASS.

- [ ] **Step 5: Commit (hand off to user)**

```bash
git add backend/app/Http/Controllers/RealTimeLocationController.php
# Hand off — the user commits, e.g.:
# git commit -m "feat(live-tracker): filter snapshot by freshness + clock-out"
```

---

## Task 3: Manual backend verification (no DB writes)

**Files:** none (read-only checks against a running backend).

- [ ] **Step 1: Confirm the live snapshot omits stale/clocked-out users**

Against the running API, call the live snapshot for a known company:

```bash
curl "https://v2backend.mytime2cloud.com/api/realtime_location?company_id=2"
```

Expected: every returned item has a `datetime` within the last 30 minutes, and no item belongs to a user whose `attendances.out` for today is set. The previously-seen month-old marker (e.g. a `2026-04-21` ping) is absent.

- [ ] **Step 2: Confirm the override param works**

```bash
curl "https://v2backend.mytime2cloud.com/api/realtime_location?company_id=2&fresh_minutes=1"
```

Expected: only pings from the last 1 minute (likely fewer or zero items) — proving the window is applied.

- [ ] **Step 3: Confirm history/trail is unaffected**

```bash
curl "https://v2backend.mytime2cloud.com/api/realtime_location?company_id=2&UserID=<known_user>&date=<YYYY-MM-DD>"
```

Expected: the full paginated trail for that user/day is returned (the `{ "data": [...] }` envelope), unfiltered by freshness — confirming single-user mode is untouched.

---

## Task 4: Pure frontend presence module

**Files:**
- Create: `frontend-new/src/components/Map/presence.js`

> No JS test runner exists in `frontend-new`; this module is kept pure (no React, no DOM) so it can be reasoned about directly and tested later if a runner is added. Verification is done in the browser in Task 7.

- [ ] **Step 1: Create the module**

Create `frontend-new/src/components/Map/presence.js`:

```javascript
// Pure helpers for Live Tracker presence. No React / DOM here.

const DEFAULT_FRESH_MINUTES = 30;
const DEFAULT_RECONCILE_MS = 60000;

export function getFreshMinutes() {
  const raw = Number(process.env.NEXT_PUBLIC_LIVE_TRACKER_FRESH_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_FRESH_MINUTES;
}

export function getReconcileMs() {
  const raw = Number(process.env.NEXT_PUBLIC_LIVE_TRACKER_RECONCILE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RECONCILE_MS;
}

// Is a ping fresh relative to nowMs? `time` may be ISO string, "Y-m-d H:i:s", or ms.
export function isPingFresh(time, nowMs, freshMinutes = getFreshMinutes()) {
  if (time === null || time === undefined || time === "") return false;
  const t = typeof time === "number" ? time : Date.parse(String(time).replace(" ", "T"));
  if (!Number.isFinite(t)) return false;
  return nowMs - t <= freshMinutes * 60 * 1000;
}

// Map one snapshot row (GET /api/realtime_location) into a map-employee object.
// Uses the real backend keys: UserID / latitude / longitude / datetime / full_name / avatar.
export function mapSnapshotRow(item) {
  if (!item) return null;
  const lat = parseFloat(item.latitude);
  const lng = parseFloat(item.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const id = item.UserID;
  return {
    id: Number.isFinite(Number(id)) ? Number(id) : String(id),
    name: item.full_name || `Employee ${id}`,
    location: "Last known location",
    mapPos: { top: "50%", left: "50%" },
    lat,
    lng,
    avatar: item.avatar || "",
    timestamp: item.datetime,
  };
}

// The snapshot is authoritative: anyone not present in `snapshotRows` is dropped.
// Prior mapPos is preserved for markers that survive, to avoid resetting animations.
export function reconcileFromSnapshot(prevList, snapshotRows) {
  const prevById = new Map((prevList || []).map((e) => [String(e.id), e]));
  return (snapshotRows || [])
    .map((item) => {
      const mapped = mapSnapshotRow(item);
      if (!mapped) return null;
      const prev = prevById.get(String(mapped.id));
      return prev ? { ...prev, ...mapped, mapPos: prev.mapPos } : mapped;
    })
    .filter(Boolean);
}
```

- [ ] **Step 2: Lint the new file**

Run: `cd frontend-new && npx eslint src/components/Map/presence.js`
Expected: no errors (warnings acceptable).

- [ ] **Step 3: Commit (hand off to user)**

```bash
git add frontend-new/src/components/Map/presence.js
# Hand off — the user commits, e.g.:
# git commit -m "feat(live-tracker): pure presence/reconcile helpers (web)"
```

---

## Task 5: Use the shared mapper on initial load

**Files:**
- Modify: `frontend-new/src/components/Map/Index.jsx`

- [ ] **Step 1: Import the helpers**

Near the top of `frontend-new/src/components/Map/Index.jsx`, below the existing `import LiveTrackerBottomFeed from "./LiveTrackerBottomFeed";`, add:

```javascript
import { mapSnapshotRow, reconcileFromSnapshot, isPingFresh, getReconcileMs, getFreshMinutes } from "./presence";
```

- [ ] **Step 2: Replace the inline mapping in `fetchInitialLocations`**

Find this block inside the `useEffect` that fetches initial locations:

```javascript
        if (rows.length) {
          const initialEmployees = rows.map(item => ({
            id: item.UserID,
            name: item.full_name || `Employee ${item.UserID}`,
            location: "Last known location",
            mapPos: { top: "50%", left: "50%" },
            lat: parseFloat(item.latitude),
            lng: parseFloat(item.longitude),
            avatar: item.avatar || "",
            timestamp: item.datetime,
          }));

          setEmployeesData(initialEmployees);

          initialEmployees.forEach(emp => {
            lastPositionsRef.current[emp.id] = { lat: emp.lat, lng: emp.lng };
          });
        }
```

Replace it with:

```javascript
        if (rows.length) {
          const initialEmployees = rows.map(mapSnapshotRow).filter(Boolean);

          setEmployeesData(initialEmployees);

          initialEmployees.forEach(emp => {
            lastPositionsRef.current[emp.id] = { lat: emp.lat, lng: emp.lng };
          });
        }
```

- [ ] **Step 3: Lint**

Run: `cd frontend-new && npx eslint src/components/Map/Index.jsx`
Expected: no new errors.

- [ ] **Step 4: Commit (hand off to user)**

```bash
git add frontend-new/src/components/Map/Index.jsx
# Hand off — the user commits, e.g.:
# git commit -m "refactor(live-tracker): use shared snapshot mapper on load"
```

---

## Task 6: Reconcile interval + SSE freshness guard

**Files:**
- Modify: `frontend-new/src/components/Map/Index.jsx`

- [ ] **Step 1: Add the reconcile interval**

In the `useEffect` that defines `fetchInitialLocations` (the one keyed on `[companyId]`), find the final lines:

```javascript
    fetchInitialLocations();
  }, [companyId]);
```

Replace them with:

```javascript
    fetchInitialLocations();

    // Reconcile against the (server-filtered) snapshot so finished/stale
    // employees are removed. The backend already applied freshness + clock-out,
    // so the snapshot is authoritative for who should be visible.
    const reconcileId = setInterval(async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://v2backend.mytime2cloud.com/api";
        const response = await fetch(`${apiBase}/realtime_location?company_id=${targetCompanyId}`);
        if (!response.ok) return;
        const result = await response.json();
        const rows = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
        setEmployeesData((prev) => reconcileFromSnapshot(prev, rows));
      } catch (error) {
        console.error("Live tracker reconcile failed:", error);
      }
    }, getReconcileMs());

    return () => clearInterval(reconcileId);
  }, [companyId]);
```

- [ ] **Step 2: Add the defensive freshness guard to the SSE handler**

In `handleSseMapMessage`, find the start of the per-payload loop:

```javascript
      payloadList.forEach((payloadData) => {
        if (!payloadData || typeof payloadData !== "object") return;

        if (
          payloadData.company_id &&
          companyId &&
          Number(payloadData.company_id) !== Number(companyId)
        ) {
          return;
        }
```

Immediately after the company-id guard's closing `}`, add:

```javascript
        // Ignore replays/stale pushes so an old ping can't resurrect a marker
        // between reconciles.
        const pingTime = payloadData.datetime ?? payloadData.timestamp ?? payloadData.recorded_at;
        if (pingTime && !isPingFresh(pingTime, Date.now(), getFreshMinutes())) {
          return;
        }
```

- [ ] **Step 3: Lint**

Run: `cd frontend-new && npx eslint src/components/Map/Index.jsx`
Expected: no new errors.

- [ ] **Step 4: Build to verify nothing is broken**

Run: `cd frontend-new && npm run build`
Expected: build succeeds; `/live-tracker` route compiles.

- [ ] **Step 5: Commit (hand off to user)**

```bash
git add frontend-new/src/components/Map/Index.jsx
# Hand off — the user commits, e.g.:
# git commit -m "feat(live-tracker): 60s reconcile + stale-ping SSE guard"
```

---

## Task 7: Manual browser verification

**Files:** none.

- [ ] **Step 1: Stale marker disappears**

Open `/live-tracker` with a company that has at least one stale marker (last ping > 30 min old). Expected: the stale marker is **not** shown on load (Task 2 filters it server-side).

- [ ] **Step 2: Active marker shows and persists**

With an employee actively pinging (last ping < 30 min, not clocked out): the marker is shown and continues to move via SSE between reconciles.

- [ ] **Step 3: Removal without reload**

Take a currently-shown employee and mark them finished (clock them out, or stop their pings for > 30 min). Within ≤60s (one reconcile) the marker disappears **without a page reload**.

- [ ] **Step 4: Reappearance (Option A)**

For an employee who went stale (not clocked out) and dropped off, resume pings. Within ≤60s the marker reappears — confirming the temporary-hide behavior.

---

## Self-Review Notes

- **Spec coverage:** Rule a+b → Task 1 (helper) + Task 2 (applied). Reuse of `attendances.out` (no shift math) → Task 2. Stale-marker fix → Task 2 freshness + Task 3 verify. Web removal via 60s reconcile → Task 6. SSE defensive guard → Task 6. Configurable N (`fresh_minutes` / env) → Task 2 + Task 4. Untouched trail/write endpoints → Task 2 guards on `! filled('date')` + Task 3 step 3. Temporary-vs-permanent (Option A) → emergent from freshness vs clocked-out rules, verified in Task 7 steps 3–4.
- **Placeholders:** none — every code step has full code; commands have expected output.
- **Type consistency:** `isVisible(datetime, userId, now, freshMinutes, clockedOutUserIds)` used identically in Task 1 and Task 2; `mapSnapshotRow` / `reconcileFromSnapshot` / `isPingFresh` / `getReconcileMs` / `getFreshMinutes` defined in Task 4 and consumed in Tasks 5–6 with matching signatures.
