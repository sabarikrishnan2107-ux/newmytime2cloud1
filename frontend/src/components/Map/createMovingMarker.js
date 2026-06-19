// Custom HTML overlay for a "moving marker" on Google Maps.
// Unlike maps.Marker (which freezes SVG animations), this injects live DOM
// so SMIL animations, CSS @keyframes, etc. all run.

function carMarkup(heading) {
  return `
    <div style="width:40px;height:40px;transform:rotate(${heading}deg);transition:transform 0.2s linear;">
      <svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="6" width="16" height="28" rx="4" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <rect x="14" y="10" width="12" height="7" rx="1.5" fill="rgba(255,255,255,0.35)"/>
        <rect x="14" y="23" width="12" height="7" rx="1.5" fill="rgba(255,255,255,0.35)"/>
        <circle cx="14.5" cy="9" r="1.2" fill="#ffffff"/>
        <circle cx="25.5" cy="9" r="1.2" fill="#ffffff"/>
      </svg>
    </div>
  `;
}

function walkMarkup(heading) {
  // Side-view walking pedestrian with animated legs/arms/body bob.
  // The badge + direction arrow rotate; the figure stays upright.
  return `
    <div class="walk-badge">
      <div class="walk-arrow" style="transform:rotate(${heading}deg);">
        <svg viewBox="0 0 48 48" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="15" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
          <path d="M 24 5 L 28 10 L 20 10 Z" fill="#ffffff"/>
        </svg>
      </div>
      <svg class="walker-figure" viewBox="0 0 48 48" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
        <g fill="#ffffff" transform="translate(24 24)">
          <!-- Head -->
          <circle cx="0" cy="-11" r="3"/>
          <!-- Torso -->
          <rect class="torso" x="-3" y="-7" width="6" height="10" rx="1.5"/>
          <!-- Legs -->
          <g transform="translate(0 3)">
            <rect class="leg leg-l" x="-2.8" y="0" width="2.2" height="9" rx="1" />
            <rect class="leg leg-r" x="0.6"  y="0" width="2.2" height="9" rx="1" />
          </g>
          <!-- Arms -->
          <g transform="translate(0 -6)">
            <rect class="arm arm-l" x="-4.2" y="0" width="1.6" height="9" rx="0.8" />
            <rect class="arm arm-r" x="2.6"  y="0" width="1.6" height="9" rx="0.8" />
          </g>
        </g>
      </svg>
    </div>
  `;
}

// Inject the keyframe animations once per page
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  if (typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = `
    .walk-badge { position: relative; width: 48px; height: 48px; }
    .walk-arrow { position: absolute; inset: 0; }
    .walker-figure { position: absolute; inset: 0; animation: walk-bob 0.55s ease-in-out infinite; }
    .walker-figure .torso { transform-origin: center top; }
    .walker-figure .leg-l { transform-origin: top center; animation: leg-swing-l 0.55s ease-in-out infinite; }
    .walker-figure .leg-r { transform-origin: top center; animation: leg-swing-r 0.55s ease-in-out infinite; }
    .walker-figure .arm-l { transform-origin: top center; animation: arm-swing-l 0.55s ease-in-out infinite; }
    .walker-figure .arm-r { transform-origin: top center; animation: arm-swing-r 0.55s ease-in-out infinite; }
    @keyframes walk-bob  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
    @keyframes leg-swing-l { 0%,100% { transform: rotate(-25deg); } 50% { transform: rotate(25deg); } }
    @keyframes leg-swing-r { 0%,100% { transform: rotate(25deg); }  50% { transform: rotate(-25deg); } }
    @keyframes arm-swing-l { 0%,100% { transform: rotate(25deg); }  50% { transform: rotate(-25deg); } }
    @keyframes arm-swing-r { 0%,100% { transform: rotate(-25deg); } 50% { transform: rotate(25deg); } }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

export function createMovingMarker({ maps, map, position, mode, heading }) {
  injectStyles();

  class MovingOverlay extends maps.OverlayView {
    constructor() {
      super();
      this.position = position;
      this.mode = mode;
      this.heading = heading || 0;
      this.div = null;
    }
    onAdd() {
      this.div = document.createElement("div");
      this.div.style.position = "absolute";
      this.div.style.transform = "translate(-50%,-50%)";
      this.div.style.zIndex = "3";
      this.div.innerHTML = this.mode === "walk" ? walkMarkup(this.heading) : carMarkup(this.heading);
      this.getPanes().overlayMouseTarget.appendChild(this.div);
    }
    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(
        new maps.LatLng(this.position.lat, this.position.lng),
      );
      if (point) {
        this.div.style.left = `${point.x}px`;
        this.div.style.top = `${point.y}px`;
      }
    }
    onRemove() {
      if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
      this.div = null;
    }
    setPosition(p) {
      this.position = p;
      try { this.draw(); } catch (e) {}
    }
    setHeading(h) {
      this.heading = h;
      if (!this.div) return;
      this.div.innerHTML = this.mode === "walk" ? walkMarkup(h) : carMarkup(h);
    }
    setMode(m, h) {
      this.mode = m;
      this.heading = h ?? this.heading;
      if (!this.div) return;
      this.div.innerHTML = m === "walk" ? walkMarkup(this.heading) : carMarkup(this.heading);
    }
  }

  const overlay = new MovingOverlay();
  overlay.setMap(map);
  return overlay;
}
