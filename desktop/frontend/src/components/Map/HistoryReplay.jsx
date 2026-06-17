"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { loadGoogleMaps } from "./googleMapsLoader";
import { X, Play, Pause, RotateCcw } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function carSvg(rotation) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
    <g transform="rotate(${rotation} 20 20)">
      <rect x="12" y="6" width="16" height="28" rx="4" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
      <rect x="14" y="10" width="12" height="7" rx="1.5" fill="rgba(255,255,255,0.35)"/>
      <rect x="14" y="23" width="12" height="7" rx="1.5" fill="rgba(255,255,255,0.35)"/>
      <circle cx="14.5" cy="9" r="1.2" fill="#ffffff"/>
      <circle cx="25.5" cy="9" r="1.2" fill="#ffffff"/>
    </g>
  </svg>`;
}

function walkSvg(rotation) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
    <circle cx="24" cy="24" r="18" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
    <g transform="rotate(${rotation} 24 24)">
      <path d="M 24 3 L 28.5 8.5 L 19.5 8.5 Z" fill="#ffffff"/>
    </g>
    <g fill="#ffffff" transform="translate(12 12) scale(1)">
      <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
    </g>
  </svg>`;
}

function iconFromSpeed(maps, rotation, speedKmh) {
  if (speedKmh >= 8) {
    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(carSvg(rotation)),
      scaledSize: new maps.Size(40, 40),
      anchor: new maps.Point(20, 20),
    };
  }
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(walkSvg(rotation)),
    scaledSize: new maps.Size(48, 48),
    anchor: new maps.Point(24, 24),
  };
}

