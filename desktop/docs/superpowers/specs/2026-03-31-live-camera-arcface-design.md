# Live Camera with ArcFace Face Recognition — Design Spec

## Overview

Add RTSP IP camera support to existing devices, with a new Live Camera page for viewing connected cameras and a dedicated streaming page that uses ArcFace face recognition to identify employees in real-time.

## Scope

- **Phase 1 (this spec):** Camera fields on devices, Live Camera list page, live stream page with ArcFace overlay
- **Phase 2 (future):** Attendance logging from face recognition

---

## 1. Database

### 1.1 Migration: Add columns to `devices` table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| camera_rtsp_ip | varchar(255), nullable | null | RTSP IP address |
| camera_rtsp_port | int, nullable | 554 | RTSP port |
| camera_username | varchar(255), nullable | null | Camera auth username |
| camera_password | varchar(255), nullable | null | Camera auth password (encrypted) |

### 1.2 New table: `employee_face_embeddings`

| Column | Type | Description |
|--------|------|-------------|
| id | bigint unsigned, PK | Auto increment |
| employee_id | bigint unsigned, FK | References employees.id |
| company_id | bigint unsigned, FK | References companies.id |
| embedding | blob | ArcFace 512-dimensional face vector |
| created_at | timestamp | |
| updated_at | timestamp | |

- Index on `(company_id, employee_id)`

---

## 2. Backend (Laravel)

### 2.1 Migration

- `add_camera_fields_to_devices_table` — adds 4 camera columns
- `create_employee_face_embeddings_table` — new table

### 2.2 Device Controller Updates

- **store()**: Accept `camera_rtsp_ip`, `camera_rtsp_port`, `camera_username`, `camera_password`
- **update()**: Same fields
- `camera_password` encrypted via Laravel `Crypt::encryptString()` on save, decrypted on read

### 2.3 Device Validation Updates

- `camera_rtsp_ip`: nullable, ip
- `camera_rtsp_port`: nullable, integer, min:1, max:65535
- `camera_username`: nullable, string, max:255
- `camera_password`: nullable, string, max:255

### 2.4 New Controller: CameraStreamController

**Endpoints:**

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/cameras | List devices with camera_rtsp_ip set (paginated, with branch info) |
| GET | /api/camera/{device_id}/status | Check RTSP connection status |
| GET | /api/camera/{device_id}/credentials | Return decrypted RTSP credentials (for Python service only, internal) |

### 2.5 New Route File: `routes/camera-stream.php`

Register in `RouteServiceProvider` with `auth:sanctum` middleware.

### 2.6 EmployeeFaceEmbedding Model

- `fillable`: employee_id, company_id, embedding
- Relationships: belongsTo Employee, belongsTo Company

---

## 3. Frontend — Device Create/Edit Side Panels

### 3.1 New Fields (below Status dropdown)

- **Camera IP Address** — text input, placeholder "e.g. 192.168.1.100"
- **Camera Port** — text input, default "554"
- **Camera Username** — text input, placeholder "admin"
- **Camera Password** — password input (masked)

Layout: IP and Port on one row (2-col grid), Username and Password on next row (2-col grid).

### 3.2 Form Payload Updates

Add to `defaultPayload` in Create.js and Edit.js:
```
camera_rtsp_ip: "",
camera_rtsp_port: "554",
camera_username: "",
camera_password: "",
```

---

## 4. Frontend — Live Camera List Page

### 4.1 Route: `/live-camera`

### 4.2 Sidebar Menu

Add "Live Camera" item in `menuData.js` companyMenu array (between Device and Automation):
- Icon: `Video` from lucide-react
- Label: "Live Camera"
- href: "/live-camera"

Add to `leftNavLinks`: `"/live-camera": companyMenu`

### 4.3 Page Component: `src/components/LiveCamera/Page.js`

- Branch multi-select filter (same as Devices page)
- DataTable with columns:
  - Branch name
  - Device Name
  - Camera IP
  - Port
  - Status (green "Connected" / red "Disconnected" badge)
  - Actions (view stream button)
