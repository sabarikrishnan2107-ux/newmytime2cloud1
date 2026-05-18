import { useState, useRef, useEffect } from "react";
import {
  UserPlus, QrCode, Phone, DoorOpen, Search, Clock, UserCheck,
  AlertCircle, Users, Printer, X, Camera, Upload, FileText, Fingerprint,
  CreditCard, Loader2, CheckCircle2, LayoutGrid, List, Mail, Building2,
  MapPin, Calendar, Briefcase, Car, LogOut, ShieldCheck, Radio, Nfc,
  ScanLine, Wifi, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  getDevices,
  openDoor,
  getVisitorPreRegistrations,
  updateVisitorPreRegistration,
  getVisitorLogs,
  getEmployees,
  getDepartments,
} from "@/lib/api";
import PinEntryModal from "@/components/Device/UnlockDoor";
import { parseApiError } from "@/lib/utils";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(t) {
  if (!t) return "—";
  const s = String(t).slice(0, 5);
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h)) return s;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}

const TILE_CLASS = "bg-card dark:bg-[#0e1730] border border-border/50 rounded-xl p-4 shadow-card";

const expectedVisitors = [
  { id: "v1", name: "David Park", company: "Samsung Electronics", host: "Jennifer Lee", time: "10:30 AM", type: "Business", photo: false, email: "d.park@samsung.com", phone: "+971 50 444 1122", purpose: "Quarterly partnership review", department: "Engineering", duration: "2h", vehicle: "DXB-A-44291", preCheck: true, qr: "QR-VST-8F3A21B7", rfid: "RFID-04:A2:9B:7C:11:8E", nfc: "NFC-UID-E7C40A22" },
  { id: "v2", name: "Maria Santos", company: "Deloitte", host: "Mark Thompson", time: "11:00 AM", type: "VIP", photo: true, email: "m.santos@deloitte.com", phone: "+971 55 221 7788", purpose: "Audit kickoff meeting", department: "Finance", duration: "3h", vehicle: "—", preCheck: true, qr: "QR-VST-2D77F441", rfid: "RFID-04:5B:11:2C:9A:01", nfc: "NFC-UID-A12FB003" },
  { id: "v3", name: "Robert Kim", company: "Flex Contractors", host: "Security Desk", time: "11:30 AM", type: "Contractor", photo: false, email: "r.kim@flex.ae", phone: "+971 52 990 1144", purpose: "HVAC maintenance — Floor 3", department: "Operations", duration: "4h", vehicle: "DXB-T-77110", preCheck: false, qr: "QR-VST-9C0E5512", rfid: "RFID-04:11:88:DD:33:42", nfc: "NFC-UID-7BB9C014" },
  { id: "v4", name: "Lisa Chang", company: "TechRecruit", host: "HR Team", time: "12:00 PM", type: "Interview", photo: true, email: "lisa@techrecruit.io", phone: "+971 56 110 4422", purpose: "Senior engineer interview", department: "Human Resources", duration: "1h", vehicle: "—", preCheck: true, qr: "QR-VST-553BA980", rfid: "RFID-04:99:71:08:62:AA", nfc: "NFC-UID-CC4D8821" },
];

const checkedInVisitors = [
  { name: "Sarah Johnson", company: "Acme Corp", host: "John Smith", checkedIn: "9:15 AM", zone: "Floor 3", badge: "#V-2847", email: "sarah@acme.com", phone: "+971 50 111 2233", purpose: "Product demo", department: "Engineering", expectedOut: "12:00 PM", visitorType: "Business" },
  { name: "Emma Davis", company: "BuildRight", host: "Tom Brown", checkedIn: "9:45 AM", zone: "Loading Bay", badge: "#C-1103", email: "emma@buildright.ae", phone: "+971 55 332 6677", purpose: "Construction supplies delivery", department: "Operations", expectedOut: "11:30 AM", visitorType: "Contractor" },
  { name: "Ana Garcia", company: "FreshDeli", host: "Reception", checkedIn: "10:10 AM", zone: "Lobby", badge: "#D-0456", email: "ana@freshdeli.com", phone: "+971 52 778 9911", purpose: "Catering drop-off", department: "Reception", expectedOut: "10:45 AM", visitorType: "Delivery" },
];

const typeColors = {
  Business: "bg-teal-500/10 text-teal-600",
  VIP: "bg-warning/10 text-warning",
  Contractor: "bg-blue-500/10 text-blue-600",
  Interview: "bg-success/10 text-success",
  Delivery: "bg-muted text-muted-foreground",
};


