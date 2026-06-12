# Dashboard i18n — Design

**Date:** 2026-05-18
**Scope:** Frontend (`frontend-new`) — translate the Executive Overview dashboard (`/` route, admin/manager view) into English / Arabic / French / Hindi.

**Builds on:** [2026-05-18-login-language-switcher-design.md](2026-05-18-login-language-switcher-design.md) and [2026-05-18-app-shell-i18n-design.md](2026-05-18-app-shell-i18n-design.md). The i18n library, locale files, `LanguageProvider`, and `LanguageSwitcher` are already in place. The app currently forces `<html dir="ltr">` for all languages (Arabic glyphs render via Unicode bidi within text). This work only adds dashboard-specific keys and wraps hard-coded strings in `t(...)` calls in six existing dashboard components.

## 1. Goal

After this work ships, the Executive Overview page that loads at `/` after admin/manager login has every visible static string translated. KPI counts, dates, names, and other dynamic values stay as-is. Layout is unchanged.

Translating the embedded tab-content components (Automation, Holidays, Announcements, Document Expiry, AI Feeds, Wishes), API-driven status strings (Allowed / Access Denied / On Time), toasts, and the staff dashboard is **explicitly out of scope** for this work.

## 2. Architecture

Add a single new namespace `dashboard.*` to the four existing locale files. No new files. Six existing dashboard component files are modified to import `useTranslation()` and reference the new keys.

```
frontend-new/
├── src/
│   ├── locales/
│   │   ├── en/common.json                    (modified — add dashboard namespace)
│   │   ├── ar/common.json                    (modified — same)
│   │   ├── fr/common.json                    (modified — same)
│   │   └── hi/common.json                    (modified — same)
│   └── components/
│       └── Dashboard/
│           ├── Dashboard.jsx                 (modified — header bar)
│           ├── Stats.jsx                     (modified — 6 stat-card labels + Alert)
│           ├── AttendanceCard.jsx            (modified — chart title, stat labels, tooltip)
│           ├── WelnessCard.jsx               (modified — title, status labels, footer)
│           ├── EventsAndInsights.jsx         (modified — title, tabs, fallback table)
│           └── LiveFeed.jsx                  (modified — feed title, column headers, dialog)
```

No new dependencies. No new files.

## 3. Key list — `dashboard.*` namespace

### 3.1 Header (`dashboard.header.*`) — 3 keys

| Key | English |
|---|---|
| `pageTitle` | Executive Overview |
| `selectBranchPlaceholder` | Select a Branch |
| `selectDepartmentPlaceholder` | Select Department |

### 3.2 Stat cards (`dashboard.stats.*`) — 7 keys

| Key | English |
|---|---|
| `totalHeadcount` | Total Headcount |
| `presentToday` | Present Today |
| `unplannedAbsence` | Unplanned Absence |
| `scheduledLeave` | Scheduled Leave |
| `vacation` | Vacation |
| `offlineNodes` | Offline Nodes |
| `alert` | Alert |

### 3.3 Daily Absences chart (`dashboard.absences.*`) — 7 keys

| Key | English |
|---|---|
| `title` | Daily Absences |
| `subtitle` | Last 7 days · bar height = absent count |
| `avg` | Avg |
| `peak` | Peak |
| `total` | Total |
| `tooltipAbsent` | absent |
| `tooltipPresent` | Present: |

### 3.4 Workforce Wellness (`dashboard.wellness.*`) — 9 keys

| Key | English |
|---|---|
| `title` | Workforce Wellness |
| `subtitle` | Burnout Risk Monitor |
| `statusOptimal` | Optimal |
| `statusStable` | Stable |
| `statusCaution` | Caution |
| `statusCritical` | Critical |
| `attentionRequired` | Attention Required |
| `systemHealthy` | System Healthy |
| `unplannedAbsencesToday` | `{{count}} unplanned absences today` (uses i18next interpolation; count is `stats.absentCount`) |

### 3.5 Insights & Events (`dashboard.insights.*`) — 12 keys

| Key | English |
|---|---|
| `title` | Insights & Events |
| `subtitle` | Live activity stream |
| `tabAutomation` | Automation |
| `tabHolidays` | Holidays |
| `tabAnnouncements` | Announcements |
| `tabDocumentExpiry` | Document Expiry |
| `tabAIFeeds` | AI Feeds |
| `tabWishes` | Wishes |
| `colEvent` | Event |
| `colSource` | Source |
| `colTime` | Time |
| `noEventsFound` | No Events Found |

### 3.6 Live Recognition Feed (`dashboard.feed.*`) — 10 keys

| Key | English |
|---|---|
| `title` | Live Recognition Feed |
| `viewFullLog` | View Full Log |
| `colNumber` | # |
| `colEmployee` | Employee |
| `colBranch` | Branch |
| `colDepartment` | Department |
| `colDateTime` | Date & Time |
| `colInOut` | In/Out |
| `colMode` | Mode |
| `colDeviceName` | Device Name |

