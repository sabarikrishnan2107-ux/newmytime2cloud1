let pendingLoadPromise = null;

export function loadGoogleMaps(apiKey) {
  if (typeof window === "undefined") return Promise.reject(new Error("Window is unavailable"));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (pendingLoadPromise) return pendingLoadPromise;

  pendingLoadPromise = new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId = null;
    let pollId = null;

    const finishResolve = () => {
      if (settled) return;
      if (window.google && window.google.maps) {
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (pollId) clearInterval(pollId);
        pendingLoadPromise = null;
        resolve(window.google.maps);
      }
    };

    const finishReject = (error) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (pollId) clearInterval(pollId);
      pendingLoadPromise = null;
      reject(error);
    };

    const existing = document.getElementById("gmaps-script");

    const attachWatchers = (scriptNode) => {
      const onLoad = () => {
        if (window.google && window.google.maps) {
          finishResolve();
        } else {
          finishReject(new Error("Google Maps loaded but window.google.maps is unavailable"));
        }
      };

      const onError = () => finishReject(new Error("Failed to load Google Maps script"));

      scriptNode.addEventListener("load", onLoad, { once: true });
      scriptNode.addEventListener("error", onError, { once: true });

      pollId = setInterval(() => {
        if (window.google && window.google.maps) {
          finishResolve();
        }
      }, 200);

      timeoutId = setTimeout(() => {
        if (window.google && window.google.maps) {
          finishResolve();
          return;
        }
        finishReject(new Error("Timed out loading Google Maps"));
      }, 10000);
    };

    if (existing) {
      attachWatchers(existing);
      return;
    }

    const script = document.createElement("script");
    script.id = "gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    attachWatchers(script);
  });

  return pendingLoadPromise;
}