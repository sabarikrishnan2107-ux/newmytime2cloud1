# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for the standalone face validator.

Produces a onedir build at  dist/face-service/face-service.exe  with every
runtime dependency frozen in — so a target PC needs NO Python and NO pip install.

Build with build-face.bat (it stages the InsightFace model pack into ./models
first, which this spec bundles into the exe so nothing is downloaded at runtime).

onedir (not onefile) is deliberate: the buffalo_l pack is ~330 MB and onefile
would re-extract it to a temp dir on every launch. onedir just sits in a folder.
"""

import os

from PyInstaller.utils.hooks import collect_all, collect_data_files

datas = []
binaries = []
hiddenimports = []

# Pull in data files, dynamic libs, and submodules for the heavy native packages.
# mediapipe ships .tflite/.binarypb graphs; insightface/cv2 ship DLLs.
# NOTE: onnxruntime is handled separately below — collect_all crashes on it
# (access violation enumerating onnxruntime.quantization submodules).
for pkg in ("mediapipe", "insightface", "cv2", "sklearn", "skimage", "scipy"):
    try:
        d, b, h = collect_all(pkg)
        datas += d
        binaries += b
        hiddenimports += h
    except Exception as exc:  # a package may be absent (e.g. optional) — keep going
        print(f"[spec] collect_all({pkg!r}) skipped: {exc}")

# --- onnxruntime (the InsightFace inference engine) -------------------------
# collect_all() segfaults importing onnxruntime.quantization, so gather it by
# hand. v1.18 ships the engine inside onnxruntime_pybind11_state.pyd plus
# onnxruntime_providers_shared.dll in capi/. collect_dynamic_libs only matches
# *.dll (not the .pyd), so add the capi natives explicitly.
import onnxruntime as _ort  # noqa: E402

_ort_capi = os.path.join(os.path.dirname(_ort.__file__), "capi")
for _fn in os.listdir(_ort_capi):
    if _fn.endswith((".dll", ".pyd")):
        binaries.append((os.path.join(_ort_capi, _fn), "onnxruntime/capi"))
datas += collect_data_files("onnxruntime")
hiddenimports += [
    "onnxruntime",
    "onnxruntime.capi",
    "onnxruntime.capi._pybind_state",
    "onnxruntime.capi.onnxruntime_inference_collection",
]

# uvicorn loads its protocol/loop implementations dynamically, so PyInstaller's
# static analysis misses them — name them explicitly.
hiddenimports += [
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.loops.asyncio",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "anyio",
    "anyio._backends",
    "anyio._backends._asyncio",
]

# Bundle the InsightFace model pack. build-face.bat copies it into ./models so
# it lands at <bundle>/insightface/models/buffalo_l/*.onnx — matching the path
# app/face_model.py points FaceAnalysis(root=...) at when frozen.
datas += [("models/buffalo_l", "insightface/models/buffalo_l")]

a = Analysis(
    ["run.py"],
    pathex=["."],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    # matplotlib stays IN — mediapipe.solutions imports it on load (drawing_utils).
    excludes=["torch", "tensorflow", "tkinter"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="face-service",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="face-service",
)