(10 visible columns, but `colNumber` is `#` which doesn't translate per se — kept as a key for consistency so the value can be customized if needed.)

### 3.7 Live Feed employee-detail dialog (`dashboard.feedDialog.*`) — 11 keys

| Key | English |
|---|---|
| `presents` | Presents |
| `absence` | Absence |
| `incomplete` | Incomplete |
| `manualEntry` | Manual Entry |
| `leaves` | Leaves |
| `holidays` | Holidays |
| `shift` | Shift |
| `shiftTime` | Shift Time |
| `dateTime` | Date Time |
| `device` | Device |
| `close` | Close |

**Total: 59 keys** under the `dashboard.*` namespace (3 + 7 + 7 + 9 + 12 + 10 + 11).

## 4. How the changes look in code

Pattern in each component file:

1. Add `import { useTranslation } from "react-i18next";` at the top.
2. Inside the component function, add `const { t } = useTranslation();`.
3. Replace hard-coded English strings:
   - `>Executive Overview<` → `>{t('dashboard.header.pageTitle')}<`
   - `placeholder="Select a Branch"` → `placeholder={t('dashboard.header.selectBranchPlaceholder')}`
   - `label="Total Headcount"` → `label={t('dashboard.stats.totalHeadcount')}`
   - Counter strings: `{stats.absentCount} unplanned absences today` → `{t('dashboard.wellness.unplannedAbsencesToday', { count: stats.absentCount })}`

For the wellness `status` object (whose `label` field is read into JSX), change:

```js
const status = useMemo(() => {
  if (safeWellnessValue >= 80) return { label: "Optimal",  ... };
  if (safeWellnessValue >= 60) return { label: "Stable",   ... };
  ...
}, [safeWellnessValue]);
```

to:

```js
const status = useMemo(() => {
  if (safeWellnessValue >= 80) return { labelKey: "dashboard.wellness.statusOptimal",  ... };
  if (safeWellnessValue >= 60) return { labelKey: "dashboard.wellness.statusStable",   ... };
  if (safeWellnessValue >= 40) return { labelKey: "dashboard.wellness.statusCaution",  ... };
  return                            { labelKey: "dashboard.wellness.statusCritical", ... };
}, [safeWellnessValue]);
```

Then in JSX render `t(status.labelKey)` instead of `{status.label}`.

For the `TABS` array in EventsAndInsights, change:

```js
const TABS = [
  { id: "Automation",      label: "Automation",      icon: Workflow },
  ...
];
```

to:

```js
const TABS = [
  { id: "Automation",      labelKey: "dashboard.insights.tabAutomation",     icon: Workflow },
  { id: "Holidays",        labelKey: "dashboard.insights.tabHolidays",       icon: CalendarDays },
  { id: "Announcements",   labelKey: "dashboard.insights.tabAnnouncements",  icon: Megaphone },
  { id: "Document Expiry", labelKey: "dashboard.insights.tabDocumentExpiry", icon: FileWarning },
  { id: "AI Feeds",        labelKey: "dashboard.insights.tabAIFeeds",        icon: Bot },
  { id: "Wishes",          labelKey: "dashboard.insights.tabWishes",         icon: Cake },
];
```

The `id` field stays as the English string because it's used as a discriminator in the `activeTab === "Automation"` checks. Only the rendered label goes through `t()`.

## 5. Verification

Manual matrix (no automated tests):

| # | Action | Expected |
|---|---|---|
| 1 | Clear localStorage, log in as admin/manager | Dashboard loads at `/`. All strings English. |
| 2 | Use the header language switcher → Français | Page title "Aperçu exécutif", stat-card labels in French, chart labels in French, tab labels in French, table columns in French, Live Recognition Feed title and "View Full Log" in French |
| 3 | Switch to हिन्दी | Same as #2 but Hindi |
| 4 | Switch to العربية | Same as #2 but Arabic. Layout stays LTR (per global-LTR setting). |
| 5 | Verify KPI values, employee names, dates | All unchanged — these are data values, not translation strings |
| 6 | Click an Insights & Events tab (e.g. Holidays) | Tab label is translated. The embedded content (Holidays component) remains English — that is the explicit out-of-scope boundary. |
| 7 | Click an employee row in Live Recognition Feed | Detail dialog opens. All static labels translated (Presents, Absence, Incomplete, etc.) |
| 8 | Workforce Wellness gauge | When score >= 60 the status badge reads "Stable" in the active language; the footer shows either "Attention Required" or "System Healthy" and the dynamic "N unplanned absences today" string (interpolation works) |

## 6. Translations

The four locale files are extended with the new `dashboard.*` namespace using carefully prepared translations for the new keys. Approach matches prior i18n work: technical / HR domain terms are translated using industry-standard usage in each language. Native-speaker review remains a follow-up step that touches only the four JSON files.

## 7. Out of scope

- Tab-content components rendered inside Insights & Events: `AutomationAll`, `HolidaysAll`, `AnnouncementsAll`, `DocumentExpiryAll`, `AIFeedAll`, `WeeklyBirthdays`. The tab *labels* are translated; the content inside each tab keeps its own English strings until a separate plan handles those pages.
- The hard-coded `MOCK_DATA` object inside `EventsAndInsights.jsx` (event names, locations, source labels). It is currently unused because the real tab-content components are mounted instead. We do not extract these strings.
- API-driven values arriving from the backend (`status`, `punctuality`, `log_type`, `device.function`, employee names, branch names, department names). These come from the database and may include legacy values like "Allowed", "Access Denied", "On Time". A separate future plan will introduce a frontend status-to-key mapping or a backend translation layer.
- Toast / Sonner / SweetAlert messages triggered from dashboard actions.
- The chart axes inside `recharts` use a custom `XAxis` whose tick labels come from `dayLetter` in API data. Those one-letter day codes (T/W/T/F/S/S/M in the screenshot) are not translated here; they pass through unchanged.
- `toLocaleString` / `toLocaleDateString` formatting on dates and times in the live feed; those continue to use `en-US` locale.
- The staff dashboard at `/staff/dashboard` (a different component, `StaffDashboard.jsx`). Translating it is a separate plan.
