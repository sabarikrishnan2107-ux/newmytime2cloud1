export const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#e8e8e8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f0f0f0" }] },
  // Hide all icons globally (removes green highway shields, POI icons, etc.)
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#bbbbbb" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#777777" }],
  },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#777777" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d4e4d4" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6a8a6a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#666666" }] },
  // Highway shields: gray background, no green
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#cccccc" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
  { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#f0f0f0" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#666666" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#777777" }] },
  { featureType: "transit.station", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c8d4e0" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#8a9baa" }] },
];