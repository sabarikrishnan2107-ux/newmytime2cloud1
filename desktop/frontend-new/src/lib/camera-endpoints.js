const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLoopbackHost(hostname = "") {
  return LOOPBACK_HOSTS.has(String(hostname || "").toLowerCase());
}

function getBrowserLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location;
}

function getDefaultProtocol(kind, location) {
  const isSecurePage = location?.protocol === "https:";

  if (kind === "ws") {
    return isSecurePage ? "wss:" : "ws:";
  }

  return isSecurePage ? "https:" : "http:";
}

function stripTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

function buildDefaultEndpoint(kind, port) {
  const location = getBrowserLocation();
  const protocol = getDefaultProtocol(kind, location);
  const hostname = location?.hostname || "localhost";

  return `${protocol}//${hostname}:${port}`;
}

function resolveCameraEndpoint(configuredUrl, kind, port) {
  const fallback = buildDefaultEndpoint(kind, port);
  const location = getBrowserLocation();

  if (!configuredUrl) {
    return fallback;
  }

  try {
    const url = new URL(configuredUrl);
    const preferredProtocol = getDefaultProtocol(kind, location);

    if (
      location &&
      isLoopbackHost(url.hostname) &&
      !isLoopbackHost(location.hostname)
    ) {
      url.hostname = location.hostname;
      url.protocol = preferredProtocol;
    } else if (
      location?.protocol === "https:" &&
      !isLoopbackHost(url.hostname)
    ) {
      url.protocol = preferredProtocol;
    }

    return stripTrailingSlash(url.toString());
  } catch (error) {
    return stripTrailingSlash(configuredUrl);
  }
}

export function getCameraProxyWsUrl() {
  return resolveCameraEndpoint(process.env.NEXT_PUBLIC_CAMERA_PROXY_URL, "ws", 8501);
}

export function getCameraServiceWsUrl() {
  return resolveCameraEndpoint(process.env.NEXT_PUBLIC_CAMERA_SERVICE_URL, "ws", 8500);
}

export function getCameraServiceHttpUrl() {
  return resolveCameraEndpoint(process.env.NEXT_PUBLIC_CAMERA_SERVICE_HTTP_URL, "http", 8500);
}
