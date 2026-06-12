// src/lib/permissions-check.js
// Per-feature UI permission gating for MANAGER logins. Pure functions — no React.
//
// Every check returns `true` for non-managers (company owner / admin / staff), so
// their experience is provably unchanged. Managers are gated by role.permissions,
// shaped: { [moduleKey]: { [featureId]: { access, view, create, edit, delete } } }.
//
// featureId values come from lib/permissions.js -> card_content[moduleKey].sub_modules[].id

import { isManagerUser } from "@/lib/moduleAccess";

const ALL_TRUE  = { access: true, view: true, create: true, edit: true, delete: true };
// Module is enabled but this feature was never configured by the admin -> view only.
const VIEW_ONLY = { access: true, view: true, create: false, edit: false, delete: false };

// Resolve the permission object for one feature.
export function permEntry(user, moduleKey, featureId) {
  if (!isManagerUser(user)) return ALL_TRUE;
  const entry = user?.role?.permissions?.[moduleKey]?.[featureId];
  if (entry && typeof entry === "object" && !Array.isArray(entry)) return entry;
  return VIEW_ONLY;
}

// Can the user perform `action` on a feature? action in access|view|create|edit|delete.
export function can(user, moduleKey, featureId, action) {
  const e = permEntry(user, moduleKey, featureId);
  if (action === "view" || action === "access") return !!(e.access || e.view);
  return !!e[action];
}

// May the user see / open this feature at all? (access OR view)
export function canSeeFeature(user, moduleKey, featureId) {
  return can(user, moduleKey, featureId, "view");
}

// Explicit, hand-verified map of featureId -> route prefixes it owns. Used ONLY for
// route-level redirects (AccessGuard). Features absent here are gated at the button
// level only — they never trigger a redirect. Populated per module as each is wired.
export const FEATURE_ROUTES = {
  employees: {
    "employees": ["/employees"],
    "employees/employee_photo_upload": ["/employees/employee_photo_upload"],
  },
  attendance: {
    "shift": ["/shift"],
    "schedule": ["/schedule"],
    "attendance/change_request": ["/attendance/change_request"],
  },
  leave: {
    "leave-dashboard": ["/leave-dashboard"],
    "leave": ["/leaves"],
  },
  payroll: {
    "payslips": ["/payslips"],
  },
  report: {
    "report": ["/report"],
  },
  visitors: {
    "visitor": ["/visitor"],
  },
  access_control: {
    "access_control": ["/access_control"],
  },
  live_tracker: {
    "live-tracker": ["/live-tracker"],
    "tracker-history": ["/tracker-history"],
  },
  settings: {
    "setup": ["/setup"],
    "roles": ["/roles"],
  },
};

const normalize = (p) => (p || "").replace(/\/+$/, "") || "/";

// Which { moduleKey, featureId } owns a path (longest matching prefix wins), or null.
export function featureForPath(pathname) {
  const path = normalize(pathname);
  let best = null;
  let bestLen = -1;
  for (const moduleKey of Object.keys(FEATURE_ROUTES)) {
    for (const featureId of Object.keys(FEATURE_ROUTES[moduleKey])) {
      for (const prefix of FEATURE_ROUTES[moduleKey][featureId]) {
        const norm = normalize(prefix);
        if ((path === norm || path.startsWith(norm + "/")) && norm.length > bestLen) {
          best = { moduleKey, featureId };
          bestLen = norm.length;
        }
      }
    }
  }
  return best;
}
