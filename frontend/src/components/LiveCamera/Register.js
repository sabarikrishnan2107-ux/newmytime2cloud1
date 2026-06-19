"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCameraStatus, registerFace, syncEmbeddings } from "@/lib/endpoint/live-camera";
import { getCameraProxyWsUrl } from "@/lib/camera-endpoints";
import { parseApiError } from "@/lib/utils";
import { api } from "@/lib/api-client";

export default function Register({ deviceId }) {
  const router = useRouter();
  const canvasRef = useRef(null);
  const latestBitmapRef = useRef(null);
  const rafRef = useRef(null);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  const [cameraInfo, setCameraInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch camera info
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const result = await getCameraStatus(deviceId);
        if (result?.status) setCameraInfo(result.data);
      } catch (err) {
        setError(parseApiError(err));
      }
    };
    fetchInfo();
  }, [deviceId]);

  // Fetch employees for dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await api.get("/employees", { params: { per_page: 500 } });
        if (data?.data) setEmployees(data.data);
      } catch (err) {
        console.error("Failed to load employees:", err);
      }
    };
    fetchEmployees();
  }, []);

  // Render loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const bitmap = latestBitmapRef.current;

    if (canvas && bitmap) {
      const ctx = canvas.getContext("2d");
      if (canvasSizeRef.current.w !== bitmap.width || canvasSizeRef.current.h !== bitmap.height) {
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvasSizeRef.current = { w: bitmap.width, h: bitmap.height };
      }
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      latestBitmapRef.current = null;
    }

    rafRef.current = requestAnimationFrame(renderFrame);
  }, []);

  // Video stream from proxy
  useEffect(() => {
    if (!cameraInfo) return;

    const ws = new WebSocket(`${getCameraProxyWsUrl()}/stream/${deviceId}`);
    ws.binaryType = "blob";

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      rafRef.current = requestAnimationFrame(renderFrame);
    };

    ws.onmessage = async (event) => {
      try {
        if (event.data instanceof Blob) {
          const bitmap = await createImageBitmap(event.data);
          if (latestBitmapRef.current) latestBitmapRef.current.close();
          latestBitmapRef.current = bitmap;
        } else {
          const data = JSON.parse(event.data);
          if (data.error) setError(data.error);
        }
      } catch (err) {
        console.error("Stream error:", err);
      }
    };

    ws.onerror = () => { setError("Camera connection failed"); setIsConnected(false); };
    ws.onclose = () => setIsConnected(false);

    return () => {
      ws.close();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (latestBitmapRef.current) { latestBitmapRef.current.close(); latestBitmapRef.current = null; }
    };
  }, [cameraInfo, deviceId, renderFrame]);

  // Capture current frame and register
  const handleCapture = async () => {
    if (!selectedEmployee || !canvasRef.current) return;

    setIsCapturing(true);
    setMessage(null);

    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const base64 = dataUrl.split(",")[1];

      const result = await registerFace(
        selectedEmployee.id,
        base64,
        selectedEmployee.company_id
      );

      setCaptureCount(result.data.total_embeddings);
      setMessage({ type: "success", text: `Captured! (${result.data.total_embeddings}/15)` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsCapturing(false);
    }
  };

  // Done — sync embeddings and go back
  const handleDone = async () => {
    if (selectedEmployee) {
      await syncEmbeddings(selectedEmployee.company_id);
    }
    router.push("/live-camera");
  };

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
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300">
          Register Face
        </h1>
        <span
          className={`ml-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isConnected
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
          {isConnected ? "Live" : "Disconnected"}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            {isConnected ? (
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            ) : (
              <div className="text-slate-400 text-center">
                <span className="material-symbols-outlined text-6xl mb-2 block">videocam_off</span>
                <p>Waiting for camera connection...</p>
              </div>
            )}
          </div>
        </div>

        {/* Registration Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Employee Selector */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 p-4">
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">
              Select Employee
            </h3>
            <select
              className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm text-gray-600 dark:text-gray-300"
              value={selectedEmployee?.id || ""}
              onChange={(e) => {
                const emp = employees.find((em) => em.id === parseInt(e.target.value));
                setSelectedEmployee(emp || null);
                setCaptureCount(0);
                setMessage(null);
              }}
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>

          {/* Capture Controls */}
          {selectedEmployee && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Look at the camera from different angles
                </p>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Captures</span>
                  <span>{captureCount}/15</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      captureCount >= 10 ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.min((captureCount / 15) * 100, 100)}%` }}
                  ></div>
                </div>
                {captureCount >= 10 && captureCount < 15 && (
                  <p className="text-xs text-green-500 mt-1">Good enough! More captures improve accuracy.</p>
                )}
                {captureCount >= 15 && (
                  <p className="text-xs text-green-500 mt-1">Excellent! Registration complete.</p>
                )}
              </div>

              {/* Message */}
              {message && (
                <div className={`text-xs p-2 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                }`}>
                  {message.text}
                </div>
              )}

              {/* Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleCapture}
                  disabled={!isConnected || isCapturing}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {isCapturing ? "Capturing..." : "Capture Face"}
                </button>

                {captureCount >= 10 && (
                  <button
                    onClick={handleDone}
                    className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Done — Save & Exit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
