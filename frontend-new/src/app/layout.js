// app/layout.js
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import LanguageProvider from "@/components/LanguageProvider";
import { DarkModeProvider } from "@/context/DarkModeContext";
import { AuthProvider } from "@/context/AuthContext";
import { LiveAttendanceProvider } from "@/context/LiveAttendanceContext";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="light">
      <head>
        {/* Diagnostic overlay removed 2026-07-13 — it was a TEMPORARY debugging aid
            that painted every JS error full-screen for end users. The issues it was
            added to catch (429 storms, LogTime 500s, i18n hydration mismatch) are
            fixed. Errors still log to the browser console as normal. */}

        {/* Chart.js */}
        <script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>

        {/* ✅ Source Sans Pro (EXACT) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap"
        />

        {/* Plus Jakarta Sans & Inter (Staff Portal) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500&display=swap"
        />

        {/* ✅ Material Icons */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />

        {/* ✅ Material Icons Outlined */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Icons+Outlined"
        />

        {/* ✅ Material Symbols Outlined */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
        />

        {/* ✅ IMPORTANT: apply font to body only (do NOT use *), so icons keep their own font */}
        <style>{`
          body {
            font-family: 'Source Sans Pro', Arial, sans-serif;
          }
        `}</style>
      </head>

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
    </html>
  );
}