// app/job-sites/geofencing/page.tsx
import React, { useState } from "react";
import RightSection from "./RightSection";
import GeoMap from "./GeoMap";
import FloatingControls from "./FloatingControls";

export default function GeoFencing() {
  const [radius, setRadius] = useState(150);
  // Default to Dubai coordinates
  const [center, setCenter] = useState({ lat: 25.2048, lng: 55.2708 });
  const [mapApi, setMapApi] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [searchText, setSearchText] = useState("");
  // Add lifted lat/lng state
  const [selectedLat, setSelectedLat] = useState(center.lat);
  const [selectedLng, setSelectedLng] = useState(center.lng);

  // convert meters -> pixels based on default visual size
  const DEFAULT_RADIUS_METERS = 150; // corresponds to current default visual size
  const DEFAULT_DIAMETER_PX = 256; // tailwind h-64 w-64 -> 256px
  const PIXELS_PER_METER = DEFAULT_DIAMETER_PX / (DEFAULT_RADIUS_METERS * 2);
  const diameterPx = Math.max(16, Math.round(radius * 2 * PIXELS_PER_METER));

  // perform search: accepts "lat, lng" or freeform address (uses Google Geocoder when available)
  function performSearch() {
    const text = (searchText || "").trim();
    if (!text) return;

    // try parse as coordinates: "lat, lng" or "lat lng"
    const coord = text.match(/^\s*([-+]?\d{1,3}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)\s*$/);
    if (coord) {
      const lat = parseFloat(coord[1]);
      const lng = parseFloat(coord[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setCenter({ lat, lng });
        setSelectedLat(lat);
        setSelectedLng(lng);
        mapApi?.panTo({ lat, lng });
        return;
      }
    }

    // fallback: use Google Geocoder if loaded
    if (typeof window !== "undefined" && window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: text }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          setCenter({ lat, lng });
          setSelectedLat(lat);
          setSelectedLng(lng);
          mapApi?.panTo({ lat, lng });
        } else {
          console.warn("Geocode failed:", status);
        }
      });
      return;
    }

    console.warn("Search: input not coordinates and Geocoder unavailable yet");
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      <main className="flex h-full w-full">
        {/* Left Side: Interactive Map */}
        <div className="relative flex-1 h-full bg-slate-200 dark:bg-slate-900 overflow-hidden">
          {/* Google Maps JS API (controlled) */}
          <div className="absolute inset-0">
            <GeoMap
              center={center}
              radius={radius}
              activeTool={activeTool}
              setCenter={(c) => {
                setCenter(c);
                setSelectedLat(c.lat);
                setSelectedLng(c.lng);
              }}
              setRadius={setRadius}
              onMapReady={(api) => setMapApi(api)}
            />

            {/* subtle overlay for dark mode readability */}
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
          </div>

          <FloatingControls
            activeTool={activeTool}
            onSelectTool={(tool) => {
              setActiveTool((prev) => (prev === tool ? null : tool));
              console.debug("FloatingControls: selected", tool);
            }}
            onZoomIn={() => mapApi?.zoomIn()}
            onZoomOut={() => mapApi?.zoomOut()}
          />

          {/* Visual Branch (Overlay) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div
              className="relative flex items-center justify-center"
              style={{ width: diameterPx + "px", height: diameterPx + "px" }}
              aria-hidden
            >
              {/* translucent ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: "rgba(250,204,21,0.12)",
                  border: "2px solid rgba(250,204,21,0.9)",
                }}
              />

              {/* center marker removed — using default map marker */}
            </div>
          </div>

          <div className="absolute top-1/4 right-1/4">
            {/* Decorative overlay removed to avoid duplicate highlight */}
          </div>

          {/* Location Search Bar */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-10">
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-1 border border-border">
              <div className="flex items-center flex-1 px-3">
                <span className="material-symbols-outlined text-slate-400 mr-2">
                  search
                </span>
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") performSearch();
                  }}
                  className="bg-transparent border-none text-sm w-full focus:ring-0 focus:outline-none dark:text-white"
                  placeholder="Find address or coordinates..."
                  type="text"
                />
              </div>
              <button
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                type="button"
                onClick={() => performSearch()}
              >
                SEARCH
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Sidebar Management */}
          <aside className="w-96 h-full border-l border-border flex flex-col bg-white dark:bg-slate-900 z-10 overflow-hidden">
          {/* Let RightSection handle its own scrolling: */}
          <div className="flex-1 overflow-y-auto">
            <RightSection
              radius={radius}
              setRadius={setRadius}
              setCenter={setCenter}
              selectedLat={selectedLat}
              setSelectedLat={setSelectedLat}
              selectedLng={selectedLng}
              setSelectedLng={setSelectedLng}
            />
          </div>
        </aside>
      </main>

      <style jsx global>{`
        .material-symbols-outlined {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        }
        .map-overlay-yellow {
          background-color: rgba(250, 204, 21, 0.2);
          border: 2px solid #facc15;
        }
      `}</style>
    </div>
  );
}