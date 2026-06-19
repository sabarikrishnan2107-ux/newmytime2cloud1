import React, { useEffect, useRef } from "react";

function loadGoogleMaps(apiKey) {
    if (typeof window === "undefined") return Promise.reject();
    if (window.google && window.google.maps) return Promise.resolve(window.google.maps);

    return new Promise((resolve, reject) => {
        const existing = document.getElementById("gmaps-script");
        if (existing) {
            existing.addEventListener("load", () => resolve(window.google.maps));
            existing.addEventListener("error", reject);
            return;
        }

        const script = document.createElement("script");
        script.id = "gmaps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.google.maps);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export default function GeoMap({
    center = { lat: 25.2048, lng: 55.2708 },
    radius = 150,
    onMapReady = () => { },
    activeTool = null,
    setCenter: setCenterProp = null,
    setRadius: setRadiusProp = null,
}) {
    const ref = useRef(null);
    const mapRef = useRef(null);
    const circleRef = useRef(null);
    const markerRef = useRef(null);
    const extraMarkersRef = useRef([]);
    const pendingCircleCenterRef = useRef(null);

    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
        if (!apiKey) {
            console.warn("GeoMap: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set");
            return;
        }

        let mounted = true;

        loadGoogleMaps(apiKey)
            .then((maps) => {
                if (!mounted) return;

                if (!mapRef.current) {
                    mapRef.current = new maps.Map(ref.current, {
                        center,
                        zoom: 13,
                        disableDefaultUI: true,
                        clickableIcons: false, // so clicks on POIs don't open info windows
                    });

                    markerRef.current = new maps.Marker({
                        position: center,
                        map: mapRef.current,
                        clickable: false,
                        optimized: false,
                    });

                    circleRef.current = new maps.Circle({
                        strokeColor: "#facc15",
                        strokeOpacity: 0.9,
                        strokeWeight: 2,
                        fillColor: "rgba(250,204,21,0.12)",
                        fillOpacity: 0.6,
                        map: mapRef.current,
                        center,
                        radius,
                    });

                    // expose simple API to parent
                    const api = {
                        panTo: (c) => mapRef.current.panTo(new maps.LatLng(c.lat, c.lng)),
                        setCenter: (c) => {
                            mapRef.current.setCenter(new maps.LatLng(c.lat, c.lng));
                            if (markerRef.current) markerRef.current.setPosition(c);
                            if (circleRef.current) circleRef.current.setCenter(c);
                        },
                        setZoom: (z) => mapRef.current.setZoom(z),
                        zoomIn: () => mapRef.current.setZoom(mapRef.current.getZoom() + 1),
                        zoomOut: () => mapRef.current.setZoom(mapRef.current.getZoom() - 1),
                        setRadius: (r) => circleRef.current && circleRef.current.setRadius(Number(r) || 0),
                    };

                    try {
                        onMapReady(api);
                    } catch (e) {
                        console.warn("onMapReady callback failed", e);
                    }
                }
            })
            .catch((err) => console.error("Failed to load Google Maps", err));

        return () => {
            mounted = false;
        };
    }, []);

    // update center smoothly
    useEffect(() => {
        const maps = window.google?.maps;
        if (!maps || !mapRef.current) return;

        const latLng = new maps.LatLng(center.lat, center.lng);
        mapRef.current.panTo(latLng);

        if (markerRef.current) markerRef.current.setPosition(latLng);
        if (circleRef.current) circleRef.current.setCenter(latLng);
    }, [center]);

    // update radius
    useEffect(() => {
        if (circleRef.current) {
            circleRef.current.setRadius(Number(radius) || 0);
        }
    }, [radius]);

    // click handler for tools
    useEffect(() => {
        const maps = window.google?.maps;
        if (!maps || !mapRef.current) return;

        const listener = mapRef.current.addListener("click", (e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();

            // Default behaviour: any click without an active tool picks that spot as the branch location.
            if (!activeTool) {
                if (markerRef.current) markerRef.current.setPosition({ lat, lng });
                if (circleRef.current) circleRef.current.setCenter({ lat, lng });
                mapRef.current.panTo(new maps.LatLng(lat, lng));
                if (typeof setCenterProp === "function") setCenterProp({ lat, lng });
                return;
            }

            if (activeTool === "marker") {
                // place an extra marker
                const mk = new maps.Marker({ position: { lat, lng }, map: mapRef.current });
                extraMarkersRef.current.push(mk);
                if (typeof setCenterProp === "function") setCenterProp({ lat, lng });
            } else if (activeTool === "circle") {
                const pending = pendingCircleCenterRef.current;
                if (!pending) {
                    // set center
                    pendingCircleCenterRef.current = { lat, lng };
                    if (circleRef.current) circleRef.current.setCenter({ lat, lng });
                    if (typeof setCenterProp === "function") setCenterProp({ lat, lng });
                } else {
                    // set radius from pending to this click
                    const R = 6371000; // meters
                    const toRad = (deg) => (deg * Math.PI) / 180;
                    const dLat = toRad(lat - pending.lat);
                    const dLon = toRad(lng - pending.lng);
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(pending.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const dist = R * c;
                    if (circleRef.current) circleRef.current.setRadius(dist);
                    if (typeof setRadiusProp === "function") setRadiusProp(Math.round(dist));
                    pendingCircleCenterRef.current = null;
                }
            } else if (activeTool === "select") {
                // render a custom OverlayView so tooltip chrome fully matches app theme
                const isDark = (typeof document !== "undefined" && document.documentElement && document.documentElement.classList && document.documentElement.classList.contains("dark")) || (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
                const bg = isDark ? "#0f172a" : "#ffffff"; // approx: slate-900 / white
                const color = isDark ? "#cbd5e1" : "#374151"; // approx: slate-300 / slate-700
                const contentHTML = `<div style="font-size:12px;padding:6px 8px;border-radius:6px;background:${bg};color:${color};box-shadow:0 6px 18px rgba(2,6,23,0.35);border:1px solid rgba(0,0,0,0.06);transform:translate(-50%, -120%);white-space:nowrap">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>`;

                class TooltipOverlay extends maps.OverlayView {
                    constructor(position, html) {
                        super();
                        this.position = position;
                        this.html = html;
                        this.div = null;
                    }
                    onAdd() {
                        this.div = document.createElement('div');
                        this.div.style.position = 'absolute';
                        this.div.style.pointerEvents = 'none';
                        this.div.innerHTML = this.html;
                        this.getPanes().floatPane.appendChild(this.div);
                    }
                    draw() {
                        if (!this.div) return;
                        const projection = this.getProjection();
                        if (!projection) return;
                        const point = projection.fromLatLngToDivPixel(new maps.LatLng(this.position.lat, this.position.lng));
                        if (point) {
                            this.div.style.left = `${point.x}px`;
                            this.div.style.top = `${point.y}px`;
                        }
                    }
                    onRemove() {
                        if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
                        this.div = null;
                    }
                }

                const overlay = new TooltipOverlay({ lat, lng }, contentHTML);
                overlay.setMap(mapRef.current);
                setTimeout(() => {
                    try {
                        overlay.setMap(null);
                    } catch (e) {
                        /* ignore */
                    }
                }, 3000);
            }
        });

        return () => {
            if (listener && listener.remove) listener.remove();
        };
    }, [activeTool, setCenterProp, setRadiusProp]);

    return <div ref={ref} className="w-full h-full" />;
}
