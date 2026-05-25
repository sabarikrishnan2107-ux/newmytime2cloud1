"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUser } from "@/config";
import {
  isManagerUser,
  canUserAccessPath,
  firstAllowedHrefForUser,
} from "@/lib/moduleAccess";

// Client-side page-level gate for manager logins. Admins/non-managers pass
// through untouched. Managers are redirected away from modules their role does
// not grant; a manager with zero allowed modules sees a friendly message
// (prevents a redirect loop on a blocked landing page).
export default function AccessGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => { setUser(getUser()); setReady(true); };
    load();
    window.addEventListener("userUpdated", load);
    return () => window.removeEventListener("userUpdated", load);
  }, []);

  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const manager = isManagerUser(user);
  const dest = manager ? firstAllowedHrefForUser(user) : null;
  const destNorm = (dest || "").replace(/\/+$/, "") || "/";
  const blocked = manager && !!dest && !canUserAccessPath(user, path);

  useEffect(() => {
    if (ready && blocked && path !== destNorm) {
      router.replace(dest);
    }
  }, [ready, blocked, path, destNorm, dest, router]);

  if (!ready) return children; // before user is known, render normally
  if (manager && dest === null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">No access</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Your account has no modules enabled yet. Please contact your administrator.
        </p>
      </div>
    );
  }
  if (blocked) return null; // redirecting — avoid flashing blocked content
  return children;
}
