"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, Circle } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100%" };

const GeoFenceMap = ({ latitude, longitude, radius, onMapClick, markerDraggable = true }) => {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });

    const mapRef = useRef(null);

    const center = { lat: latitude || 25.276987, lng: longitude || 55.296249 };

    const onLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
    }, []);

    const handleClick = useCallback((e) => {
        if (onMapClick) {
            onMapClick(e.latLng.lat(), e.latLng.lng());
        }
    }, [onMapClick]);

    // Pan to new center when lat/lng changes
    useEffect(() => {
        if (mapRef.current && latitude && longitude) {
            mapRef.current.panTo({ lat: latitude, lng: longitude });
        }
    }, [latitude, longitude]);

    if (!isLoaded) {
        return (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                <span className="text-xs text-gray-400">Loading map...</span>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={15}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={handleClick}
            options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                styles: [
                    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
                    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#0e1626" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
                    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
                ],
            }}
        >
            <Marker position={center}
                draggable={markerDraggable}
                onDragEnd={(e) => {
                    if (markerDraggable && onMapClick) onMapClick(e.latLng.lat(), e.latLng.lng());
                }} />
            <Circle
                center={center}
                radius={radius || 200}
                options={{
                    strokeColor: "#6366f1",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: "#6366f1",
                    fillOpacity: 0.15,
                }}
            />
        </GoogleMap>
    );
};

export default GeoFenceMap;
