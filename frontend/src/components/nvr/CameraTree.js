"use client";

import { useState, useEffect, useRef } from "react";
import { getCameras } from "@/lib/endpoint/live-camera";
import { getCameraServiceWsUrl } from "@/lib/camera-endpoints";
import { buildQueryParams } from "@/lib/api";
import { Camera, ChevronDown, ChevronRight, Search, User } from "lucide-react";

export default function CameraTree({ onCameraSelect, onDragStart }) {
  const [cameras, setCameras] = useState([]);
  const [search, setSearch] = useState("");
  const [expandedBranches, setExpandedBranches] = useState({});
  const [loading, setLoading] = useState(true);
  const [detections, setDetections] = useState({}); // { cameraId: [{ name, time }] }
  const wsRefs = useRef({});

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const result = await getCameras({ per_page: 200 });
        const items = (result?.data || []).map(c => ({
          id: c.id,
          device_id: c.device_id,
          name: c.name || `Camera ${c.device_id}`,
          branch_name: c.branch?.branch_name || "Unknown",
          branch_id: c.branch_id,
          location: c.location || "---",
          status: c.status_id === 1 ? "online" : "offline",
        }));
        setCameras(items);
        // Auto-expand all branches
        const branches = {};
        items.forEach(c => { branches[c.branch_name] = true; });
        setExpandedBranches(branches);
      } catch (e) {}
      finally { setLoading(false); }
    };
    fetchCameras();
  }, []);

  // Connect detection WebSockets for each camera
  useEffect(() => {
    if (cameras.length === 0) return;

    cameras.forEach(cam => {
      if (wsRefs.current[cam.id]) return; // already connected

      const connect = () => {
        const ws = new WebSocket(`${getCameraServiceWsUrl()}/detect/${cam.id}`);
        wsRefs.current[cam.id] = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.detections && data.detections.length > 0) {
              const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
              const faces = data.detections
                .filter(d => d.name && d.name !== "Unknown")
                .map(d => ({
                  name: d.name,
                  employeeId: d.employee_id || null,
                  time: now,
                }));
              setDetections(prev => {
                const existing = prev[cam.id] || [];
                // Merge: update existing names, add new ones, keep last 5
                const merged = [...faces];
                existing.forEach(e => {
                  if (!merged.find(m => m.name === e.name)) merged.push(e);
                });
                return { ...prev, [cam.id]: merged.slice(0, 5) };
              });
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          delete wsRefs.current[cam.id];
          setTimeout(connect, 5000);
        };

        ws.onerror = () => ws.close();
      };

      connect();
    });

    return () => {
      Object.values(wsRefs.current).forEach(ws => ws.close());
      wsRefs.current = {};
    };
  }, [cameras]);

  const filtered = cameras.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.branch_name.toLowerCase().includes(search.toLowerCase())
  );

  // Group by branch
  const grouped = {};
  filtered.forEach(c => {
    if (!grouped[c.branch_name]) grouped[c.branch_name] = [];
    grouped[c.branch_name].push(c);
  });

  const toggleBranch = (name) => {
    setExpandedBranches(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Cameras</span>
          <span className="ml-auto text-[10px] text-gray-500 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded">{cameras.length}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="w-full pl-7 pr-2 py-1.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-primary" />
        </div>
      </div>

      {/* Camera List */}
      <div className="flex-1 overflow-y-auto p-1">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-xs">Loading cameras...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-xs">No cameras found</div>
        ) : (
          Object.entries(grouped).map(([branch, cams]) => (
            <div key={branch} className="mb-1">
              {/* Branch Header */}
              <button onClick={() => toggleBranch(branch)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded transition">
                {expandedBranches[branch] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="truncate">{branch}</span>
                <span className="ml-auto text-[9px] text-gray-600">{cams.length}</span>
              </button>

              {/* Camera Items */}
              {expandedBranches[branch] && (
                <div className="ml-3 space-y-0.5">
                  {cams.map(cam => {
                    const camDetections = detections[cam.id] || [];
                    return (
                      <div key={cam.id}>
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("camera", JSON.stringify(cam));
                            onDragStart?.(cam);
                          }}
                          onClick={() => onCameraSelect?.(cam)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-primary/10 transition group"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${cam.status === "online" ? "bg-emerald-500" : "bg-gray-600"}`} />
                          <Camera className="w-3 h-3 text-gray-500 group-hover:text-primary" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white truncate">{cam.name}</div>
                            <div className="text-[9px] text-gray-400 dark:text-gray-600 truncate">{cam.location}</div>
                          </div>
                          {camDetections.length > 0 && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-500 px-1 py-0.5 rounded font-bold">{camDetections.length}</span>
                          )}
                        </div>
                        {/* Detected employees */}
                        {camDetections.length > 0 && (
                          <div className="ml-7 space-y-0.5 mb-1">
                            {camDetections.map((det, i) => (
                              <div key={`${det.name}-${i}`} className="flex items-center gap-1.5 px-2 py-0.5">
                                <User className={`w-2.5 h-2.5 ${det.name === "Unknown" ? "text-red-400" : "text-emerald-400"}`} />
                                <span className={`text-[10px] truncate ${det.name === "Unknown" ? "text-red-400" : "text-emerald-400 font-medium"}`}>{det.name}</span>
                                <span className="text-[8px] text-gray-500 ml-auto">{det.time}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
