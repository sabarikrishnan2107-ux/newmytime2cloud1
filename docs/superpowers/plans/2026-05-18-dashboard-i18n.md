# Dashboard i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the Executive Overview dashboard at `/` into English / Arabic / French / Hindi by adding a `dashboard.*` namespace (59 keys) to the four existing locale files and replacing hard-coded strings in six existing dashboard components with `t(...)` calls.

**Architecture:** Build on the existing i18n infrastructure (already shipped: `react-i18next`, four `locales/{lang}/common.json` files, `LanguageProvider`, `LanguageSwitcher` rendered in the header, global `<html dir="ltr">` for all languages). Add a single new namespace inside each of the four locale files. Modify six dashboard components (`Dashboard.jsx`, `Stats.jsx`, `AttendanceCard.jsx`, `WelnessCard.jsx`, `EventsAndInsights.jsx`, `LiveFeed.jsx`) to import `useTranslation()` and look up display strings via `t('dashboard.<section>.<key>')`. Two components (`WelnessCard`, `EventsAndInsights`) need a small refactor where a `label` field on a config object becomes a `labelKey` so the rendering call site is the one that runs `t()`.

**Tech Stack:** Next.js 15 App Router, React 19, `react-i18next` 15.x (already installed), Tailwind v4, recharts.

**Spec:** [`docs/superpowers/specs/2026-05-18-dashboard-i18n-design.md`](../specs/2026-05-18-dashboard-i18n-design.md)

**Note on testing:** No frontend test suite. Verification is **manual browser testing** at the end.

**Note on commits:** Per project preference, the user handles all git commits. Treat every "Commit" step as a checkpoint where the engineer pauses and asks the user to commit.

---

## Task 1: Add `dashboard.*` namespace to the English locale file

**Files:**
- Modify: `frontend-new/src/locales/en/common.json`

- [ ] **Step 1: Insert the `dashboard` block before the closing brace of the file**

Open `frontend-new/src/locales/en/common.json`. Locate the last closing brace `}` of the top-level object. Immediately before the existing `"common": {` block (or, equivalently, after the `"language"` block and before `"common"`), insert a new `"dashboard": { ... }` block as below. Keep all existing namespaces (`login`, `branding`, `footer`, `language`, `menu`, `header`, `common`) untouched.

