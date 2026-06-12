# Employees List Page i18n — Design

**Status:** Approved
**Date:** 2026-05-18
**Author:** brainstormed with user, written by Claude
**Prior art:** [`2026-05-18-dashboard-i18n-design.md`](./2026-05-18-dashboard-i18n-design.md) — same pattern, same locale files, same approach.

## Goal

Translate the Employees list page at `/employees` into English / Arabic / French / Hindi by adding an `employees.*` namespace (~22 new keys + 3 cross-namespace reuses) to the four existing locale files and replacing hard-coded display strings in two files (`page.js`, `columns.js`).

## Scope

### In scope (2 files)

- `frontend-new/src/app/employees/page.js` — page-level chrome: title, branch/department dropdown placeholders, search input placeholder, refresh icon tooltip, "New" button label, delete-confirm string.
- `frontend-new/src/app/employees/columns.js` — DataTable column headers, lucide-icon `title` props in the Access column, action-menu item labels.

### Out of scope (per user's scope decision)

- **Host QR modal** (lives inside `page.js` lines 444-498): "Host QR Code", "Visitors scan this to register with this host", "Generating…", "Download", "Copy Link". User excluded this surface.
- **Print Card popup** (lines 174-360 of `page.js`): the entire `window.open()`'d HTML document including "Print", "Close", "EmpID:", "DOJ:", "Branch:". This is HTML rendered in a detached browser window with no React/i18next context. Stays English.
- **`EmployeeExtras`** (`components/Employees/Extras.jsx`): Import/Export tooltips, "Upload Employees" dialog.
- **`EnrolledDevicesModal`** (`components/Employees/EnrolledDevicesModal.jsx`): newly-added device table modal.
- **Browser `alert()` and `notify()` calls** in `page.js` ("Pop-ups blocked", and error alerts inside `Extras.jsx`).
- **Create / Edit / Short subpages** (`/employees/create`, `/employees/edit`, `/employees/short`).
- **"N/A" fallback strings** (5× in columns.js) and "—" em-dash fallback (`mobile_email` column): kept English as a near-universal convention.
- **Dynamic data** (employee names, branch names, department names, emails, IDs, join dates).
- **API-driven status values** returned from backend.

## Architecture

Build on the existing i18n infrastructure already shipped for dashboard and app shell:

- `react-i18next` v15 already installed.
- Four locale files: `frontend-new/src/locales/{en,ar,fr,hi}/common.json`.
- `LanguageProvider` wraps the app; `LanguageSwitcher` rendered in the global header.
- Global `<html dir="ltr">` for all languages (decision inherited from app-shell i18n).

Add a single new top-level namespace `employees.*` inside each of the four locale files. Modify two source files to import `useTranslation()` and look up display strings via `t('employees.<section>.<key>')`. Reuse three already-shipped `common.*` keys (`common.edit`, `common.delete`, `common.actions`) where the dashboard plan established a single semantic verb.

### Namespace structure

```json
"employees": {
  "list": {
    "pageTitle": "Employees",
    "selectBranchPlaceholder": "Select Branch",
    "selectDepartmentPlaceholder": "Select Department",
    "searchPlaceholder": "Search by name or ID",
    "refreshTitle": "Refresh Data",
    "newButton": "New",
    "confirmDelete": "Are you sure you want to delete this employee?"
  },
  "columns": {
    "personnel": "Personnel",
    "branch": "Branch",
    "department": "Department",
    "position": "Position",
    "mobileEmail": "Mobile / Email",
    "joinDate": "Join Date",
    "access": "Access"
  },
  "access": {
    "face": "Face",
    "card": "Card",
    "fingerprint": "Fingerprint",
    "palms": "Palms",
    "password": "Password"
  },
  "actions": {
    "hostQr": "Host QR",
    "printCard": "Print Card",
    "devices": "Devices"
  }
}
```

**Key count:** 22 new keys per locale file (4 sections × 7+7+5+3 keys).

### Cross-namespace reuse (no new keys)

