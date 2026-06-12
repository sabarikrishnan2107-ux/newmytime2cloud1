# ArcFace Face Detection & Recognition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic OpenCV DNN face detector with ArcFace (InsightFace) for real-time multi-face detection and employee recognition in MyTime2Cloud's live camera system.

**Architecture:** Python FastAPI camera-service connects directly to PostgreSQL (existing shared DB), loads employee face embeddings into memory on startup, and uses InsightFace buffalo_l model for detection + recognition. Camera proxy (Node.js) continues to handle smooth video streaming separately. Frontend gets a new face registration page and updated detection overlay with employee names.

**Tech Stack:** Python/FastAPI, InsightFace (ArcFace buffalo_l), OpenCV, PostgreSQL (psycopg2), Next.js, WebSocket

**Database:** PostgreSQL on localhost:5433, database `mytime2cloud_dev`, user `postgres`

---

## File Structure

### camera-service/ (modify existing)

| File | Action | Responsibility |
|------|--------|---------------|
| `config.py` | Modify | Add DB config, ArcFace config |
| `main.py` | Rewrite | FastAPI app with router registration, startup embedding load |
| `requirements.txt` | Modify | Add psycopg2-binary, remove websockets |
| `.env` | Modify | Add DB credentials, threshold config |
| `database/__init__.py` | Create | Package init |
| `database/connection.py` | Create | PostgreSQL pool + embedding CRUD |
| `services/arcface.py` | Create | ArcFace engine (InsightFace buffalo_l) |
| `services/face_recognizer.py` | Delete | Old OpenCV DNN detector |
| `services/stream_manager.py` | Delete | Unused stream manager |
| `routers/__init__.py` | Create | Package init |
| `routers/detect.py` | Create | WS /detect/{device_id} — live detection |
| `routers/register.py` | Create | POST /register/{employee_id} — face registration |
| `routers/employees.py` | Create | GET /employees/sync — reload embeddings |
| `models/deploy.prototxt` | Delete | Old OpenCV model |
| `models/res10_300x300_ssd_iter_140000.caffemodel` | Delete | Old OpenCV model |

### frontend-new/src/ (modify existing)

| File | Action | Responsibility |
|------|--------|---------------|
| `app/live-camera/register/page.js` | Create | Registration page route |
| `components/LiveCamera/Register.js` | Create | Face registration component |
| `components/LiveCamera/Stream.js` | Modify | Update overlay for employee names + unknown faces |
| `lib/endpoint/live-camera.js` | Modify | Add registration API functions |
| `lib/menuData.js` | Modify | Add "Register Face" to sidebar |

---

## Task 1: Clean Up Old Files + Update Dependencies

**Files:**
- Delete: `camera-service/services/face_recognizer.py`
- Delete: `camera-service/services/stream_manager.py`
- Delete: `camera-service/models/deploy.prototxt`
- Delete: `camera-service/models/res10_300x300_ssd_iter_140000.caffemodel`
- Modify: `camera-service/requirements.txt`
- Modify: `camera-service/.env`
- Modify: `camera-service/config.py`

- [ ] **Step 1: Delete old files**

```bash
cd d:/newmytime2cloud/camera-service
rm -f services/face_recognizer.py
rm -f services/stream_manager.py
rm -f models/deploy.prototxt
rm -f models/res10_300x300_ssd_iter_140000.caffemodel
```

- [ ] **Step 2: Update requirements.txt**

Replace contents of `camera-service/requirements.txt` with:

```
fastapi==0.110.0
uvicorn==0.29.0
opencv-python-headless==4.9.0.80
insightface==0.7.3
onnxruntime==1.17.1
numpy==1.26.4
httpx==0.27.0
python-dotenv==1.0.1
psycopg2-binary==2.9.9
python-multipart==0.0.9
```

- [ ] **Step 3: Install new dependencies**

```bash
cd d:/newmytime2cloud/camera-service
pip install -r requirements.txt
```

