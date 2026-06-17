// Resolve service URLs from the host the app is actually served from, so there
// is never a static host baked in — works on any IP/hostname. Used as the
// fallback when a NEXT_PUBLIC_* env var is missing. (In the desktop build the
// env vars are always set to the __M2C_HOST__ token, which the static server
// rewrites to the request host, so these fallbacks are a safety net; on a remote
// PC `localhost` would be wrong, so we use the page's hostname instead.)

function browserLocation() {
  return typeof window !== "undefined" ? window.location : null;
}

// The host the page is served from. 'localhost' is only the build-time/prerender
// value; in the browser this resolves to the real host the client used.
export function currentHost() {
  const loc = browserLocation();
  return (loc && loc.hostname) || "localhost";
}

// Build a same-host service URL. kind: 'http' | 'ws'. Protocol follows the page
// (https/wss when the page is https).
export function svcUrl(kind, port, path = "") {
  const loc = browserLocation();
  const secure = loc && loc.protocol === "https:";
  const proto = kind === "ws" ? (secure ? "wss" : "ws") : (secure ? "https" : "http");
  return `${proto}://${currentHost()}:${port}${path}`;
}
