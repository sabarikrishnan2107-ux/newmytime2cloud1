"use client";

import { useState, useCallback } from "react";
import LiveTile from "./LiveTile";

const GRID_CONFIGS = {
  1: { cols: 1, rows: 1 },
  4: { cols: 2, rows: 2 },
  6: { cols: 3, rows: 2 },
  9: { cols: 3, rows: 3 },
  16: { cols: 4, rows: 4 },
  25: { cols: 5, rows: 5 },
};

export default function LiveGrid({ layout, tiles, onTileUpdate }) {
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const config = GRID_CONFIGS[layout] || GRID_CONFIGS[4];
  const totalTiles = config.cols * config.rows;

  const handleDrop = useCallback((index, e) => {
    e.preventDefault();
    setDragOverIndex(null);
    try {
      const camera = JSON.parse(e.dataTransfer.getData("camera"));
      onTileUpdate?.(index, camera);
    } catch (err) {}
  }, [onTileUpdate]);

  const handleDragOver = useCallback((index, e) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleRemove = useCallback((index) => {
    onTileUpdate?.(index, null);
  }, [onTileUpdate]);

  // Fullscreen mode
  if (fullscreenCamera) {
    return (
      <div className="w-full h-full">
        <LiveTile
          camera={fullscreenCamera}
          isFullscreen={true}
          onFullscreen={() => setFullscreenCamera(null)}
          onRemove={() => setFullscreenCamera(null)}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full h-full grid gap-1 p-1"
      style={{
        gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
        gridTemplateRows: `repeat(${config.rows}, 1fr)`,
      }}
    >
      {Array.from({ length: totalTiles }).map((_, index) => {
        const camera = tiles[index] || null;
        const isDragOver = dragOverIndex === index;

        return (
          <div
            key={index}
            className={`relative rounded overflow-hidden transition-all ${isDragOver ? "ring-2 ring-primary ring-offset-1 ring-offset-gray-950" : ""}`}
            onDrop={(e) => handleDrop(index, e)}
            onDragOver={(e) => handleDragOver(index, e)}
            onDragLeave={() => setDragOverIndex(null)}
          >
            <LiveTile
              camera={camera}
              onFullscreen={(cam) => setFullscreenCamera(cam)}
              onRemove={() => handleRemove(index)}
            />
          </div>
        );
      })}
    </div>
  );
}
