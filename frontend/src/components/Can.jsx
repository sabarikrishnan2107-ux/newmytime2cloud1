// src/components/Can.jsx
"use client";

import { can } from "@/lib/permissions-check";

// Renders `children` only when the user may perform `action` on the given feature.
// Non-managers always pass. Pass the current user explicitly (callers already have it
// via getUser()/useAuth) to keep this a pure render-gate with no data fetching.
//
// Usage:
//   <Can user={user} module="employees" feature="employees" action="create">
//     <NewButton />
//   </Can>
export default function Can({ user, module, feature, action, fallback = null, children }) {
  return can(user, module, feature, action) ? <>{children}</> : fallback;
}