| Display string | Where | Existing key |
|----------------|-------|--------------|
| "Actions" column header | `columns.js` | `common.actions` |
| "Edit" action menu item | `columns.js` | `common.edit` |
| "Delete" action menu item | `columns.js` | `common.delete` |

This is the same convention the dashboard plan established (one semantic verb → one key in `common.*`).

## Component changes

### `page.js`

The page already lives in a React function component (`EmployeesPage`), so `useTranslation` plugs in cleanly.

1. Add `import { useTranslation } from "react-i18next";` next to the React imports.
2. Add `const { t } = useTranslation();` as the first statement inside `EmployeesPage`.
3. Replace the following literal strings with `t(...)` calls:
   - `<h1>Employees</h1>` → `{t('employees.list.pageTitle')}`
   - Branch `MultiDropDown` `placeholder={'Select Branch'}` → `placeholder={t('employees.list.selectBranchPlaceholder')}`
   - Department `MultiDropDown` `placeholder={'Select Department'}` → `placeholder={t('employees.list.selectDepartmentPlaceholder')}`
   - Search `Input` `placeholder="Search by name or ID"` → `placeholder={t('employees.list.searchPlaceholder')}`
   - Refresh `IconButton` `title="Refresh Data"` → `title={t('employees.list.refreshTitle')}`
   - "New" button span text → `{t('employees.list.newButton')}`
   - `confirm("Are you sure you want to delete this employee?")` inside `deleteEmployee` → `confirm(t('employees.list.confirmDelete'))`
4. Pass `t` into the `Columns(...)` factory call — see `columns.js` change below.

### `columns.js`

The current export is a plain function returning a column-config array. It cannot call `useTranslation()` itself (a hook can only be called inside a React component or another hook). The cleanest fix is to take `t` as a parameter and let the consuming component pass its `t` down:

```js
// Before
export default (deleteEmployee, editEmployee, showHostQr, printCard, showEnrolledDevices) => [ ... ];

// After
export default (t, deleteEmployee, editEmployee, showHostQr, printCard, showEnrolledDevices) => [ ... ];
```

In `page.js`, change the call site from:

```jsx
columns={Columns(deleteEmployee, editEmployee, showHostQr, (emp) => printEmployeeCard(emp), setDevicesEmployee)}
```

to:

```jsx
columns={Columns(t, deleteEmployee, editEmployee, showHostQr, (emp) => printEmployeeCard(emp), setDevicesEmployee)}
```

Then inside the column config, replace:

- All `header:` strings → `t('employees.columns.<key>')` for Personnel/Branch/Department/Position/Mobile-Email/Join-Date/Access, and `t('common.actions')` for "Actions".
- All lucide-icon `title=` props in the Access column → `t('employees.access.<key>')` for Face/Card/Fingerprint/Palms/Password.
- Action-menu item spans:
  - "Edit" → `t('common.edit')`
  - "Host QR" → `t('employees.actions.hostQr')`
  - "Print Card" → `t('employees.actions.printCard')`
  - "Devices" → `t('employees.actions.devices')`
  - "Delete" → `t('common.delete')`

The N/A fallback cells (`employee.branch?.branch_name || "N/A"`) and the em-dash fallbacks in `mobile_email` remain untouched per the scope decision.

## Locale-file changes