Expected: All packages install successfully. InsightFace will download the buffalo_l model (~300MB) on first use, not at install time.

- [ ] **Step 4: Update .env**

Replace contents of `camera-service/.env` with:

```env
# Database (PostgreSQL — same as Laravel backend)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=mytime2cloud_dev
DB_USER=postgres
DB_PASS=sabari12345

# Laravel API
LARAVEL_API_URL=http://localhost:8000/api
LARAVEL_API_TOKEN=

# ArcFace
FACE_SIMILARITY_THRESHOLD=0.4
FACE_DETECT_INTERVAL=3

# Service
HOST=0.0.0.0
PORT=8500
```

- [ ] **Step 5: Update config.py**

Replace contents of `camera-service/config.py` with:

```python
import os
from dotenv import load_dotenv

load_dotenv()

# Database
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5433"))
DB_NAME = os.getenv("DB_NAME", "mytime2cloud_dev")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "")

# Laravel API
LARAVEL_API_URL = os.getenv("LARAVEL_API_URL", "http://localhost:8000/api")
LARAVEL_API_TOKEN = os.getenv("LARAVEL_API_TOKEN", "")

# ArcFace
FACE_SIMILARITY_THRESHOLD = float(os.getenv("FACE_SIMILARITY_THRESHOLD", "0.4"))
FACE_DETECT_INTERVAL = int(os.getenv("FACE_DETECT_INTERVAL", "3"))

# Service
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8500"))
```

- [ ] **Step 6: Create package init files**

Create `camera-service/database/__init__.py` — empty file.
Create `camera-service/routers/__init__.py` — empty file.

```bash
mkdir -p d:/newmytime2cloud/camera-service/database
mkdir -p d:/newmytime2cloud/camera-service/routers
touch d:/newmytime2cloud/camera-service/database/__init__.py
touch d:/newmytime2cloud/camera-service/routers/__init__.py
```

---

## Task 2: Database Layer

**Files:**
- Create: `camera-service/database/connection.py`

- [ ] **Step 1: Create database/connection.py**

```python
import struct
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np

from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS


def log(msg):
    print(msg, flush=True)


def get_connection():
    """Get a PostgreSQL connection."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
    )


def load_all_embeddings(company_id: int) -> dict:
    """Load all employee face embeddings for a company into memory.

    Returns:
        {employee_id: {"name": str, "embeddings": [np.array, ...]}}
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT e.id as employee_id,
                       CONCAT(e.first_name, ' ', e.last_name) as name,
                       ef.embedding
                FROM employee_face_embeddings ef
                JOIN employees e ON e.id = ef.employee_id
                WHERE ef.company_id = %s
                ORDER BY e.id
            """, (company_id,))

            rows = cur.fetchall()

        result = {}
        for row in rows:
            eid = row["employee_id"]
            raw = row["embedding"]

            if raw is None:
                continue

            # Convert binary to numpy float32 array (512 dims = 2048 bytes)
            if isinstance(raw, memoryview):
                raw = bytes(raw)
            embedding = np.frombuffer(raw, dtype=np.float32)

            if eid not in result:
                result[eid] = {"name": row["name"], "embeddings": []}
            result[eid]["embeddings"].append(embedding)

        log(f"Loaded {sum(len(v['embeddings']) for v in result.values())} embeddings for {len(result)} employees")
        return result

    finally:
        conn.close()


def save_embedding(employee_id: int, company_id: int, embedding: np.ndarray) -> int:
    """Save a face embedding to the database.

    Args:
        employee_id: Employee ID
        company_id: Company ID
        embedding: 512-dim float32 numpy array

    Returns:
        Inserted row ID
    """
    conn = get_connection()
    try:
        embedding_bytes = embedding.astype(np.float32).tobytes()

        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO employee_face_embeddings (employee_id, company_id, embedding, created_at, updated_at)
                VALUES (%s, %s, %s, NOW(), NOW())
                RETURNING id
            """, (employee_id, company_id, psycopg2.Binary(embedding_bytes)))

            row_id = cur.fetchone()[0]

        conn.commit()
        log(f"Saved embedding for employee {employee_id} (row {row_id})")
        return row_id

    finally:
        conn.close()


def delete_embeddings(employee_id: int) -> int:
    """Delete all embeddings for an employee.

    Returns:
        Number of rows deleted
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM employee_face_embeddings WHERE employee_id = %s",
                (employee_id,),
            )
            count = cur.rowcount
        conn.commit()
        log(f"Deleted {count} embeddings for employee {employee_id}")
        return count
    finally:
        conn.close()


def get_embedding_count(employee_id: int) -> int:
    """Get number of stored embeddings for an employee."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM employee_face_embeddings WHERE employee_id = %s",
                (employee_id,),
            )
            return cur.fetchone()[0]
    finally:
        conn.close()


def get_employee_name(employee_id: int) -> str | None:
    """Fetch employee full name."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT CONCAT(first_name, ' ', last_name) FROM employees WHERE id = %s",
                (employee_id,),
            )
            row = cur.fetchone()
            return row[0] if row else None
    finally:
        conn.close()
```

