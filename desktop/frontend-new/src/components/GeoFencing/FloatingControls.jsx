import React from "react";

export default function FloatingControls({ onSelectTool = () => {}, onZoomIn = () => {}, onZoomOut = () => {}, activeTool = null }) {
  const btnBase = "p-2 rounded-lg flex items-center justify-center transition-colors";
  const inactive = "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800";
  const active = "bg-primary/20 text-primary ring-2 ring-primary/30";

  return (
    <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-1.5 flex flex-col gap-1 border border-border">
        <button
          className={`${btnBase} ${activeTool === "select" ? active : "bg-primary/10 text-primary hover:bg-primary/20"}`}
          title="Select Tool"
          type="button"
          onClick={() => onSelectTool("select")}
        >
          <span className="material-symbols-outlined">near_me</span>
        </button>

        <hr className="border-border mx-1" />

        <button
          className={`${btnBase} ${activeTool === "circle" ? active : inactive}`}
          title="Draw Circular Branch"
          type="button"
          onClick={() => onSelectTool("circle")}
        >
          <span className="material-symbols-outlined">radio_button_unchecked</span>
        </button>

        <button
          className={`${btnBase} ${activeTool === "marker" ? active : inactive}`}
          title="Place Marker"
          type="button"
          onClick={() => onSelectTool("marker")}
        >
          <span className="material-symbols-outlined">location_on</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-1.5 flex flex-col gap-1 border border-border mt-4">
        <button
          className={`${btnBase} ${inactive}`}
          type="button"
          onClick={onZoomIn}
        >
          <span className="material-symbols-outlined">add</span>
        </button>
        <button
          className={`${btnBase} ${inactive}`}
          type="button"
          onClick={onZoomOut}
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
      </div>
    </div>
  );
}
