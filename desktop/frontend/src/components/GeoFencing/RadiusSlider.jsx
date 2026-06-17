import React from "react";

export function RadiusSlider({
  min = 50,
  max = 1000,
  value,
  step = 10,
  onChange = () => {},
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">
        Radius (Meters)
      </label>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-primary cursor-pointer"
          aria-label="Radius in meters"
        />
        <span className="text-sm font-black w-14 text-right">{value}m</span>
      </div>
      {/* optional: hidden input for form submission */}
      <input type="hidden" name="radius" value={value} />
    </div>
  );
}