- [ ] **Step 2: Verify DB connection**

```bash
cd d:/newmytime2cloud/camera-service
python -c "from database.connection import get_connection; c = get_connection(); print('DB OK'); c.close()"
```

Expected: `DB OK`

---

## Task 3: ArcFace Engine

**Files:**
- Create: `camera-service/services/arcface.py`

- [ ] **Step 1: Create services/arcface.py**

```python
import os
import numpy as np

_app = None


def log(msg):
    print(msg, flush=True)


def get_app():
    """Lazy-load the InsightFace app (downloads model on first run ~300MB)."""
    global _app
    if _app is None:
        from insightface.app import FaceAnalysis

        model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
        os.makedirs(model_dir, exist_ok=True)

        log("Loading ArcFace model (buffalo_l)... first run downloads ~300MB")
        _app = FaceAnalysis(
            name="buffalo_l",
            root=model_dir,
            providers=["CPUExecutionProvider"],
        )
        _app.prepare(ctx_id=-1, det_size=(640, 640))
        log("ArcFace model loaded successfully")

    return _app


def detect_faces(frame: np.ndarray) -> list:
    """Detect all faces in a frame.

    Args:
        frame: BGR image as numpy array from OpenCV

    Returns:
        List of insightface Face objects with bbox, embedding, etc.
    """
    app = get_app()
    faces = app.get(frame)
    return faces


def get_embedding(face) -> np.ndarray:
    """Extract the 512-dim embedding from a detected face.

    Args:
        face: InsightFace Face object from detect_faces()

    Returns:
        512-dim float32 numpy array (normalized)
    """
    return face.normed_embedding


def face_to_bbox(face) -> list:
    """Convert InsightFace face bbox to [x, y, w, h] format.

    Args:
        face: InsightFace Face object

    Returns:
        [x, y, width, height] as integers
    """
    box = face.bbox.astype(int)
    x1, y1, x2, y2 = box[0], box[1], box[2], box[3]
    return [int(x1), int(y1), int(x2 - x1), int(y2 - y1)]


def compare_embedding(
    embedding: np.ndarray,
    stored_embeddings: dict,
    threshold: float = 0.4,
) -> dict | None:
    """Compare a face embedding against all stored employee embeddings.

    Args:
        embedding: 512-dim float32 array from the detected face
        stored_embeddings: {employee_id: {"name": str, "embeddings": [np.array, ...]}}
        threshold: Minimum cosine similarity to consider a match

    Returns:
        {"employee_id": int, "name": str, "confidence": float} or None if no match
    """
    best_match = None
    best_score = -1.0

    for emp_id, emp_data in stored_embeddings.items():
        for stored_emb in emp_data["embeddings"]:
            # Cosine similarity
            score = float(np.dot(embedding, stored_emb) / (
                np.linalg.norm(embedding) * np.linalg.norm(stored_emb) + 1e-8
            ))

            if score > best_score:
                best_score = score
                best_match = {
                    "employee_id": emp_id,
                    "name": emp_data["name"],
                    "confidence": round(score, 3),
                }

    if best_match and best_score >= threshold:
        return best_match

    return None
```

