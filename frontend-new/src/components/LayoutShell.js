"use client";

import { usePathname } from "next/navigation";
import LeftMenu from "@/components/leftMenu";
import Header from "@/components/Header";
import MainContentWrapper from "@/components/MainContentWrapper";
import AccessGuard from "@/components/AccessGuard";
import { WizardModeProvider } from "@/context/WizardModeContext";
import dynamic from "next/dynamic";

const VoiceButton = dynamic(() => import("@/components/Voice/VoiceButton"), { ssr: false });

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  // Normalize: strip trailing slash so checks work whether `trailingSlash` is on or off.
  const path = pathname?.replace(/\/$/, "") || "";
  const isStaffRoute = path.startsWith("/staff");
  // Only the actual /login screen renders without the admin shell.
  // Sub-routes like /login/manager-login are admin CRUD pages and need the header/sidebar.
  const isLoginRoute = path === "/login";
  const isHostCheckinRoute = path.startsWith("/visitor/host-checkin");
  // Support page keeps the header but renders full-width (no left menu).
  const isSupportRoute = path === "/support";

  // Staff, login, and public visitor host-checkin pages render their own layout
  if (isStaffRoute || isLoginRoute || isHostCheckinRoute) {
    return <>{children}</>;
  }

  // Admin/Manager layout with Header + LeftMenu
  return (
    <WizardModeProvider>
      <Header />
      <div className="flex flex-1 min-h-0">
        {!isSupportRoute && <LeftMenu />}
        <MainContentWrapper>
          <AccessGuard>{children}</AccessGuard>
        </MainContentWrapper>
      </div>
      <VoiceButton />
    </WizardModeProvider>
  );
}