export default function Reception() {
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMode, setScanMode] = useState("qr");
  const [qrScanning, setQrScanning] = useState(false);
  const [qrResult, setQrResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const [expectedList, setExpectedList] = useState([]);
  const [insideList, setInsideListState] = useState([]);
  const [autoCheckedIn, setAutoCheckedIn] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const today = todayStr();
    (async () => {
      try {
        const r = await getVisitorPreRegistrations({ date: today, per_page: 100 });
        if (cancelled) return;
        const rows = Array.isArray(r?.data) ? r.data : [];
        setExpectedList(rows.map((v) => ({
          id: v.id,
          name: v.visitor_name || "Visitor",
          company: v.company_name || "—",
          host: v.host_name || (v.host_employee ? [v.host_employee.first_name, v.host_employee.last_name].filter(Boolean).join(" ") : "—"),
          time: fmtTime(v.expected_time),
          type: v.visitor_type || "Business",
          email: v.email || "",
          phone: v.phone || "",
          purpose: v.purpose || "—",
          department: v.host_employee?.department?.name || "",
          duration: "—",
          vehicle: v.vehicle_plate || "—",
          preCheck: v.status === "confirmed",
          status: v.status || "pending",
        })));
      } catch (e) {
        console.warn("preRegistrations", e);
      }
    })();
    (async () => {
      try {
        const r = await getVisitorLogs({ date: today, per_page: 100 });
        if (cancelled) return;
        const rows = Array.isArray(r?.data) ? r.data : [];
        setInsideListState(rows.filter((a) => !a.out).map((a, i) => ({
          id: a.id,
          name: [a?.visitor?.first_name, a?.visitor?.last_name].filter(Boolean).join(" ") || "Visitor",
          company: a?.visitor?.visitor_company_name || "—",
          host: a?.host_name || "—",
          checkedIn: fmtTime(a.in),
          zone: a?.zone?.name || "—",
          badge: a?.visitor?.system_user_id ? `#${a.visitor.system_user_id}` : `#V-${a.id}`,
          email: "",
          phone: "",
          purpose: a?.purpose || "—",
          department: "",
          expectedOut: fmtTime(a.expected_out || a.out_expected),
          visitorType: "Business",
          auto: false,
        })));
      } catch (e) {
        console.warn("visitor attendance", e);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadTick]);

  const reload = () => setReloadTick((t) => t + 1);

  const tokenSamples = {
    qr: ["QR-VST-8F3A21B7", "QR-VST-2D77F441", "QR-VST-9C0E5512", "QR-VST-553BA980", "QR-UNKNOWN-0001"],
    rfid: ["RFID-04:A2:9B:7C:11:8E", "RFID-04:5B:11:2C:9A:01", "RFID-04:11:88:DD:33:42", "RFID-04:99:71:08:62:AA", "RFID-FF:FF:FF:FF:FF:FF"],
    nfc: ["NFC-UID-E7C40A22", "NFC-UID-A12FB003", "NFC-UID-7BB9C014", "NFC-UID-CC4D8821", "NFC-UID-DEADBEEF"],
  };
  const scanCounter = useRef(0);

  const matchByToken = (token) =>
    expectedList.find(v => v.qr === token || v.rfid === token || v.nfc === token);

  const performAutoCheckIn = (visitor, mode) => {
    setExpectedList(prev => prev.filter(v => v.id !== visitor.id));
    setAutoCheckedIn(prev => [visitor, ...prev.filter(v => v.id !== visitor.id)]);
    toast.success(`${visitor.name} checked in automatically`, {
      description: `${mode.toUpperCase()} verified - host ${visitor.host} notified`,
    });
  };

  const openScanner = (mode) => {
    setScanMode(mode);
    setScanOpen(true);
    runScan(mode);
  };

  const runScan = (mode) => {
    setQrScanning(true);
    setQrResult(null);
    setScanError(null);
    const delay = mode === "qr" ? 1600 : mode === "nfc" ? 1100 : 1400;
    setTimeout(() => {
      const samples = tokenSamples[mode];
      const token = samples[scanCounter.current++ % samples.length];
      const matched = matchByToken(token);
      setQrScanning(false);
      if (!matched) {
        setScanError(`No pre-registered visitor matches token ${token}`);
        toast.error("Token not recognised", { description: token });
        return;
      }
      setQrResult({ ...matched, token });
      performAutoCheckIn(matched, mode);
      setTimeout(() => { setScanOpen(false); setQrResult(null); }, 1800);
    }, delay);
  };

  const handleQrCheckIn = () => {
    if (qrResult) {
      setScanOpen(false);
      setQrScanning(false);
      setQrResult(null);
    }
  };

  const insideListMerged = [
    ...autoCheckedIn.map((v, i) => ({
      name: v.name, company: v.company, host: v.host, checkedIn: "just now",
      zone: "Lobby", badge: `#A-${(2900 + i).toString().padStart(4, "0")}`,
      email: v.email, phone: v.phone, purpose: v.purpose, department: v.department,
      expectedOut: v.time, visitorType: v.type, auto: true,
    })),
    ...insideList,
  ];

  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = (v) => {
    if (!q) return true;
    return [v.name, v.company, v.host, v.badge, v.purpose].filter(Boolean).some((s) => String(s).toLowerCase().includes(q));
  };
  const filteredExpected = expectedList.filter(matchesSearch);
  const filteredInside = insideListMerged.filter(matchesSearch);

  const handlePreRegCheckIn = async (v) => {
    try {
      await updateVisitorPreRegistration(v.id, { status: "confirmed" });
      toast.success(`${v.name} marked as confirmed`);
      reload();
    } catch (e) {
      toast.error("Could not check in", { description: parseApiError(e) });
    }
  };


  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [step, setStep] = useState(1);
  const [eidScriptReady, setEidScriptReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);

  const processPhotoWithBgRemoval = async (rawDataUrl) => {
    if (!rawDataUrl) return;
    // Show the original immediately so the user sees a preview while we work
    setCapturedPhoto(rawDataUrl);
    setBgRemoving(true);
    setBgProgress(0);
    try {
      // 1) Crop+focus the face (zoom in on the visitor's face)
      let working = rawDataUrl;
      try {
        const { cropFaceWithPadding } = await import("@/lib/faceCrop");
        working = await cropFaceWithPadding(rawDataUrl);
        setCapturedPhoto(working);
        setBgProgress(25);
      } catch (faceErr) {
        console.warn("face crop failed", faceErr);
      }
      // 2) Remove the background and put the face on white
      const { replaceBackgroundWithWhite, prewarmBackgroundRemoval } = await import("@/lib/backgroundRemoval");
      await prewarmBackgroundRemoval();
      const cleaned = await replaceBackgroundWithWhite(working, {
        progress: (_key, current, total) => {
          if (total > 0) {
            const pct = 25 + Math.min(74, Math.round((current / total) * 75));
            setBgProgress(pct);
          }
        },
      });
      setBgProgress(100);
      setCapturedPhoto(cleaned);
    } catch (err) {
      console.warn("photo processing failed", err);
      // Keep whatever we have — user still gets their picture
    } finally {
      setTimeout(() => {
        setBgRemoving(false);
        setBgProgress(0);
      }, 350);
    }
  };

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const openCamera = async () => {
    setCameraError("");
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setCameraError(err?.message || "Camera unavailable");
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 480;
    const h = video.videoHeight || 480;
    const size = Math.min(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    const sx = (w - size) / 2;
    const sy = (h - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 480, 480);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    closeCamera();
    processPhotoWithBgRemoval(dataUrl);
  };

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Pre-warm AI models the moment the walk-in dialog opens so the first photo is snappy
  useEffect(() => {
    if (!walkinOpen) return;
    (async () => {
      try {
        const [{ prewarmBackgroundRemoval }, { prewarmFaceDetector }] = await Promise.all([
          import("@/lib/backgroundRemoval"),
          import("@/lib/faceCrop"),
        ]);
        prewarmBackgroundRemoval();
        prewarmFaceDetector();
      } catch {}
    })();
  }, [walkinOpen]);

  const photoFileInputRef = useRef(null);
  const onPhotoFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => processPhotoWithBgRemoval(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const [hostEmployees, setHostEmployees] = useState([]);
  const [hostDepartments, setHostDepartments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getEmployees({ per_page: 1000 });
        if (cancelled) return;
        const list = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
        const mapped = list
          .map((e) => ({
            id: e.id,
            employeeId: e.employee_id || "",
            name: [e.first_name, e.last_name].filter(Boolean).join(" ").trim() || e.display_name || `Employee ${e.employee_id || e.id}`,
            departmentId: e.department?.id ?? e.department_id ?? null,
            departmentName: e.department?.name || "",
            branchName: e.branch?.branch_name || "",
            phone: e.phone_number || e.phone || "",
            email: e?.user?.email || e.email || "",
            profile: e.profile_picture && e.profile_picture !== "undefined" ? e.profile_picture : "",
          }))
          .filter((x) => x.id != null);
        setHostEmployees(mapped);
      } catch (err) { console.warn("employees", err); }
    })();
    (async () => {
      try {
        const r = await getDepartments();
        if (cancelled) return;
        const list = Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [];
        setHostDepartments(list.map((d) => ({ id: d.id, name: d.name })).filter((x) => x.id != null));
      } catch (err) { console.warn("departments", err); }
    })();
    return () => { cancelled = true; };
  }, []);

  const [callHostOpen, setCallHostOpen] = useState(false);
  const [callHostQuery, setCallHostQuery] = useState("");
  const [callHostBranch, setCallHostBranch] = useState("");
  const [callHostDept, setCallHostDept] = useState("");
  const [callHostEmployeeId, setCallHostEmployeeId] = useState("");

  const [openGateOpen, setOpenGateOpen] = useState(false);
  const [gateDevices, setGateDevices] = useState([]);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateSearch, setGateSearch] = useState("");
  const [gatePinModal, setGatePinModal] = useState(false);
  const [gateActiveDeviceId, setGateActiveDeviceId] = useState(null);

  const handleOpenGateClick = async () => {
    setOpenGateOpen(true);
    if (gateDevices.length === 0) {
      setGateLoading(true);
      try {
        const r = await getDevices({ per_page: 500 });
        const list = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
        setGateDevices(list);
      } catch (e) {
        toast.error("Failed to load devices", { description: parseApiError(e) });
      } finally {
        setGateLoading(false);
      }
    }
  };

  const handleGateDevicePick = (device) => {
    setGateActiveDeviceId(device.device_id);
    setOpenGateOpen(false);
    setGatePinModal(true);
  };
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", company: "",
    visitorType: "", host: "", department: "", purpose: "",
    vehiclePlate: "", notes: "", idType: "", idNumber: "",
    ndaAccepted: false, safetyAccepted: false, privacyAccepted: false,
    nationality: "", gender: "", dateOfBirth: "", expiryDate: "",
    documents: [],
    cardNumber: "",
  });
  const docInputRef = useRef(null);
  const [docDragOver, setDocDragOver] = useState(false);

  const fmtBytes = (n) => {
    if (n == null) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  };

  const acceptDocFiles = async (files) => {
    if (!files || !files.length) return;
    const next = [];
    for (const file of files) {
      const dataUrl = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => res(null);
        r.readAsDataURL(file);
      });
      if (!dataUrl) continue;
      next.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        type: file.type || "",
        data: dataUrl,
      });
    }
    if (next.length === 0) return;
    setForm((prev) => ({ ...prev, documents: [...(prev.documents || []), ...next] }));
  };

  const removeDoc = (id) => {
    setForm((prev) => ({ ...prev, documents: (prev.documents || []).filter((d) => d.id !== id) }));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Toolkit) { setEidScriptReady(true); return; }
    const existing = document.querySelector('script[data-eida-toolkit]');
    if (existing) {
      existing.addEventListener("load", () => setEidScriptReady(true));
      return;
    }
    const s = document.createElement("script");
    s.src = "/eidatoolkit.js";
    s.async = true;
    s.dataset.eidaToolkit = "true";
    s.onload = () => setEidScriptReady(true);
    s.onerror = () => console.error("Failed to load eidatoolkit.js");
    document.body.appendChild(s);
  }, []);

  const readEmiratesIdPublicData = () => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.Toolkit) {
        reject(new Error("EID Toolkit not loaded"));
        return;
      }
      let ToolkitOB = null;
      let readerClass = null;
      let settled = false;
      const done = (fn, arg) => {
        if (settled) return;
        settled = true;
        try { if (readerClass && readerClass.disconnect) readerClass.disconnect(() => {}); } catch (_) {}
        fn(arg);
      };
      const fail = (msg) => done(reject, new Error(msg));

      const options = {
        debugEnabled: false,
        agent_tls_enabled: false,
        agent_host_name: "toolkitagent.emiratesid.ae",
        jnlp_address: "/IDCardToolkitService.jnlp",
        toolkitConfig:
          'vg_connection_timeout = 60 \n' +
          'log_level = "INFO" \n' +
          'log_performance_time = true \n' +
          'read_publicdata_offline = false \n',
      };

      const onOpen = (_resp, error) => {
        if (error) return fail("Agent open failed: " + (error.message || error));
        ToolkitOB.getReaderWithEmiratesId(onListReaders);
      };
      const onClose = () => {};
      const onError = (err) => fail("Agent error: " + (err && err.message ? err.message : err));

      const onListReaders = (response, error) => {
        if (error) return fail("No reader: " + (error.message || error.description || error));
        readerClass = response;
        if (!readerClass) return fail("No reader found. Plug in the card reader.");
        readerClass.connect(onCardConnected);
      };
      const onCardConnected = (_resp, error) => {
        if (error) return fail("Card not connected: " + (error.message || error.code || error));
        readerClass.getInterfaceType(onInterface);
      };
      const onInterface = (response, error) => {
        if (error) return fail("Interface check failed: " + (error.message || error));
        const isNfc = response === 2;
        const requestId = btoa(String(Math.random()).slice(2) + Date.now());
        readerClass.readPublicData(
          requestId, true, true, true, true, !isNfc,
          (resp, err) => {
            if (err) return fail("Read failed: " + (err.message || err));
            resp.isNfc = isNfc;
            done(resolve, resp);
          }
        );
      };

      try { ToolkitOB = new window.Toolkit(onOpen, onClose, onError, options); }
      catch (e) { fail("Could not start toolkit: " + e); }
    });
  };

  const photoMimeFromBase64 = (b64) => {
    if (!b64) return "image/jpeg";
    if (b64.indexOf("/9j/") === 0) return "image/jpeg";
    if (b64.indexOf("Qk") === 0) return "image/bmp";
    if (b64.indexOf("iVBOR") === 0) return "image/png";
    return "image/jpeg";
  };

  const updateForm = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const filteredHostEmployees = !form.department
    ? hostEmployees
    : hostEmployees.filter((e) => String(e.departmentId) === String(form.department));

  const onPickHost = (employeeId) => {
    updateForm("host", employeeId);
    const emp = hostEmployees.find((e) => String(e.id) === String(employeeId));
    if (emp && emp.departmentId) {
      updateForm("department", String(emp.departmentId));
    }
  };

  const onPickDepartment = (deptId) => {
    updateForm("department", deptId);
    if (form.host) {
      const emp = hostEmployees.find((e) => String(e.id) === String(form.host));
      if (emp && String(emp.departmentId) !== String(deptId)) {
        updateForm("host", "");
      }
    }
  };

  const resetForm = () => {
    setForm({
      firstName: "", lastName: "", email: "", phone: "", company: "",
      visitorType: "", host: "", department: "", purpose: "",
      vehiclePlate: "", notes: "", idType: "", idNumber: "",
      ndaAccepted: false, safetyAccepted: false, privacyAccepted: false,
      nationality: "", gender: "", dateOfBirth: "", expiryDate: "",
      documents: [], cardNumber: "",
    });
    setStep(1);
    setScanned(false);
    setCapturedPhoto(null);
  };

  const handleScanEmiratesID = async () => {
    if (!eidScriptReady) {
      toast.error("Emirates ID Toolkit is still loading", {
        description: "Please wait a moment and try again.",
      });
      return;
    }
    setScanning(true);
    try {
      const resp = await readEmiratesIdPublicData();
      const nm = resp.nonModifiablePublicData || {};
      const home = resp.homeAddress || {};
      const fullName = (nm.fullNameEnglish || "").trim();
      const parts = fullName.split(/\s+/);
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      setForm((prev) => ({
        ...prev,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        idType: "Emirates ID",
        idNumber: resp.iDNumber || prev.idNumber,
        nationality: nm.nationalityEnglish || nm.nationality || prev.nationality,
        gender: nm.gender || prev.gender,
        dateOfBirth: nm.dateOfBirth || prev.dateOfBirth,
        expiryDate: resp.expiryDate || resp.cardExpiry || prev.expiryDate,
        phone: home.mobilePhoneNumber || prev.phone,
      }));
      if (resp.cardHolderPhoto) {
        const mime = photoMimeFromBase64(resp.cardHolderPhoto);
        setCapturedPhoto(`data:${mime};base64,${resp.cardHolderPhoto}`);
      }
      setScanned(true);
      toast.success("Emirates ID scanned successfully!", {
        description: "Visitor information has been auto-filled from the ID card.",
      });
    } catch (e) {
      toast.error("EID read failed", { description: e?.message || String(e) });
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = () => {
    toast.success("Visitor registered successfully!", {
      description: `${form.firstName} ${form.lastName} from ${form.company} has been checked in.`,
    });
    setWalkinOpen(false);
    resetForm();
  };

  const canProceedStep1 = form.firstName && form.lastName && form.company && form.visitorType;
  const canProceedStep2 = form.host && form.purpose;
  const canSubmit = form.ndaAccepted && form.privacyAccepted;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reception Desk</h1>
          <p className="text-muted-foreground text-sm">Main Lobby — HQ Building A</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => setWalkinOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> New Walk-in
          </Button>
          <Button variant="outline" onClick={() => openScanner("qr")}>
            <QrCode className="w-4 h-4 mr-2" /> Scan QR
          </Button>
          <Button variant="outline" onClick={() => openScanner("rfid")}>
            <Radio className="w-4 h-4 mr-2" /> RFID
          </Button>
          <Button variant="outline" onClick={() => openScanner("nfc")}>
            <Nfc className="w-4 h-4 mr-2" /> NFC
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: UserPlus, label: "Register Visitor", color: "bg-teal-500/10 text-teal-600", action: () => setWalkinOpen(true) },
          { icon: ScanLine, label: "Scan Token", color: "bg-blue-500/10 text-blue-600", action: () => openScanner("qr") },
          { icon: Phone, label: "Call Host", color: "bg-warning/10 text-warning", action: () => setCallHostOpen(true) },
          { icon: DoorOpen, label: "Open Gate", color: "bg-success/10 text-success", action: handleOpenGateClick },
        ].map((a) => (
          <button key={a.label} onClick={a.action} className={`${TILE_CLASS} flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-all`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.color}`}>
              <a.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-foreground">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search visitor by name, company, or badge number..."
          className="pl-10 h-11 dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expected Today */}
        <div className="bg-card rounded-xl border border-border/50 shadow-card">
          <Tabs defaultValue="grid">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Expected Today</h3>
                <Badge variant="secondary" className="text-xs">{filteredExpected.length}</Badge>
                {autoCheckedIn.length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-success/10 text-success border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />{autoCheckedIn.length} auto
                  </Badge>
                )}
              </div>
              <TabsList className="h-8">
                <TabsTrigger value="grid" className="h-6 px-2 text-xs"><LayoutGrid className="w-3.5 h-3.5 mr-1" />Grid</TabsTrigger>
                <TabsTrigger value="list" className="h-6 px-2 text-xs"><List className="w-3.5 h-3.5 mr-1" />List</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="grid" className="m-0">
              <div className="grid sm:grid-cols-2 gap-3 p-4">
                {filteredExpected.length === 0 && (
                  <div className="col-span-full text-center text-xs text-muted-foreground py-6">No visitors expected today</div>
                )}
                {filteredExpected.map((v) => (
                  <div key={v.id || v.name} className="rounded-lg border border-border/50 p-3 hover:border-teal-500/40 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                          {v.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{v.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{v.company}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${typeColors[v.type]}`}>{v.type}</span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
                      <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{v.time} · {v.duration}</div>
                      <div className="flex items-center gap-1.5"><Users className="w-3 h-3" />Host: <span className="text-foreground">{v.host}</span></div>
                      <div className="flex items-center gap-1.5"><Briefcase className="w-3 h-3" />{v.department}</div>
                      <div className="flex items-center gap-1.5 truncate"><FileText className="w-3 h-3 shrink-0" /><span className="truncate">{v.purpose}</span></div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-3">
                      {v.preCheck ? (
                        <span className="flex items-center gap-1 text-[10px] text-success"><ShieldCheck className="w-3 h-3" />Pre-checked</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-warning"><AlertCircle className="w-3 h-3" />Needs check</span>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handlePreRegCheckIn(v)}>Check In</Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list" className="m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-2 px-3">Visitor</th>
                      <th className="text-left p-2">Host</th>
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-right p-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredExpected.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No visitors expected today</td></tr>
                    )}
                    {filteredExpected.map((v) => (
                      <tr key={v.id || v.name} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2 px-3">
                          <div className="font-medium text-foreground">{v.name}</div>
                          <div className="text-muted-foreground">{v.company}</div>
                        </td>
                        <td className="p-2"><div className="text-foreground">{v.host}</div><div className="text-muted-foreground">{v.department}</div></td>
                        <td className="p-2"><div className="text-foreground">{v.time}</div><div className="text-muted-foreground">{v.duration}</div></td>
                        <td className="p-2"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColors[v.type]}`}>{v.type}</span></td>
                        <td className="p-2 px-3 text-right"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handlePreRegCheckIn(v)}>Check In</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Currently Inside */}
        <div className="bg-card rounded-xl border border-border/50 shadow-card">
          <Tabs defaultValue="grid">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-success" />
                <h3 className="font-semibold text-foreground">Currently Inside</h3>
                <Badge variant="secondary" className="text-xs">{filteredInside.length}</Badge>
              </div>
              <TabsList className="h-8">
                <TabsTrigger value="grid" className="h-6 px-2 text-xs"><LayoutGrid className="w-3.5 h-3.5 mr-1" />Grid</TabsTrigger>
                <TabsTrigger value="list" className="h-6 px-2 text-xs"><List className="w-3.5 h-3.5 mr-1" />List</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="grid" className="m-0">
              <div className="grid sm:grid-cols-2 gap-3 p-4">
                {filteredInside.length === 0 && (
                  <div className="col-span-full text-center text-xs text-muted-foreground py-6">No visitors currently inside</div>
                )}
                {filteredInside.map((v) => (
                  <div key={v.id || v.name} className="rounded-lg border border-border/50 p-3 hover:border-success/40 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center text-xs font-semibold text-success shrink-0">
                          {v.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{v.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{v.company}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-mono text-muted-foreground">{v.badge}</span>
                        {v.auto && <span className="text-[9px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium flex items-center gap-1"><ScanLine className="w-2.5 h-2.5" />Auto</span>}
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
                      <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{v.zone}</div>
                      <div className="flex items-center gap-1.5"><Users className="w-3 h-3" />Host: <span className="text-foreground">{v.host}</span></div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" />In: {v.checkedIn} · Out: {v.expectedOut}</div>
                      <div className="flex items-center gap-1.5 truncate"><FileText className="w-3 h-3 shrink-0" /><span className="truncate">{v.purpose}</span></div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" title="Call host"><Phone className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs"><LogOut className="w-3 h-3 mr-1" />Check Out</Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list" className="m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-2 px-3">Visitor</th>
                      <th className="text-left p-2">Zone</th>
                      <th className="text-left p-2">In / Out</th>
                      <th className="text-left p-2">Badge</th>
                      <th className="text-right p-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredInside.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No visitors currently inside</td></tr>
                    )}
                    {filteredInside.map((v) => (
                      <tr key={v.id || v.name} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2 px-3">
                          <div className="font-medium text-foreground">{v.name}</div>
                          <div className="text-muted-foreground">{v.company}</div>
                        </td>
                        <td className="p-2"><div className="text-foreground">{v.zone}</div><div className="text-muted-foreground">{v.host}</div></td>
                        <td className="p-2"><div className="text-foreground">{v.checkedIn}</div><div className="text-muted-foreground">→ {v.expectedOut}</div></td>
                        <td className="p-2 font-mono text-muted-foreground">{v.badge}</td>
                        <td className="p-2 px-3 text-right"><Button size="sm" variant="outline" className="h-7 text-xs">Check Out</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Walk-in Registration Dialog */}
      <Dialog open={walkinOpen} onOpenChange={(open) => { setWalkinOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">New Walk-in Visitor</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Register a walk-in visitor — Step {step} of 3
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 py-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step >= s ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground"
                }`}>{s}</div>
                <span className={`text-xs font-medium hidden sm:inline ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Visitor Info" : s === 2 ? "Visit Details" : "Verify & Confirm"}
                </span>
                {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-teal-600" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Visitor Information */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Emirates ID Scanner */}
              <div className={`rounded-xl border-2 border-dashed p-4 transition-all ${
                scanned ? "border-success/50 bg-success/5" : scanning ? "border-teal-500/50 bg-teal-500/5" : "border-border bg-muted/20 hover:border-teal-500/30"
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                    scanned ? "bg-success/10" : "bg-teal-500/10"
                  }`}>
                    {scanning ? (
                      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    ) : scanned ? (
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    ) : (
                      <CreditCard className="w-6 h-6 text-teal-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Emirates ID Scanner</p>
                    <p className="text-xs text-muted-foreground">
                      {scanning ? "Reading card data..." : scanned ? "ID data loaded — review and complete remaining fields" : "Place the Emirates ID on the card reader to auto-fill visitor details"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={scanned ? "outline" : "default"}
                    className={scanned ? "" : "bg-teal-600 text-white hover:bg-teal-700"}
                    disabled={scanning || !eidScriptReady}
                    onClick={handleScanEmiratesID}
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                    {scanning ? "Scanning..." : scanned ? "Re-scan" : "Scan ID"}
                  </Button>
                </div>
                {scanned && (
                  <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">ID No:</span> <span className="text-foreground font-mono font-medium">{form.idNumber}</span></div>
                    <div><span className="text-muted-foreground">Nationality:</span> <span className="text-foreground font-medium">{form.nationality}</span></div>
                    <div><span className="text-muted-foreground">DOB:</span> <span className="text-foreground font-medium">{form.dateOfBirth}</span></div>
                    <div><span className="text-muted-foreground">Gender:</span> <span className="text-foreground font-medium">{form.gender}</span></div>
                    <div><span className="text-muted-foreground">Expiry:</span> <span className="text-foreground font-medium">{form.expiryDate}</span></div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">or enter manually</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex flex-col items-center justify-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={openCamera}
                    disabled={bgRemoving}
                    className="w-28 h-28 rounded-full bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/70 hover:border-teal-500/60 transition-colors overflow-hidden relative"
                    title="Take photo with webcam"
                  >
                    {capturedPhoto ? (
                      <img src={capturedPhoto} alt="Visitor" className={`w-full h-full object-cover ${bgRemoving ? "opacity-60" : ""}`} />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Photo</span>
                      </>
                    )}
                  </button>
                  {bgRemoving && (
                    <div className="absolute inset-0 rounded-full pointer-events-none">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.15)" strokeWidth="4" fill="none" />
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          stroke="url(#bgGrad)"
                          strokeWidth="4"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${(2 * Math.PI * 46 * bgProgress) / 100} ${2 * Math.PI * 46}`}
                          style={{ transition: "stroke-dasharray 0.25s ease-out" }}
                        />
                        <defs>
                          <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#14b8a6" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <span className="text-[10px] font-semibold tracking-wider opacity-80">AI</span>
                        <span className="text-base font-bold tabular-nums">{bgProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
                {bgRemoving && (
                  <div className="text-[10px] text-muted-foreground text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Removing background · AI processing
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={openCamera}>
                    <Camera className="w-3 h-3 mr-1.5" /> Take Photo
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => photoFileInputRef.current?.click()}>
                    <Upload className="w-3 h-3 mr-1.5" /> Upload
                  </Button>
                  <input ref={photoFileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoFileChosen} />
                </div>
              </div>

              {cameraOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 px-4" onClick={closeCamera}>
                  <div className="w-[480px] max-w-full bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <h3 className="text-sm font-bold text-white">Take Photo</h3>
                      <button onClick={closeCamera} className="w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="aspect-square w-full bg-black flex items-center justify-center">
                      {cameraError ? (
                        <div className="text-center text-rose-300 text-sm px-6">
                          <div className="font-semibold">Camera unavailable</div>
                          <div className="text-xs text-rose-300/70 mt-1">{cameraError}</div>
                        </div>
                      ) : (
                        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10">
                      <Button type="button" variant="outline" size="sm" onClick={closeCamera}>Cancel</Button>
                      <Button type="button" size="sm" className="bg-teal-600 text-white hover:bg-teal-700" disabled={!!cameraError} onClick={captureFromCamera}>
                        <Camera className="w-3.5 h-3.5 mr-1.5" /> Capture
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">First Name *</label>
                  <Input placeholder="First name" className="dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10" value={form.firstName} onChange={(e) => updateForm("firstName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Last Name *</label>
                  <Input placeholder="Last name" className="dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10" value={form.lastName} onChange={(e) => updateForm("lastName", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input type="email" placeholder="visitor@company.com" className="dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10" value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <Input type="tel" placeholder="+971 50 000 0000" className="dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Company *</label>
                  <Input placeholder="Company name" className="dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10" value={form.company} onChange={(e) => updateForm("company", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Visitor Type *</label>
                  <Select value={form.visitorType} onValueChange={(v) => updateForm("visitorType", v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent side="bottom" avoidCollisions={false} className="max-h-[200px] overflow-y-auto">
                      {["Business", "Interview", "Contractor", "Vendor", "Delivery", "VIP", "Maintenance", "Event Attendee"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Date of Birth</label>
                  <Input
                    type="date"
                    className="dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10"
                    value={form.dateOfBirth}
                    onChange={(e) => updateForm("dateOfBirth", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Gender</label>
                  <Select value={form.gender} onValueChange={(v) => updateForm("gender", v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent side="bottom" avoidCollisions={false} className="max-h-[200px] overflow-y-auto">
                      {["Male", "Female", "Other"].map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">ID Type</label>
                  <Select value={form.idType} onValueChange={(v) => updateForm("idType", v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select ID type" /></SelectTrigger>
                    <SelectContent side="bottom" avoidCollisions={false} className="max-h-[200px] overflow-y-auto">
                      {["Passport", "National ID", "Driver's License", "Emirates ID", "Company Badge"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">ID Number</label>
                  <Input placeholder="ID number" className="dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10" value={form.idNumber} onChange={(e) => updateForm("idNumber", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Visit Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Host / Employee *</label>
                  <Select value={form.host || ""} onValueChange={onPickHost}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={filteredHostEmployees.length === 0 ? "No employees in this department" : "Select host"} /></SelectTrigger>
                    <SelectContent side="bottom" avoidCollisions={false} className="max-h-[260px] overflow-y-auto">
                      {filteredHostEmployees.map((h) => {
                        const meta = [h.departmentName, h.branchName].filter(Boolean).join(" · ");
                        return (
                          <SelectItem key={h.id} value={String(h.id)}>
                            {h.name}{meta ? ` · ${meta}` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Department</label>
                  <Select value={form.department || ""} onValueChange={onPickDepartment}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="All departments" /></SelectTrigger>
                    <SelectContent side="bottom" avoidCollisions={false} className="max-h-[260px] overflow-y-auto">
                      {hostDepartments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Purpose of Visit *</label>
                <Select value={form.purpose} onValueChange={(v) => updateForm("purpose", v)}>
                  <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                  <SelectContent>
                    {["Business Meeting", "Interview", "Delivery", "Maintenance", "Audit", "Site Visit", "Training", "Event", "Other"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Vehicle License Plate</label>
                <Input placeholder="e.g. ABC-1234" className="dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10" value={form.vehiclePlate} onChange={(e) => updateForm("vehiclePlate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Additional Notes</label>
                <Textarea placeholder="Any special instructions or notes..." className="resize-none h-20 dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10" value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} />
              </div>
              <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="font-medium">Upload Documents (optional)</span>
                  {form.documents?.length > 0 && (
                    <span className="ml-auto text-[10px] font-semibold text-foreground">
                      {form.documents.length} file{form.documents.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <div
                  onClick={() => docInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDocDragOver(true); }}
                  onDragLeave={() => setDocDragOver(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDocDragOver(false);
                    await acceptDocFiles(Array.from(e.dataTransfer.files || []));
                  }}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    docDragOver
                      ? "border-teal-500/70 bg-teal-500/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {docDragOver ? "Release to add files" : "Drop files here or click to upload"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">ID, NDA, Insurance, Work Permit · max ~5 MB each</p>
                  <input
                    ref={docInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={async (e) => {
                      await acceptDocFiles(Array.from(e.target.files || []));
                      e.target.value = "";
                    }}
                  />
                </div>
                {form.documents?.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {form.documents.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-foreground truncate">{d.name}</div>
                          <div className="text-[10px] text-muted-foreground">{fmtBytes(d.size)}{d.type ? ` · ${d.type.split("/").pop().toUpperCase()}` : ""}</div>
                        </div>
                        {d.type?.startsWith("image/") && (
                          <a
                            href={d.data}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0"
                          >
                            View
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeDoc(d.id); }}
                          title="Remove"
                          className="w-5 h-5 rounded-full text-muted-foreground hover:bg-rose-500/15 hover:text-rose-500 flex items-center justify-center shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Verify & Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Visitor Summary</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground font-medium">{form.firstName} {form.lastName}</span></div>
                  <div><span className="text-muted-foreground">Company:</span> <span className="text-foreground font-medium">{form.company}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground font-medium">{form.visitorType}</span></div>
                  <div><span className="text-muted-foreground">Host:</span> <span className="text-foreground font-medium">{form.host}</span></div>
                  <div><span className="text-muted-foreground">Purpose:</span> <span className="text-foreground font-medium">{form.purpose}</span></div>
                  <div><span className="text-muted-foreground">Department:</span> <span className="text-foreground font-medium">{form.department || "—"}</span></div>
                  {form.idType && <div><span className="text-muted-foreground">ID:</span> <span className="text-foreground font-medium">{form.idType} · {form.idNumber}</span></div>}
                  {form.nationality && <div><span className="text-muted-foreground">Nationality:</span> <span className="text-foreground font-medium">{form.nationality}</span></div>}
                  {form.dateOfBirth && <div><span className="text-muted-foreground">DOB:</span> <span className="text-foreground font-medium">{form.dateOfBirth}</span></div>}
                  {form.gender && <div><span className="text-muted-foreground">Gender:</span> <span className="text-foreground font-medium">{form.gender}</span></div>}
                  {form.expiryDate && <div><span className="text-muted-foreground">ID Expiry:</span> <span className="text-foreground font-medium">{form.expiryDate}</span></div>}
                  {form.vehiclePlate && <div><span className="text-muted-foreground">Vehicle:</span> <span className="text-foreground font-medium">{form.vehiclePlate}</span></div>}
                  {form.cardNumber && <div><span className="text-muted-foreground">Card #:</span> <span className="text-foreground font-medium font-mono">{form.cardNumber}</span></div>}
                </div>
              </div>

              {/* Face Capture Placeholder */}
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-muted border border-dashed border-border flex items-center justify-center">
                  <Fingerprint className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Face Verification</p>
                  <p className="text-xs text-muted-foreground">Capture visitor face for identity verification</p>
                  <Button size="sm" variant="outline" className="mt-1.5 h-7 text-xs">
                    <Camera className="w-3 h-3 mr-1" /> Capture Face
                  </Button>
                </div>
              </div>

              {/* Access Card */}
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Access Card</p>
                    <p className="text-xs text-muted-foreground mb-2">Tap or scan the visitor badge to assign a card number.</p>
                    <Input
                      placeholder="Card / Badge number"
                      autoComplete="off"
                      className="dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10 font-mono tracking-wider"
                      value={form.cardNumber}
                      onChange={(e) => updateForm("cardNumber", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Agreements */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Agreements</h4>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <Checkbox checked={form.ndaAccepted} onCheckedChange={(v) => updateForm("ndaAccepted", !!v)} className="mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Non-Disclosure Agreement</p>
                    <p className="text-[10px] text-muted-foreground">Visitor agrees to company confidentiality terms</p>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <Checkbox checked={form.safetyAccepted} onCheckedChange={(v) => updateForm("safetyAccepted", !!v)} className="mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Safety Induction</p>
                    <p className="text-[10px] text-muted-foreground">Visitor acknowledges safety guidelines and emergency procedures</p>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <Checkbox checked={form.privacyAccepted} onCheckedChange={(v) => updateForm("privacyAccepted", !!v)} className="mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Privacy Consent *</p>
                    <p className="text-[10px] text-muted-foreground">Visitor consents to data collection and processing</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <Button
                className="bg-teal-600 text-white hover:bg-teal-700"
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                onClick={() => setStep(step + 1)}
              >
                Continue
              </Button>
            ) : (
              <Button
                className="bg-teal-600 text-white hover:bg-teal-700"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                <UserCheck className="w-4 h-4 mr-2" /> Check In Visitor
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Scan Dialog (QR / RFID / NFC) */}
      <Dialog open={scanOpen} onOpenChange={(open) => { setScanOpen(open); if (!open) { setQrScanning(false); setQrResult(null); setScanError(null); } }}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {scanMode === "qr" ? "Scan Visitor QR Code" : scanMode === "rfid" ? "Tap RFID Card" : "Tap NFC Token"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {scanMode === "qr"
                ? "Point the scanner at the visitor's QR invitation"
                : scanMode === "rfid"
                ? "Hold the RFID card near the reader"
                : "Tap the NFC badge or phone on the reader"}
            </DialogDescription>
          </DialogHeader>

          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "qr", label: "QR", icon: QrCode },
              { id: "rfid", label: "RFID", icon: Radio },
              { id: "nfc", label: "NFC", icon: Nfc },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => { setScanMode(m.id); runScan(m.id); }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                  scanMode === m.id ? "border-teal-600 bg-teal-500/10 text-teal-600" : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <m.icon className="w-3.5 h-3.5" /> {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4 py-2">
            {/* Scanner viewport */}
            <div className={`w-56 h-56 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all ${
              qrResult ? "border-success/50 bg-success/5" : scanError ? "border-destructive/50 bg-destructive/5" : qrScanning ? "border-teal-500/50 bg-teal-500/5" : "border-border bg-muted/20"
            }`}>
              {qrScanning ? (
                <div className="flex flex-col items-center gap-3">
                  {scanMode === "qr"
                    ? <ScanLine className="w-10 h-10 text-teal-600 animate-pulse" />
                    : scanMode === "rfid"
                    ? <Radio className="w-10 h-10 text-teal-600 animate-pulse" />
                    : <Nfc className="w-10 h-10 text-teal-600 animate-pulse" />}
                  <p className="text-xs text-muted-foreground">
                    {scanMode === "qr" ? "Scanning QR…" : scanMode === "rfid" ? "Reading RFID…" : "Listening for NFC…"}
                  </p>
                  <Wifi className="w-3 h-3 text-teal-600 animate-pulse" />
                </div>
              ) : qrResult ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-success" />
                  <p className="text-xs text-success font-medium">Match Found</p>
                </div>
              ) : scanError ? (
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                  <p className="text-xs text-destructive font-medium">{scanError}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  {scanMode === "qr" ? <QrCode className="w-10 h-10 text-muted-foreground" /> : scanMode === "rfid" ? <Radio className="w-10 h-10 text-muted-foreground" /> : <Nfc className="w-10 h-10 text-muted-foreground" />}
                  <p className="text-xs text-muted-foreground">Ready to scan</p>
                </div>
              )}
            </div>

            {/* Token line */}
            {(qrResult?.token || (qrScanning && scanMode !== "qr")) && (
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider">
                {qrResult?.token ?? "····  ····  ····"}
              </div>
            )}

            {/* Result card */}
            {qrResult && (
              <div className="w-full bg-muted/30 rounded-lg p-4 border border-border/50 space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-sm font-semibold text-teal-600">
                    {qrResult.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{qrResult.name}</p>
                    <p className="text-xs text-muted-foreground">{qrResult.company}</p>
                  </div>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[qrResult.type]}`}>{qrResult.type}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                  <div><span className="text-muted-foreground">Host:</span> <span className="text-foreground font-medium">{qrResult.host}</span></div>
                  <div><span className="text-muted-foreground">Time:</span> <span className="text-foreground font-medium">{qrResult.time}</span></div>
                  <div><span className="text-muted-foreground">Dept:</span> <span className="text-foreground font-medium">{qrResult.department}</span></div>
                  <div><span className="text-muted-foreground">Purpose:</span> <span className="text-foreground font-medium truncate">{qrResult.purpose}</span></div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {!qrResult ? (
              <>
                <Button variant="outline" onClick={() => setScanOpen(false)}>Cancel</Button>
                {scanError && <Button onClick={() => runScan(scanMode)}>Retry</Button>}
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => runScan(scanMode)}>
                  <ScanLine className="w-4 h-4 mr-2" /> Scan Again
                </Button>
                <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={handleQrCheckIn}>
                  <UserCheck className="w-4 h-4 mr-2" /> Check In
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={callHostOpen} onOpenChange={setCallHostOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </span>
              Call a Host
            </DialogTitle>
            <DialogDescription className="text-xs">Filter by branch, department, or employee.</DialogDescription>
          </DialogHeader>

          {(() => {
            const branchOptions = Array.from(
              new Set(hostEmployees.map((e) => e.branchName).filter(Boolean))
            ).sort();
            const deptOptions = Array.from(
              new Set(
                hostEmployees
                  .filter((e) => !callHostBranch || e.branchName === callHostBranch)
                  .map((e) => e.departmentName)
                  .filter(Boolean)
              )
            ).sort();
            const employeeOptions = hostEmployees
              .filter((e) => !callHostBranch || e.branchName === callHostBranch)
              .filter((e) => !callHostDept || e.departmentName === callHostDept);

            const q = callHostQuery.trim().toLowerCase();
            const list = hostEmployees
              .filter((e) => !callHostBranch || e.branchName === callHostBranch)
              .filter((e) => !callHostDept || e.departmentName === callHostDept)
              .filter((e) => !callHostEmployeeId || String(e.id) === String(callHostEmployeeId))
              .filter((e) => {
                if (!q) return true;
                return [e.name, e.departmentName, e.branchName, e.phone, e.employeeId]
                  .filter(Boolean)
                  .some((s) => String(s).toLowerCase().includes(q));
              });

            return (
              <>
                <div className="px-5 py-3 border-b border-border space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={callHostBranch || "__all"}
                      onValueChange={(v) => {
                        const next = v === "__all" ? "" : v;
                        setCallHostBranch(next);
                        setCallHostDept("");
                        setCallHostEmployeeId("");
                      }}
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder="All Branches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">All Branches</SelectItem>
                        {branchOptions.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={callHostDept || "__all"}
                      onValueChange={(v) => {
                        const next = v === "__all" ? "" : v;
                        setCallHostDept(next);
                        setCallHostEmployeeId("");
                      }}
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">All Departments</SelectItem>
                        {deptOptions.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={callHostEmployeeId || "__all"}
                      onValueChange={(v) => setCallHostEmployeeId(v === "__all" ? "" : v)}
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder="All Employees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">All Employees</SelectItem>
                        {employeeOptions.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, department, or phone"
                      value={callHostQuery}
                      onChange={(e) => setCallHostQuery(e.target.value)}
                      className="pl-9 dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10"
                    />
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
                  {list.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                      {hostEmployees.length === 0 ? "Loading employees…" : "No employees match the filters."}
                    </div>
                  ) : (
                    list.slice(0, 200).map((e) => {
                      const initials = e.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      const cleanPhone = String(e.phone || "").replace(/\s+/g, "");
                      return (
                        <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {e.profile ? (
                              <img
                                src={e.profile}
                                alt={e.name}
                                className="w-full h-full object-cover"
                                onError={(ev) => { ev.currentTarget.style.display = "none"; ev.currentTarget.parentNode.textContent = initials; }}
                              />
                            ) : (
                              initials || "?"
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground truncate">{e.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {[e.departmentName, e.branchName].filter(Boolean).join(" · ") || "—"}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {cleanPhone ? (
                              <div className="text-xs font-mono text-foreground tabular-nums">{e.phone}</div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">No number</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={openGateOpen} onOpenChange={setOpenGateOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DoorOpen className="w-4 h-4" />
              </span>
              Open Gate
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pick a device to unlock. You'll be asked for the device PIN next.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const q = gateSearch.trim().toLowerCase();
            const filtered = gateDevices
              .filter((d) => {
                if (!q) return true;
                return [d.name, d.device_id, d?.branch?.branch_name]
                  .filter(Boolean)
                  .some((s) => String(s).toLowerCase().includes(q));
              })
              .sort((a, b) => {
                const ao = a.status_id == 1 ? 0 : 1;
                const bo = b.status_id == 1 ? 0 : 1;
                if (ao !== bo) return ao - bo;
                return String(a.name || "").localeCompare(String(b.name || ""));
              });
            const onlineCount = gateDevices.filter((d) => d.status_id == 1).length;

            return (
              <>
                <div className="px-5 py-3 border-b border-border space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Search device by name or branch"
                      className="pl-9 dark:!bg-slate-900 dark:!text-slate-200 dark:!border-white/10"
                      value={gateSearch}
                      onChange={(e) => setGateSearch(e.target.value)}
                    />
                  </div>
                  {!gateLoading && gateDevices.length > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{filtered.length} device{filtered.length === 1 ? "" : "s"}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {onlineCount} online · {gateDevices.length - onlineCount} offline
                      </span>
                    </div>
                  )}
                </div>

                <div className="max-h-[360px] overflow-y-auto px-3 py-2">
                  {gateLoading ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                      Loading devices…
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="py-10 text-center">
                      <DoorOpen className="w-7 h-7 mx-auto text-muted-foreground/50 mb-2" />
                      <div className="text-sm text-muted-foreground">
                        {gateDevices.length === 0 ? "No devices registered." : "No devices match your search."}
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {filtered.map((d) => {
                        const online = d.status_id == 1;
                        return (
                          <li key={d.device_id}>
                            <button
                              onClick={() => online && handleGateDevicePick(d)}
                              disabled={!online}
                              className={`group w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                                online
                                  ? "border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5"
                                  : "border-border/60 bg-card/60 opacity-60 cursor-not-allowed"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${
                                  online
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  <DoorOpen className="w-4 h-4" />
                                  {online && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-foreground truncate">
                                    {d.name || d.device_id}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate">
                                    {d?.branch?.branch_name || "No branch"} · {d.device_id}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                  online ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                }`}>
                                  {online ? "Online" : "Offline"}
                                </span>
                                {online && (
                                  <span className="hidden group-hover:inline-flex items-center text-emerald-600 dark:text-emerald-400">
                                    <ChevronRight className="w-4 h-4" />
                                  </span>
                                )}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    PIN required after selection
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenGateOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <PinEntryModal
        device_id={gateActiveDeviceId}
        pinModal={gatePinModal}
        setPinModal={setGatePinModal}
        onSuccess={async (pin) => {
          try {
            const r = await openDoor({ device_id: gateActiveDeviceId, otp: pin });
            if (r?.status) {
              toast.success(r?.message || "Door opened");
            } else {
              toast.error("Door open command failed");
            }
          } catch (e) {
            toast.error("Failed to open door", { description: parseApiError(e) });
          } finally {
            setGatePinModal(false);
          }
        }}
      />
    </div>
  );
}
