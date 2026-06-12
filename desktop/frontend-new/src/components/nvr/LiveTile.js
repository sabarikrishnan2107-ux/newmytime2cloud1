"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getCameraProxyWsUrl, getCameraServiceWsUrl } from "@/lib/camera-endpoints";
import { Maximize, X, Camera } from "lucide-react";

export default function LiveTile({ camera, onRemove, onFullscreen, isFullscreen }) {
  const canvasRef = useRef(null);
  const latestBitmapRef = useRef(null);
  const detectionsRef = useRef({ dets: [], srcW: 1280, srcH: 720 });
  const rafRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("Connecting...");
  const [faceCount, setFaceCount] = useState(0);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && latestBitmapRef.current) {
      const ctx = canvas.getContext("2d");
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(latestBitmapRef.current, 0, 0, w, h);

      // Draw face detection boxes
      const { dets, srcW, srcH } = detectionsRef.current;
      if (dets && dets.length > 0) {
        // Use actual bitmap dimensions for accurate scaling
        const imgW = latestBitmapRef.current.width || srcW;
        const imgH = latestBitmapRef.current.height || srcH;
        const scaleX = w / imgW;
        const scaleY = h / imgH;
        dets.forEach(det => {
          const [x1, y1, x2, y2] = det.bbox || [];
          if (x1 === undefined) return;
          const bx = x1 * scaleX;
          const by = y1 * scaleY;
          const bw = (x2 - x1) * scaleX;
          const bh = (y2 - y1) * scaleY;

          // Box
          ctx.strokeStyle = det.name === "Unknown" ? "#ef4444" : "#22c55e";
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, bw, bh);

          // Label background
          const label = det.name || "Unknown";
          ctx.font = `bold ${Math.max(10, Math.min(14, w / 40))}px Arial`;
          const textW = ctx.measureText(label).width;
          ctx.fillStyle = det.name === "Unknown" ? "rgba(239,68,68,0.8)" : "rgba(34,197,94,0.8)";
          ctx.fillRect(bx, by - 18, textW + 8, 18);

          // Label text
          ctx.fillStyle = "#fff";
          ctx.fillText(label, bx + 4, by - 4);
        });
      }
    }
    rafRef.current = requestAnimationFrame(renderFrame);
  }, []);

  // Video stream WebSocket
  useEffect(() => {
    if (!camera) return;

    let ws = null;
    let cancelled = false;
    let reconnectTimer = null;
    let reconnectAttempts = 0;

    const connect = () => {
      if (cancelled) return;
      setMessage("Connecting...");

      ws = new WebSocket(`${getCameraProxyWsUrl()}/stream/${camera.id}`);
      ws.binaryType = "blob";

      ws.onopen = () => {
        reconnectAttempts = 0;
        setMessage("Waiting for frames...");
        if (!rafRef.current) rafRef.current = requestAnimationFrame(renderFrame);
      };

      ws.onmessage = async (event) => {
        try {
          if (event.data instanceof Blob) {
            const bitmap = await createImageBitmap(event.data);
            if (latestBitmapRef.current) latestBitmapRef.current.close();
            latestBitmapRef.current = bitmap;
            setConnected(true);
            setMessage(null);
          } else {
            const data = JSON.parse(event.data);
            if (data.error) { setMessage(data.error); setConnected(false); }
            else if (data.status === "reconnecting") { setMessage("Reconnecting..."); setConnected(false); }
          }
        } catch (e) {}
      };

      ws.onerror = () => { setConnected(false); setMessage("Connection failed"); };

      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectAttempts++;
          setMessage(`Reconnecting in ${Math.round(delay / 1000)}s...`);
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (latestBitmapRef.current) { latestBitmapRef.current.close(); latestBitmapRef.current = null; }
    };
  }, [camera, renderFrame]);

  // Face detection WebSocket
  useEffect(() => {
    if (!camera) return;

    let ws = null;
    let cancelled = false;
    let reconnectTimer = null;
    let detReconnectAttempts = 0;

    const connect = () => {
      if (cancelled) return;

      ws = new WebSocket(`${getCameraServiceWsUrl()}/detect/${camera.id}`);

      ws.onopen = () => { detReconnectAttempts = 0; };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.detections) {
            detectionsRef.current = {
              dets: data.detections,
              srcW: data.frameWidth || 1280,
              srcH: data.frameHeight || 720,
            };
            setFaceCount(data.count || data.detections.length);
          }
        } catch (e) {}
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        if (!cancelled) {
          const delay = Math.min(2000 * Math.pow(2, detReconnectAttempts), 30000);
          detReconnectAttempts++;
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    };

    setTimeout(connect, 1500);

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
      detectionsRef.current = { dets: [], srcW: 1280, srcH: 720 };
    };
  }, [camera]);

  if (!camera) {
    return (
      <div className="w-full h-full bg-gray-200 dark:bg-gray-950 flex items-center justify-center border border-gray-300 dark:border-gray-800 rounded">
        <div className="text-center text-gray-400 dark:text-gray-600">
          <Camera className="w-6 h-6 mx-auto mb-1 opacity-30" />
          <p className="text-[10px]">Drag camera here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black rounded overflow-hidden group ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Overlay when not connected */}
      {!connected && (
        <div className="absolute inset-0 bg-gray-950/80 flex items-center justify-center">
          <div className="text-center">
            <Camera className="w-5 h-5 text-gray-500 mx-auto mb-1 animate-pulse" />
            <p className="text-[10px] text-gray-400">{message || "No signal"}</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
          <span className="text-[10px] text-white font-medium truncate">{camera.name || `Camera ${camera.id}`}</span>
          {faceCount > 0 && (
            <span className="text-[9px] bg-emerald-500/80 text-white px-1.5 py-0.5 rounded-full font-bold">{faceCount} face{faceCount > 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => onFullscreen?.(camera)} className="p-1 hover:bg-white/20 rounded transition" title="Fullscreen">
            <Maximize className="w-3 h-3 text-white" />
          </button>
          <button onClick={() => onRemove?.(camera)} className="p-1 hover:bg-red-500/50 rounded transition" title="Remove">
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] text-gray-300">{camera.branch_name || ""}</span>
        <span className={`text-[9px] ${connected ? "text-emerald-400" : "text-red-400"}`}>{connected ? "● LIVE" : "● OFFLINE"}</span>
      </div>

      {/* Fullscreen exit */}
      {isFullscreen && (
        <button onClick={() => onFullscreen?.(null)} className="absolute top-4 right-4 z-50 p-2 bg-black/60 rounded-lg hover:bg-black/80 transition">
          <X className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
}