- [ ] **Step 2: Verify ArcFace loads**

```bash
cd d:/newmytime2cloud/camera-service
python -c "from services.arcface import get_app; get_app(); print('ArcFace OK')"
```

Expected: Model downloads on first run (~300MB), then prints `ArcFace OK`. Subsequent runs load from cache instantly.

---

## Task 4: Detection Router (WebSocket)

**Files:**
- Create: `camera-service/routers/detect.py`

- [ ] **Step 1: Create routers/detect.py**

```python
import asyncio
import cv2
import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from urllib.parse import quote

from config import LARAVEL_API_URL, LARAVEL_API_TOKEN, FACE_SIMILARITY_THRESHOLD, FACE_DETECT_INTERVAL
from services import arcface
from database.connection import load_all_embeddings

router = APIRouter()

# In-memory cache of employee embeddings, keyed by company_id
_embeddings_cache = {}


def log(msg):
    print(msg, flush=True)


def get_embeddings(company_id: int) -> dict:
    """Get cached embeddings or load from DB."""
    if company_id not in _embeddings_cache:
        _embeddings_cache[company_id] = load_all_embeddings(company_id)
    return _embeddings_cache[company_id]


def refresh_embeddings(company_id: int):
    """Force refresh embeddings from DB."""
    _embeddings_cache[company_id] = load_all_embeddings(company_id)


async def fetch_camera_credentials(device_id: str) -> dict | None:
    """Fetch RTSP credentials from Laravel API."""
    try:
        headers = {}
        if LARAVEL_API_TOKEN and LARAVEL_API_TOKEN.strip():
            headers["Authorization"] = f"Bearer {LARAVEL_API_TOKEN}"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LARAVEL_API_URL}/camera/{device_id}/credentials",
                headers=headers,
            )
            data = response.json()
            if data.get("status"):
                return data["data"]
    except Exception as e:
        log(f"Error fetching credentials: {e}")
    return None


def build_rtsp_url(creds: dict) -> str:
    """Build RTSP URL from credentials."""
    ip = creds["camera_rtsp_ip"]
    port = creds.get("camera_rtsp_port") or 554
    user = creds.get("camera_username", "")
    password = creds.get("camera_password", "")

    if user and password:
        return f"rtsp://{quote(user, safe='')}:{quote(password, safe='')}@{ip}:{port}/Streaming/Channels/101"
    return f"rtsp://{ip}:{port}/Streaming/Channels/101"


@router.websocket("/detect/{device_id}")
async def detect_stream(websocket: WebSocket, device_id: str):
    await websocket.accept()
    log(f"=== Detection connected for device {device_id} ===")

    cap = None
    try:
        # Fetch credentials
        creds = await fetch_camera_credentials(device_id)
        if not creds:
            await websocket.send_json({"error": "Camera not found"})
            await websocket.close()
            return

        await websocket.send_json({"status": "connecting", "message": "Connecting to camera..."})

        rtsp_url = build_rtsp_url(creds)

        # Get company_id from credentials (branch → company lookup via creds)
        company_id = creds.get("company_id")
        if not company_id:
            # Fallback: fetch from device info
            company_id = 1

        # Pre-load embeddings
        stored = get_embeddings(company_id)
        log(f"Loaded embeddings for company {company_id}: {len(stored)} employees")

        # Open RTSP
        loop = asyncio.get_event_loop()
        cap = await loop.run_in_executor(
            None, lambda: cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        )

        if not cap.isOpened():
            await websocket.send_json({"error": "Failed to connect to camera"})
            await websocket.close()
            return

        await websocket.send_json({"status": "detecting", "message": "Face detection active"})
        log("Detection stream active — ArcFace running")

        frame_count = 0
        while True:
            ret, frame = await loop.run_in_executor(None, cap.read)
            if not ret:
                log("Detection: failed to read frame")
                break

            frame_count += 1
            if frame_count % FACE_DETECT_INTERVAL != 0:
                await asyncio.sleep(0.01)
                continue

            # Run ArcFace detection in background thread
            faces = await loop.run_in_executor(None, arcface.detect_faces, frame)

            detections = []
            for face in faces:
                embedding = arcface.get_embedding(face)
                bbox = arcface.face_to_bbox(face)

                # Match against stored embeddings
                match = arcface.compare_embedding(
                    embedding, stored, FACE_SIMILARITY_THRESHOLD
                )

                if match:
                    detections.append({
                        "name": match["name"],
                        "employee_id": match["employee_id"],
                        "confidence": match["confidence"],
                        "bbox": bbox,
                        "recognized": True,
                    })
                else:
                    detections.append({
                        "name": "Unknown",
                        "employee_id": None,
                        "confidence": 0.0,
                        "bbox": bbox,
                        "recognized": False,
                    })

            await websocket.send_json({
                "detections": detections,
                "count": len(detections),
                "frameWidth": frame.shape[1],
                "frameHeight": frame.shape[0],
            })

            if frame_count % 30 == 0:
                recognized = sum(1 for d in detections if d["recognized"])
                log(f"Frame #{frame_count}: {len(detections)} faces ({recognized} recognized)")

            await asyncio.sleep(0.03)

    except WebSocketDisconnect:
        log("Detection client disconnected")
    except Exception as e:
        log(f"Detection error: {type(e).__name__}: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
    finally:
        if cap is not None:
            await asyncio.get_event_loop().run_in_executor(None, cap.release)
        log("=== Detection stream closed ===")
```

