"use client";

import { usePathname } from "next/navigation";
import LeftMenu from "@/components/leftMenu";
import Header from "@/components/Header";
import MainContentWrapper from "@/components/MainContentWrapper";
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

  // Staff, login, and public visitor host-checkin pages render their own layout
  if (isStaffRoute || isLoginRoute || isHostCheckinRoute) {
    return <>{children}</>;
  }

  // Admin/Manager layout with Header + LeftMenu
  return (
    <>
      <Header />
      <div className="flex flex-1 min-h-0">
        <LeftMenu />
        <MainContentWrapper>{children}</MainContentWrapper>
      </div>
      <VoiceButton />
    </>
  );
}
