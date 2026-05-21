# Employees List Page i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the Employees list page at `/employees` into English / Arabic / French / Hindi by adding an `employees.*` namespace (22 keys) to the four existing locale files and replacing hard-coded strings in two existing files (`page.js`, `columns.js`) with `t(...)` calls.

**Architecture:** Build on the existing i18n infrastructure (already shipped: `react-i18next`, four `locales/{lang}/common.json` files including `common.*` + `dashboard.*` namespaces, `LanguageProvider`, `LanguageSwitcher` in the header). Add a single new namespace inside each of the four locale files. Modify `EmployeesPage` to call `useTranslation()`, modify the `Columns` factory in `columns.js` to accept `t` as its first parameter so it can do its own lookups. Reuse three already-shipped `common.*` keys (`common.edit`, `common.delete`, `common.actions`) instead of duplicating them under `employees.*`.

**Tech Stack:** Next.js 15 App Router, React 19, `react-i18next` 15.x (already installed), Tailwind v4.

**Spec:** [`docs/superpowers/specs/2026-05-18-employees-list-i18n-design.md`](../specs/2026-05-18-employees-list-i18n-design.md)

**Note on testing:** No frontend test suite. Verification is **manual browser testing** at the end.

**Note on commits:** Per project preference, the user handles all git commits. Treat every "Commit" step as a checkpoint where the engineer pauses and asks the user to commit.

---

## Task 1: Add `employees.*` namespace to the English locale file

**Files:**
- Modify: `frontend-new/src/locales/en/common.json`

- [ ] **Step 1: Insert the `employees` block right after the existing `dashboard` block and before `menu`**

Open `frontend-new/src/locales/en/common.json`. The file's existing top-level structure is:

```
{
  "login": { ... },
  "branding": { ... },
  "footer": { ... },
  "language": { ... },
  "dashboard": { ... },     ← already shipped
  "menu": { ... },
  "header": { ... },
  "common": { ... }
}
```

The unique anchor in the file is the line `  },\n  "menu": {` immediately preceded by the closing brace of `dashboard`. Insert the new `employees` block between the closing brace of `dashboard` and the opening of `menu`.

The exact text to find:

```json
    }
  },
  "menu": {
```

(This sequence appears exactly once in the file — the `}` closes `dashboard.feedDialog`, the next `},` closes the entire `dashboard` block, then `"menu":` starts.)

Replace it with:

```json
    }
  },
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
  },
  "menu": {
```

- [ ] **Step 2: Validate JSON**

Run from the repository root:

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/en/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

- [ ] **Step 3: Sanity-check the new keys are reachable**

```bash
node -e "const j = JSON.parse(require('fs').readFileSync('frontend-new/src/locales/en/common.json','utf8')); console.log('list.pageTitle =', j.employees.list.pageTitle); console.log('columns.personnel =', j.employees.columns.personnel); console.log('access.face =', j.employees.access.face); console.log('actions.hostQr =', j.employees.actions.hostQr);"
```

Expected:
```
list.pageTitle = Employees
columns.personnel = Personnel
access.face = Face
actions.hostQr = Host QR
```

---

## Task 2: Add `employees.*` namespace to the Arabic locale file

**Files:**
- Modify: `frontend-new/src/locales/ar/common.json`

- [ ] **Step 1: Insert the `employees` block in the same position**

The unique anchor `    }\n  },\n  "menu": {` is the same as in the English file. Replace:

```json
    }
  },
  "menu": {
```

with:

