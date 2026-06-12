"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import LiveTrackerBottomFeed from "./LiveTrackerBottomFeed";
import distanceMeters from "@/hooks/useDistance";
import { darkMapStyle } from "./mapData";
import { loadGoogleMaps } from "./googleMapsLoader";
import { createAvatarOverlay } from "./createAvatarOverlay";
import HistoryReplay from "./HistoryReplay";
import { getUser } from "@/config";
import useSse from "@/hooks/useSse";

const BASE_MAP_CENTER = { lat: 25.2812992, lng: 55.4128809 };


export default function LiveTeamStatus() {
  const { t } = useTranslation();
  let companyId = null;
  try {
    const user = getUser();
    companyId = user?.company_id;
  } catch (error) {
    companyId = null;
  }
  const simulationEnabled = process.env.NEXT_PUBLIC_LIVE_TRACKER_SIMULATION === "true";

  // side panel removed; clicks are no-ops
  const lastPositionsRef = useRef({});
  const [movingMap, setMovingMap] = useState({});
  const [employeesData, setEmployeesData] = useState([]);
  const [bwMode, setBwMode] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const timersRef = useRef({});
  const darkMapStyleRef = useRef(darkMapStyle);

  const ensureMapInstance = useCallback((maps) => {
    if (!mapContainerRef.current) return false;

    const currentDiv =
      mapRef.current && typeof mapRef.current.getDiv === "function"
        ? mapRef.current.getDiv()
        : null;

    const needsRecreate = !mapRef.current || currentDiv !== mapContainerRef.current;

    if (needsRecreate) {
      mapRef.current = new maps.Map(mapContainerRef.current, {
        center: BASE_MAP_CENTER,
        zoom: 13,
        disableDefaultUI: true,
        styles: bwMode ? darkMapStyleRef.current : null,
      });
    }

    if (mapRef.current && maps.event?.trigger) {
      maps.event.trigger(mapRef.current, "resize");
    }

    setMapReady(true);
    return true;
  }, [bwMode]);

  const parseGpsNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const isValidLat = (value) => Number.isFinite(value) && value >= -90 && value <= 90;
  const isValidLng = (value) => Number.isFinite(value) && value >= -180 && value <= 180;

  const scoreDistance = (point, reference) => {
    if (!point || !reference) return Number.POSITIVE_INFINITY;
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return Number.POSITIVE_INFINITY;
    if (!Number.isFinite(reference.lat) || !Number.isFinite(reference.lng)) return Number.POSITIVE_INFINITY;
    const dLat = point.lat - reference.lat;
    const dLng = point.lng - reference.lng;
    return dLat * dLat + dLng * dLng;
  };

  const getEmployeeIdFromPayload = (payload = {}) => {
    return (
      payload.employeeId ||
      payload.employee_id ||
      payload.customId ||
      payload.userId ||
      payload.user_id ||
      payload.id ||
      null
    );
  };

  const getLatLngFromPayload = (payload = {}, reference = BASE_MAP_CENTER) => {
    const rawLat = parseGpsNumber(payload.lat ?? payload.latitude);
    const rawLng = parseGpsNumber(payload.lng ?? payload.lon ?? payload.long ?? payload.longitude);
    if (rawLat === null || rawLng === null) return null;

    const direct = { lat: rawLat, lng: rawLng };
    const swapped = { lat: rawLng, lng: rawLat };

    const directValid = isValidLat(direct.lat) && isValidLng(direct.lng);
    const swappedValid = isValidLat(swapped.lat) && isValidLng(swapped.lng);

    if (!directValid && !swappedValid) return null;
    if (directValid && !swappedValid) return direct;
    if (!directValid && swappedValid) return swapped;

    return scoreDistance(swapped, reference) < scoreDistance(direct, reference) ? swapped : direct;
  };

  const createLiveEmployee = (employeeId, payload, coords) => {
    const avatar = payload.avatar || "";
    return {
      id: Number.isFinite(Number(employeeId)) ? Number(employeeId) : String(employeeId),
      name: payload.personName || payload.name || `Employee ${employeeId}`,
      location: payload.location || payload.address || "Live Location",
      mapPos: { top: "50%", left: "50%" },
      lat: coords.lat,
      lng: coords.lng,
      avatar,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
  };

  const mergePayloadIntoEmployees = useCallback((payload = {}) => {
    const employeeId = getEmployeeIdFromPayload(payload);
    if (!employeeId) return;

    setEmployeesData((prev) => {
      const index = prev.findIndex((emp) => String(emp.id) === String(employeeId));
      const reference = index >= 0
        ? { lat: prev[index]?.lat, lng: prev[index]?.lng }
        : prev[0]
          ? { lat: prev[0].lat, lng: prev[0].lng }
          : BASE_MAP_CENTER;
      const coords = getLatLngFromPayload(payload, reference);
      if (!coords) return prev;

      if (index === -1) {
        return [createLiveEmployee(employeeId, payload, coords), ...prev];
      }

      const updated = [...prev];
      const current = updated[index];
      updated[index] = {
        ...current,
        id: current.id,
        name: payload.personName || payload.name || current.name,
        role: payload.role || current.role,
        location: payload.location || payload.address || current.location,
        lat: coords.lat,
        lng: coords.lng,
        avatar: payload.avatar,
        mapPos: current.mapPos || { top: "50%", left: "50%" },
      };
      return updated;
    });
  }, []);

  const handleSseMapMessage = useCallback(
    (incoming) => {
      if (!incoming || typeof incoming !== "object") return;
      if (incoming.type && incoming.type !== "map") return;

      const rawPayload = incoming.data && typeof incoming.data === "object" ? incoming.data : incoming;
      const payloadList = Array.isArray(rawPayload) ? rawPayload : [rawPayload];

      payloadList.forEach((payloadData) => {
        if (!payloadData || typeof payloadData !== "object") return;

        if (
          payloadData.company_id &&
          companyId &&
          Number(payloadData.company_id) !== Number(companyId)
        ) {
          return;
        }

        const normalizedPayload = {
          ...payloadData,
          lat: payloadData.lat ?? payloadData.latitude,
          lng: payloadData.lng ?? payloadData.lon ?? payloadData.longitude ?? payloadData.long,
          user_id: payloadData.user_id
            ?? payloadData.employee_id
            ?? payloadData.employeeId
            ?? payloadData.UserID
            ?? payloadData.userId,
          name: payloadData.name
            ?? payloadData.personName
            ?? payloadData.full_name
            ?? payloadData.fullName
            ?? payloadData.short_name,
        };

        console.log(normalizedPayload);

        mergePayloadIntoEmployees(normalizedPayload);
      });
    },
    [companyId, mergePayloadIntoEmployees],
  );

  useSse({ clientId: companyId, onMessage: handleSseMapMessage, storeMessages: false });





  // Detect movement: start a delayed flicker when lat/lng changes beyond threshold
  useEffect(() => {
    const thresholdMeters = 10; // consider movement if >10m
    employeesData.forEach((emp) => {
      const last = lastPositionsRef.current[emp.id];
      if (last) {
        const d = distanceMeters(last.lat, last.lng, emp.lat, emp.lng);
        if (d > thresholdMeters) {
          // clear any existing timers for this emp
          const existing = timersRef.current[emp.id];
          if (existing) {
            if (existing.delay) clearTimeout(existing.delay);
            if (existing.end) clearTimeout(existing.end);
          }

          // Delay 1s (stay 'stuck'), then start flicker/ping for ~1.8s
          const delay = setTimeout(() => {
            setMovingMap((prev) => ({ ...prev, [emp.id]: true }));
            const end = setTimeout(() => {
              setMovingMap((prev) => ({ ...prev, [emp.id]: false }));
              timersRef.current[emp.id] = null;
            }, 1800);
            timersRef.current[emp.id] = { delay: null, end };
          }, 1000);

          timersRef.current[emp.id] = { delay, end: null };
        }
      }
      lastPositionsRef.current[emp.id] = { lat: emp.lat, lng: emp.lng };
    });
    // cleanup on unmount
    return () => {
      Object.values(timersRef.current || {}).forEach((t) => {
        if (!t) return;
        if (t.delay) clearTimeout(t.delay);
        if (t.end) clearTimeout(t.end);
      });
    };
  }, [employeesData]);

  // Simulation: nudge one employee's position every 2s to demonstrate movement/ping
  useEffect(() => {
    if (!simulationEnabled) return;
    const idToMove = 1; // simulate employee with id=1
    const interval = setInterval(() => {
      setEmployeesData((prev) => {
        return prev.map((e) => {
          if (e.id !== idToMove) return e;
          // small random delta in lat/lng to simulate movement
          const deltaLat = (Math.random() - 0.5) * 0.0004; // ~ up to ~44m
          const deltaLng = (Math.random() - 0.5) * 0.0004;
          const newLat = e.lat + deltaLat;
          const newLng = e.lng + deltaLng;
          // also slightly adjust mapPos for demo (clamp not necessary here)
          const topNum = parseFloat(e.mapPos.top) + (Math.random() - 0.5) * 1.2;
          const leftNum = parseFloat(e.mapPos.left) + (Math.random() - 0.5) * 1.2;
          return {
            ...e,
            lat: Number(newLat.toFixed(6)),
            lng: Number(newLng.toFixed(6)),
            mapPos: { top: `${topNum}%`, left: `${leftNum}%` },
          };
        });
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [simulationEnabled]);

  // Initialize Google Map once
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (!apiKey) {
      console.warn("Map: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set");
      setMapError(t("liveTracker.apiKeyMissing"));
      return;
    }

    let mounted = true;
    setMapError("");
    setMapReady(false);
    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (!mounted) return;
        const mountMap = () => {
          if (!mounted) return;
          if (!mapContainerRef.current) {
            requestAnimationFrame(mountMap);
            return;
          }
          ensureMapInstance(maps);
        };

        mountMap();
      })
      .catch((err) => {
        const message = err?.message || t("liveTracker.loadMapFailed");
        setMapError(message);
        console.error("Failed to load Google Maps", err);
      });

    return () => {
      mounted = false;
    };
  }, [ensureMapInstance]);

  // Safety net: if map script is already ready but init missed container timing, create map anyway.
  useEffect(() => {
    if (mapRef.current) return;
    const maps = window.google?.maps;
    if (!maps) return;
    ensureMapInstance(maps);
  }, [ensureMapInstance, mapReady]);

  // Fallback: attempt to initialize Google Maps for a short period in case
  // script/container timing causes the normal init to miss.
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // ~10 seconds (500ms interval)
    const iv = setInterval(() => {
      if (mapRef.current) return clearInterval(iv);
      const maps = window.google?.maps;
      if (maps && mapContainerRef.current) {
        try {
          ensureMapInstance(maps);
        } catch (e) { }
      }
      attempts += 1;
      if (attempts >= maxAttempts) clearInterval(iv);
    }, 500);
    return () => clearInterval(iv);
  }, [ensureMapInstance]);

  // Toggle CSS class on the map container so overlays can respond to B/W mode via CSS
  useEffect(() => {
    const node = mapContainerRef.current;
    if (!node) return;
    if (bwMode) node.classList.add("bw-mode");
    else node.classList.remove("bw-mode");
  }, [bwMode]);

  // Sync avatar overlays to employeesData
  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapRef.current) return;

    const currentIds = new Set();

    employeesData.forEach((emp) => {
      const employeeKey = String(emp.id);
      currentIds.add(employeeKey);
      const pos = { lat: emp.lat, lng: emp.lng };
      const exists = markersRef.current[employeeKey];
      if (exists) {
        // update position and moving state
        if (typeof exists.setPosition === "function") exists.setPosition(pos);
        if (typeof exists.setMoving === "function") exists.setMoving(Boolean(movingMap[emp.id]));
      } else {
        const overlay = createAvatarOverlay({
          maps,
          employee: emp,
          pos,
          map: mapRef.current,
          openPanel,
          openHistory: (e) => setHistoryEmployee(e),
          bwMode,
          moving: movingMap[emp.id],
          labels: {
            lastKnownLocation: t("liveTracker.overlay.lastKnownLocation"),
            history: t("liveTracker.overlay.history"),
          },
        });
        markersRef.current[employeeKey] = overlay;
      }
    });

    // remove overlays that are no longer present
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.has(String(id))) {
        try {
          markersRef.current[id].setMap(null);
        } catch (e) { }
        delete markersRef.current[id];
      }
    });
  }, [employeesData, movingMap]);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapRef.current || employeesData.length === 0) return;
    const first = employeesData[0];
    if (!first || !Number.isFinite(first.lat) || !Number.isFinite(first.lng)) return;
    mapRef.current.panTo({ lat: first.lat, lng: first.lng });
  }, [employeesData]);

  // Apply B/W mode to existing overlays when toggled
  useEffect(() => {
    Object.values(markersRef.current).forEach((ov) => {
      if (ov && typeof ov.setBW === "function") {
        try { ov.setBW(Boolean(bwMode)); } catch (e) { }
      }
    });
  }, [bwMode]);

  // apply map style when bwMode toggles
  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapRef.current) return;
    try {
      mapRef.current.setOptions({ styles: bwMode ? darkMapStyleRef.current : null });
    } catch (e) {
      console.warn('Failed to apply map style', e);
    }
  }, [bwMode]);

  // no-op panel opener now that side panel is removed
  const openPanel = () => { };

  useEffect(() => {
    const targetCompanyId = companyId || 2;

    const fetchInitialLocations = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://v2backend.mytime2cloud.com/api";
        const response = await fetch(`${apiBase}/realtime_location?company_id=${targetCompanyId}`);
        if (!response.ok) throw new Error("Failed to fetch initial locations");

        const result = await response.json();
        const rows = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);

        if (rows.length) {
          const initialEmployees = rows.map(item => ({
            id: item.UserID,
            name: item.full_name || `Employee ${item.UserID}`,
            location: "Last known location",
            mapPos: { top: "50%", left: "50%" },
            lat: parseFloat(item.latitude),
            lng: parseFloat(item.longitude),
            avatar: item.avatar || "",
            timestamp: item.datetime,
          }));

          setEmployeesData(initialEmployees);

          initialEmployees.forEach(emp => {
            lastPositionsRef.current[emp.id] = { lat: emp.lat, lng: emp.lng };
          });
        }
      } catch (error) {
        console.error("Error loading default entries:", error);
      }
    };

    fetchInitialLocations();
  }, [companyId]);


  return (
    <div
      className="live-tracker-map relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#101622] text-slate-100"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Main Map Area */}
      <main className="relative flex-1 overflow-hidden">
        {/* Background Map (Google Maps will mount here) */}
        <div className="absolute inset-0 bg-[#0a0c10]">
          <div ref={mapContainerRef} className="w-full h-full min-h-0" />
          <div className="absolute inset-0 map-gradient-overlay pointer-events-none" />
          {!mapReady && !mapError && (
            <div className="absolute top-4 left-4 z-20 rounded-md bg-black/70 px-3 py-1 text-xs text-slate-200">
              {t("liveTracker.loadingMap")}
            </div>
          )}
          {mapError && (
            <div className="absolute top-4 left-4 z-20 rounded-md bg-red-900/80 px-3 py-1 text-xs text-red-100">
              {mapError}
            </div>
          )}
        </div>

        {/* Map Controls */}
        <div className="absolute top-6 right-6 flex flex-col gap-3 z-20">
          <div className="flex flex-col bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-800">
            <button className="p-3 hover:bg-slate-800 text-slate-300 transition-colors">
              <span style={{ fontFamily: "Material Icons", fontSize: 24 }}>+</span>
            </button>
            <div className="h-px bg-slate-800" />
            <button className="p-3 hover:bg-slate-800 text-slate-300 transition-colors">
              <span style={{ fontFamily: "Material Icons", fontSize: 24 }}>−</span>
            </button>
          </div>
          <button className="flex w-12 h-12 items-center justify-center rounded-xl bg-[#1152d4] text-white shadow-lg hover:bg-blue-600 transition-all">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
            </svg>
          </button>
          <button className="flex w-12 h-12 items-center justify-center rounded-xl bg-slate-900 text-slate-300 shadow-xl border border-slate-800 hover:bg-slate-800 transition-all">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z" />
            </svg>
          </button>
          <button
            onClick={() => setBwMode((s) => !s)}
            title={t("liveTracker.toggleBw")}
            className={`flex w-12 h-12 items-center justify-center rounded-xl shadow-lg transition-all ${bwMode ? 'bg-white text-black' : 'bg-slate-900 text-slate-300'}`}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 3v18a9 9 0 100-18z" />
            </svg>
          </button>
        </div>

        {/* Avatars are rendered as Google Maps overlays; DOM pins removed to avoid duplication. */}

        {/* Live Feed Panel */}
        <LiveTrackerBottomFeed employees={employeesData} openPanel={openPanel} />
      </main>

      {/* Side panel removed */}

      {historyEmployee && (
        <HistoryReplay
          employee={historyEmployee}
          companyId={companyId}
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
          onClose={() => setHistoryEmployee(null)}
        />
      )}
    </div>
  );
}