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
        {/* ⚠️ TEMPORARY DIAGNOSTIC — capture white-screen errors on mobile Safari.
            Renders the real JS error + stack onto the page so we can read it on the
            phone (no Mac/devtools needed). REMOVE once the Safari issue is fixed. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  function show(title, msg){
    try{
      var el = document.getElementById('__err_overlay__');
      if(!el){
        el = document.createElement('div');
        el.id = '__err_overlay__';
        el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0b1120;color:#f87171;font:13px/1.5 ui-monospace,monospace;padding:16px;overflow:auto;white-space:pre-wrap;word-break:break-word;-webkit-overflow-scrolling:touch;';
        var h = document.createElement('div');
        h.style.cssText='color:#fbbf24;font-weight:bold;margin-bottom:8px;';
        h.textContent='App error (diagnostic overlay) — screenshot this:';
        el.appendChild(h);
        (document.body||document.documentElement).appendChild(el);
      }
      el.textContent += '\\n\\n' + title + '\\n' + msg;
    }catch(_){}
  }
  window.addEventListener('error', function(e){
    var m = (e.error && (e.error.stack || e.error.message)) || e.message || String(e);
    show('[JS ERROR] '+(e.filename||'')+':'+(e.lineno||'')+':'+(e.colno||''), m);
  });
  window.addEventListener('unhandledrejection', function(e){
    var r = e.reason; var m = (r && (r.stack || r.message)) || String(r);
    show('[PROMISE REJECTION]', m);
  });
})();`,
          }}
        />

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