```json
    }
  },
  "employees": {
    "list": {
      "pageTitle": "الموظفون",
      "selectBranchPlaceholder": "اختر فرعًا",
      "selectDepartmentPlaceholder": "اختر القسم",
      "searchPlaceholder": "البحث بالاسم أو المعرّف",
      "refreshTitle": "تحديث البيانات",
      "newButton": "جديد",
      "confirmDelete": "هل أنت متأكد أنك تريد حذف هذا الموظف؟"
    },
    "columns": {
      "personnel": "الموظف",
      "branch": "الفرع",
      "department": "القسم",
      "position": "المنصب",
      "mobileEmail": "الجوال / البريد",
      "joinDate": "تاريخ الانضمام",
      "access": "الوصول"
    },
    "access": {
      "face": "الوجه",
      "card": "البطاقة",
      "fingerprint": "البصمة",
      "palms": "راحة اليد",
      "password": "كلمة المرور"
    },
    "actions": {
      "hostQr": "رمز المضيف",
      "printCard": "طباعة البطاقة",
      "devices": "الأجهزة"
    }
  },
  "menu": {
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/ar/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

---

## Task 3: Add `employees.*` namespace to the French locale file

**Files:**
- Modify: `frontend-new/src/locales/fr/common.json`

- [ ] **Step 1: Insert the `employees` block in the same position**

Replace the unique anchor:

```json
    }
  },
  "menu": {
```

with:

```json
    }
  },
  "employees": {
    "list": {
      "pageTitle": "Employés",
      "selectBranchPlaceholder": "Sélectionner une agence",
      "selectDepartmentPlaceholder": "Sélectionner un département",
      "searchPlaceholder": "Rechercher par nom ou ID",
      "refreshTitle": "Actualiser les données",
      "newButton": "Nouveau",
      "confirmDelete": "Voulez-vous vraiment supprimer cet employé ?"
    },
    "columns": {
      "personnel": "Personnel",
      "branch": "Agence",
      "department": "Département",
      "position": "Poste",
      "mobileEmail": "Mobile / E-mail",
      "joinDate": "Date d'entrée",
      "access": "Accès"
    },
    "access": {
      "face": "Visage",
      "card": "Carte",
      "fingerprint": "Empreinte",
      "palms": "Paumes",
      "password": "Mot de passe"
    },
    "actions": {
      "hostQr": "QR de l'hôte",
      "printCard": "Imprimer la carte",
      "devices": "Appareils"
    }
  },
  "menu": {
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/fr/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

---

## Task 4: Add `employees.*` namespace to the Hindi locale file

**Files:**
- Modify: `frontend-new/src/locales/hi/common.json`

- [ ] **Step 1: Insert the `employees` block in the same position**

Replace the unique anchor:

```json
    }
  },
  "menu": {
```

with:

```json
    }
  },
  "employees": {
    "list": {
      "pageTitle": "कर्मचारी",
      "selectBranchPlaceholder": "शाखा चुनें",
      "selectDepartmentPlaceholder": "विभाग चुनें",
      "searchPlaceholder": "नाम या ID से खोजें",
      "refreshTitle": "डेटा रीफ़्रेश करें",
      "newButton": "नया",
      "confirmDelete": "क्या आप वाकई इस कर्मचारी को हटाना चाहते हैं?"
    },
    "columns": {
      "personnel": "कार्मिक",
      "branch": "शाखा",
      "department": "विभाग",
      "position": "पद",
      "mobileEmail": "मोबाइल / ईमेल",
      "joinDate": "जॉइन तिथि",
      "access": "एक्सेस"
    },
    "access": {
      "face": "चेहरा",
      "card": "कार्ड",
      "fingerprint": "फ़िंगरप्रिंट",
      "palms": "हथेली",
      "password": "पासवर्ड"
    },
    "actions": {
      "hostQr": "होस्ट QR",
      "printCard": "कार्ड प्रिंट करें",
      "devices": "डिवाइस"
    }
  },
  "menu": {
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/hi/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

- [ ] **Step 3: Cross-locale parity check**

```bash
node -e "const langs=['en','ar','fr','hi']; const ref=JSON.parse(require('fs').readFileSync('frontend-new/src/locales/en/common.json','utf8')).employees; const keysOf=o=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keysOf(v).map(s=>k+'.'+s):[k]); const refKeys=keysOf(ref).sort(); langs.forEach(l=>{const j=JSON.parse(require('fs').readFileSync('frontend-new/src/locales/'+l+'/common.json','utf8')).employees; const k=keysOf(j).sort(); if(JSON.stringify(k)!==JSON.stringify(refKeys)) throw new Error(l+' key mismatch'); }); console.log('All 4 locales have identical employees.* key sets ('+refKeys.length+' keys)');"
```

Expected: `All 4 locales have identical employees.* key sets (22 keys)`.

- [ ] **Step 4: Pause for user commit**

Tell the user: "All four locale files extended with the `employees` namespace (22 keys × 4 locales = 88 translations). Please commit `frontend-new/src/locales/` before continuing to component changes."

---

## Task 5: Refactor `columns.js` to accept `t` as a parameter

**Files:**
- Modify: `frontend-new/src/app/employees/columns.js`

This task converts the `Columns` factory's signature from `(deleteEmployee, editEmployee, showHostQr, printCard, showEnrolledDevices)` to `(t, deleteEmployee, editEmployee, showHostQr, printCard, showEnrolledDevices)` and replaces all hard-coded display strings inside with `t(...)` calls. `columns.js` cannot call `useTranslation()` itself because it is not a React component — the caller (`page.js`) will own the hook and pass its `t` down. The matching call-site update happens in Task 6 step 4.

- [ ] **Step 1: Change the factory signature**

Locate:

```javascript
export default (deleteEmployee, editEmployee, showHostQr, printCard, showEnrolledDevices) => [
```

Change to:

```javascript
export default (t, deleteEmployee, editEmployee, showHostQr, printCard, showEnrolledDevices) => [
```

- [ ] **Step 2: Translate the "Personnel" column header**

Locate:

```javascript
  {
    key: "employee",
    header: "Personnel",
    align: "left",
```

Change to:

```javascript
  {
    key: "employee",
    header: t('employees.columns.personnel'),
    align: "left",
```

- [ ] **Step 3: Translate the "Branch" column header**

Locate:

```javascript
  {
    key: "branch",
    header: "Branch",
    align: "left",
```

Change to:

```javascript
  {
    key: "branch",
    header: t('employees.columns.branch'),
    align: "left",
```

- [ ] **Step 4: Translate the "Department" column header**

Locate:

```javascript
  {
    key: "department",
    header: "Department",
    align: "left",
```

Change to:

```javascript
  {
    key: "department",
    header: t('employees.columns.department'),
    align: "left",
```

- [ ] **Step 5: Translate the "Position" column header**

Locate:

```javascript
  {
    key: "position",
    header: "Position",
    align: "left",
```

Change to:

```javascript
  {
    key: "position",
    header: t('employees.columns.position'),
    align: "left",
```

- [ ] **Step 6: Translate the "Mobile / Email" column header**

Locate:

```javascript
  {
    key: "mobile_email",
    header: "Mobile / Email",
    align: "left",
```

Change to:

```javascript
  {
    key: "mobile_email",
    header: t('employees.columns.mobileEmail'),
    align: "left",
```

- [ ] **Step 7: Translate the "Join Date" column header**

Locate:

```javascript
  {
    key: "timezone",
    header: "Join Date",
    align: "left",
```

Change to:

```javascript
  {
    key: "timezone",
    header: t('employees.columns.joinDate'),
    align: "left",
```

- [ ] **Step 8: Translate the "Access" column header**

Locate:

```javascript
  {
    key: "access",
    header: "Access",
    align: "center",
```

Change to:

```javascript
  {
    key: "access",
    header: t('employees.columns.access'),
    align: "center",
```

- [ ] **Step 9: Translate the "Actions" column header (reusing `common.actions`)**

Locate:

```javascript
  {
    key: "actions",
    header: "Actions",
    align: "center",
```

Change to:

```javascript
  {
    key: "actions",
    header: t('common.actions'),
    align: "center",
```

- [ ] **Step 10: Translate the five lucide-icon tooltips in the Access render block**

Locate the five `title="..."` props inside the Access column's render function:

```jsx
          {isFace && <ScanFace className="w-5 h-5 hover:text-indigo-600 transition-colors" title="Face" />}
          {isCardNumberSet && <QrCode className="w-5 h-5 hover:text-indigo-600 transition-colors" title="Card" />}
          {isFingerPrint && <Fingerprint className="w-5 h-5 hover:text-indigo-600 transition-colors" title="Fingerprint" />}
          {isPalms && <Hand className="w-5 h-5 hover:text-indigo-600 transition-colors" title="Palms" />}
          {isPasswordSet && <Lock className="w-5 h-5 hover:text-indigo-600 transition-colors" title="Password" />}
```

Change to:

```jsx
          {isFace && <ScanFace className="w-5 h-5 hover:text-indigo-600 transition-colors" title={t('employees.access.face')} />}
          {isCardNumberSet && <QrCode className="w-5 h-5 hover:text-indigo-600 transition-colors" title={t('employees.access.card')} />}
          {isFingerPrint && <Fingerprint className="w-5 h-5 hover:text-indigo-600 transition-colors" title={t('employees.access.fingerprint')} />}
          {isPalms && <Hand className="w-5 h-5 hover:text-indigo-600 transition-colors" title={t('employees.access.palms')} />}
          {isPasswordSet && <Lock className="w-5 h-5 hover:text-indigo-600 transition-colors" title={t('employees.access.password')} />}
```

- [ ] **Step 11: Translate the "Edit" action menu item (reusing `common.edit`)**

Locate:

```jsx
              <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">Edit</span>
```

Change to:

```jsx
              <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">{t('common.edit')}</span>
```

- [ ] **Step 12: Translate the "Host QR" action menu item**

Locate:

```jsx
                <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-slate-700 dark:text-slate-200 font-medium">Host QR</span>
```

Change to:

```jsx
                <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-slate-700 dark:text-slate-200 font-medium">{t('employees.actions.hostQr')}</span>
```

- [ ] **Step 13: Translate the "Print Card" action menu item**

Locate:

```jsx
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">Print Card</span>
```

Change to:

```jsx
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">{t('employees.actions.printCard')}</span>
```

- [ ] **Step 14: Translate the "Devices" action menu item**

Locate:

```jsx
              <MonitorSmartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">Devices</span>
```

Change to:

```jsx
              <MonitorSmartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">{t('employees.actions.devices')}</span>
```

- [ ] **Step 15: Translate the "Delete" action menu item (reusing `common.delete`)**

Locate:

```jsx
              <Trash className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400 font-medium">Delete</span>
```

Change to:

```jsx
              <Trash className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400 font-medium">{t('common.delete')}</span>
```

- [ ] **Step 16: Verify no English strings remain in `columns.js`**

```bash
node -e "const c = require('fs').readFileSync('frontend-new/src/app/employees/columns.js','utf8'); ['header: \"Personnel\"','header: \"Branch\"','header: \"Department\"','header: \"Position\"','header: \"Mobile / Email\"','header: \"Join Date\"','header: \"Access\"','header: \"Actions\"','title=\"Face\"','title=\"Card\"','title=\"Fingerprint\"','title=\"Palms\"','title=\"Password\"','>Edit<','>Host QR<','>Print Card<','>Devices<','>Delete<'].forEach(s => { if (c.includes(s)) throw new Error('Untranslated: '+s); }); console.log('OK')"
```

Expected: `OK`.

Note: this script does NOT yet check that `t` is referenced — that consistency check belongs after Task 6, when the call site is updated. If this verify passes but the page still throws at runtime, the cause is Task 6 step 4 not yet done.

---

## Task 6: Translate `page.js` and pass `t` into the `Columns` factory

**Files:**
- Modify: `frontend-new/src/app/employees/page.js`

- [ ] **Step 1: Add `useTranslation` import**

Locate the imports block at the top of the file:

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, RefreshCw, Download, Copy, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
```

Add a new import line after the existing `useRouter` import:

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, RefreshCw, Download, Copy, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
```

- [ ] **Step 2: Call `useTranslation()` as the first statement inside `EmployeesPage`**

Locate the function body's opening lines:

```javascript
export default function EmployeesPage() {

    const router = useRouter();
```

Change to:

```javascript
export default function EmployeesPage() {

    const { t } = useTranslation();
    const router = useRouter();
```

- [ ] **Step 3: Translate the `confirm()` string inside `deleteEmployee`**

Locate:

```javascript
    const deleteEmployee = async (id) => {
        if (confirm("Are you sure you want to delete this employee?")) {
```

Change to:

```javascript
    const deleteEmployee = async (id) => {
        if (confirm(t('employees.list.confirmDelete'))) {
```

- [ ] **Step 4: Pass `t` as the first argument to `Columns(...)`**

Locate:

```jsx
            <DataTable
                columns={Columns(deleteEmployee, editEmployee, showHostQr, (emp) => printEmployeeCard(emp), setDevicesEmployee)}
```

Change to:

```jsx
            <DataTable
                columns={Columns(t, deleteEmployee, editEmployee, showHostQr, (emp) => printEmployeeCard(emp), setDevicesEmployee)}
```

This matches the new factory signature from Task 5 Step 1.

- [ ] **Step 5: Translate the page title `<h1>`**

Locate:

```jsx
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center shrink-0">
                    Employees
                </h1>
```

Change to:

```jsx
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center shrink-0">
                    {t('employees.list.pageTitle')}
                </h1>
```

- [ ] **Step 6: Translate the Branch dropdown placeholder**

Locate:

```jsx
                        <MultiDropDown
                            placeholder={'Select Branch'}
                            items={branches}
                            value={selectedBranchIds}
                            onChange={setSelectedBranchIds}
                            badgesCount={1}
                            width='w-full sm:w-[200px]'
                        />
```

Change to:

```jsx
                        <MultiDropDown
                            placeholder={t('employees.list.selectBranchPlaceholder')}
                            items={branches}
                            value={selectedBranchIds}
                            onChange={setSelectedBranchIds}
                            badgesCount={1}
                            width='w-full sm:w-[200px]'
                        />
```

- [ ] **Step 7: Translate the Department dropdown placeholder**

Locate:

```jsx
                        <MultiDropDown
                            placeholder={'Select Department'}
                            items={departments}
                            value={selectedDepartmentIds}
                            onChange={setSelectedDepartmentIds}
                            badgesCount={1}
                            width='w-full sm:w-[200px]'
                        />
```

Change to:

```jsx
                        <MultiDropDown
                            placeholder={t('employees.list.selectDepartmentPlaceholder')}
                            items={departments}
                            value={selectedDepartmentIds}
                            onChange={setSelectedDepartmentIds}
                            badgesCount={1}
                            width='w-full sm:w-[200px]'
                        />
```

- [ ] **Step 8: Translate the search input placeholder**

Locate:

```jsx
                        <Input
                            placeholder="Search by name or ID"
                            icon="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
```

Change to:

```jsx
                        <Input
                            placeholder={t('employees.list.searchPlaceholder')}
                            icon="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
```

- [ ] **Step 9: Translate the refresh `IconButton` tooltip**

Locate:

```jsx
                    <IconButton
                        icon={RefreshCw}
                        onClick={handleRefresh}
                        isLoading={isLoading}
                        title="Refresh Data"
                    />
```

Change to:

```jsx
                    <IconButton
                        icon={RefreshCw}
                        onClick={handleRefresh}
                        isLoading={isLoading}
                        title={t('employees.list.refreshTitle')}
                    />
```

- [ ] **Step 10: Translate the "New" button label**

Locate:

```jsx
                        <button className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
                            <Plus className="w-4 h-4" />
                            <span>New</span>
                        </button>
```

Change to:

```jsx
                        <button className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
                            <Plus className="w-4 h-4" />
                            <span>{t('employees.list.newButton')}</span>
                        </button>
```

- [ ] **Step 11: Verify the in-scope English strings are gone from `page.js`**

This check is restricted to the in-scope strings only. The Host QR modal text, the Print Card popup HTML, and `notify(...)` arguments are explicitly out of scope per the spec and intentionally remain English.

```bash
node -e "const c = require('fs').readFileSync('frontend-new/src/app/employees/page.js','utf8'); ['>Employees<','placeholder={\\'Select Branch\\'}','placeholder={\\'Select Department\\'}','placeholder=\"Search by name or ID\"','title=\"Refresh Data\"','<span>New</span>','\"Are you sure you want to delete this employee?\"'].forEach(s => { if (c.includes(s)) throw new Error('Untranslated: '+s); }); console.log('OK')"
```

Expected: `OK`.

- [ ] **Step 12: Confirm `t` is imported and used**

```bash
node -e "const c = require('fs').readFileSync('frontend-new/src/app/employees/page.js','utf8'); if (!c.includes(\"from 'react-i18next'\")) throw new Error('useTranslation import missing'); if (!c.includes('useTranslation()')) throw new Error('useTranslation() call missing'); if (!c.includes('Columns(t,')) throw new Error('t not passed to Columns'); console.log('OK')"
```

Expected: `OK`.

- [ ] **Step 13: Pause for user commit**

Tell the user: "Employees list translated end-to-end (page.js + columns.js). Please commit `frontend-new/src/app/employees/` before the build verification."

---

## Task 7: Build verification and final manual check matrix

**Files:** None modified — verification only.

- [ ] **Step 1: Production build succeeds**

From the repository root:

```bash
cd frontend-new && npm run build 2>&1 | grep -E "(Compiled|Generating static|Exporting|error|Error|Failed)" | head -20
```

Expected output includes:

```
 ✓ Compiled successfully
 ✓ Generating static pages (103/103)
 ✓ Exporting (2/2)
```

No `error` or `Failed` lines should appear (pre-existing face-api.js / node-fetch warnings are unrelated and can be ignored).

If the build errors out with `t is not defined` or similar inside `columns.js`, return to Task 6 Step 4 and confirm `Columns(t, ...)` is the call.

- [ ] **Step 2: Manual browser check matrix**

Start dev server (`npm run dev` in `frontend-new`) and open `http://localhost:3001/employees`:

| # | Action | Expected |
|---|---|---|
| 1 | Log in as admin/manager, navigate to `/employees` | List loads. Page title "Employees". Branch dropdown placeholder "Select Branch". Department placeholder "Select Department". Search placeholder "Search by name or ID". Hover refresh icon → "Refresh Data". "New" button visible. All eight column headers in English. |
| 2 | Click LanguageSwitcher → Français | Page title "Employés". Branch placeholder "Sélectionner une agence". Department "Sélectionner un département". Search "Rechercher par nom ou ID". Refresh tooltip "Actualiser les données". "Nouveau" button. Column headers: Personnel / Agence / Département / Poste / Mobile / E-mail / Date d'entrée / Accès / Actions. |
| 3 | Hover access-column icons (any row with face/card/fingerprint/palms/password set) | Tooltips translate to French: Visage / Carte / Empreinte / Paumes / Mot de passe. |
| 4 | Open the kebab menu on any row | Five items: Modifier / QR de l'hôte / Imprimer la carte / Appareils / Supprimer. |
| 5 | Click "Supprimer" | Browser `confirm()` dialog text reads "Voulez-vous vraiment supprimer cet employé ?". Cancel — no row deleted. |
| 6 | Switch to العربية | All translated cells render in Arabic. Layout stays LTR (per global-LTR decision). |
| 7 | Switch to हिन्दी | All translated cells render in Hindi. |
| 8 | Click "QR de l'hôte" → confirm Host QR popup opens | Popup contents (title, "Visitors scan this...", Download, Copy Link) remain English — this is the explicit out-of-scope boundary. |
| 9 | Click "Imprimer la carte" → confirm a Print window opens | Card HTML remains English (Print, Close, EmpID, DOJ, Branch labels). Out of scope. |
| 10 | Click "Appareils" → confirm Enrolled Devices modal opens | Modal contents (Employee header, table headers, status badges) remain English. Out of scope. |
| 11 | Click the Import/Export buttons in the toolbar | Tooltips and Upload dialog remain English. Out of scope. |
| 12 | Confirm employee names, branch names, department names, IDs, emails, dates in cells are unchanged across language switches | These are dynamic data values, not translation strings. |

If any in-scope cell fails:

- **Untranslated string visible:** find it in `page.js` or `columns.js`. If the key already exists in `employees.*`, wrap the string in `t(...)`. If not, add a new key to all four locale files following the existing pattern.
- **"employees.list.pageTitle" appears literally instead of "Employees":** the locale file's `employees` block is malformed or the key path is wrong. Re-run the cross-locale parity check from Task 4 Step 3.
- **Compile error referencing `t` is undefined inside columns.js:** Task 5 Step 1 signature change or Task 6 Step 4 call-site update was skipped. Both must be in place.

- [ ] **Step 3: Pause for user commit**

Tell the user: "Employees list i18n complete. 22 keys × 4 locales translated, build clean, manual matrix passed. Please make the final commit."

---

## Out of scope (do NOT do in this plan)

- **Host QR modal** inside `page.js` (lines around 444-498): "Host QR Code", "Visitors scan this to register with this host", "Generating…", "Download", "Copy Link", and the `notify("Pop-ups blocked", ...)` call inside `printEmployeeCard`.
- **Print Card popup HTML** in `printEmployeeCard` (around lines 174-360): "Print", "Close", "EmpID:", "DOJ:", "Branch:" inside the `window.open()`'d document. No React/i18next context available.
- **`EmployeeExtras`** component (`components/Employees/Extras.jsx`): Import/Export tooltips, "Upload Employees" dialog, "Select Branch", "Search branch...", "No branch found.", "Uploading...", "Upload", and `alert(...)` error messages.
- **`EnrolledDevicesModal`** component (`components/Employees/EnrolledDevicesModal.jsx`): the entire device-listing modal.
- **Browser `alert()`, `notify()`, and `confirm()` strings outside the in-scope `confirmDelete`** (e.g. "Pop-ups blocked"). The delete-confirm in `deleteEmployee` IS translated; everything else remains English.
- **"N/A" fallback cells** (`employee.branch?.branch_name || "N/A"` etc., 5× in columns.js) and "—" em-dash fallbacks in the `mobile_email` cell. Kept English as a near-universal convention.
- **Create / Edit / Short subpages** (`/employees/create`, `/employees/edit`, `/employees/short`) — separate plans.
- **API-driven values** returned from the backend (status strings, mode strings).
- **Locale-aware date / number formatting** for the Join Date column.
- **Reverting the global `<html dir="ltr">` decision**.