Insert the new `employees.*` block immediately after the existing `dashboard.*` block (and before `menu`) in all four files, preserving the JSON structure already shipped by the dashboard plan. JSON is validated after every locale edit via:

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/<lang>/common.json','utf8')); console.log('OK')"
```

### Translations

| Key | en | ar | fr | hi |
|-----|----|----|----|----|
| `list.pageTitle` | Employees | الموظفون | Employés | कर्मचारी |
| `list.selectBranchPlaceholder` | Select Branch | اختر فرعًا | Sélectionner une agence | शाखा चुनें |
| `list.selectDepartmentPlaceholder` | Select Department | اختر القسم | Sélectionner un département | विभाग चुनें |
| `list.searchPlaceholder` | Search by name or ID | البحث بالاسم أو المعرّف | Rechercher par nom ou ID | नाम या ID से खोजें |
| `list.refreshTitle` | Refresh Data | تحديث البيانات | Actualiser les données | डेटा रीफ़्रेश करें |
| `list.newButton` | New | جديد | Nouveau | नया |
| `list.confirmDelete` | Are you sure you want to delete this employee? | هل أنت متأكد أنك تريد حذف هذا الموظف؟ | Voulez-vous vraiment supprimer cet employé ? | क्या आप वाकई इस कर्मचारी को हटाना चाहते हैं? |
| `columns.personnel` | Personnel | الموظف | Personnel | कार्मिक |
| `columns.branch` | Branch | الفرع | Agence | शाखा |
| `columns.department` | Department | القسم | Département | विभाग |
| `columns.position` | Position | المنصب | Poste | पद |
| `columns.mobileEmail` | Mobile / Email | الجوال / البريد | Mobile / E-mail | मोबाइल / ईमेल |
| `columns.joinDate` | Join Date | تاريخ الانضمام | Date d'entrée | जॉइन तिथि |
| `columns.access` | Access | الوصول | Accès | एक्सेस |
| `access.face` | Face | الوجه | Visage | चेहरा |
| `access.card` | Card | البطاقة | Carte | कार्ड |
| `access.fingerprint` | Fingerprint | البصمة | Empreinte | फ़िंगरप्रिंट |
| `access.palms` | Palms | راحة اليد | Paumes | हथेली |
| `access.password` | Password | كلمة المرور | Mot de passe | पासवर्ड |
| `actions.hostQr` | Host QR | رمز المضيف | QR de l'hôte | होस्ट QR |
| `actions.printCard` | Print Card | طباعة البطاقة | Imprimer la carte | कार्ड प्रिंट करें |
| `actions.devices` | Devices | الأجهزة | Appareils | डिवाइस |

## Testing

There is no frontend test suite. Verification is **manual browser testing** at the end, matching the dashboard pattern. The implementation plan will include a per-step `node -e "...".includes(...)"` guard for each modified file and a `npm run build` check at the end.

### Manual matrix (will be in implementation plan)

1. Log in, navigate to `/employees`. All listed strings in English.
2. Click LanguageSwitcher → Français. Page title becomes "Employés"; both placeholders, search, refresh tooltip, "New" button label translate.
3. Open the action menu on any row → all six items (Edit, Host QR, Print Card, Devices, Delete) translated.
4. Click "Delete" → confirm dialog text appears in French.
5. Column headers all in French. Hover access-column icons → tooltips in French.
6. Switch to العربية / हिन्दी — same checks pass.
7. Confirm Host QR popup, Print Card popup, Import/Export buttons, and Enrolled Devices modal stay English (out of scope).

## Commit checkpoints

Per the user's preference for handling all commits themselves, the implementation plan will pause for the user at two checkpoints:

1. After all four locale files extended → commit `frontend-new/src/locales/`.
2. After both component files modified and build verified → commit `frontend-new/src/app/employees/`.

## Risks and notes

- `columns.js` exports a function that's currently called from one place (`page.js`). The signature change `(t, deleteEmployee, ...)` is safe because `t` is passed first and all existing arguments shift right. There are no other call sites (verified by Grep of `from "./columns"` and `Columns(`).
- Cross-namespace reuse (`common.edit`, `common.delete`, `common.actions`) — these three keys already exist in all four locale files (shipped with the dashboard work). No locale change needed for them.
- The user's auto-memory note "User handles all git commits and pushes; never commit or push from Claude" applies — the implementation plan must end at the build-clean verification step and ask the user to commit.

## Out of scope (do NOT do in this plan)

- Translating the Host QR popup, Print Card popup, Import/Export dialog, Enrolled Devices modal, or any /employees subpage.
- Translating browser `alert()` calls or `notify()` toast messages.
- Translating "N/A" or "—" fallback cells.
- Locale-aware date / number formatting for the Join Date column.
- Replacing the global `<html dir="ltr">` decision.
- Adding new locales beyond the four already shipped.
