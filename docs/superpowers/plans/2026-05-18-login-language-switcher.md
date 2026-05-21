# Login Language Switcher & i18n Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a language switcher (English, Arabic, French, Hindi) on the login page that translates every visible login string, flips to RTL when Arabic is selected, and persists in `localStorage` — while putting reusable i18n infrastructure in place for future page-by-page rollout.

**Architecture:** Install `react-i18next` + `i18next`. Add a single bootstrap module (`lib/i18n.js`) loading four locale JSON files. A `LanguageProvider` client component wraps the app root and applies the saved language + `dir` to `<html>` on mount. A reusable `LanguageSwitcher` dropdown lives in the top-right of the login page; it calls `i18n.changeLanguage`, writes localStorage, and updates `<html dir/lang>` on each change. The login page replaces every hard-coded string with `t(...)` and swaps direction-sensitive Tailwind classes (`left-*`, `pl-*`, `ml-*`) for logical equivalents (`start-*`, `ps-*`, `ms-*`) so the form mirrors correctly in RTL.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind v4, Radix UI dropdown (already installed), `i18next` 24.x, `react-i18next` 15.x.

**Spec:** [`docs/superpowers/specs/2026-05-18-login-language-switcher-design.md`](../specs/2026-05-18-login-language-switcher-design.md)

**Note on testing:** The project has no frontend test suite. Verification is **manual browser testing** described per-task. There is no `npm test` to run.

**Note on commits:** Per project preference, the user handles all git commits. Treat every "Commit" step as a verification checkpoint where the engineer pauses and asks the user to commit before proceeding.

---

## Task 1: Install i18n dependencies

**Files:**
- Modify: `frontend-new/package.json`
- Modify: `frontend-new/package-lock.json` (auto)

- [ ] **Step 1: Install i18next and react-i18next**

Run from the `frontend-new` directory:

```bash
npm install i18next@^24.0.0 react-i18next@^15.0.0
```

Expected: `package.json` `dependencies` now contains both packages. `node_modules/i18next` and `node_modules/react-i18next` exist.

- [ ] **Step 2: Verify install**

```bash
npm ls i18next react-i18next
```

Expected output shows both packages resolved at the installed versions, no `UNMET DEPENDENCY` errors.

- [ ] **Step 3: Pause for user commit**

Tell the user: "Dependencies installed — please commit `package.json` and `package-lock.json` before continuing."

---

## Task 2: Create English locale file (source of truth)

**Files:**
- Create: `frontend-new/src/locales/en/common.json`

- [ ] **Step 1: Create directory and file**

Create the directory `frontend-new/src/locales/en/` and write `common.json`:

```json
{
  "login": {
    "welcomeBack": "Welcome Back",
    "signInSubtitle": "Sign in to your enterprise dashboard",
    "accessLevel": "Access Level",
    "roleAdmin": "Admin",
    "roleManager": "Manager",
    "roleStaff": "Staff",
    "emailLabel": "Username or Email",
    "emailPlaceholder": "j.doe@company.com",
    "passwordLabel": "Password",
    "passwordPlaceholder": "Enter your password",
    "rememberMe": "Remember me",
    "forgotPassword": "Forgot Password?",
    "signIn": "Sign In",
    "signingIn": "Signing in...",
    "errorRequired": "Email and Password are required.",
    "errorInvalidEmail": "E-mail must be valid.",
    "errorLoginFailed": "Login failed."
  },
  "branding": {
    "enterpriseIntelligence": "Enterprise Intelligence",
    "heroLine1": "Empower your",
    "heroLine2": "workforce with",
    "heroLine3Highlight": "next-gen",
    "heroLine4": "intelligence.",
    "heroDescription": "Streamline attendance, optimize complex scheduling, and gain real-time insights with our award-winning platform."
  },
  "footer": {
    "copyright": "© 2024 MyTime Cloud Systems",
    "privacy": "Privacy",
    "terms": "Terms",
    "help": "Help"
  },
  "language": {
    "label": "Language",
    "english": "English",
    "arabic": "العربية",
    "french": "Français",
    "hindi": "हिन्दी"
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/en/common.json','utf8')); console.log('OK')"
```

