# Payroll Pages Internationalization (i18n) — Design

**Date:** 2026-06-01
**Status:** Approved (pending spec review)

## Problem

The app has a working language switcher (English / Arabic / French / Hindi) via
`react-i18next`. When the user changes language, the app chrome (header nav, left
menu, dashboard) translates correctly — but the **payroll pages do not**. Their
text stays English regardless of the selected language.

### Root cause

A page only translates if **both** are true:
1. Its code calls `t('some.key')` instead of using a hardcoded string.
2. That key exists in all four `locales/<lang>/common.json` dictionaries.

The payroll components do **neither**. Every file in
`frontend-new/src/components/payroll/` contains raw English (e.g.
`<h1>Payroll Register</h1>`) and has no payroll keys in the locale JSON files.
The surrounding menu/header translate because they already use `t()`; the payroll
page bodies are hardcoded.

## How translation works today (reference)

- `frontend-new/src/lib/i18n.js` — initializes i18next, loads four dictionaries
  (`locales/en|ar|fr|hi/common.json`), reads saved language from `localStorage`.
- `frontend-new/src/components/LanguageSwitcher.jsx` — calls
  `i18n.changeLanguage(code)`, saves to `localStorage`, fires `languageChanged`.
- `frontend-new/src/components/LanguageProvider.jsx` — on mount restores saved
  language and **forces `document.documentElement.dir = "ltr"` for all languages**
  (Arabic stays LTR by design; only glyphs render RTL within text).
- Any component doing `const { t } = useTranslation();` and `t('key')`
  re-renders automatically when the language changes.

## Scope

In scope (3 areas, ~20 files, ~6,700 lines):

| Area | Files |
|---|---|
| **Admin payroll module** | `components/payroll/`: `PayrollDashboard.jsx` (475), `PayrollRegister.jsx` (818), `PayrollSettings.jsx` (319), `Reports.jsx` (406), `LoansAdvances.jsx` (1705), `SalaryStructures.jsx` (594), `Adjustments.jsx` (314), `KPICard.jsx` (37), `StatusBadge.jsx` (19) |
| **Employee-edit payroll** | `components/Employees/Payroll.js` (641), `components/Employees/Edit/Payroll.js` (222), `components/Employees/Edit/PayrollModal.js` (134) |
| **Payroll settings tabs** | `app/payroll-tabs/page.js` (57), `components/PayrollTabs/Formula/{Page,Create,Edit,columns}.js`, `components/PayrollTabs/GenerationDate/{Page,Create,Edit,columns}.js` |

**Out of scope:** the staff self-service page `app/staff/payroll/page.js`
(explicitly excluded by the user).

## Approach (chosen: A)

Add a single top-level `"payroll"` namespace inside the **existing**
`common.json` for each of the four languages, then wire `useTranslation()` +
`t()` into every in-scope component. This is identical to how dashboard/employees
already work — **no i18n infrastructure changes**.

Approaches considered and rejected:
- **B — separate `payroll.json` namespace per language.** Cleaner file split, but
  requires changing the i18n init and diverges from the established
  single-namespace pattern. Not worth the friction.
- **C — runtime machine translation.** Rejected: term accuracy matters for a
  payroll/finance UI.

## Key structure

Convention: `payroll.<section>.<element>`

```
payroll
├── common          // shared: save, cancel, status, paid, pending, approved,
│                   //         month, year, search, actions, edit, delete, etc.
├── dashboard       // PayrollDashboard
├── register        // PayrollRegister (+ .columns.*)
├── settings        // PayrollSettings
├── reports         // Reports
├── loans           // LoansAdvances
├── salaryStructures// SalaryStructures
├── adjustments     // Adjustments
├── employeeEdit    // Employees/Payroll.js, Edit/Payroll.js, Edit/PayrollModal.js
└── tabs            // PayrollTabs/Formula + GenerationDate + payroll-tabs page
```

Shared words live ONLY in `payroll.common.*` and are reused everywhere — no
duplicated keys across sections.

## What gets translated vs. not

**Translated (static UI):** headings, field labels, table headers, buttons, tab
names, input placeholders, empty-state messages, toast/alert/confirm messages,
and status badges (backend enum value → mapped to a `t()` key, e.g.
`"paid" → t('payroll.common.paid')`).

**NOT translated (dynamic data):** values returned from the API (employee names,
amounts, dates), numeric values, and currency symbols/codes. These pass through
untouched.

## Constraints

- **No layout change.** App stays LTR for all languages (existing design). Wiring
  `t()` only swaps text content; it must not alter any markup, class, or layout.
- **Match existing translation tone/quality.** New `ar/fr/hi` values are written
  to match the style of the existing dashboard/header entries.
- **Fallback safety.** `fallbackLng: "en"` already configured — any accidentally
  missing key shows English rather than a raw key string.

## Translations

Claude generates `en`, `ar`, `fr`, `hi` values for every new payroll key.
Recommendation: a fluent Arabic/Hindi speaker spot-checks afterward (finance
terminology). English values are extracted verbatim from the current hardcoded
strings.

## Phasing

Each phase is independently testable (switch language on that page, confirm body
text changes, no missing-key fallbacks):

1. Shared `payroll.common.*` + small components: `KPICard`, `StatusBadge`,
   `Adjustments`, `PayrollSettings`.
2. `PayrollDashboard` + `Reports`.
3. `PayrollRegister` + `SalaryStructures`.
4. `LoansAdvances` (largest file).
5. Employee-edit payroll (3 files).
6. Payroll settings tabs (`Formula` + `GenerationDate` + `payroll-tabs` page).

## Verification

Per phase, run the frontend, open the affected page(s), toggle EN → AR → FR → HI,
and confirm:
- All static body text changes language.
- No raw key strings or English leakage (other than intentional dynamic data).
- No layout shift between languages.

## Risks / notes

- **Volume.** ~6,700 lines; `LoansAdvances.jsx` (1,705) is the heaviest. Phasing
  keeps each change reviewable.
- **Hidden strings.** Alerts, `confirm()` messages, and dynamically-built labels
  (e.g. status maps) are easy to miss — each component must be scanned fully, not
  just its JSX return.
- **Reused components.** `KPICard`/`StatusBadge` take label text via props from
  parents; ensure the parent passes a translated string (translate at the call
  site, not inside the leaf, where it makes sense).