The exact content to insert (with the leading comma after `language`'s closing brace remaining and a trailing comma before `"menu"`):

```json
  "dashboard": {
    "header": {
      "pageTitle": "Executive Overview",
      "selectBranchPlaceholder": "Select a Branch",
      "selectDepartmentPlaceholder": "Select Department"
    },
    "stats": {
      "totalHeadcount": "Total Headcount",
      "presentToday": "Present Today",
      "unplannedAbsence": "Unplanned Absence",
      "scheduledLeave": "Scheduled Leave",
      "vacation": "Vacation",
      "offlineNodes": "Offline Nodes",
      "alert": "Alert"
    },
    "absences": {
      "title": "Daily Absences",
      "subtitle": "Last 7 days · bar height = absent count",
      "avg": "Avg",
      "peak": "Peak",
      "total": "Total",
      "tooltipAbsent": "absent",
      "tooltipPresent": "Present:"
    },
    "wellness": {
      "title": "Workforce Wellness",
      "subtitle": "Burnout Risk Monitor",
      "statusOptimal": "Optimal",
      "statusStable": "Stable",
      "statusCaution": "Caution",
      "statusCritical": "Critical",
      "attentionRequired": "Attention Required",
      "systemHealthy": "System Healthy",
      "unplannedAbsencesToday": "{{count}} unplanned absences today"
    },
    "insights": {
      "title": "Insights & Events",
      "subtitle": "Live activity stream",
      "tabAutomation": "Automation",
      "tabHolidays": "Holidays",
      "tabAnnouncements": "Announcements",
      "tabDocumentExpiry": "Document Expiry",
      "tabAIFeeds": "AI Feeds",
      "tabWishes": "Wishes",
      "colEvent": "Event",
      "colSource": "Source",
      "colTime": "Time",
      "noEventsFound": "No Events Found"
    },
    "feed": {
      "title": "Live Recognition Feed",
      "viewFullLog": "View Full Log",
      "colNumber": "#",
      "colEmployee": "Employee",
      "colBranch": "Branch",
      "colDepartment": "Department",
      "colDateTime": "Date & Time",
      "colInOut": "In/Out",
      "colMode": "Mode",
      "colDeviceName": "Device Name"
    },
    "feedDialog": {
      "presents": "Presents",
      "absence": "Absence",
      "incomplete": "Incomplete",
      "manualEntry": "Manual Entry",
      "leaves": "Leaves",
      "holidays": "Holidays",
      "shift": "Shift",
      "shiftTime": "Shift Time",
      "dateTime": "Date Time",
      "device": "Device",
      "close": "Close"
    }
  },
```

The file's existing top-level structure is (commas indicated):

```
{
  "login": { ... },
  "branding": { ... },
  "footer": { ... },
  "language": { ... },     ← place new dashboard block right after this one
  "menu": { ... },
  "header": { ... },
  "common": { ... }
}
```

So the resulting order will be:

```
{
  "login": { ... },
  "branding": { ... },
  "footer": { ... },
  "language": { ... },
  "dashboard": { ... },     ← new
  "menu": { ... },
  "header": { ... },
  "common": { ... }
}
```

- [ ] **Step 2: Validate JSON**

Run from the repository root:

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/en/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

---

## Task 2: Add `dashboard.*` namespace to the Arabic locale file

**Files:**
- Modify: `frontend-new/src/locales/ar/common.json`

- [ ] **Step 1: Insert the `dashboard` block in the same position**

Insert the following block after the `"language"` block and before the `"menu"` block:

```json
  "dashboard": {
    "header": {
      "pageTitle": "نظرة عامة تنفيذية",
      "selectBranchPlaceholder": "اختر فرعًا",
      "selectDepartmentPlaceholder": "اختر القسم"
    },
    "stats": {
      "totalHeadcount": "إجمالي عدد الموظفين",
      "presentToday": "الحاضرون اليوم",
      "unplannedAbsence": "غياب غير مخطط",
      "scheduledLeave": "إجازة مجدولة",
      "vacation": "إجازة",
      "offlineNodes": "أجهزة غير متصلة",
      "alert": "تنبيه"
    },
    "absences": {
      "title": "حالات الغياب اليومية",
      "subtitle": "آخر 7 أيام · ارتفاع العمود = عدد الغياب",
      "avg": "متوسط",
      "peak": "ذروة",
      "total": "إجمالي",
      "tooltipAbsent": "غائب",
      "tooltipPresent": "حاضر:"
    },
    "wellness": {
      "title": "صحة القوى العاملة",
      "subtitle": "مراقبة مخاطر الإرهاق",
      "statusOptimal": "مثالي",
      "statusStable": "مستقر",
      "statusCaution": "تحذير",
      "statusCritical": "حرج",
      "attentionRequired": "تتطلب الانتباه",
      "systemHealthy": "النظام سليم",
      "unplannedAbsencesToday": "{{count}} حالات غياب غير مخططة اليوم"
    },
    "insights": {
      "title": "الرؤى والأحداث",
      "subtitle": "تدفق النشاط المباشر",
      "tabAutomation": "الأتمتة",
      "tabHolidays": "العطلات",
      "tabAnnouncements": "الإعلانات",
      "tabDocumentExpiry": "انتهاء الوثائق",
      "tabAIFeeds": "خلاصات الذكاء الاصطناعي",
      "tabWishes": "التهاني",
      "colEvent": "الحدث",
      "colSource": "المصدر",
      "colTime": "الوقت",
      "noEventsFound": "لا توجد أحداث"
    },
    "feed": {
      "title": "تغذية التعرف المباشرة",
      "viewFullLog": "عرض السجل الكامل",
      "colNumber": "#",
      "colEmployee": "الموظف",
      "colBranch": "الفرع",
      "colDepartment": "القسم",
      "colDateTime": "التاريخ والوقت",
      "colInOut": "دخول/خروج",
      "colMode": "الوضع",
      "colDeviceName": "اسم الجهاز"
    },
    "feedDialog": {
      "presents": "حضور",
      "absence": "غياب",
      "incomplete": "غير مكتمل",
      "manualEntry": "إدخال يدوي",
      "leaves": "إجازات",
      "holidays": "عطلات",
      "shift": "الوردية",
      "shiftTime": "وقت الوردية",
      "dateTime": "التاريخ والوقت",
      "device": "الجهاز",
      "close": "إغلاق"
    }
  },
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/ar/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

---

## Task 3: Add `dashboard.*` namespace to the French locale file

**Files:**
- Modify: `frontend-new/src/locales/fr/common.json`

- [ ] **Step 1: Insert the `dashboard` block in the same position**

```json
  "dashboard": {
    "header": {
      "pageTitle": "Aperçu exécutif",
      "selectBranchPlaceholder": "Sélectionner une agence",
      "selectDepartmentPlaceholder": "Sélectionner un département"
    },
    "stats": {
      "totalHeadcount": "Effectif total",
      "presentToday": "Présents aujourd'hui",
      "unplannedAbsence": "Absence imprévue",
      "scheduledLeave": "Congé planifié",
      "vacation": "Vacances",
      "offlineNodes": "Nœuds hors ligne",
      "alert": "Alerte"
    },
    "absences": {
      "title": "Absences quotidiennes",
      "subtitle": "7 derniers jours · hauteur de barre = nombre d'absences",
      "avg": "Moy.",
      "peak": "Pic",
      "total": "Total",
      "tooltipAbsent": "absent",
      "tooltipPresent": "Présents :"
    },
    "wellness": {
      "title": "Bien-être de l'équipe",
      "subtitle": "Surveillance du risque d'épuisement",
      "statusOptimal": "Optimal",
      "statusStable": "Stable",
      "statusCaution": "Attention",
      "statusCritical": "Critique",
      "attentionRequired": "Attention requise",
      "systemHealthy": "Système sain",
      "unplannedAbsencesToday": "{{count}} absences imprévues aujourd'hui"
    },
    "insights": {
      "title": "Informations et événements",
      "subtitle": "Flux d'activité en direct",
      "tabAutomation": "Automatisation",
      "tabHolidays": "Jours fériés",
      "tabAnnouncements": "Annonces",
      "tabDocumentExpiry": "Expiration des documents",
      "tabAIFeeds": "Flux IA",
      "tabWishes": "Vœux",
      "colEvent": "Événement",
      "colSource": "Source",
      "colTime": "Heure",
      "noEventsFound": "Aucun événement"
    },
    "feed": {
      "title": "Flux de reconnaissance en direct",
      "viewFullLog": "Voir le journal complet",
      "colNumber": "#",
      "colEmployee": "Employé",
      "colBranch": "Agence",
      "colDepartment": "Département",
      "colDateTime": "Date et heure",
      "colInOut": "Entrée/Sortie",
      "colMode": "Mode",
      "colDeviceName": "Nom de l'appareil"
    },
    "feedDialog": {
      "presents": "Présences",
      "absence": "Absence",
      "incomplete": "Incomplet",
      "manualEntry": "Saisie manuelle",
      "leaves": "Congés",
      "holidays": "Jours fériés",
      "shift": "Quart",
      "shiftTime": "Horaire du quart",
      "dateTime": "Date et heure",
      "device": "Appareil",
      "close": "Fermer"
    }
  },
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/fr/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

---

## Task 4: Add `dashboard.*` namespace to the Hindi locale file

**Files:**
- Modify: `frontend-new/src/locales/hi/common.json`

- [ ] **Step 1: Insert the `dashboard` block in the same position**

```json
  "dashboard": {
    "header": {
      "pageTitle": "कार्यकारी अवलोकन",
      "selectBranchPlaceholder": "शाखा चुनें",
      "selectDepartmentPlaceholder": "विभाग चुनें"
    },
    "stats": {
      "totalHeadcount": "कुल कर्मचारी",
      "presentToday": "आज उपस्थित",
      "unplannedAbsence": "अनिर्धारित अनुपस्थिति",
      "scheduledLeave": "निर्धारित अवकाश",
      "vacation": "छुट्टी",
      "offlineNodes": "ऑफ़लाइन डिवाइस",
      "alert": "अलर्ट"
    },
    "absences": {
      "title": "दैनिक अनुपस्थिति",
      "subtitle": "पिछले 7 दिन · बार की ऊँचाई = अनुपस्थिति की संख्या",
      "avg": "औसत",
      "peak": "अधिकतम",
      "total": "कुल",
      "tooltipAbsent": "अनुपस्थित",
      "tooltipPresent": "उपस्थित:"
    },
    "wellness": {
      "title": "कार्यबल स्वास्थ्य",
      "subtitle": "बर्नआउट जोखिम मॉनिटर",
      "statusOptimal": "उत्कृष्ट",
      "statusStable": "स्थिर",
      "statusCaution": "सावधानी",
      "statusCritical": "गंभीर",
      "attentionRequired": "ध्यान आवश्यक",
      "systemHealthy": "सिस्टम स्वस्थ",
      "unplannedAbsencesToday": "आज {{count}} अनिर्धारित अनुपस्थितियाँ"
    },
    "insights": {
      "title": "अंतर्दृष्टि और घटनाएँ",
      "subtitle": "लाइव गतिविधि स्ट्रीम",
      "tabAutomation": "ऑटोमेशन",
      "tabHolidays": "अवकाश",
      "tabAnnouncements": "घोषणाएँ",
      "tabDocumentExpiry": "दस्तावेज़ समाप्ति",
      "tabAIFeeds": "AI फ़ीड",
      "tabWishes": "शुभकामनाएँ",
      "colEvent": "घटना",
      "colSource": "स्रोत",
      "colTime": "समय",
      "noEventsFound": "कोई घटना नहीं"
    },
    "feed": {
      "title": "लाइव पहचान फ़ीड",
      "viewFullLog": "पूरा लॉग देखें",
      "colNumber": "#",
      "colEmployee": "कर्मचारी",
      "colBranch": "शाखा",
      "colDepartment": "विभाग",
      "colDateTime": "तिथि और समय",
      "colInOut": "अंदर/बाहर",
      "colMode": "मोड",
      "colDeviceName": "डिवाइस का नाम"
    },
    "feedDialog": {
      "presents": "उपस्थिति",
      "absence": "अनुपस्थिति",
      "incomplete": "अधूरा",
      "manualEntry": "मैनुअल प्रविष्टि",
      "leaves": "अवकाश",
      "holidays": "छुट्टियाँ",
      "shift": "शिफ्ट",
      "shiftTime": "शिफ्ट का समय",
      "dateTime": "तिथि और समय",
      "device": "डिवाइस",
      "close": "बंद करें"
    }
  },
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/hi/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

- [ ] **Step 3: Pause for user commit**

Tell the user: "All four locale files extended with the `dashboard` namespace. Please commit `frontend-new/src/locales/` before continuing to component changes."

---

## Task 5: Translate `Dashboard.jsx` (header bar)

**Files:**
- Modify: `frontend-new/src/components/Dashboard/Dashboard.jsx`

- [ ] **Step 1: Add `useTranslation` import**

Locate the imports block at the top of the file. Change:

```javascript
import { getBranches, getDepartmentsByBranchIds } from "@/lib/api";
import { parseApiError } from "@/lib/utils";
import { useEffect, useState } from "react";
import Dropdown from "../Theme/DropDown";
import MultiDropDown from "../ui/MultiDropDown";
```

to:

```javascript
import { getBranches, getDepartmentsByBranchIds } from "@/lib/api";
import { parseApiError } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../Theme/DropDown";
import MultiDropDown from "../ui/MultiDropDown";
```

- [ ] **Step 2: Call `useTranslation` inside the component**

Locate the function `const AdminDashboard = () => {` and the first line after it. Change:

```javascript
const AdminDashboard = () => {
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
```

to:

```javascript
const AdminDashboard = () => {
  const { t } = useTranslation();
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
```

- [ ] **Step 3: Translate the page title**

Change:

```jsx
        <h2 className="text-2xl font-extrabold text-gray-700 dark:text-gray-100 font-display tracking-tight">
          Executive Overview
        </h2>
```

to:

```jsx
        <h2 className="text-2xl font-extrabold text-gray-700 dark:text-gray-100 font-display tracking-tight">
          {t('dashboard.header.pageTitle')}
        </h2>
```

- [ ] **Step 4: Translate the branch dropdown placeholder**

Change:

```jsx
            <MultiDropDown
              items={branches}
              value={selectedBranchIds}
              onChange={(item) => {
                setSelectedBranchIds(item);
              }}
              placeholder="Select a Branch"
            />
```

to:

```jsx
            <MultiDropDown
              items={branches}
              value={selectedBranchIds}
              onChange={(item) => {
                setSelectedBranchIds(item);
              }}
              placeholder={t('dashboard.header.selectBranchPlaceholder')}
            />
```

- [ ] **Step 5: Translate the department dropdown placeholder**

Change:

```jsx
            <MultiDropDown
              placeholder={"Select Department"}
              items={departments}
              value={selectedDepartmentIds}
              onChange={setSelectedDepartmentIds}
              badgesCount={1}
            />
```

to:

```jsx
            <MultiDropDown
              placeholder={t('dashboard.header.selectDepartmentPlaceholder')}
              items={departments}
              value={selectedDepartmentIds}
              onChange={setSelectedDepartmentIds}
              badgesCount={1}
            />
```

- [ ] **Step 6: Verify no English strings remain in the file**

Run from the repository root:

```bash
node -e "const c = require('fs').readFileSync('frontend-new/src/components/Dashboard/Dashboard.jsx','utf8'); ['Executive Overview', 'Select a Branch', 'Select Department'].forEach(s => { if (c.includes(s)) throw new Error('Untranslated: '+s); }); console.log('OK')"
```

Expected: `OK`.

---

## Task 6: Translate `Stats.jsx` (6 stat cards + Alert)

**Files:**
- Modify: `frontend-new/src/components/Dashboard/Stats.jsx`

- [ ] **Step 1: Add `useTranslation` import**

Change:

```javascript
import { getAttendanceCount } from "@/lib/endpoint/dashboard";
import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  Plane,
  ServerOff,
  AlertTriangle,
} from "lucide-react";
import EmployeeListDialog from "./EmployeeListDialog";
```

to:

```javascript
import { getAttendanceCount } from "@/lib/endpoint/dashboard";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  Plane,
  ServerOff,
  AlertTriangle,
} from "lucide-react";
import EmployeeListDialog from "./EmployeeListDialog";
```

- [ ] **Step 2: Pass `t` as a prop to `StatCard` for the "Alert" badge**

The `StatCard` component is defined outside the `Stats` function, so it doesn't see `t` directly. The simplest fix is to pass the translated alert label down. Change the `StatCard` signature and its `alert` rendering.

Find the existing block:

```javascript
function StatCard({ label, value, icon: Icon, accent = "neutral", badge, alert = false, onClick }) {
```

and the line that renders "Alert":

```jsx
        {alert && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1"
            style={{ color: a.iconFg, background: a.iconBg }}
          >
            <AlertTriangle className="h-3 w-3" /> Alert
          </span>
        )}
```

Change the signature to accept an `alertLabel` prop:

```javascript
function StatCard({ label, value, icon: Icon, accent = "neutral", badge, alert = false, alertLabel = "Alert", onClick }) {
```

and the rendering to use it:

```jsx
        {alert && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1"
            style={{ color: a.iconFg, background: a.iconBg }}
          >
            <AlertTriangle className="h-3 w-3" /> {alertLabel}
          </span>
        )}
```

- [ ] **Step 3: Call `useTranslation` inside the `Stats` function and translate all 6 card labels**

Locate:

```javascript
function Stats({ branch_ids, department_ids }) {
  const [stats, setStats] = useState({
```

Add `const { t } = useTranslation();` right after the opening brace:

```javascript
function Stats({ branch_ids, department_ids }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
```

Then change the six `<StatCard label="..." />` calls. Replace this entire block:

```jsx
      <StatCard
        label="Total Headcount"
        value={stats.employeeCount}
        icon={Users}
        accent="neutral"
      />
      <StatCard
        label="Present Today"
        value={stats.presentCount}
        icon={UserCheck}
        accent="green"
        badge={presentPct !== null ? `${presentPct}%` : null}
        onClick={() => setOpenVariant("present")}
      />
      <StatCard
        label="Unplanned Absence"
        value={stats.absentCount}
        icon={UserX}
        accent="red"
        badge={absentPct !== null ? `${absentPct}%` : null}
        onClick={() => setOpenVariant("absent")}
      />
      <StatCard
        label="Scheduled Leave"
        value={stats.leaveCount}
        icon={CalendarDays}
        accent="purple"
      />
      <StatCard
        label="Vacation"
        value={stats.vacationCount}
        icon={Plane}
        accent="indigo"
      />
      <StatCard
        label="Offline Nodes"
        value={stats.offlineDevices}
        icon={ServerOff}
        accent="orange"
        alert={stats.offlineDevices > 0}
      />
```

with:

```jsx
      <StatCard
        label={t('dashboard.stats.totalHeadcount')}
        value={stats.employeeCount}
        icon={Users}
        accent="neutral"
      />
      <StatCard
        label={t('dashboard.stats.presentToday')}
        value={stats.presentCount}
        icon={UserCheck}
        accent="green"
        badge={presentPct !== null ? `${presentPct}%` : null}
        onClick={() => setOpenVariant("present")}
      />
      <StatCard
        label={t('dashboard.stats.unplannedAbsence')}
        value={stats.absentCount}
        icon={UserX}
        accent="red"
        badge={absentPct !== null ? `${absentPct}%` : null}
        onClick={() => setOpenVariant("absent")}
      />
      <StatCard
        label={t('dashboard.stats.scheduledLeave')}
        value={stats.leaveCount}
        icon={CalendarDays}
        accent="purple"
      />
      <StatCard
        label={t('dashboard.stats.vacation')}
        value={stats.vacationCount}
        icon={Plane}
        accent="indigo"
      />
      <StatCard
        label={t('dashboard.stats.offlineNodes')}
        value={stats.offlineDevices}
        icon={ServerOff}
        accent="orange"
        alert={stats.offlineDevices > 0}
        alertLabel={t('dashboard.stats.alert')}
      />
```

- [ ] **Step 4: Verify no English stat labels remain**

```bash
node -e "const c = require('fs').readFileSync('frontend-new/src/components/Dashboard/Stats.jsx','utf8'); ['label=\"Total Headcount\"','label=\"Present Today\"','label=\"Unplanned Absence\"','label=\"Scheduled Leave\"','label=\"Vacation\"','label=\"Offline Nodes\"','> Alert'].forEach(s => { if (c.includes(s)) throw new Error('Untranslated: '+s); }); console.log('OK')"
```

Expected: `OK`.

---

## Task 7: Translate `AttendanceCard.jsx` (Daily Absences chart)

**Files:**
- Modify: `frontend-new/src/components/Dashboard/AttendanceCard.jsx`

- [ ] **Step 1: Add `useTranslation` import**

Change:

```javascript
import { dashboardGetCountslast7DaysChart } from "@/lib/endpoint/dashboard";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
```

to:

```javascript
import { dashboardGetCountslast7DaysChart } from "@/lib/endpoint/dashboard";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
```

- [ ] **Step 2: Convert `ChartTooltip` to accept `t` via props**

The `ChartTooltip` function is defined outside `AttendanceCard` so it can't call `useTranslation()` directly without becoming a hook. The cleanest approach is to inline a `t`-aware tooltip inside the component. Replace the existing `ChartTooltip` function entirely with a version that ignores translation (its strings will be passed in) — change:

```javascript
function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 min-w-[150px]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {r.day} · {r.dateLabel}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">{r.absent ?? 0}</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">absent</span>
      </div>
      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
        Present: {r.present ?? 0}
      </p>
    </div>
  );
}
```

to:

```javascript
function ChartTooltip({ active, payload, absentLabel, presentLabel }) {
  if (!active || !payload || !payload.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 min-w-[150px]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {r.day} · {r.dateLabel}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">{r.absent ?? 0}</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{absentLabel}</span>
      </div>
      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
        {presentLabel} {r.present ?? 0}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Call `useTranslation` inside the component**

Change:

```javascript
function AttendanceCard({ branch_ids, department_ids }) {
  const [stats, setStats] = useState([]);
```

to:

```javascript
function AttendanceCard({ branch_ids, department_ids }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState([]);
```

- [ ] **Step 4: Translate title and subtitle**

Change:

```jsx
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100">
            Daily Absences
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Last 7 days · bar height = absent count</p>
        </div>
```

to:

```jsx
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100">
            {t('dashboard.absences.title')}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('dashboard.absences.subtitle')}</p>
        </div>
```

- [ ] **Step 5: Translate the Avg / Peak / Total labels**

Change:

```jsx
      <div className="flex items-center gap-4 mb-2 text-[11px]">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Avg </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{avgAbsent}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Peak </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{peakAbsent}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Total </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{totalAbsent}</span>
        </div>
      </div>
```

to:

```jsx
      <div className="flex items-center gap-4 mb-2 text-[11px]">
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.absences.avg')} </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{avgAbsent}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.absences.peak')} </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{peakAbsent}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('dashboard.absences.total')} </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{totalAbsent}</span>
        </div>
      </div>
```

- [ ] **Step 6: Pass translated tooltip labels into `ChartTooltip`**

Locate the `<Tooltip ... content={<ChartTooltip />} />` line and replace it. Change:

```jsx
            <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} content={<ChartTooltip />} />
```

to:

```jsx
            <Tooltip
              cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
              content={<ChartTooltip absentLabel={t('dashboard.absences.tooltipAbsent')} presentLabel={t('dashboard.absences.tooltipPresent')} />}
            />
```

- [ ] **Step 7: Verify no English strings remain**

```bash
node -e "const c = require('fs').readFileSync('frontend-new/src/components/Dashboard/AttendanceCard.jsx','utf8'); ['Daily Absences','Last 7 days','>Avg <','>Peak <','>Total <','>absent<','>Present: '].forEach(s => { if (c.includes(s)) throw new Error('Untranslated: '+s); }); console.log('OK')"
```

Expected: `OK`.

---

## Task 8: Translate `WelnessCard.jsx` (status object refactor + footer text)

**Files:**
- Modify: `frontend-new/src/components/Dashboard/WelnessCard.jsx`

- [ ] **Step 1: Add `useTranslation` import**

Change:

```javascript
import { useDarkMode } from "@/context/DarkModeContext";
import { getAttendanceCount } from "@/lib/endpoint/dashboard";
import { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { ShieldCheck, AlertTriangle, ShieldAlert, Activity } from "lucide-react";
```

to:

```javascript
import { useDarkMode } from "@/context/DarkModeContext";
import { getAttendanceCount } from "@/lib/endpoint/dashboard";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { ShieldCheck, AlertTriangle, ShieldAlert, Activity } from "lucide-react";
```

- [ ] **Step 2: Call `useTranslation` inside the component**

Change:

```javascript
function WelnessCard({ branch_ids, department_ids }) {
  const { isDark } = useDarkMode();
  const [stats, setStats] = useState({
```

to:

```javascript
function WelnessCard({ branch_ids, department_ids }) {
  const { t } = useTranslation();
  const { isDark } = useDarkMode();
  const [stats, setStats] = useState({
```

- [ ] **Step 3: Refactor the `status` object to use `labelKey` instead of `label`**

Change:

```javascript
  const status = useMemo(() => {
    if (safeWellnessValue >= 80) return { label: "Optimal",  color: "#10b981", icon: ShieldCheck, glow: "rgba(16,185,129,0.45)", textCls: "text-emerald-500", bgCls: "bg-emerald-500/15" };
    if (safeWellnessValue >= 60) return { label: "Stable",   color: "#22c55e", icon: ShieldCheck, glow: "rgba(34,197,94,0.45)",  textCls: "text-green-500",   bgCls: "bg-green-500/15" };
    if (safeWellnessValue >= 40) return { label: "Caution",  color: "#f59e0b", icon: AlertTriangle, glow: "rgba(245,158,11,0.45)", textCls: "text-amber-500",   bgCls: "bg-amber-500/15" };
    return { label: "Critical", color: "#ef4444", icon: ShieldAlert, glow: "rgba(239,68,68,0.45)",  textCls: "text-rose-500",    bgCls: "bg-rose-500/15" };
  }, [safeWellnessValue]);
```

to:

```javascript
  const status = useMemo(() => {
    if (safeWellnessValue >= 80) return { labelKey: "dashboard.wellness.statusOptimal",  color: "#10b981", icon: ShieldCheck, glow: "rgba(16,185,129,0.45)", textCls: "text-emerald-500", bgCls: "bg-emerald-500/15" };
    if (safeWellnessValue >= 60) return { labelKey: "dashboard.wellness.statusStable",   color: "#22c55e", icon: ShieldCheck, glow: "rgba(34,197,94,0.45)",  textCls: "text-green-500",   bgCls: "bg-green-500/15" };
    if (safeWellnessValue >= 40) return { labelKey: "dashboard.wellness.statusCaution",  color: "#f59e0b", icon: AlertTriangle, glow: "rgba(245,158,11,0.45)", textCls: "text-amber-500",   bgCls: "bg-amber-500/15" };
    return { labelKey: "dashboard.wellness.statusCritical", color: "#ef4444", icon: ShieldAlert, glow: "rgba(239,68,68,0.45)",  textCls: "text-rose-500",    bgCls: "bg-rose-500/15" };
  }, [safeWellnessValue]);
```

- [ ] **Step 4: Translate title and subtitle**

Change:

```jsx
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100">
          Workforce Wellness
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Burnout Risk Monitor</p>
```

to:

```jsx
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100">
          {t('dashboard.wellness.title')}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('dashboard.wellness.subtitle')}</p>
```

- [ ] **Step 5: Render the status badge via `t(status.labelKey)`**

Change:

```jsx
          <span className={`mt-1 text-[10px] font-bold uppercase tracking-[0.12em] ${status.textCls} ${status.bgCls} px-2 py-0.5 rounded-full`}>
            {status.label}
          </span>
```

to:

```jsx
          <span className={`mt-1 text-[10px] font-bold uppercase tracking-[0.12em] ${status.textCls} ${status.bgCls} px-2 py-0.5 rounded-full`}>
            {t(status.labelKey)}
          </span>
```

- [ ] **Step 6: Translate the footer alert headline and the count line**

Change:

```jsx
          <div className="min-w-0">
            <p className={`text-[11px] font-semibold leading-tight ${status.textCls}`}>
              {safeWellnessValue < 70 ? "Attention Required" : "System Healthy"}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.absentCount} unplanned absences today
            </p>
          </div>
```

to:

```jsx
          <div className="min-w-0">
            <p className={`text-[11px] font-semibold leading-tight ${status.textCls}`}>
              {safeWellnessValue < 70 ? t('dashboard.wellness.attentionRequired') : t('dashboard.wellness.systemHealthy')}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t('dashboard.wellness.unplannedAbsencesToday', { count: stats.absentCount })}
            </p>
          </div>
```

- [ ] **Step 7: Verify no English strings remain**

```bash
node -e "const c = require('fs').readFileSync('frontend-new/src/components/Dashboard/WelnessCard.jsx','utf8'); ['Workforce Wellness','Burnout Risk Monitor','Attention Required','System Healthy','unplanned absences today','label: \"Optimal\"','label: \"Stable\"','label: \"Caution\"','label: \"Critical\"'].forEach(s => { if (c.includes(s)) throw new Error('Untranslated: '+s); }); console.log('OK')"
```

Expected: `OK`.

---

## Task 9: Translate `EventsAndInsights.jsx` (title, tabs, fallback table)

**Files:**
- Modify: `frontend-new/src/components/Dashboard/EventsAndInsights.jsx`

- [ ] **Step 1: Add `useTranslation` import**

Change:

```javascript
import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Workflow,
  CalendarDays,
  Megaphone,
  FileWarning,
  Bot,
  Cake,
  Inbox,
} from "lucide-react";
```

to:

```javascript
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Workflow,
  CalendarDays,
  Megaphone,
  FileWarning,
  Bot,
  Cake,
  Inbox,
} from "lucide-react";
```

- [ ] **Step 2: Convert `TABS` entries to carry `labelKey`**

Change:

```javascript
const TABS = [
  { id: "Automation",      label: "Automation",      icon: Workflow },
  { id: "Holidays",        label: "Holidays",        icon: CalendarDays },
  { id: "Announcements",   label: "Announcements",   icon: Megaphone },
  { id: "Document Expiry", label: "Document Expiry", icon: FileWarning },
  { id: "AI Feeds",        label: "AI Feeds",        icon: Bot },
  { id: "Wishes",          label: "Wishes",          icon: Cake },
];
```

to:

```javascript
const TABS = [
  { id: "Automation",      labelKey: "dashboard.insights.tabAutomation",     icon: Workflow },
  { id: "Holidays",        labelKey: "dashboard.insights.tabHolidays",       icon: CalendarDays },
  { id: "Announcements",   labelKey: "dashboard.insights.tabAnnouncements",  icon: Megaphone },
  { id: "Document Expiry", labelKey: "dashboard.insights.tabDocumentExpiry", icon: FileWarning },
  { id: "AI Feeds",        labelKey: "dashboard.insights.tabAIFeeds",        icon: Bot },
  { id: "Wishes",          labelKey: "dashboard.insights.tabWishes",         icon: Cake },
];
```

(The `id` strings remain unchanged because they are used as discriminators in the `activeTab === "Automation"` conditional rendering below.)

- [ ] **Step 3: Call `useTranslation` inside the component**

Change:

```javascript
function EventsAndInsights({ branch_ids }) {
  const [activeTab, setActiveTab] = useState("Automation");
```

to:

```javascript
function EventsAndInsights({ branch_ids }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("Automation");
```

- [ ] **Step 4: Translate title and subtitle**

Change:

```jsx
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100 leading-tight">
                Insights & Events
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Live activity stream</p>
            </div>
```

to:

```jsx
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100 leading-tight">
                {t('dashboard.insights.title')}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t('dashboard.insights.subtitle')}</p>
            </div>
```

- [ ] **Step 5: Render tab label via `t(tab.labelKey)`**

Change:

```jsx
                <TabIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                {tab.label}
```

to:

```jsx
                <TabIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                {t(tab.labelKey)}
```

- [ ] **Step 6: Translate fallback column headers**

Change:

```jsx
            <div className="grid grid-cols-12 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-6">Event</div>
              <div className="col-span-3">Source</div>
              <div className="col-span-3 text-right">Time</div>
            </div>
```

to:

```jsx
            <div className="grid grid-cols-12 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-6">{t('dashboard.insights.colEvent')}</div>
              <div className="col-span-3">{t('dashboard.insights.colSource')}</div>
              <div className="col-span-3 text-right">{t('dashboard.insights.colTime')}</div>
            </div>
```

- [ ] **Step 7: Translate the empty state**

Change:

```jsx
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
                <Inbox className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No Events Found</p>
              </div>
```

to:

```jsx
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
                <Inbox className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-[10px] font-bold uppercase tracking-widest">{t('dashboard.insights.noEventsFound')}</p>
              </div>
```

- [ ] **Step 8: Verify no English strings remain (excluding `id` discriminators and `MOCK_DATA` per scope)**

```bash
node -e "const c = require('fs').readFileSync('frontend-new/src/components/Dashboard/EventsAndInsights.jsx','utf8'); ['Insights & Events','Live activity stream','>Event<','>Source<','>Time<','No Events Found','label: \"Automation\"','label: \"Holidays\"','label: \"Announcements\"','label: \"Document Expiry\"','label: \"AI Feeds\"','label: \"Wishes\"'].forEach(s => { if (c.includes(s)) throw new Error('Untranslated: '+s); }); console.log('OK')"
```

Expected: `OK`.

---

## Task 10: Translate `LiveFeed.jsx` (header, column headers)

**Files:**
- Modify: `frontend-new/src/components/Dashboard/LiveFeed.jsx`

This task translates the visible header, the "View Full Log" button, and the 8 column headers in the table. The employee-detail dialog strings are handled in Task 11.

- [ ] **Step 1: Add `useTranslation` import**

Locate the existing imports block at the top. Add `useTranslation` from `react-i18next`. The exact line to add depends on the file's current import style; insert this somewhere alongside the other React imports:

```javascript
import { useTranslation } from "react-i18next";
```

- [ ] **Step 2: Call `useTranslation` inside the `LiveFeed` component**

Find the line that starts the LiveFeed component function (e.g. `function LiveFeed(...)` or `const LiveFeed = (...) =>`) and add `const { t } = useTranslation();` as the very first statement inside its body. If the component already has `const ... = ...` lines, add this as the first one.

- [ ] **Step 3: Translate the panel title**

Change:

```jsx
          <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 font-display tracking-wide">
            Live Recognition Feed
          </h3>
```

to:

```jsx
          <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 font-display tracking-wide">
            {t('dashboard.feed.title')}
          </h3>
```

- [ ] **Step 4: Translate the "View Full Log" button text**

Change:

```jsx
          <button
            onClick={() => router.push("/logs")}
            className="text-sm font-bold text-primary hover:text-gray-600 dark:text-gray-300 transition-colors uppercase tracking-wider"
          >
            View Full Log
          </button>
```

to:

```jsx
          <button
            onClick={() => router.push("/logs")}
            className="text-sm font-bold text-primary hover:text-gray-600 dark:text-gray-300 transition-colors uppercase tracking-wider"
          >
            {t('dashboard.feed.viewFullLog')}
          </button>
```

- [ ] **Step 5: Translate the 8 column headers**

Change the entire 8-row table header block:

```jsx
        <div className="text-center">#</div>
        <div className="text-left">Employee</div>
        <div className="text-center">Branch</div>
        <div className="text-center">Department</div>
        <div className="text-center">Date & Time</div>
        <div className="text-center">In/Out</div>
        <div className="text-center">Mode</div>
        <div className="text-center">Device Name</div>
```

to:

```jsx
        <div className="text-center">{t('dashboard.feed.colNumber')}</div>
        <div className="text-left">{t('dashboard.feed.colEmployee')}</div>
        <div className="text-center">{t('dashboard.feed.colBranch')}</div>
        <div className="text-center">{t('dashboard.feed.colDepartment')}</div>
        <div className="text-center">{t('dashboard.feed.colDateTime')}</div>
        <div className="text-center">{t('dashboard.feed.colInOut')}</div>
        <div className="text-center">{t('dashboard.feed.colMode')}</div>
        <div className="text-center">{t('dashboard.feed.colDeviceName')}</div>
```

- [ ] **Step 6: Verify the column-header strings are all gone**

```bash
node -e "const c = require('fs').readFileSync('frontend-new/src/components/Dashboard/LiveFeed.jsx','utf8'); ['Live Recognition Feed','View Full Log','>Employee<','>Branch<','>Department<','>Date & Time<','>In/Out<','>Mode<','>Device Name<'].forEach(s => { if (c.includes(s)) throw new Error('Untranslated: '+s); }); console.log('OK')"
```

Expected: `OK`.

If any are still flagged, locate them in the file and apply the same `{t('dashboard.feed.<key>')}` pattern.

---

## Task 11: Translate `LiveFeed.jsx` employee-detail dialog

**Files:**
- Modify: `frontend-new/src/components/Dashboard/LiveFeed.jsx`

This task continues editing the same file as Task 10 but focuses on the employee-detail dialog rendered when a row is clicked. The dialog contains StatRow labels, Shift / Shift Time / Date Time / Device labels, and a Close button. The `useTranslation` call from Task 10 is reused.

- [ ] **Step 1: Translate the dialog Close button title**

Change:

```jsx
          title="Close"
```

to:

```jsx
          title={t('dashboard.feedDialog.close')}
```

- [ ] **Step 2: Translate the 6 StatRow labels**

Change:

```jsx
              <StatRow label="Presents" value={presents} />
              <StatRow label="Absence" value={absence} />
              <StatRow label="Incomplete" value={incomplete} />
              <StatRow label="Manual Entry" value={manualEntry} />
              <StatRow label="Leaves" value={0} />
              <StatRow label="Holidays" value={0} />
```

to:

```jsx
              <StatRow label={t('dashboard.feedDialog.presents')} value={presents} />
              <StatRow label={t('dashboard.feedDialog.absence')} value={absence} />
              <StatRow label={t('dashboard.feedDialog.incomplete')} value={incomplete} />
              <StatRow label={t('dashboard.feedDialog.manualEntry')} value={manualEntry} />
              <StatRow label={t('dashboard.feedDialog.leaves')} value={0} />
              <StatRow label={t('dashboard.feedDialog.holidays')} value={0} />
```

- [ ] **Step 3: Translate the Shift / Shift Time / Date Time / Device labels**

Change:

```jsx
                <div className="text-sm text-slate-700 dark:text-white">Shift</div>
```

to:

```jsx
                <div className="text-sm text-slate-700 dark:text-white">{t('dashboard.feedDialog.shift')}</div>
```

Change:

```jsx
                <div className="text-sm text-slate-700 dark:text-white">Shift Time</div>
```

to:

```jsx
                <div className="text-sm text-slate-700 dark:text-white">{t('dashboard.feedDialog.shiftTime')}</div>
```

Change:

```jsx
                <div>Date Time</div>
```

to:

```jsx
                <div>{t('dashboard.feedDialog.dateTime')}</div>
```

Change:

```jsx
                <div>Device</div>
```

to:

```jsx
                <div>{t('dashboard.feedDialog.device')}</div>
```

- [ ] **Step 4: Verify all dialog strings are translated**

```bash
node -e "const c = require('fs').readFileSync('frontend-new/src/components/Dashboard/LiveFeed.jsx','utf8'); ['title=\"Close\"','label=\"Presents\"','label=\"Absence\"','label=\"Incomplete\"','label=\"Manual Entry\"','label=\"Leaves\"','label=\"Holidays\"','>Shift<','>Shift Time<','>Date Time<','>Device<'].forEach(s => { if (c.includes(s)) throw new Error('Untranslated: '+s); }); console.log('OK')"
```

Expected: `OK`.

Note: This check intentionally excludes the `<StatRow label="..."` lines that occur inside non-dialog code paths (StatRow is only used inside the dialog block in this file, so this is safe).

- [ ] **Step 5: Pause for user commit**

Tell the user: "Dashboard translated end-to-end (six components). Please commit `frontend-new/src/components/Dashboard/` before the build verification."

---

## Task 12: Build verification and final manual check matrix

**Files:** None modified — verification only.

- [ ] **Step 1: Production build succeeds**

From `frontend-new`:

```bash
npm run build 2>&1 | grep -E "(✓ Compiled|Generating static pages \(103|Exporting \(2|error|Error|Failed)" | head -10
```

Expected output includes:

```
 ✓ Compiled successfully
 ✓ Generating static pages (103/103)
 ✓ Exporting (2/2)
```

No "error" or "Failed" lines should appear (pre-existing face-api.js / node-fetch warnings are unrelated and can be ignored).

- [ ] **Step 2: Manual browser check matrix**

Start dev server (`npm run dev` in `frontend-new`) and verify on `http://localhost:3001`:

| # | Action | Expected |
|---|---|---|
| 1 | Clear localStorage, log in as admin/manager | Dashboard at `/` loads. All shell + dashboard strings English. |
| 2 | Click LanguageSwitcher in header → Français | Page title becomes "Aperçu exécutif". Branch dropdown placeholder "Sélectionner une agence". Department placeholder "Sélectionner un département". All 6 stat cards translated. Chart title "Absences quotidiennes". Avg / Peak / Total become "Moy. / Pic / Total". Hover a bar → tooltip in French. Workforce Wellness translated, status badge in French, "Attention requise" or "Système sain" in French, "{N} absences imprévues aujourd'hui". Insights & Events title in French, all 6 tab labels in French. Live Recognition Feed title and "Voir le journal complet" button in French. All 8 column headers in French. |
| 3 | Click any row in Live Recognition Feed | Detail dialog opens. All static labels in French (Présences, Absence, Incomplet, Saisie manuelle, Congés, Jours fériés, Quart, Horaire du quart, Date et heure, Appareil, Fermer). |
| 4 | Switch to العربية | All dashboard strings in Arabic, layout stays LTR (per global-LTR setting), Arabic glyphs render right-to-left within text. |
| 5 | Switch to हिन्दी | All dashboard strings in Hindi. |
| 6 | Confirm KPI numbers, employee names, branch names, dates are unchanged | They are dynamic data values, not translation strings. |
| 7 | Click an Insights & Events tab (e.g. Holidays) | Tab label is translated; the embedded content (Holidays component) remains in English. This is the explicit out-of-scope boundary. |
| 8 | Refresh the page on any language | Selected language persists (already handled by `LanguageProvider`). |
| 9 | Click "Voir le journal complet" / "View Full Log" | Navigates to `/logs` (target page is not yet translated; out of scope). |

If any cell fails:

- **Untranslated string visible:** find it in one of the six modified component files. If the key already exists in the locale files, wrap the string in `t('dashboard.<section>.<key>')`. If the key doesn't exist, add a new key to all four locale files following the existing pattern.
- **Interpolation broken (e.g. "{{count}} unplanned absences today" appears literally):** confirm `t('dashboard.wellness.unplannedAbsencesToday', { count: stats.absentCount })` is the call, not `t('dashboard.wellness.unplannedAbsencesToday')`.
- **Compile error referencing `t` is undefined:** confirm `const { t } = useTranslation();` was added inside the component function.

- [ ] **Step 3: Pause for user commit**

Tell the user: "Dashboard i18n complete. All 59 keys translated, build clean, manual matrix passed. Please make the final commit."

---

## Out of scope (do NOT do in this plan)

- Translating the embedded components rendered inside Insights & Events tabs: `AutomationAll`, `HolidaysAll`, `AnnouncementsAll`, `DocumentExpiryAll`, `AIFeedAll`, `WeeklyBirthdays`. The tab *labels* are translated; the contents of each tab remain in English until their own plans.
- Translating the `MOCK_DATA` constant in `EventsAndInsights.jsx` (currently unused since real tab-content components render instead).
- Translating API-driven status values (`"Allowed"`, `"Access Denied"`, `"On Time"`, `"Auto"`, log_type strings, device function strings) returned from the backend.
- Translating SweetAlert dialogs, Sonner toasts, or any popup messages triggered from dashboard actions.
- Translating the staff dashboard at `/staff/dashboard` (a different component, `StaffDashboard.jsx`).
- Locale-aware date / number / currency formatting.
- Translating the Logs target page (`/logs`) that "View Full Log" navigates to.
- Reverting the global `<html dir="ltr">` decision (the dashboard inherits LTR layout — Arabic text still renders with correct character ordering via Unicode bidi inside elements).