---

## Task 5: Registration Router

**Files:**
- Create: `camera-service/routers/register.py`

- [ ] **Step 1: Create routers/register.py**

```python
import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services import arcface
from database.connection import save_embedding, get_embedding_count, get_employee_name

router = APIRouter()


def log(msg):
    print(msg, flush=True)


class RegisterRequest(BaseModel):
    frame: str  # base64 encoded JPEG image
    company_id: int


@router.post("/register/{employee_id}")
async def register_face(employee_id: int, body: RegisterRequest):
    """Register an employee's face from a camera capture.

    Detects the face in the frame, extracts the ArcFace embedding,
    and stores it in the database. Call multiple times (10-15) per
    employee for best accuracy.
    """
    # Verify employee exists
    name = get_employee_name(employee_id)
    if not name:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Decode base64 frame
    try:
        img_bytes = base64.b64decode(body.frame)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data")

    if frame is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    # Detect faces
    faces = arcface.detect_faces(frame)

    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected in the image. Ensure face is clearly visible.")

    if len(faces) > 1:
        raise HTTPException(status_code=400, detail=f"Multiple faces detected ({len(faces)}). Only one person should be in frame during registration.")

    # Extract embedding from the single face
    face = faces[0]
    embedding = arcface.get_embedding(face)

    # Save to database
    row_id = save_embedding(employee_id, body.company_id, embedding)

    # Get updated count
    total = get_embedding_count(employee_id)

    log(f"Registered face for {name} (employee {employee_id}), total embeddings: {total}")

    return {
        "status": True,
        "message": f"Face registered for {name}",
        "data": {
            "employee_id": employee_id,
            "name": name,
            "embedding_id": row_id,
            "total_embeddings": total,
        }
    }


@router.delete("/register/{employee_id}")
async def delete_faces(employee_id: int):
    """Delete all face embeddings for an employee."""
    from database.connection import delete_embeddings

    name = get_employee_name(employee_id)
    if not name:
        raise HTTPException(status_code=404, detail="Employee not found")

    count = delete_embeddings(employee_id)

    return {
        "status": True,
        "message": f"Deleted {count} embeddings for {name}",
        "data": {"employee_id": employee_id, "deleted": count},
    }
```

