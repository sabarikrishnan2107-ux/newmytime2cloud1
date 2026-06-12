// src/lib/moduleAccess.js
// Single source of truth: maps each top-nav module to its nav entry and the
// route prefixes that belong to it. Drives nav filtering (Header) and the
// client-side route gate (AccessGuard). Pure functions only — no React.

export const NAV_MODULES = [
  { module: 'dashboard',      navName: 'DASHBOARD',      labelKey: 'header.nav.dashboard',     href: '/',                match: ['/'] },
  { module: 'employees',      navName: 'EMPLOYEES',      labelKey: 'header.nav.employees',     href: '/employees',       match: ['/employees'] },
  { module: 'attendance',     navName: 'ATTENDANCE',     labelKey: 'header.nav.attendance',    href: '/shift',           match: ['/shift', '/attendance'] },
  { module: 'leave',          navName: 'LEAVE',          labelKey: 'header.nav.leave',         href: '/leave-dashboard', match: ['/leave-dashboard', '/leave'] },
  { module: 'live_tracker',   navName: 'LIVE TRACKER',   labelKey: 'header.nav.liveTracker',   href: '/live-tracker',    match: ['/live-tracker', '/tracker-history'] },
  { module: 'access_control', navName: 'ACCESS CONTROL', labelKey: 'header.nav.accessControl', href: '/access_control',  match: ['/access_control'] },
  { module: 'payroll',        navName: 'PAYROLL',        labelKey: 'header.nav.payroll',       href: '/payslips',        match: ['/payslips', '/payroll'] },
  { module: 'visitors',       navName: 'VISITORS',       labelKey: 'header.nav.visitors',      href: '/visitor',         match: ['/visitor'] },
  { module: 'report',         navName: 'REPORTS',        labelKey: 'header.nav.reports',       href: '/report',          match: ['/report'] },
  { module: 'settings',       navName: 'SETTINGS',       labelKey: 'header.nav.settings',      href: '/setup',           match: ['/setup'] },
];

// Strip trailing slashes so checks work whether `trailingSlash` is on or off.
const normalize = (p) => (p || '').replace(/\/+$/, '') || '/';

// Managers are gated; the company owner and users without an assigned role are not.
// NOTE: the backend login rewrites user_type via getUserType() (a "manager" comes
// back as "master"/"branch"), so we can't key off user_type === 'manager'. We key
// off: NOT the company owner (user_type "company" IS preserved by the backend) AND
// having an assigned role with a modules map.
export function isManagerUser(user) {
  if (!user || user.user_type === 'company') return false;
  const mods = user.role?.modules;
  return !!mods && typeof mods === 'object' && !Array.isArray(mods) && Object.keys(mods).length > 0;
}

// Returns { [moduleKey]: boolean }. Non-managers get every module = true.
export function allowedModulesForUser(user) {
  const manager = isManagerUser(user);
  const roleModules = user?.role?.modules || {};
  const result = {};
  for (const entry of NAV_MODULES) {
    result[entry.module] = manager ? !!roleModules[entry.module] : true;
  }
  return result;
}

// Which module owns a path (longest matching prefix wins). '/' matches the
// dashboard ONLY when the path is exactly '/'. Returns null for paths owned by
// no module (shared/neutral pages stay accessible).
export function moduleForPath(pathname) {
  const path = normalize(pathname);
  let best = null;
  let bestLen = -1;
  for (const entry of NAV_MODULES) {
    for (const prefix of entry.match) {
      if (prefix === '/') {
        if (path === '/' && bestLen < 1) { best = entry.module; bestLen = 1; }
        continue;
      }
      const norm = normalize(prefix);
      if ((path === norm || path.startsWith(norm + '/')) && norm.length > bestLen) {
        best = entry.module;
        bestLen = norm.length;
      }
    }
  }
  return best;
}

// True if the user may view this path. Paths owned by no module are allowed.
export function canUserAccessPath(user, pathname) {
  const mod = moduleForPath(pathname);
  if (!mod) return true;
  return !!allowedModulesForUser(user)[mod];
}

// First nav href the user may open, or null if none are allowed.
export function firstAllowedHrefForUser(user) {
  const allowed = allowedModulesForUser(user);
  const entry = NAV_MODULES.find((e) => allowed[e.module]);
  return entry ? entry.href : null;
}
