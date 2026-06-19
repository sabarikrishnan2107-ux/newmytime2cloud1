"use client";

import { useCallback, useRef, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

const MapPicker = ({ lat, lon, onChange }) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const mapRef = useRef(null);
  const defaultLat = parseFloat(lat) || 25.2048;
  const defaultLng = parseFloat(lon) || 55.2708;
  const center = { lat: defaultLat, lng: defaultLng };

  const onLoad = useCallback((map) => { mapRef.current = map; }, []);

  const handleClick = useCallback((e) => {
    onChange(e.latLng.lat().toFixed(6), e.latLng.lng().toFixed(6));
  }, [onChange]);

  const handleDragEnd = useCallback((e) => {
    onChange(e.latLng.lat().toFixed(6), e.latLng.lng().toFixed(6));
  }, [onChange]);

  useEffect(() => {
    if (mapRef.current && lat && lon) {
      mapRef.current.panTo({ lat: parseFloat(lat), lng: parseFloat(lon) });
    }
  }, [lat, lon]);

  if (!isLoaded) {
    return (
      <div className="w-full h-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
        <span className="text-xs text-gray-400">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="w-full h-48 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={13}
          onLoad={onLoad}
          onClick={handleClick}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          <Marker position={center} draggable={true} onDragEnd={handleDragEnd} />
        </GoogleMap>
      </div>
      <p className="text-[10px] text-slate-400">Click on the map or drag the marker to set location</p>
    </div>
  );
};

export default MapPicker;
