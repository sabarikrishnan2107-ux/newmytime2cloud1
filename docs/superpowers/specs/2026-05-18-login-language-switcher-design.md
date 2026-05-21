# Login Language Switcher & i18n Foundation — Design

**Date:** 2026-05-18
**Scope:** Frontend (`frontend-new`) — login page only, plus reusable i18n infrastructure for the rest of the app

## 1. Goal

Add a language selector on the login page supporting **English, Arabic, French, Hindi**. Selecting a language must:

- Translate every visible string on the login page (form labels, buttons, validation, marketing copy, footer).
- Flip the page to **RTL** when Arabic is selected.
- Persist the choice in `localStorage` so it survives refresh, logout, and re-login on the same browser.
- Lay the foundation so other pages can be translated incrementally later, without rework.

Translating pages beyond login (employees, attendance, payroll, sidebar, header, toasts, API messages) is **explicitly out of scope** for this piece of work and will be tackled as separate follow-up plans.

## 2. Library choice

Use **`react-i18next`** + **`i18next`**.

- Framework-agnostic, integrates cleanly with Next.js 15 App Router + React 19.
- Simple `useTranslation()` hook — easy to adopt page-by-page later.
- JSON translation files; supports namespaces so we can split per feature later.
- No restructuring of the `app/` folder required (unlike `next-intl`'s `[locale]` segments).

## 3. Architecture

```
frontend-new/
├── src/
│   ├── lib/
│   │   └── i18n.js                          (new — i18next bootstrap)
│   ├── locales/
│   │   ├── en/common.json                   (new)
│   │   ├── ar/common.json                   (new)
│   │   ├── fr/common.json                   (new)
│   │   └── hi/common.json                   (new)
│   ├── components/
│   │   ├── LanguageProvider.jsx             (new — sets <html dir/lang>, loads saved locale)
│   │   └── LanguageSwitcher.jsx             (new — dropdown UI)
│   └── app/
│       ├── layout.js                        (modified — wrap children in LanguageProvider)
│       └── login/page.js                    (modified — render switcher, use t(), logical CSS)
└── package.json                             (modified — add i18next, react-i18next)
```

### 3.1 `lib/i18n.js` — bootstrap

- Imports all four locale JSON files statically (small files, no async loading needed).
- Initializes `i18next` with `react-i18next`, registers resources, sets `fallbackLng: 'en'`, default namespace `common`.
- Reads `localStorage.getItem('app_language')` on init; defaults to `'en'` if absent or invalid.
- Exports the `i18n` instance (already auto-attached via `initReactI18next`).
- Must be imported once at the app root so the singleton is initialized before any `useTranslation()` call.

### 3.2 `components/LanguageProvider.jsx` — client wrapper

- `"use client"` component that wraps `{children}`.
- On mount: reads saved language from `localStorage`, calls `i18n.changeLanguage(saved)`, and sets `document.documentElement.dir` (`'rtl'` if `ar`, else `'ltr'`) and `document.documentElement.lang`.
- Imports `lib/i18n.js` for its side effect (bootstrap).
- Renders `{children}` directly — no visual wrapper.

### 3.3 `components/LanguageSwitcher.jsx` — UI

- `"use client"` component using the existing Radix `DropdownMenu` (`@radix-ui/react-dropdown-menu` is already a dependency).
- Trigger: shows current language as flag emoji + 2-letter code (e.g. `🇬🇧 EN`). Compact, fits the dark login theme.
- Menu items list all 4 languages with **flag emoji + native name**: `🇬🇧 English`, `🇸🇦 العربية`, `🇫🇷 Français`, `🇮🇳 हिन्दी`. Active language is marked.
- On select:
  1. `i18n.changeLanguage(code)`
  2. `localStorage.setItem('app_language', code)`
  3. `document.documentElement.dir = (code === 'ar') ? 'rtl' : 'ltr'`
  4. `document.documentElement.lang = code`
- Reusable: the same component can later be dropped into the post-login header without changes.

### 3.4 RTL handling

Two-pronged approach to avoid a visible LTR→RTL flip on load:

1. **Initial paint:** `LanguageProvider` runs `useEffect` on mount to set `dir` from localStorage. Because this fires before the login form is fully interactive, the flip is imperceptible in practice. (A future hardening pass could set `dir` via an inline `<script>` in the layout before hydration if needed — out of scope here.)
2. **Direction-aware styling:** On the login page, replace direction-sensitive Tailwind utilities with logical equivalents:
   - `left-3.5` → `start-3.5`
   - `right-3` → `end-3`
   - `ml-*` / `mr-*` → `ms-*` / `me-*`
   - `pl-10` / `pr-11` → `ps-10` / `pe-11`
   - `text-left` / `text-right` → `text-start` / `text-end`

Tailwind v4 (installed) supports logical properties natively. Icons (User, Lock, Eye) and padding mirror automatically under `dir="rtl"`.

## 4. Login page changes

Every hard-coded English string on `app/login/page.js` is replaced with `t('login.<key>')` or `t('footer.<key>')`. The strings to translate:

**`login` namespace:**
- `welcomeBack`: "Welcome Back"
- `signInSubtitle`: "Sign in to your enterprise dashboard"
- `accessLevel`: "Access Level"
- `roleAdmin`: "Admin"
- `roleManager`: "Manager"
- `roleStaff`: "Staff"
- `emailLabel`: "Username or Email"
- `emailPlaceholder`: "j.doe@company.com"
- `passwordLabel`: "Password"
- `passwordPlaceholder`: "Enter your password"
- `rememberMe`: "Remember me"
- `forgotPassword`: "Forgot Password?"
- `signIn`: "Sign In"
- `signingIn`: "Signing in..."
- `errorRequired`: "Email and Password are required."
- `errorInvalidEmail`: "E-mail must be valid."
- `errorLoginFailed`: "Login failed."

**`branding` namespace (left panel):**
- `enterpriseIntelligence`: "Enterprise Intelligence"
- `heroLine1`: "Empower your"
- `heroLine2`: "workforce with"
- `heroLine3Highlight`: "next-gen"
- `heroLine4`: "intelligence."
- `heroDescription`: "Streamline attendance, optimize complex scheduling, and gain real-time insights with our award-winning platform."

**`footer` namespace:**
- `copyright`: "© 2024 MyTime Cloud Systems"
- `privacy`: "Privacy"
- `terms`: "Terms"
- `help`: "Help"

Total ~24 keys × 4 languages.

## 5. Persistence

- Single localStorage key: `app_language`, value is one of `en | ar | fr | hi`.
- Read on app boot in `LanguageProvider`.
- Written by `LanguageSwitcher` on every change.
- No backend changes. No per-user field. (A future plan can add a `preferred_language` column on the users table if cross-device persistence becomes a requirement.)

## 6. Translation accuracy

- English is the source of truth.
- Arabic, French, Hindi translations will be provided as a starting set in the locale JSON files. They should be reviewed by a native speaker before this is shipped to real customers. For this implementation pass, we will use careful translations (not raw machine output), but the **JSON files are the single point of update** — a native-speaker review pass touches only those four files.

## 7. Files touched

**New (7):**
- `frontend-new/src/lib/i18n.js`
- `frontend-new/src/locales/en/common.json`
- `frontend-new/src/locales/ar/common.json`
- `frontend-new/src/locales/fr/common.json`
- `frontend-new/src/locales/hi/common.json`
- `frontend-new/src/components/LanguageProvider.jsx`
- `frontend-new/src/components/LanguageSwitcher.jsx`

**Modified (3):**
- `frontend-new/package.json` — add `i18next` + `react-i18next` deps (run `npm install`)
- `frontend-new/src/app/layout.js` — wrap children in `<LanguageProvider>`
- `frontend-new/src/app/login/page.js` — render `<LanguageSwitcher>` top-right, replace strings with `t(...)`, swap direction-sensitive classes for logical equivalents

## 8. Testing / verification

Manual verification in the browser at `http://localhost:3001/login`:

1. Page loads in English by default (no `app_language` in localStorage).
2. Open language dropdown → see 4 options with flags + native names.
3. Select **Français** → all login strings switch to French. Refresh — still French.
4. Select **العربية** → all login strings switch to Arabic AND page flips to RTL (icons on the right side of inputs, text right-aligned). Refresh — still Arabic + RTL.
5. Select **हिन्दी** → strings in Hindi, layout LTR.
6. Switch back to English → strings English, layout LTR.
7. Log in successfully — admin / staff / manager flow all still work (no regressions to login submit).
8. Log out, return to `/login` — language persists.

No automated tests are added in this piece of work (the project does not currently have a frontend test suite).

## 9. Out of scope

The following are explicitly **not** part of this work and will be separate follow-up plans:

- Translating sidebar, header, or any page besides login.
- Translating SweetAlert dialogs, Sonner toasts, or any runtime-generated UI outside login.
- Translating backend API error messages.
- Per-user backend persistence of language preference.
- Locale-aware date / number / currency formatting.
- Inline `<script>`-based pre-hydration `dir` setting (avoids any flicker entirely).
- Adding more languages beyond the requested four.
