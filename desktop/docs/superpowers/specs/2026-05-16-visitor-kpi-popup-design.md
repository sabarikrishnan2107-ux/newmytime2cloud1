# Visitor KPI Card Click-Through Popup — Design

**Date:** 2026-05-16
**Status:** Approved verbally, ready to implement

## Problem

The Visitor Dashboard ([VisitorDashboard.jsx](../../../frontend-new/src/components/Visitor/VisitorDashboard.jsx)) shows 10 KPI cards at the top with counts. Today the cards are passive — clicking them does nothing. The user wants each card (the 7 backed by real data) to open a popup showing the **list of visitors counted in that KPI**, so they can drill from the count into the underlying records.

## Scope

**Clickable cards (7):**
1. Total Visitors Today
2. Currently Inside
3. Pending Approvals
4. Blacklisted
5. Pre-Registered
6. Weekly Total
7. Overstayed

**NOT clickable (3, no real data source yet):**
- Badges Printed (currently shows `total_today` — placeholder, same value as card 1)
- Face Verifications (hardcoded `0`)
- Avg Wait Time (hardcoded `"---"`)

These three remain visually identical but without `cursor-pointer` or onClick.

## Architecture

```
KpiCard (clickable wrapper added)
        │ onClick
        ▼
KpiDetailDialog (new component)
        │ kpi key
        ▼
Endpoint mapping (internal to dialog)
        │ fetches matching list
        ▼
Table render (name, company, host, type, check-in, status)
```

### Components

**1. `KpiCard.jsx`** — modified, in [VisitorDashboard.jsx:35](../../../frontend-new/src/components/Visitor/VisitorDashboard.jsx#L35)

Add an optional `onClick` prop. When set, wrap the card in a `<button>` (or add `role="button"` with `cursor-pointer hover:ring-1 hover:ring-primary/40` styling). When `onClick` is unset, the card stays static (covers the 3 placeholder cards).

**2. `KpiDetailDialog.jsx`** — new file at `frontend-new/src/components/Visitor/KpiDetailDialog.jsx`

Props:
```
{
  open: boolean,
  onClose: () => void,
  kpiKey: 'total_today' | 'currently_inside' | 'pending_approvals'
        | 'blacklisted' | 'pre_registered' | 'weekly_total' | 'overstayed' | null,
  title: string,  // human-readable title, e.g. "Total Visitors Today"
}
```

Internal behavior:
- When `open` flips true, fetch from the mapped endpoint (see table below).
- Show a loading spinner during fetch.
- Render a table: `# | Visitor | Company | Host | Type | Check-In | Status`.
- Empty state: "No records found".
- A search box at the top filters client-side by visitor name / company.
- Pagination: simple 25-per-page client-side pagination if more than 25 rows.

### KPI → Endpoint Mapping

| KPI key | Endpoint | Filter params |
|---|---|---|
| `total_today` | `GET /api/visitor-management/logs` | `date=<today>` |
| `currently_inside` | `GET /api/visitor-management/logs` | `date=<today>`, then client-filter `out == null` |
| `weekly_total` | `GET /api/visitor-management/logs` | `from=<today-7>`, `to=<today>` (or no date if backend defaults to recent) |
| `overstayed` | `GET /api/visitor-management/logs` | `date=<today>`, then client-filter rows where `(now - in) > expected_duration` |
| `pending_approvals` | `GET /api/visitor-management/pre-registrations` | `status=pending` |
| `pre_registered` | `GET /api/visitor-management/pre-registrations` | (no filter — all pre-registrations) |
| `blacklisted` | `GET /api/visitor-management/blacklist` | (no filter) |

The dialog encapsulates this mapping internally — the parent just passes `kpiKey`.

**No backend changes.** All three endpoints already exist ([routes/visitor_management.php](../../../backend/routes/visitor_management.php)). If `currently_inside` / `overstayed` filtering needs to happen client-side because the backend doesn't expose those flags, that's fine — the daily logs response is small enough to filter in JS.

### Wiring in `VisitorDashboard.jsx`

Add local state at the component top:
```js
const [kpiDialog, setKpiDialog] = useState({ open: false, kpiKey: null, title: '' });
```

Update the KPI cards (lines 221–224 and 230–238) to pass `onClick` for the 7 clickable ones. Example:
```jsx
<KpiCard
  icon={Users}
  title="Total Visitors Today"
  value={stats?.total_today ?? 0}
  accent="neutral"
  onClick={() => setKpiDialog({ open: true, kpiKey: 'total_today', title: 'Total Visitors Today' })}
/>
```

Render the dialog once at the bottom of the component tree:
```jsx
<KpiDetailDialog
  open={kpiDialog.open}
  onClose={() => setKpiDialog({ ...kpiDialog, open: false })}
  kpiKey={kpiDialog.kpiKey}
  title={kpiDialog.title}
/>
```

### Visual design

- **Dialog**: standard shadcn `Dialog` (same pattern used elsewhere in this app, e.g. the Log Details modal in [Report.js:741](../../../frontend-new/src/components/Report/Report.js#L741)).
- **Width**: `min-w-[900px] max-w-[1100px]`.
- **Header**: dark accent bar with the KPI's title + a record count badge (`12 records`).
- **Table**: same striped style as the in-page absent table. Avatars use the same KPI accent color (purple/blue/amber/green) so the popup visually echoes which card it came from.
- **Footer**: close button + count summary.

### Hover affordance on cards

Add to clickable KpiCard wrapper:
```
cursor-pointer transition-colors hover:bg-[#0e1730] hover:ring-1 hover:ring-white/10
```

The 3 non-clickable cards skip this — they keep their static appearance so the user can visually tell which are interactive.

## Out of scope

- Server-side filtering for `currently_inside` / `overstayed` (client-side filter is acceptable for the daily volume of records).
- Real data sources for Badges Printed / Face Verifications / Avg Wait Time.
- Persisting/deep-linking which dialog is open (e.g. URL params). The dialog is purely local UI state.
- Editing/managing records from inside the popup (read-only view).

## Validation plan

After implementation:
1. Click each of the 7 cards → matching popup opens with the expected list.
2. Verify counts in the popup match the KPI value on the card (within a tolerance for client-side filters).
3. Click the 3 non-clickable cards → no popup, no console error.
4. Type in the search box → list filters in real time.
5. Resize browser → dialog stays usable on narrow screens.
6. Open dashboard with `stats === null` (slow connection) → cards still render, clicking before stats load doesn't crash.
