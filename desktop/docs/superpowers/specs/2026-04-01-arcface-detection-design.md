# ArcFace Face Detection & Recognition System — Design Spec

## Overview

Add real-time multi-face detection and employee recognition to MyTime2Cloud's live camera system using ArcFace (InsightFace buffalo_l model). Employees register their face via live camera capture; during live streaming, detected faces are matched against stored embeddings and employee names are overlaid on the video.

## Architecture

### Services

| Service | Tech | Port | Role |
|---------|------|------|------|
| Frontend | Next.js | 3001 | UI — live stream, registration page, detection overlay |
| Backend | Laravel/PHP | 8000 | Employee CRUD, camera credentials API |
| Camera Proxy | Node.js | 8501 | Smooth binary JPEG video stream via WebSocket |
| Camera Service | Python/FastAPI | 8500 | ArcFace detection, recognition, face registration |
| Database | MySQL | 3306 | Existing shared DB — employees + face embeddings |

### Data Flow

**Registration (one-time per employee):**
```
Employee stands in front of camera
→ Frontend captures frame (base64)
→ POST /register/{employee_id} to Python service
→ ArcFace detects face, extracts 512-dim embedding
→ Stores in employee_face_embeddings table
→ Repeat 10-15 times per employee for accuracy
```

**Live Detection (real-time):**
```
On service startup → Load all embeddings from MySQL into memory
Camera RTSP → ArcFace detects all faces in frame
→ Generate embedding per face
→ Cosine similarity vs stored embeddings
→ Match > 0.4 threshold = recognized employee
→ Send {name, employee_id, confidence, bbox} via WebSocket to frontend
```

**Video Stream (unchanged):**
```
Camera RTSP → Camera Proxy (FFmpeg MJPEG) → Binary WebSocket → Frontend canvas
```

## Camera Service Structure

```
camera-service/
├── main.py                  ← FastAPI app + route registration
├── config.py                ← Settings from .env
├── requirements.txt         ← Dependencies
├── .env                     ← DB credentials, Laravel API URL
├── database/
│   └── connection.py        ← MySQL pool + embedding CRUD
├── services/
│   └── arcface.py           ← ArcFace engine (InsightFace buffalo_l)
├── routers/
│   ├── detect.py            ← WS /detect/{device_id} — live detection
│   ├── register.py          ← POST /register/{employee_id} — face registration
│   └── employees.py         ← GET /employees/sync — reload embeddings
├── models/                  ← ArcFace model auto-downloads here (~300MB)
└── uploads/                 ← Captured face photos (optional backup)
```

### Files to Remove (old OpenCV DNN detector)
- `services/face_recognizer.py`
- `services/stream_manager.py`
- `models/deploy.prototxt`
- `models/res10_300x300_ssd_iter_140000.caffemodel`

## Components

### ArcFace Engine (`services/arcface.py`)
- Loads InsightFace `buffalo_l` model on startup (auto-downloads first run, ~300MB)
- `detect_faces(frame)` → list of faces with bounding boxes
- `get_embedding(frame, face)` → 512-dim float32 numpy vector
- `compare(embedding, stored_embeddings, threshold=0.4)` → best match employee + score
- Cosine similarity for matching

### Database Layer (`database/connection.py`)
- Direct MySQL connection to existing shared production DB
- `load_all_embeddings(company_id)` → loads all employee embeddings into memory as `{employee_id: {name, embeddings: [np.array]}}`
- `save_embedding(employee_id, company_id, embedding_bytes)` → inserts into `employee_face_embeddings`
- `delete_embeddings(employee_id)` → removes all embeddings for an employee
- `get_employee_name(employee_id)` → fetches name from employees table

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| WS | `/detect/{device_id}` | Live face detection + recognition stream |
| POST | `/register/{employee_id}` | Register face from base64 frame |
| GET | `/employees/sync` | Reload embeddings from DB into memory |
| GET | `/health` | Health check |

### Detection WebSocket (`routers/detect.py`)
1. Accept WebSocket connection
2. Fetch RTSP credentials from Laravel API
3. Connect to camera via OpenCV
4. Every 3rd frame: ArcFace detect all faces
5. For each face: generate embedding → cosine similarity search
6. Send JSON: `{detections: [{name, employee_id, confidence, bbox: [x,y,w,h]}], count, frameWidth, frameHeight}`
7. All heavy work in background threads via `run_in_executor`

### Registration Endpoint (`routers/register.py`)
- Accepts: `{frame: base64, company_id: int}`
- ArcFace detects face in frame
- Extracts 512-dim embedding
- Stores as binary BLOB in `employee_face_embeddings`
- Returns: `{status: true, faces_found: int, total_embeddings: int}`
- Rejects if no face found in frame

## Database

### Existing Table: `employee_face_embeddings`
Already created via migration `2026_03_31_000002`:

| Column | Type | Description |
|--------|------|-------------|
| id | bigint (PK) | Auto-increment |
| employee_id | bigint (FK) | References employees.id, cascade delete |
| company_id | bigint (FK) | References companies.id, cascade delete |
| embedding | binary | 512-dim float32 vector (2048 bytes) |
| created_at | timestamp | |
| updated_at | timestamp | |

Index: composite on `[company_id, employee_id]`

No schema changes needed.

## Frontend

### New Page: Face Registration (`/live-camera/register`)
- Employee dropdown selector (search by name/ID)
- Live camera feed from device
- "Capture Face" button — captures frame, sends to `/register/{employee_id}`
- Capture count display (target: 10-15 per employee)
- Progress feedback (success/error per capture)
- "Done" button when enough captures taken

### Updated: Live Camera Stream (`/live-camera/stream`)
- Video: unchanged (camera-proxy binary WebSocket)
- Detection overlay: shows **employee names** instead of generic "Detected Face"
- Green box + name = recognized employee (confidence > 40%)
- Red box + "Unknown" = unrecognized face
- Side panel: detected employees list with confidence

### Updated: Sidebar Navigation
- Add "Register Face" link under Live Camera section

## Configuration

### camera-service/.env
```
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mytime2cloud
DB_USER=root
DB_PASS=

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

## Dependencies

### Python (requirements.txt)
```
fastapi==0.110.0
uvicorn==0.29.0
opencv-python-headless==4.9.0.80
insightface==0.7.3
onnxruntime==1.17.1
numpy==1.26.4
httpx==0.27.0
python-dotenv==1.0.1
mysql-connector-python==8.3.0
```

## Performance Expectations

| Employees | Embeddings | Search Time |
|-----------|------------|-------------|
| 100 | 1,000 | <1ms |
| 1,000 | 10,000 | ~3ms |
| 10,000 | 100,000 | ~5ms |

Detection runs every 3rd frame (~5-7 detections/sec). Video stream is completely unaffected.

## Threshold Guide

| Value | Behavior |
|-------|----------|
| 0.30 | Permissive — more matches, some false positives |
| **0.40** | **Default — good balance** |
| 0.50 | Strict — fewer false positives |
| 0.60+ | Very strict — high confidence only |

## Out of Scope (future)
- Automatic attendance logging on face recognition
- Face registration via photo upload
- Multi-camera simultaneous detection
- Face liveness detection (anti-spoofing)