---

## Task 6: Employees Sync Router + Main App

**Files:**
- Create: `camera-service/routers/employees.py`
- Rewrite: `camera-service/main.py`

- [ ] **Step 1: Create routers/employees.py**

```python
from fastapi import APIRouter, Query

from routers.detect import refresh_embeddings, get_embeddings

router = APIRouter()


@router.get("/employees/sync")
async def sync_embeddings(company_id: int = Query(default=1)):
    """Force reload employee embeddings from the database into memory.

    Call this after registering new faces or deleting embeddings
    so live detection picks up the changes immediately.
    """
    refresh_embeddings(company_id)
    stored = get_embeddings(company_id)

    total_embeddings = sum(len(v["embeddings"]) for v in stored.values())

    return {
        "status": True,
        "message": f"Synced {total_embeddings} embeddings for {len(stored)} employees",
        "data": {
            "company_id": company_id,
            "employees": len(stored),
            "total_embeddings": total_embeddings,
        }
    }
```

- [ ] **Step 2: Rewrite main.py**

Replace contents of `camera-service/main.py` with:

```python
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import HOST, PORT
from routers import detect, register, employees

app = FastAPI(title="MyTime2Cloud Camera Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(detect.router)
app.include_router(register.router)
app.include_router(employees.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "camera-service", "model": "arcface-buffalo_l"}


def log(msg):
    print(msg, flush=True)


if __name__ == "__main__":
    log(f"Starting camera service on {HOST}:{PORT}")
    uvicorn.run("main:app", host=HOST, port=PORT)
```

- [ ] **Step 3: Test the service starts**

```bash
cd d:/newmytime2cloud/camera-service
python main.py
```

Expected: Service starts on port 8500. ArcFace model downloads on first request (not startup).

- [ ] **Step 4: Test health endpoint**

```bash
curl http://localhost:8500/health
```

Expected: `{"status":"ok","service":"camera-service","model":"arcface-buffalo_l"}`

---

## Task 7: Frontend — API Endpoint Functions

**Files:**
- Modify: `frontend-new/src/lib/endpoint/live-camera.js`

- [ ] **Step 1: Add registration API functions**

Add to end of `frontend-new/src/lib/endpoint/live-camera.js`:

```javascript
const CAMERA_SERVICE_URL = process.env.NEXT_PUBLIC_CAMERA_SERVICE_HTTP_URL || "http://localhost:8500";

export const registerFace = async (employeeId, frame, companyId) => {
    const response = await fetch(`${CAMERA_SERVICE_URL}/register/${employeeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame, company_id: companyId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Registration failed");
    return data;
};

export const deleteFaceEmbeddings = async (employeeId) => {
    const response = await fetch(`${CAMERA_SERVICE_URL}/register/${employeeId}`, {
        method: "DELETE",
    });
    return await response.json();
};

export const syncEmbeddings = async (companyId = 1) => {
    const response = await fetch(`${CAMERA_SERVICE_URL}/employees/sync?company_id=${companyId}`);
    return await response.json();
};
```

- [ ] **Step 2: Add env var to .env.local**

Add to `frontend-new/.env.local`:

```
NEXT_PUBLIC_CAMERA_SERVICE_HTTP_URL=http://localhost:8500
```

---

## Task 8: Frontend — Face Registration Page

**Files:**
- Create: `frontend-new/src/app/live-camera/register/page.js`
- Create: `frontend-new/src/components/LiveCamera/Register.js`

- [ ] **Step 1: Create the route page**

Create `frontend-new/src/app/live-camera/register/page.js`:

```jsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Register from "@/components/LiveCamera/Register";