Expected: `OK` printed, no parse error.

---

## Task 3: Create Arabic locale file

**Files:**
- Create: `frontend-new/src/locales/ar/common.json`

- [ ] **Step 1: Write the Arabic translations**

```json
{
  "login": {
    "welcomeBack": "مرحبًا بعودتك",
    "signInSubtitle": "سجّل الدخول إلى لوحة المؤسسة",
    "accessLevel": "مستوى الوصول",
    "roleAdmin": "مسؤول",
    "roleManager": "مدير",
    "roleStaff": "موظف",
    "emailLabel": "اسم المستخدم أو البريد الإلكتروني",
    "emailPlaceholder": "j.doe@company.com",
    "passwordLabel": "كلمة المرور",
    "passwordPlaceholder": "أدخل كلمة المرور",
    "rememberMe": "تذكّرني",
    "forgotPassword": "هل نسيت كلمة المرور؟",
    "signIn": "تسجيل الدخول",
    "signingIn": "جارٍ تسجيل الدخول...",
    "errorRequired": "البريد الإلكتروني وكلمة المرور مطلوبان.",
    "errorInvalidEmail": "يجب أن يكون البريد الإلكتروني صالحًا.",
    "errorLoginFailed": "فشل تسجيل الدخول."
  },
  "branding": {
    "enterpriseIntelligence": "ذكاء المؤسسات",
    "heroLine1": "مكّن",
    "heroLine2": "قوّتك العاملة بـ",
    "heroLine3Highlight": "الجيل القادم",
    "heroLine4": "من الذكاء.",
    "heroDescription": "بسّط الحضور، وحسّن الجداول المعقدة، واحصل على رؤى لحظية مع منصتنا الحائزة على الجوائز."
  },
  "footer": {
    "copyright": "© 2024 MyTime Cloud Systems",
    "privacy": "الخصوصية",
    "terms": "الشروط",
    "help": "المساعدة"
  },
  "language": {
    "label": "اللغة",
    "english": "English",
    "arabic": "العربية",
    "french": "Français",
    "hindi": "हिन्दी"
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/ar/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

---

## Task 4: Create French locale file

**Files:**
- Create: `frontend-new/src/locales/fr/common.json`

- [ ] **Step 1: Write the French translations**

```json
{
  "login": {
    "welcomeBack": "Bon retour",
    "signInSubtitle": "Connectez-vous à votre tableau de bord d'entreprise",
    "accessLevel": "Niveau d'accès",
    "roleAdmin": "Administrateur",
    "roleManager": "Responsable",
    "roleStaff": "Employé",
    "emailLabel": "Nom d'utilisateur ou e-mail",
    "emailPlaceholder": "j.doe@company.com",
    "passwordLabel": "Mot de passe",
    "passwordPlaceholder": "Entrez votre mot de passe",
    "rememberMe": "Se souvenir de moi",
    "forgotPassword": "Mot de passe oublié ?",
    "signIn": "Se connecter",
    "signingIn": "Connexion en cours...",
    "errorRequired": "L'e-mail et le mot de passe sont requis.",
    "errorInvalidEmail": "L'e-mail doit être valide.",
    "errorLoginFailed": "Échec de la connexion."
  },
  "branding": {
    "enterpriseIntelligence": "Intelligence d'entreprise",
    "heroLine1": "Donnez du pouvoir",
    "heroLine2": "à vos équipes avec",
    "heroLine3Highlight": "une nouvelle génération",
    "heroLine4": "d'intelligence.",
    "heroDescription": "Simplifiez la gestion des présences, optimisez la planification complexe et obtenez des informations en temps réel grâce à notre plateforme primée."
  },
  "footer": {
    "copyright": "© 2024 MyTime Cloud Systems",
    "privacy": "Confidentialité",
    "terms": "Conditions",
    "help": "Aide"
  },
  "language": {
    "label": "Langue",
    "english": "English",
    "arabic": "العربية",
    "french": "Français",
    "hindi": "हिन्दी"
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/fr/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

---

## Task 5: Create Hindi locale file

**Files:**
- Create: `frontend-new/src/locales/hi/common.json`

- [ ] **Step 1: Write the Hindi translations**

```json
{
  "login": {
    "welcomeBack": "वापसी पर स्वागत है",
    "signInSubtitle": "अपने एंटरप्राइज़ डैशबोर्ड में साइन इन करें",
    "accessLevel": "एक्सेस स्तर",
    "roleAdmin": "एडमिन",
    "roleManager": "मैनेजर",
    "roleStaff": "स्टाफ",
    "emailLabel": "उपयोगकर्ता नाम या ईमेल",
    "emailPlaceholder": "j.doe@company.com",
    "passwordLabel": "पासवर्ड",
    "passwordPlaceholder": "अपना पासवर्ड दर्ज करें",
    "rememberMe": "मुझे याद रखें",
    "forgotPassword": "पासवर्ड भूल गए?",
    "signIn": "साइन इन करें",
    "signingIn": "साइन इन हो रहा है...",
    "errorRequired": "ईमेल और पासवर्ड आवश्यक हैं।",
    "errorInvalidEmail": "ईमेल मान्य होना चाहिए।",
    "errorLoginFailed": "लॉगिन विफल।"
  },
  "branding": {
    "enterpriseIntelligence": "एंटरप्राइज़ इंटेलिजेंस",
    "heroLine1": "अपने कार्यबल को",
    "heroLine2": "सशक्त बनाएं",
    "heroLine3Highlight": "अगली पीढ़ी",
    "heroLine4": "की बुद्धिमत्ता से।",
    "heroDescription": "उपस्थिति को सरल बनाएं, जटिल शेड्यूलिंग को अनुकूलित करें, और हमारे पुरस्कार-विजेता प्लेटफ़ॉर्म के साथ रीयल-टाइम अंतर्दृष्टि प्राप्त करें।"
  },
  "footer": {
    "copyright": "© 2024 MyTime Cloud Systems",
    "privacy": "गोपनीयता",
    "terms": "शर्तें",
    "help": "सहायता"
  },
  "language": {
    "label": "भाषा",
    "english": "English",
    "arabic": "العربية",
    "french": "Français",
    "hindi": "हिन्दी"
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend-new/src/locales/hi/common.json','utf8')); console.log('OK')"
```

Expected: `OK`.

- [ ] **Step 3: Pause for user commit**

Tell the user: "Four locale files added — please commit `frontend-new/src/locales/` before continuing."

---

## Task 6: Create i18n bootstrap module

**Files:**
- Create: `frontend-new/src/lib/i18n.js`

- [ ] **Step 1: Write `i18n.js`**

```javascript
"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";
import fr from "@/locales/fr/common.json";
import hi from "@/locales/hi/common.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
];

export const LANGUAGE_STORAGE_KEY = "app_language";

const isBrowser = typeof window !== "undefined";

function readSavedLanguage() {
  if (!isBrowser) return "en";
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const valid = SUPPORTED_LANGUAGES.some((l) => l.code === saved);
  return valid ? saved : "en";
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { common: en },
      ar: { common: ar },
      fr: { common: fr },
      hi: { common: hi },
    },
    lng: readSavedLanguage(),
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
```

- [ ] **Step 2: Verify the module imports without syntax error**

Run:

```bash
node -e "require('fs').accessSync('frontend-new/src/lib/i18n.js'); console.log('exists')"
```

Expected: `exists`.

(Full module verification happens once it's imported by the `LanguageProvider` in Task 7; this is just a sanity check that the file is in place.)

---

## Task 7: Create LanguageProvider component

**Files:**
- Create: `frontend-new/src/components/LanguageProvider.jsx`

- [ ] **Step 1: Write `LanguageProvider.jsx`**

```jsx
"use client";

import { useEffect } from "react";
import i18n, { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from "@/lib/i18n";

export default function LanguageProvider({ children }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const valid = SUPPORTED_LANGUAGES.some((l) => l.code === saved);
    const code = valid ? saved : "en";

    if (i18n.language !== code) {
      i18n.changeLanguage(code);
    }

    document.documentElement.lang = code;
    document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
  }, []);

  return children;
}
```

- [ ] **Step 2: Verify file exists**

```bash
node -e "require('fs').accessSync('frontend-new/src/components/LanguageProvider.jsx'); console.log('exists')"
```

Expected: `exists`.

---

## Task 8: Wire LanguageProvider into root layout

**Files:**
- Modify: `frontend-new/src/app/layout.js`

- [ ] **Step 1: Add the import and wrap the existing providers**

Edit `frontend-new/src/app/layout.js`:

Change the imports block (top of file) from:

```javascript
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { DarkModeProvider } from "@/context/DarkModeContext";
import { AuthProvider } from "@/context/AuthContext";
import { LiveAttendanceProvider } from "@/context/LiveAttendanceContext";
```

to:

```javascript
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import LanguageProvider from "@/components/LanguageProvider";
import { DarkModeProvider } from "@/context/DarkModeContext";
import { AuthProvider } from "@/context/AuthContext";
import { LiveAttendanceProvider } from "@/context/LiveAttendanceContext";
```

Then wrap the body's provider tree. Change:

```javascript
<body className="text-slate-200 overflow-hidden h-screen flex flex-col">
  <DarkModeProvider>
    <AuthProvider>
      <LiveAttendanceProvider>
        <LayoutShell>{children}</LayoutShell>
      </LiveAttendanceProvider>
    </AuthProvider>
  </DarkModeProvider>
</body>
```

to:

```javascript
<body className="text-slate-200 overflow-hidden h-screen flex flex-col">
  <LanguageProvider>
    <DarkModeProvider>
      <AuthProvider>
        <LiveAttendanceProvider>
          <LayoutShell>{children}</LayoutShell>
        </LiveAttendanceProvider>
      </AuthProvider>
    </DarkModeProvider>
  </LanguageProvider>
</body>
```

(Leave the existing `<html lang="en" className="light">` opening tag and `<head>` block exactly as they are. `LanguageProvider` updates `<html>` attributes at runtime; the static `lang="en"` is a safe SSR default.)

- [ ] **Step 2: Start dev server and verify no errors**

In a separate terminal:

```bash
cd frontend-new
npm run dev
```

Expected: Dev server boots without compile errors. Visit `http://localhost:3001/login` — the existing login page renders unchanged (no visible difference yet; we have only added an idle provider).

Open browser DevTools console — expect **no** React errors, no hydration warnings, no `i18next` warnings about missing resources.

- [ ] **Step 3: Pause for user commit**

Tell the user: "i18n infrastructure wired in — please commit before continuing to the login page changes."

---

## Task 9: Create LanguageSwitcher component

**Files:**
- Create: `frontend-new/src/components/LanguageSwitcher.jsx`

- [ ] **Step 1: Write `LanguageSwitcher.jsx`**

```jsx
"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import i18n, {
  SUPPORTED_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
} from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function LanguageSwitcher({ className = "" }) {
  const { i18n: i18nFromHook } = useTranslation();
  const [current, setCurrent] = useState(i18nFromHook.language || "en");

  useEffect(() => {
    const onChange = (lng) => setCurrent(lng);
    i18n.on("languageChanged", onChange);
    return () => i18n.off("languageChanged", onChange);
  }, []);

  const activeLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === current) ||
    SUPPORTED_LANGUAGES[0];

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      document.documentElement.lang = code;
      document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-slate-800/50 border border-white/10 text-slate-200 text-xs font-semibold hover:bg-slate-800/80 transition-colors ${className}`}
        aria-label="Change language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="text-base leading-none">{activeLang.flag}</span>
        <span className="uppercase tracking-wider">{activeLang.code}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-[180px] bg-[#0D1626] border border-white/10 text-slate-200"
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = lang.code === current;
          return (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => handleSelect(lang.code)}
              className="flex items-center gap-2 cursor-pointer focus:bg-white/10 focus:text-white"
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
              {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Verify file exists**

```bash
node -e "require('fs').accessSync('frontend-new/src/components/LanguageSwitcher.jsx'); console.log('exists')"
```

Expected: `exists`.

---

## Task 10: Wire LanguageSwitcher into the login page (translations only)

**Files:**
- Modify: `frontend-new/src/app/login/page.js`

This task replaces hard-coded English strings with `t(...)` calls and renders the switcher. **It does NOT yet swap direction-sensitive Tailwind classes** — that is Task 11. Splitting keeps each diff reviewable.

- [ ] **Step 1: Add imports**

At the top of `frontend-new/src/app/login/page.js`, add (next to the existing imports):

```javascript
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
```

- [ ] **Step 2: Call `useTranslation` inside the component**

Inside the `Login` component, immediately after `const router = useRouter();`, add:

```javascript
const { t } = useTranslation();
```

- [ ] **Step 3: Replace validation messages**

In `validateForm`, change:

```javascript
if (!credentials.email || !credentials.password) {
    setMsg('Email and Password are required.');
    return false;
}
if (!/.+@.+\..+/.test(credentials.email)) {
    setMsg('E-mail must be valid.');
    return false;
}
```

to:

```javascript
if (!credentials.email || !credentials.password) {
    setMsg(t('login.errorRequired'));
    return false;
}
if (!/.+@.+\..+/.test(credentials.email)) {
    setMsg(t('login.errorInvalidEmail'));
    return false;
}
```

- [ ] **Step 4: Replace the login-failure fallback message**

In the `catch` block of `handleLogin`, change:

```javascript
|| 'Login failed.';
```

to:

```javascript
|| t('login.errorLoginFailed');
```

- [ ] **Step 5: Render the LanguageSwitcher in the top-right**

Inside the outermost `<div className="relative min-h-screen ...">`, immediately after the closing `</div>` of the background block (the one that ends with the gradient overlay div) and BEFORE the `<div className="relative z-10 flex min-h-screen ...">` content block, insert:

```jsx
{/* Language switcher */}
<div className="absolute top-4 right-4 z-20">
    <LanguageSwitcher />
</div>
```

- [ ] **Step 6: Translate the left-panel branding block**

Replace the entire left-branding block. Change:

```jsx
<div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-bold tracking-[0.2em] text-emerald-400 uppercase rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
    Enterprise Intelligence
</div>
<h2 className="text-5xl xl:text-7xl font-extrabold text-white mb-7 leading-[1.05]">
    Empower your<br />workforce with<br /><span className="text-emerald-400">next-gen</span><br />intelligence.
</h2>
<p className="text-slate-300 text-xl leading-relaxed">
    Streamline attendance, optimize complex scheduling,<br />and gain real-time insights with our award-winning<br />platform.
</p>
```

to:

```jsx
<div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-bold tracking-[0.2em] text-emerald-400 uppercase rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
    {t('branding.enterpriseIntelligence')}
</div>
<h2 className="text-5xl xl:text-7xl font-extrabold text-white mb-7 leading-[1.05]">
    {t('branding.heroLine1')}<br />{t('branding.heroLine2')}<br /><span className="text-emerald-400">{t('branding.heroLine3Highlight')}</span><br />{t('branding.heroLine4')}
</h2>
<p className="text-slate-300 text-xl leading-relaxed">
    {t('branding.heroDescription')}
</p>
```

(The `<br />` line breaks remain. They look fine in all four languages — long heroDescription paragraph no longer hard-wraps, which is desirable across locales.)

- [ ] **Step 7: Translate the form heading and subtitle**

Change:

```jsx
<h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
<p className="text-slate-400 text-sm mb-8">Sign in to your enterprise dashboard</p>
```

to:

```jsx
<h2 className="text-2xl font-bold text-white mb-1">{t('login.welcomeBack')}</h2>
<p className="text-slate-400 text-sm mb-8">{t('login.signInSubtitle')}</p>
```

- [ ] **Step 8: Translate the Access Level label and role buttons**

Change:

```jsx
<label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2 block">
    Access Level
</label>
<div className="grid grid-cols-3 p-1 bg-slate-800/50 rounded-xl border border-white/5">
    {[
        { id: 'company', label: 'Admin', icon: LayoutDashboard },
        { id: 'manager', label: 'Manager', icon: Users },
        { id: 'employee', label: 'Staff', icon: UserCircle }
    ].map((item) => (
```

to:

```jsx
<label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2 block">
    {t('login.accessLevel')}
</label>
<div className="grid grid-cols-3 p-1 bg-slate-800/50 rounded-xl border border-white/5">
    {[
        { id: 'company', label: t('login.roleAdmin'), icon: LayoutDashboard },
        { id: 'manager', label: t('login.roleManager'), icon: Users },
        { id: 'employee', label: t('login.roleStaff'), icon: UserCircle }
    ].map((item) => (
```

- [ ] **Step 9: Translate email field**

Change:

```jsx
<label className="text-sm font-semibold text-slate-300 mb-1.5 block" htmlFor="email">
    Username or Email
</label>
```

to:

```jsx
<label className="text-sm font-semibold text-slate-300 mb-1.5 block" htmlFor="email">
    {t('login.emailLabel')}
</label>
```

And change the email input's placeholder:

```jsx
placeholder="j.doe@company.com"
```

to:

```jsx
placeholder={t('login.emailPlaceholder')}
```

- [ ] **Step 10: Translate password field**

Change:

```jsx
<label className="text-sm font-semibold text-slate-300 mb-1.5 block" htmlFor="password">
    Password
</label>
```

to:

```jsx
<label className="text-sm font-semibold text-slate-300 mb-1.5 block" htmlFor="password">
    {t('login.passwordLabel')}
</label>
```

And change the password input's placeholder:

```jsx
placeholder="Enter your password"
```

to:

```jsx
placeholder={t('login.passwordPlaceholder')}
```

- [ ] **Step 11: Translate Remember Me + Forgot Password**

Change:

```jsx
<span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors select-none">
    Remember me
</span>
```

to:

```jsx
<span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors select-none">
    {t('login.rememberMe')}
</span>
```

And change:

```jsx
<a href="#" className="text-xs font-semibold text-[#3713ec] hover:text-[#5b3ff5] transition-colors">
    Forgot Password?
</a>
```

to:

```jsx
<a href="#" className="text-xs font-semibold text-[#3713ec] hover:text-[#5b3ff5] transition-colors">
    {t('login.forgotPassword')}
</a>
```

- [ ] **Step 12: Translate the Sign In button**

Change:

```jsx
{loading ? 'Signing in...' : 'Sign In'}
```

to:

```jsx
{loading ? t('login.signingIn') : t('login.signIn')}
```

- [ ] **Step 13: Translate the footer**

Change:

```jsx
<span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
    &copy; 2024 MyTime Cloud Systems
</span>
<div className="flex gap-6">
    <a href="#" className="text-[10px] font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Privacy</a>
    <a href="#" className="text-[10px] font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Terms</a>
    <a href="#" className="text-[10px] font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Help</a>
</div>
```

to:

```jsx
<span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
    {t('footer.copyright')}
</span>
<div className="flex gap-6">
    <a href="#" className="text-[10px] font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">{t('footer.privacy')}</a>
    <a href="#" className="text-[10px] font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">{t('footer.terms')}</a>
    <a href="#" className="text-[10px] font-semibold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">{t('footer.help')}</a>
</div>
```

- [ ] **Step 14: Manual verification — translations work, RTL not yet**

With dev server running (`npm run dev` in `frontend-new`), visit `http://localhost:3001/login`:

1. Page loads in English. All visible strings are still English ✓.
2. Click the language switcher (top-right). Dropdown shows 🇬🇧 English, 🇸🇦 العربية, 🇫🇷 Français, 🇮🇳 हिन्दी with a green check on English.
3. Select **Français** → form heading reads "Bon retour", button reads "Se connecter", role buttons read "Administrateur / Responsable / Employé", footer reads "Confidentialité / Conditions / Aide".
4. Hard refresh — language still French.
5. Open DevTools Application → Local Storage → `app_language` is `"fr"`.
6. Select **हिन्दी** → form heading reads "वापसी पर स्वागत है", button reads "साइन इन करें".
7. Select **العربية** → form heading reads "مرحبًا بعودتك". Note: layout is still LTR (icons on the left of inputs); we fix that in Task 11.
8. Select **English** → back to English.
9. Submit a valid login (the existing `demo@gmail.com` / `demo` credentials) — verify it still authenticates and redirects to `/` or `/staff/dashboard` based on role. **No login regression.**

If any string is still hard-coded English in a translated locale, fix the corresponding step before continuing.

- [ ] **Step 15: Pause for user commit**

Tell the user: "Login page now fully translated in 4 languages — please commit before the RTL/logical-CSS pass."

---

## Task 11: Convert direction-sensitive Tailwind classes to logical equivalents (RTL pass)

**Files:**
- Modify: `frontend-new/src/app/login/page.js`

These changes mirror the form correctly when `<html dir="rtl">` is active. They are **invisible in LTR** (logical classes resolve to the same pixels as left/right when `dir="ltr"`).

- [ ] **Step 1: Email input — icon and padding**

Change:

```jsx
<User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#3713ec] transition-colors w-4 h-4" />
<input
    id="email"
    type="text"
    required
    value={credentials.email}
    onChange={handleInputChange}
    className="w-full h-11 pl-10 pr-4 bg-slate-800/40 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3713ec]/30 focus:border-[#3713ec]/50 transition-all text-sm"
    placeholder={t('login.emailPlaceholder')}
/>
```

to:

```jsx
<User className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#3713ec] transition-colors w-4 h-4" />
<input
    id="email"
    type="text"
    required
    value={credentials.email}
    onChange={handleInputChange}
    className="w-full h-11 ps-10 pe-4 bg-slate-800/40 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3713ec]/30 focus:border-[#3713ec]/50 transition-all text-sm"
    placeholder={t('login.emailPlaceholder')}
/>
```

- [ ] **Step 2: Password input — icon, padding, and show/hide button**

Change:

```jsx
<Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#3713ec] transition-colors w-4 h-4" />
<input
    id="password"
    type={showPassword ? "text" : "password"}
    required
    value={credentials.password}
    onChange={handleInputChange}
    className="w-full h-11 pl-10 pr-11 bg-slate-800/40 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3713ec]/30 focus:border-[#3713ec]/50 transition-all text-sm"
    placeholder={t('login.passwordPlaceholder')}
/>
<button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
>
```

to:

```jsx
<Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#3713ec] transition-colors w-4 h-4" />
<input
    id="password"
    type={showPassword ? "text" : "password"}
    required
    value={credentials.password}
    onChange={handleInputChange}
    className="w-full h-11 ps-10 pe-11 bg-slate-800/40 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3713ec]/30 focus:border-[#3713ec]/50 transition-all text-sm"
    placeholder={t('login.passwordPlaceholder')}
/>
<button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
>
```

- [ ] **Step 3: Branding panel — self-alignment of logo**

The logo on the left panel uses `self-start`. That is direction-aware (resolves to flex-start) — leave it as-is.

No change required for this step; it exists to confirm the auditor checked.

- [ ] **Step 4: Switch top-right switcher anchor to logical**

Change:

```jsx
<div className="absolute top-4 right-4 z-20">
    <LanguageSwitcher />
</div>
```

to:

```jsx
<div className="absolute top-4 end-4 z-20">
    <LanguageSwitcher />
</div>
```

(So in RTL the switcher correctly appears in the top-LEFT visual corner — i.e. the inline-end edge.)

- [ ] **Step 5: Manual verification — RTL mirrors correctly**

With dev server running, visit `http://localhost:3001/login`:

1. Select **العربية** from the switcher.
2. **All Arabic text should now read right-to-left.**
3. **User icon** in the email field is on the **right** edge of the input (not the left).
4. **Lock icon** in the password field is on the **right** edge.
5. **Eye / EyeOff toggle** is on the **left** edge of the password field.
6. **Language switcher** is now in the top-**left** corner of the page (because `end-4` resolves to left in RTL).
7. **Form labels** and **input text** align to the right.
8. **Role selector** (Admin / Manager / Staff) — visually mirrors, with Admin on the right end of the grid in RTL. (This is correct behavior for Arabic.)
9. Switch back to **English / Français / हिन्दी** → page returns to LTR, icons on the left, switcher on the right. Layout looks identical to before this task in those languages.
10. Refresh while Arabic is selected → page reloads in RTL with Arabic strings.

If any element is visually broken in RTL (overlap, cut-off, wrong icon side), inspect the element and look for any remaining `left-*`, `right-*`, `pl-*`, `pr-*`, `ml-*`, or `mr-*` class on that element and convert to its logical equivalent.

- [ ] **Step 6: Verify no login regression**

Still on the login page:

1. With language set to Arabic, submit `demo@gmail.com` / `demo` (admin role) → expect redirect to `/`.
2. Log out, return to `/login` (should land back on login page; language persists as Arabic).
3. Switch to English, submit again → still works.

- [ ] **Step 7: Pause for user commit**

Tell the user: "RTL pass complete. The login page now translates and mirrors correctly for all four languages. Please commit."

---

## Task 12: Cross-browser sanity pass and final verification

**Files:** None modified — verification only.

- [ ] **Step 1: Verify build succeeds**

Stop the dev server, then:

```bash
cd frontend-new
npm run build
```

Expected: Build completes without errors. Watch for any "Module not found" or React error related to the new files.

- [ ] **Step 2: End-to-end check matrix**

Restart `npm run dev` and run this matrix on `http://localhost:3001/login`:

| Step | Language | Expected |
|------|----------|----------|
| Clear localStorage, refresh | (default) | English, LTR, switcher shows 🇬🇧 EN |
| Pick Français | fr | All strings French, LTR, switcher shows 🇫🇷 FR |
| Refresh page | fr | Still French (persisted) |
| Pick हिन्दी | hi | All strings Hindi, LTR, switcher shows 🇮🇳 HI |
| Pick العربية | ar | All strings Arabic, **RTL**, switcher in top-LEFT corner, shows 🇸🇦 AR |
| Refresh page | ar | Still Arabic + RTL |
| Submit valid login | ar | Authenticates and redirects, no console errors |
| Manually edit localStorage to `app_language=xyz`, refresh | (invalid) | Falls back to English, LTR |

- [ ] **Step 3: Pause for user commit**

Tell the user: "All verification passes. Feature is complete on the login page. Please make the final commit."

---

## Out of scope (do NOT do in this plan)

The following are explicitly **not** part of this plan and must not be added:

- Translating any page other than `/login` (sidebar, header, employees, attendance, payroll, etc.).
- Translating SweetAlert dialogs or Sonner toasts that originate from non-login flows.
- Translating backend API error messages.
- Adding a `preferred_language` column to the users table or any backend persistence.
- Locale-aware date / number / currency formatting.
- Inline `<script>` pre-hydration `dir` setting to eliminate the imperceptible flicker on first paint.
- Adding more languages beyond the four requested.

Each of the above is a separate follow-up plan that builds on this foundation.
