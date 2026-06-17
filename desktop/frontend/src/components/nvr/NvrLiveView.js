"use client";

import { useState, useCallback } from "react";
import { MonitorPlay, Maximize, RefreshCw, Grid2X2 } from "lucide-react";
import CameraTree from "./CameraTree";
import LiveGrid from "./LiveGrid";

const LAYOUT_OPTIONS = [
  { value: 1, label: "1" },
  { value: 4, label: "2×2" },
  { value: 6, label: "3×2" },
  { value: 9, label: "3×3" },
  { value: 16, label: "4×4" },
  { value: 25, label: "5×5" },
];

export default function NvrLiveView() {
  const [layout, setLayout] = useState(4);
  const [tiles, setTiles] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleTileUpdate = useCallback((index, camera) => {
    setTiles(prev => {
      const next = { ...prev };
      if (camera) {
        next[index] = camera;
      } else {
        delete next[index];
      }
      return next;
    });
  }, []);

  const handleCameraSelect = useCallback((camera) => {
    // Find first empty tile
    const maxTiles = layout;
    for (let i = 0; i < maxTiles; i++) {
      if (!tiles[i]) {
        handleTileUpdate(i, camera);
        return;
      }
    }
    // If all tiles full, replace first one
    handleTileUpdate(0, camera);
  }, [layout, tiles, handleTileUpdate]);

  const handleFullscreen = () => {
    const el = document.getElementById("nvr-grid-container");
    if (el) {
      if (document.fullscreenElement) document.exitFullscreen();
      else el.requestFullscreen();
    }
  };

  const clearAll = () => setTiles({});

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-gray-100 dark:bg-gray-950">
      {/* Left: Camera Tree Sidebar */}
      {sidebarOpen && (
        <div className="w-56 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900/80">
          <CameraTree
            onCameraSelect={handleCameraSelect}
            onDragStart={() => {}}
          />
        </div>
      )}

      {/* Center: Grid Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-9 flex items-center px-3 gap-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition" title="Toggle Sidebar">
            <Grid2X2 className="w-3.5 h-3.5 text-gray-400" />
          </button>

          <div className="h-4 w-px bg-gray-700" />

          <MonitorPlay className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] text-gray-500 font-medium">Layout:</span>

          <div className="flex items-center gap-0.5 bg-gray-200 dark:bg-gray-800/50 rounded p-0.5">
            {LAYOUT_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setLayout(opt.value)}
                className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${layout === opt.value
                  ? "bg-primary text-white shadow"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}>
                {opt.label}
              </button>
            ))}
          </div>

          <span className="flex-1" />

          <span className="text-[9px] text-gray-600">
            {Object.keys(tiles).length} / {layout} active
          </span>

          <button onClick={clearAll} className="p-1 hover:bg-gray-800 rounded transition" title="Clear All">
            <RefreshCw className="w-3 h-3 text-gray-500 hover:text-gray-300" />
          </button>

          <button onClick={handleFullscreen} className="p-1 hover:bg-gray-800 rounded transition" title="Fullscreen">
            <Maximize className="w-3 h-3 text-gray-500 hover:text-gray-300" />
          </button>
        </div>

        {/* Grid */}
        <div id="nvr-grid-container" className="flex-1 bg-gray-200 dark:bg-gray-950 overflow-hidden">
          <LiveGrid
            layout={layout}
            tiles={tiles}
            onTileUpdate={handleTileUpdate}
          />
        </div>
      </div>
    </div>
  );
}