function RegisterContent() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get("id");

  if (!deviceId) {
    return <div className="p-10 text-slate-400">No device ID provided.</div>;
  }

  return (
    <div className="p-10">
      <Register deviceId={deviceId} />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-10 text-slate-400">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Create the Register component**

Create `frontend-new/src/components/LiveCamera/Register.js`:

```jsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCameraStatus, registerFace, syncEmbeddings } from "@/lib/endpoint/live-camera";
import { parseApiError } from "@/lib/utils";
import { api } from "@/lib/api-client";

const PROXY_URL = process.env.NEXT_PUBLIC_CAMERA_PROXY_URL || "ws://localhost:8501";

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

    const ws = new WebSocket(`${PROXY_URL}/stream/${deviceId}`);
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
```

---

## Task 9: Frontend — Update Stream Overlay

**Files:**
- Modify: `frontend-new/src/components/LiveCamera/Stream.js`

- [ ] **Step 1: Update detection overlay colors**

In `frontend-new/src/components/LiveCamera/Stream.js`, replace the detection overlay drawing block (the `dets.forEach` section inside the `renderFrame` callback, approximately lines 77-99) with:

```javascript
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
```

- [ ] **Step 2: Update detection side panel**

In the same file, replace the detection list rendering (the `detections.map` section, approximately lines 284-303) with:

```jsx
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
                    </div>
                  </div>
                ))}
```

---

## Task 10: Frontend — Sidebar Navigation + Register Link

**Files:**
- Modify: `frontend-new/src/lib/menuData.js`

- [ ] **Step 1: Add register page to sidebar route map**

In `frontend-new/src/lib/menuData.js`, add after the `/live-camera/stream` entry (approximately line 129):

```javascript
  "/live-camera/register": companyMenu,
```

- [ ] **Step 2: Add env var to .env.local**

Ensure `frontend-new/.env.local` has:

```
NEXT_PUBLIC_CAMERA_SERVICE_HTTP_URL=http://localhost:8500
```

---

## Task 11: Add Register Button to Camera List Page

**Files:**
- Modify: `frontend-new/src/components/LiveCamera/Page.js`

- [ ] **Step 1: Add Register Face button to the camera list page header**

In `frontend-new/src/components/LiveCamera/Page.js`, add a "Register Face" button next to the branch filter. After the `MultiDropDown` closing div (approximately line 88), add:

```jsx
          <button
            onClick={() => {
              if (cameras.length > 0) {
                router.push(`/live-camera/register?id=${cameras[0].id}`);
              }
            }}
            disabled={cameras.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">face</span>
            Register Face
          </button>
```

---

## Task 12: Update credentials endpoint to include company_id

**Files:**
- Modify: `backend/app/Http/Controllers/CameraStreamController.php`

- [ ] **Step 1: Add company_id to credentials response**

In `backend/app/Http/Controllers/CameraStreamController.php`, in the `credentials()` method response array (approximately line 80), add `company_id`:

```php
        return response()->json([
            'status' => true,
            'data' => [
                'rtsp_url' => null,
                'camera_rtsp_ip' => $device->camera_rtsp_ip,
                'camera_rtsp_port' => $device->camera_rtsp_port,
                'camera_username' => $device->camera_username,
                'camera_password' => $password,
                'device_name' => $device->name,
                'branch_id' => $device->branch_id,
                'company_id' => $device->company_id,
            ]
        ]);
```

---

## Verification Checklist

After all tasks are complete, verify:

1. `curl http://localhost:8500/health` returns OK
2. Registration page loads at `http://localhost:3001/live-camera/register?id=301`
3. Can select an employee and capture 10+ faces
4. Live stream at `http://localhost:3001/live-camera/stream?id=301` shows:
   - Green boxes with employee names for recognized faces
   - Red boxes with "Unknown" for unrecognized faces
5. `curl http://localhost:8500/employees/sync?company_id=1` reloads embeddings