- Pagination
- Click row or view button → navigate to `/live-camera/{device_id}`

### 4.4 API Endpoint File: `src/lib/endpoint/live-camera.js`

```
getCameras(params) → GET /api/cameras
getCameraStatus(deviceId) → GET /api/camera/{deviceId}/status
```

---

## 5. Frontend — Live Stream Page

### 5.1 Route: `/live-camera/[id]/page.js`

### 5.2 Page Component: `src/components/LiveCamera/Stream.js`

- Back button to `/live-camera`
- Camera name and branch info header
- Video canvas (full width) — renders frames from WebSocket
- Overlay: When ArcFace detects a face, show bounding box + employee name on the canvas
- Connection status indicator
- Recent detections list (sidebar or below video): last N recognized employees with timestamp

### 5.3 WebSocket Connection

- Connect to Python service: `ws://{PYTHON_SERVICE_URL}/stream/{device_id}`
- Receive: JSON messages with base64 frame + detection results (employee names, bounding boxes)
- Render frame on canvas, draw bounding boxes and names

---

## 6. Python Microservice

### 6.1 Tech Stack

- **Framework**: FastAPI
- **RTSP**: OpenCV (`cv2.VideoCapture`)
- **Face Recognition**: InsightFace (ArcFace model)
- **WebSocket**: FastAPI WebSocket

### 6.2 Directory: `d:\newmytime2cloud\camera-service\`

### 6.3 Endpoints

| Type | Route | Description |
|------|-------|-------------|
| WebSocket | /stream/{device_id} | Streams processed frames with face detection |
| POST | /embeddings/sync | Receives employee face embeddings from Laravel |
| GET | /health | Health check |

### 6.4 Stream Flow

1. Frontend connects to `WS /stream/{device_id}`
2. Python service calls Laravel `GET /api/camera/{device_id}/credentials` to get RTSP URL
3. Opens RTSP stream via OpenCV
4. For each frame:
   - Run InsightFace face detection
   - Compare detected face embeddings against stored employee embeddings for that branch
   - Draw bounding boxes and employee names on frame
   - Encode frame as JPEG, base64
   - Send via WebSocket: `{ "frame": "<base64>", "detections": [{"name": "John", "confidence": 0.92, "bbox": [x,y,w,h]}] }`
5. Frontend renders on canvas

### 6.5 Configuration

- `LARAVEL_API_URL`: URL of Laravel backend
- `LARAVEL_API_TOKEN`: Service token for internal API calls
- `FACE_CONFIDENCE_THRESHOLD`: Minimum confidence for match (default 0.6)

---

## 7. Architecture

```
┌─────────────┐     RTSP      ┌──────────────────────┐    WebSocket    ┌──────────────┐
│  IP Camera  │ ─────────────→ │  Python Service      │ ──────────────→ │  Frontend    │
│  (RTSP)     │               │  FastAPI + OpenCV    │                │  Next.js     │
└─────────────┘               │  + InsightFace       │                │  Canvas +    │
                              └──────────┬───────────┘                │  Overlays    │
                                         │ REST API                   └──────────────┘
                              ┌──────────▼───────────┐
                              │  Laravel Backend     │
                              │  - Camera CRUD       │
                              │  - Employee data     │
                              │  - Face embeddings   │
                              └──────────────────────┘
```

---

## 8. File Structure

```
backend/
├── database/migrations/
│   ├── xxxx_add_camera_fields_to_devices_table.php
│   └── xxxx_create_employee_face_embeddings_table.php
├── app/Models/EmployeeFaceEmbedding.php
├── app/Http/Controllers/CameraStreamController.php
├── app/Http/Requests/Camera/StatusRequest.php
└── routes/camera-stream.php

frontend-new/src/
├── app/live-camera/
│   ├── page.js
│   └── [id]/page.js
├── components/LiveCamera/
│   ├── Page.js
│   ├── Stream.js
│   └── columns.js
└── lib/endpoint/live-camera.js

camera-service/
├── main.py
├── requirements.txt
├── config.py
├── services/
│   ├── stream_manager.py
│   └── face_recognizer.py
└── README.md
```