function computeHeading(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function computeSpeedKmh(from, to) {
  const R = 6371;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const distKm = 2 * R * Math.asin(Math.sqrt(a));
  const t1 = new Date(from.datetime).getTime();
  const t2 = new Date(to.datetime).getTime();
  const hours = (t2 - t1) / 3600000;
  if (hours <= 0) return 0;
  return distKm / hours;
}

export default function HistoryReplay({ employee, companyId, apiKey, onClose, date, layout = "modal", fromTime, toTime }) {
  const { t } = useTranslation();
  const [trail, setTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(20);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const livePolysRef = useRef([]);
  const fullPathPolysRef = useRef([]);
  const segmentBoundariesRef = useRef([]);
  const mapsRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({ playing: false, speed: 20, index: 0 });

  const segmentOf = (trailIdx) => {
    const bounds = segmentBoundariesRef.current;
    for (let s = 0; s < bounds.length; s++) {
      if (trailIdx >= bounds[s][0] && trailIdx <= bounds[s][1]) return s;
    }
    return 0;
  };

  const normaliseDate = (raw) => {
    if (!raw) return new Date().toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  };
  const [selectedDate, setSelectedDate] = useState(normaliseDate(date));
  useEffect(() => {
    const normalised = normaliseDate(date);
    if (normalised !== selectedDate) setSelectedDate(normalised);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  const today = selectedDate;

  useEffect(() => {
    stateRef.current.playing = playing;
    stateRef.current.speed = speed;
    stateRef.current.index = index;
  }, [playing, speed, index]);

  useEffect(() => {
    setPlaying(false);
    setIndex(0);
    setProgress(0);
    setTrail([]);
    setLoading(true);
    setError(null);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://v2backend.mytime2cloud.com/api";
    fetch(`${apiBase}/realtime_location?company_id=${companyId}&UserID=${employee.id}&date=${today}&per_page=5000`)
      .then((r) => r.json())
      .then((data) => {
        const rows = Array.isArray(data) ? data : (data.data || []);
        rows.sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)));
        const valid = rows
          .filter((r) => !isNaN(parseFloat(r.latitude)) && !isNaN(parseFloat(r.longitude)))
          .map((r) => ({
            lat: parseFloat(r.latitude),
            lng: parseFloat(r.longitude),
            datetime: r.datetime,
            id: r.id,
          }));
        setTrail(valid);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t("liveTracker.history.loadFailed"));
        setLoading(false);
      });
  }, [companyId, employee.id, today]);

  useEffect(() => {
    if (loading || trail.length === 0 || !mapContainerRef.current) return;

    let cancelled = false;
    loadGoogleMaps(apiKey).then((maps) => {
      if (cancelled) return;
      mapsRef.current = maps;

      const first = trail[0];
      const map = new maps.Map(mapContainerRef.current, {
        center: { lat: first.lat, lng: first.lng },
        zoom: 15,
        mapTypeId: "roadmap",
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
      });
      mapRef.current = map;

      const arrowSymbol = {
        path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 3,
        strokeColor: "#1e40af",
        fillColor: "#1e40af",
        fillOpacity: 1,
      };

      // Split trail into session segments by time gaps > 15 min
      const GAP_MS = 15 * 60 * 1000;
      const boundaries = [];
      let segStart = 0;
      for (let i = 1; i < trail.length; i++) {
        const gap = new Date(trail[i].datetime).getTime() - new Date(trail[i - 1].datetime).getTime();
        if (gap > GAP_MS) {
          boundaries.push([segStart, i - 1]);
          segStart = i;
        }
      }
      boundaries.push([segStart, trail.length - 1]);
      segmentBoundariesRef.current = boundaries;

      fullPathPolysRef.current = [];
      livePolysRef.current = [];
      boundaries.forEach(([s, e], sIdx) => {
        const slice = trail.slice(s, e + 1);
        const fullPoly = new maps.Polyline({
          path: slice,
          geodesic: true,
          strokeColor: "#94a3b8",
          strokeOpacity: 0.35,
          strokeWeight: 2,
          icons: [{ icon: arrowSymbol, offset: "0", repeat: "80px" }],
          map,
        });
        fullPathPolysRef.current.push(fullPoly);

        const livePoly = new maps.Polyline({
          path: [slice[0]],
          geodesic: true,
          strokeColor: "#3b82f6",
          strokeOpacity: 0.95,
          strokeWeight: 4,
          map,
        });
        livePolysRef.current.push(livePoly);

        if (sIdx > 0) {
          new maps.Marker({
            position: slice[0],
            map,
            title: t("liveTracker.history.sessionStart") + " • " + formatTime(slice[0].datetime),
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#10b981",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            zIndex: 2,
          });
        }
        if (sIdx < boundaries.length - 1) {
          const lastPt = slice[slice.length - 1];
          new maps.Marker({
            position: lastPt,
            map,
            title: t("liveTracker.history.sessionEnd") + " • " + formatTime(lastPt.datetime),
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#f59e0b",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            zIndex: 2,
          });
        }
      });

      // Day start (A) and end (B) pins
      new maps.Marker({
        position: { lat: first.lat, lng: first.lng },
        map,
        title: t("liveTracker.history.start") + " • " + formatTime(first.datetime),
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#10b981",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        label: { text: "A", color: "white", fontSize: "11px", fontWeight: "bold" },
        zIndex: 2,
      });

      const last = trail[trail.length - 1];
      if (trail.length > 1) {
        new maps.Marker({
          position: { lat: last.lat, lng: last.lng },
          map,
          title: t("liveTracker.history.end") + " • " + formatTime(last.datetime),
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          label: { text: "B", color: "white", fontSize: "11px", fontWeight: "bold" },
          zIndex: 2,
        });
      }

      // Moving replay marker
      const initialHeading = trail.length > 1 ? computeHeading(trail[0], trail[1]) : 0;
      const initialSpeed = trail.length > 1 ? computeSpeedKmh(trail[0], trail[1]) : 0;
      markerRef.current = new maps.Marker({
        position: { lat: first.lat, lng: first.lng },
        map,
        icon: iconFromSpeed(maps, initialHeading, initialSpeed),
        zIndex: 3,
      });

      const bounds = new maps.LatLngBounds();
      trail.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds);
    }).catch((err) => {
      setError(t("liveTracker.history.loadMapFailed") + ": " + err.message);
    });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (markerRef.current) markerRef.current.setMap(null);
      livePolysRef.current.forEach((p) => p.setMap(null));
      fullPathPolysRef.current.forEach((p) => p.setMap(null));
      livePolysRef.current = [];
      fullPathPolysRef.current = [];
    };
  }, [loading, trail, apiKey]);

  useEffect(() => {
    if (!playing || trail.length < 2) return;

    let segmentStart = performance.now();
    let currentIdx = stateRef.current.index;

    const animate = (now) => {
      if (!stateRef.current.playing) return;
      currentIdx = stateRef.current.index;
      if (currentIdx >= trail.length - 1) {
        setPlaying(false);
        setProgress(100);
        return;
      }

      const from = trail[currentIdx];
      const to = trail[currentIdx + 1];
      const fromSeg = segmentOf(currentIdx);
      const toSeg = segmentOf(currentIdx + 1);

      // Crossing a session gap — teleport, don't draw a line through the break
      if (fromSeg !== toSeg) {
        if (markerRef.current) markerRef.current.setPosition({ lat: to.lat, lng: to.lng });
        setIndex(currentIdx + 1);
        setProgress(Math.round(((currentIdx + 1) / (trail.length - 1)) * 100));
        segmentStart = now;
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const fromTime = new Date(from.datetime).getTime();
      const toTime = new Date(to.datetime).getTime();
      const realGap = Math.max(100, Math.min(toTime - fromTime, 60000));
      const segmentMs = realGap / stateRef.current.speed;

      const elapsed = now - segmentStart;
      const t = Math.min(elapsed / segmentMs, 1);

      const lat = from.lat + (to.lat - from.lat) * t;
      const lng = from.lng + (to.lng - from.lng) * t;

      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
        const heading = computeHeading(from, to);
        const kmh = computeSpeedKmh(from, to);
        markerRef.current.setIcon(iconFromSpeed(mapsRef.current, heading, kmh));
        setCurrentSpeed(kmh);
      }

      const activeLivePoly = livePolysRef.current[fromSeg];
      if (activeLivePoly && t >= 1) {
        activeLivePoly.getPath().push(new mapsRef.current.LatLng(to.lat, to.lng));
      }

      setProgress(Math.round(((currentIdx + t) / (trail.length - 1)) * 100));

      if (t >= 1) {
        setIndex(currentIdx + 1);
        segmentStart = now;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, trail]);

  const rebuildLivePolysUpTo = useCallback((idx) => {
    if (!mapsRef.current || livePolysRef.current.length === 0) return;
    segmentBoundariesRef.current.forEach(([s, e], sIdx) => {
      const poly = livePolysRef.current[sIdx];
      if (!poly) return;
      if (idx < s) {
        poly.setPath([{ lat: trail[s].lat, lng: trail[s].lng }]);
      } else if (idx >= e) {
        poly.setPath(trail.slice(s, e + 1).map((p) => ({ lat: p.lat, lng: p.lng })));
      } else {
        poly.setPath(trail.slice(s, idx + 1).map((p) => ({ lat: p.lat, lng: p.lng })));
      }
    });
  }, [trail]);

  const handleReset = useCallback(() => {
    setPlaying(false);
    setIndex(0);
    setProgress(0);
    if (trail.length > 0 && markerRef.current && mapsRef.current) {
      markerRef.current.setPosition({ lat: trail[0].lat, lng: trail[0].lng });
      rebuildLivePolysUpTo(0);
    }
  }, [trail, rebuildLivePolysUpTo]);

  const handleSliderChange = useCallback((e) => {
    const pct = Number(e.target.value);
    setProgress(pct);
    setPlaying(false);
    const idx = Math.min(trail.length - 1, Math.floor((pct / 100) * (trail.length - 1)));
    setIndex(idx);
    if (trail[idx] && markerRef.current && mapsRef.current) {
      const point = { lat: trail[idx].lat, lng: trail[idx].lng };
      markerRef.current.setPosition(point);
      rebuildLivePolysUpTo(idx);
      if (idx < trail.length - 1) {
        const heading = computeHeading(trail[idx], trail[idx + 1]);
        const kmh = computeSpeedKmh(trail[idx], trail[idx + 1]);
        markerRef.current.setIcon(iconFromSpeed(mapsRef.current, heading, kmh));
        setCurrentSpeed(kmh);
      } else {
        setCurrentSpeed(0);
      }
    }
  }, [trail, rebuildLivePolysUpTo]);

  const currentPoint = trail[index] || trail[0];

  const isPage = layout === "page";

  const outerClass = isPage
    ? "w-full bg-white dark:bg-slate-900 flex"
    : "fixed inset-0 z-[10000] bg-black/75 flex items-center justify-center";
  const innerClass = isPage
    ? "w-full h-full overflow-hidden flex flex-col bg-white dark:bg-slate-900"
    : "w-[92vw] max-w-[1200px] h-[88vh] rounded-xl overflow-hidden flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700";
  const outerStyle = isPage ? { height: "calc(100vh - 70px)" } : undefined;

  return (
    <div className={outerClass} style={outerStyle} onClick={isPage ? undefined : onClose}>
      <div className={innerClass} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {employee.avatar ? (
              <img src={employee.avatar} alt={employee.name} className="w-10 h-10 rounded-full object-cover border-2 border-primary" />
            ) : null}
            <div>
              <div className="text-slate-800 dark:text-white font-semibold text-[15px]">{employee.name || t("liveTracker.history.employeeFallback")}</div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">{t("liveTracker.history.movementHistory")}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs">{t("liveTracker.history.date")}</span>
              <div className="w-[170px]">
                <DatePicker
                  value={selectedDate}
                  onChange={(d) => setSelectedDate(d)}
                  placeholder={t("liveTracker.history.pickDate")}
                />
              </div>
            </div>
            <button
              onClick={onClose}
              title={isPage ? t("liveTracker.history.back") : t("liveTracker.history.close")}
              className="flex items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-100 dark:bg-[#0a0c10]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400">
              {t("liveTracker.history.loading")}
            </div>
          )}
          {!loading && error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-500">
              {error}
            </div>
          )}
          {!loading && !error && trail.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400">
              {t("liveTracker.history.noMovement", { date: today })}
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {trail.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2.5">
              <button
                onClick={() => setPlaying((p) => !p)}
                title={playing ? t("liveTracker.history.pause") : t("liveTracker.history.play")}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-white transition"
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                onClick={handleReset}
                title={t("liveTracker.history.reset")}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 transition"
              >
                <RotateCcw size={16} />
              </button>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>{t("liveTracker.history.speed")}</span>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                >
                  <option value={5}>5×</option>
                  <option value={10}>10×</option>
                  <option value={20}>20×</option>
                  <option value={50}>50×</option>
                  <option value={100}>100×</option>
                </select>
              </div>
              <div className="flex-1 flex justify-end items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    currentSpeed >= 8
                      ? "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-300"
                      : "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
                  }`}
                  title={currentSpeed >= 8 ? t("liveTracker.history.driving") : t("liveTracker.history.walking")}
                >
                  {currentSpeed.toFixed(1)} km/h
                </span>
                <span>{currentPoint ? formatTime(currentPoint.datetime) : ""}</span>
                <span className="text-slate-400 dark:text-slate-500">{index + 1} / {trail.length}</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={handleSliderChange}
              className="w-full accent-primary"
            />
          </div>
        )}
      </div>
    </div>
  );
}
