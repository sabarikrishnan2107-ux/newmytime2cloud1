"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCameraStatus } from "@/lib/endpoint/live-camera";
import { getCameraProxyWsUrl, getCameraServiceWsUrl } from "@/lib/camera-endpoints";
import { parseApiError } from "@/lib/utils";

export default function Stream({ deviceId }) {
  const router = useRouter();
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const latestBitmapRef = useRef(null);
  const receivedFrameRef = useRef(false);
  const detectionsRef = useRef({ dets: [], srcW: 1, srcH: 1 });
  const rafRef = useRef(null);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  const [cameraInfo, setCameraInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [firstFrameRendered, setFirstFrameRendered] = useState(false);
  const [streamMessage, setStreamMessage] = useState("Waiting for camera connection...");
  const [playbackState, setPlaybackState] = useState("playing");
  const [playbackSession, setPlaybackSession] = useState(0);
  const [detections, setDetections] = useState([]);
  const [faceCount, setFaceCount] = useState(0);
  const [attendanceEvents, setAttendanceEvents] = useState([]);
  const [error, setError] = useState(null);

  const statusVariant = isConnected
    ? "live"
    : playbackState === "playing" && !error
      ? "connecting"
      : "disconnected";

  const formatTime = useCallback((value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, []);

  const handlePausePlayback = useCallback(() => {
    setPlaybackState("paused");
    setIsConnected(false);
    receivedFrameRef.current = false;
    setStreamMessage("Live camera paused.");
    setError(null);
  }, []);

  const handleStopPlayback = useCallback(() => {
    setPlaybackState("stopped");
    setIsConnected(false);
    receivedFrameRef.current = false;
    setStreamMessage("Live camera stopped.");
    setDetections([]);
    setFaceCount(0);
    setError(null);
  }, []);

  const handleStartPlayback = useCallback(() => {
    if (latestBitmapRef.current) {
      latestBitmapRef.current.close();
      latestBitmapRef.current = null;
    }
    receivedFrameRef.current = false;
    canvasSizeRef.current = { w: 0, h: 0 };
    detectionsRef.current = { dets: [], srcW: 1, srcH: 1 };
    setIsConnected(false);
    setFirstFrameRendered(false);
    setStreamMessage("Connecting to camera...");
    setDetections([]);
    setFaceCount(0);
    setError(null);
    setPlaybackSession((value) => value + 1);
    setPlaybackState("playing");
  }, []);

  useEffect(() => {
    if (playbackState !== "stopped") return;

    detectionsRef.current = { dets: [], srcW: 1, srcH: 1 };

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const overlay = overlayRef.current;
    if (overlay) {
      const octx = overlay.getContext("2d");
      octx.clearRect(0, 0, overlay.width, overlay.height);
    }
  }, [playbackState]);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const result = await getCameraStatus(deviceId);
        if (result?.status) {
          setCameraInfo(result.data);
        }
      } catch (err) {
        setError(parseApiError(err));
      }
    };
    fetchInfo();
  }, [deviceId]);

  // Render loop: paints latest video frame + detection overlays at screen refresh rate
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const bitmap = latestBitmapRef.current;

    if (canvas && bitmap) {
      const ctx = canvas.getContext("2d");

      if (canvasSizeRef.current.w !== bitmap.width || canvasSizeRef.current.h !== bitmap.height) {
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvasSizeRef.current = { w: bitmap.width, h: bitmap.height };

        // Match overlay canvas size
        if (overlayRef.current) {
          overlayRef.current.width = bitmap.width;
          overlayRef.current.height = bitmap.height;
        }
      }

      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      latestBitmapRef.current = null;
      if (!firstFrameRendered) setFirstFrameRendered(true);
    }

    // Draw detection overlays on separate canvas
    const overlay = overlayRef.current;
    if (overlay && overlay.width > 0) {
      const octx = overlay.getContext("2d");
      octx.clearRect(0, 0, overlay.width, overlay.height);

      const { dets, srcW, srcH } = detectionsRef.current;
      if (dets.length > 0) {
        // Scale from detection source frame to overlay canvas
        const scaleX = overlay.width / srcW;
        const scaleY = overlay.height / srcH;

        dets.forEach((det) => {
          const [bx, by, bw, bh] = det.bbox;
          const dx = bx * scaleX;
          const dy = by * scaleY;
          const dw = bw * scaleX;
          const dh = bh * scaleY;

          const isRecognized = det.recognized !== false && det.name !== "Unknown";

          // Green for recognized, red for unknown
          const color = isRecognized ? "#22c55e" : "#ef4444";

          octx.strokeStyle = color;
          octx.lineWidth = 3;
          octx.strokeRect(dx, dy, dw, dh);

          // Label background
          const label = isRecognized
            ? `${det.name} (${Math.round(det.confidence * 100)}%)`
            : "Unknown";
          octx.font = "bold 16px sans-serif";
          const textWidth = octx.measureText(label).width;
          octx.fillStyle = isRecognized ? "rgba(34, 197, 94, 0.85)" : "rgba(239, 68, 68, 0.85)";
          octx.fillRect(dx, dy - 28, textWidth + 16, 28);

          // Label text
          octx.fillStyle = "#ffffff";
          octx.fillText(label, dx + 8, dy - 8);
        });
      }
    }

    rafRef.current = requestAnimationFrame(renderFrame);
  }, []);

  // Video stream from camera-proxy (binary JPEG, smooth)
  useEffect(() => {
    if (!cameraInfo || playbackState !== "playing") return;

    let ws = null;
    let reconnectTimer = null;
    let cancelled = false;
    let reconnectAttempts = 0;
    let idleTimer = null;

    const connect = () => {
      if (cancelled) return;

      ws = new WebSocket(`${getCameraProxyWsUrl()}/stream/${deviceId}`);
      ws.binaryType = "blob";

      ws.onopen = () => {
        reconnectAttempts = 0;
        setIsConnected(false);
        setStreamMessage("Connected to camera gateway. Waiting for first video frame...");
        setError(null);
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(renderFrame);
        }
      };

      ws.onmessage = async (event) => {
        // Reset idle timer on every message
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (!cancelled && ws && ws.readyState === WebSocket.OPEN) {
            setStreamMessage("Camera stream idle. Reconnecting...");
            ws.close();
          }
        }, 30000); // 30s idle = reconnect

        try {
          if (event.data instanceof Blob) {
            const bitmap = await createImageBitmap(event.data);
            if (latestBitmapRef.current) {
              latestBitmapRef.current.close();
            }
            latestBitmapRef.current = bitmap;
            receivedFrameRef.current = true;
            setIsConnected(true);
            setStreamMessage(null);
            setError(null);
          } else {
            const data = JSON.parse(event.data);

            if (data.error) {
              setError(data.error);
              setIsConnected(false);
              setStreamMessage("Camera connection failed.");
              return;
            }

            if (data.status === "reconnecting") {
              setError(data.message || "Camera reconnecting...");
              setIsConnected(false);
              setStreamMessage(data.message || "Camera reconnecting...");
              return;
            }

            if (data.status === "streaming") {
              setError(null);
              if (!receivedFrameRef.current) {
                setStreamMessage("Camera connected. Waiting for video frames...");
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        }
      };

      ws.onerror = () => {
        setError("Connection to camera failed");
        setIsConnected(false);
        receivedFrameRef.current = false;
        setStreamMessage("Camera connection failed.");
      };

      ws.onclose = () => {
        setIsConnected(false);
        receivedFrameRef.current = false;
        if (idleTimer) clearTimeout(idleTimer);
        if (!cancelled) {
          // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectAttempts++;
          setStreamMessage(`Camera disconnected. Retrying in ${Math.round(delay/1000)}s...`);
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (idleTimer) clearTimeout(idleTimer);
      if (ws) ws.close();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (latestBitmapRef.current) {
        latestBitmapRef.current.close();
        latestBitmapRef.current = null;
      }
    };
  }, [cameraInfo, deviceId, playbackState, renderFrame]);

  // Face detection from Python service (separate channel, doesn't affect video)
  useEffect(() => {
    if (!cameraInfo || playbackState !== "playing") return;

    let ws = null;
    let cancelled = false;
    let reconnectTimer = null;
    let detReconnectAttempts = 0;

    const connect = () => {
      if (cancelled) return;

      ws = new WebSocket(`${getCameraServiceWsUrl()}/detect/${deviceId}`);

      ws.onopen = () => { detReconnectAttempts = 0; };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            console.warn("Detection error:", data.error);
            return;
          }
          if (data.detections) {
            detectionsRef.current = {
              dets: data.detections,
              srcW: data.frameWidth || 1280,
              srcH: data.frameHeight || 720,
            };
            setDetections(data.detections);
            setFaceCount(data.count || data.detections.length);
            const newEvents = data.detections
              .filter((det) => det?.attendance_log?.status && det.attendance_log.status !== "not_logged")
              .map((det) => ({
                key: `${det.employee_id || det.name}-${det?.attendance_log?.log_timestamp || "na"}-${det?.attendance_log?.status || "na"}`,
                employeeId: det.employee_id,
                name: det.name,
                status: det.attendance_log.status,
                reason: det.attendance_log.reason,
                timestamp: det.attendance_log.log_timestamp,
                cameraName: det.attendance_log.camera_name,
                attendanceRecord: det.attendance_log.attendance_record || null,
              }));

            if (newEvents.length > 0) {
              setAttendanceEvents((prev) => {
                const merged = [...newEvents, ...prev];
                const seen = new Set();
                return merged.filter((eventItem) => {
                  if (seen.has(eventItem.key)) return false;
                  seen.add(eventItem.key);
                  return true;
                }).slice(0, 10);
              });
            }
          }
        } catch (err) {
          console.error("Detection parse error:", err);
        }
      };

      ws.onerror = () => console.warn("Detection WebSocket failed — video continues");

      ws.onclose = () => {
        if (!cancelled) {
          const delay = Math.min(2000 * Math.pow(2, detReconnectAttempts), 30000);
          detReconnectAttempts++;
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    };

    // Delay initial connection to avoid React strict mode double-mount race
    const startTimer = setTimeout(connect, 1500);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [cameraInfo, deviceId, playbackState]);

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/live-camera")}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300">
            {cameraInfo?.name || "Live Camera"}
          </h1>
          <p className="text-sm text-slate-400">
            {cameraInfo?.camera_rtsp_ip || "Loading..."}
          </p>
        </div>
        <span
          className={`ml-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            statusVariant === "live"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : statusVariant === "connecting"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              statusVariant === "live"
                ? "bg-green-500 animate-pulse"
                : statusVariant === "connecting"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-red-500"
            }`}
          ></span>
          {statusVariant === "live" ? "Live" : statusVariant === "connecting" ? "Connecting" : "Disconnected"}
        </span>
        {faceCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <span className="material-symbols-outlined text-[14px]">face</span>
            {faceCount} {faceCount === 1 ? "face" : "faces"} detected
          </span>
        )}
        <div className="inline-flex items-center gap-2">
          {playbackState === "playing" ? (
            <>
              <button
                type="button"
                onClick={handlePausePlayback}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
              >
                <span className="material-symbols-outlined text-[14px]">pause</span>
                Pause
              </button>
              <button
                type="button"
                onClick={handleStopPlayback}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
              >
                <span className="material-symbols-outlined text-[14px]">stop</span>
                Stop
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStartPlayback}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
              >
                <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                {playbackState === "paused" ? "Resume" : "Play"}
              </button>
              {playbackState !== "stopped" && (
                <button
                  type="button"
                  onClick={handleStopPlayback}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                >
                  <span className="material-symbols-outlined text-[14px]">stop</span>
                  Stop
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {playbackState === "paused" && (
        <div className="mb-4 p-4 bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 rounded-lg text-sm">
          Live camera paused. Press Play to resume the video and face detection streams.
        </div>
      )}

      {playbackState === "stopped" && (
        <div className="mb-4 p-4 bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 rounded-lg text-sm">
          Live camera stopped. Press Play to reconnect the video and face detection streams.
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Video Stream with Detection Overlay */}
        <div className="lg:col-span-3">
          <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
            {/* Hidden canvas — always mounted so renderFrame can paint to it */}
            <div key={`player-${playbackSession}`} className="absolute inset-0" style={{ visibility: firstFrameRendered ? 'visible' : 'hidden' }}>
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
              <canvas
                ref={overlayRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            </div>
            {!firstFrameRendered && (
              <div className="text-slate-400 text-center">
                <span className="material-symbols-outlined text-6xl mb-2 block">videocam_off</span>
                <p>{streamMessage || "Waiting for camera connection..."}</p>
              </div>
            )}
          </div>
        </div>

        {/* Detection Log */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 p-4">
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">
              Detected Faces
            </h3>
            {detections.length === 0 ? (
              <p className="text-xs text-slate-400">No faces detected yet</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {detections.map((det, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      det.recognized !== false && det.name !== "Unknown"
                        ? "bg-green-50 dark:bg-green-900/10"
                        : "bg-red-50 dark:bg-red-900/10"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${
                      det.recognized !== false && det.name !== "Unknown"
                        ? "text-green-600"
                        : "text-red-500"
                    }`}>
                      {det.recognized !== false && det.name !== "Unknown" ? "person" : "person_off"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {det.name}
                      </p>
                      {det.confidence > 0 && (
                        <p className="text-xs text-slate-400">
                          {(det.confidence * 100).toFixed(1)}% match
                        </p>
                      )}
                      {det.attendance_log?.status && det.attendance_log.status !== "not_logged" && (
                        <p className={`text-xs mt-1 ${
                          det.attendance_log.status === "created"
                            ? "text-green-600"
                            : det.attendance_log.status === "duplicate_ignored"
                              ? "text-amber-600"
                              : det.attendance_log.status === "error"
                                ? "text-red-500"
                                : "text-slate-500"
                        }`}>
                          {det.attendance_log.status === "created" && `Attendance log created${det.attendance_log.log_timestamp ? ` at ${formatTime(det.attendance_log.log_timestamp)}` : ""}`}
                          {det.attendance_log.status === "duplicate_ignored" && `Duplicate ignored${det.attendance_log.log_timestamp ? `, last log ${formatTime(det.attendance_log.log_timestamp)}` : ""}`}
                          {det.attendance_log.status === "disabled" && "Auto log disabled"}
                          {det.attendance_log.status === "error" && `Log error: ${det.attendance_log.reason}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 p-4">
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">
              Attendance Log Status
            </h3>
            {attendanceEvents.length === 0 ? (
              <p className="text-xs text-slate-400">No attendance log events yet</p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {attendanceEvents.map((eventItem) => (
                  <div
                    key={eventItem.key}
                    className={`p-2 rounded-lg border ${
                      eventItem.status === "created"
                        ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30"
                        : eventItem.status === "duplicate_ignored"
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30"
                          : "bg-slate-50 border-slate-200 dark:bg-slate-900/10 dark:border-slate-800"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {eventItem.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {eventItem.status === "created" && "Attendance log created"}
                      {eventItem.status === "duplicate_ignored" && "Duplicate log ignored"}
                      {eventItem.status === "disabled" && "Auto log disabled"}
                      {eventItem.status === "error" && `Error: ${eventItem.reason}`}
                    </p>
                    {eventItem.timestamp && (
                      <p className="text-xs text-slate-400 mt-1">
                        {formatTime(eventItem.timestamp)}
                        {eventItem.cameraName ? ` | ${eventItem.cameraName}` : ""}
                      </p>
                    )}
                    {eventItem.attendanceRecord?.date && (
                      <p className="text-xs text-slate-400 mt-1">
                        IN: {eventItem.attendanceRecord.in_time ? formatTime(eventItem.attendanceRecord.in_time) : "---"}
                        {" | "}
                        OUT: {eventItem.attendanceRecord.out_time ? formatTime(eventItem.attendanceRecord.out_time) : "---"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
