# Face Clock In/Out Tablet Kiosk — Design (React Native app)

**Date:** 2026-06-18
**Status:** Approved design (prototype + endpoints confirmed) — ready for implementation plan
**Project location:** `D:\tab mytime2cloud` (standalone app, separate from the main repo)

## Problem

Some employees using the OX-900 face device don't know how to show their face and
press clock in / clock out. The owner wants a simple **tablet app**: the person
identifies themselves, the tablet confirms their face, they tap **Clock In** or
**Clock Out**, and a friendly popup confirms it ("Welcome, <name>!" / "Thank you,
<name>!"). Punches land in the existing software dashboard and flow into the existing
report/shift calculation with no manual work.

## Decision: Native React Native Android app, reusing existing endpoints

Build a standalone **React Native** Android app (APK) in `D:\tab mytime2cloud`,
talking to the existing MyTime2Cloud backend. **No new face technology and no
on-device ML** — the app reuses the two endpoints already proven in the company's
mobile app:

- **Face check (1:1):** `POST https://face-validator.mytime2cloud.com/verify-face-fast-file`
- **Punch:** `POST https://v2backend.mytime2cloud.com/api/generate_log`

History of the decision: prototyped as a web page (`kiosk-sample.html`, look/flow
approved) → owner required a real installable **app** → chose **React Native** →
discovered the existing face endpoint is **1:1 only** (compares a selfie against ONE
known profile photo), and the service has no 1:N identify. So the kiosk identifies the
person with a **tap (name/photo grid)**, then the existing endpoint confirms the face.

## How the existing endpoints work (confirmed from the mobile app)

### 1) Face verify — 1:1 only
```
POST https://face-validator.mytime2cloud.com/verify-face-fast-file
Headers: Accept: application/json
Body (multipart/form-data):
  captured_image = <selfie.jpg>     # just-taken camera photo
  existing_image = <profile.jpg>    # the chosen employee's profile photo
Response (JSON): { "match": true|false, "score": 0.91, "message": "Face matched" }
  - HTTP 2xx → parsed JSON; only `match` gates pass/fail (score/message shown to user)
  - HTTP non-2xx → throws (e.g. { "error": "No face detected in captured_image" })
```
It needs `existing_image`, i.e. you must already know who the person is → why the
kiosk picks the person first.

### 2) Punch — generate_log
```
POST https://v2backend.mytime2cloud.com/api/generate_log
Authorization: Bearer <token>
Content-Type: application/json
{
  "UserID": "<system_user_id>",
  "LogTime": "2026-06-18 09:01:23",
  "log_type": "in",                 // or "out"
  "DeviceID": "KIOSK-<branch>",     // kiosk identifier (mobile app uses "Mobile-<id>")
  "company_id": "<company_id>"
}
```
This writes the attendance record the same way the mobile app does → existing reports
and shift calculation pick it up unchanged.

## Confirmed requirements

| Topic | Decision |
|---|---|
| App type | Native React Native Android app (APK) in `D:\tab mytime2cloud` |
| Identify who | **Tap name/photo** from a grid (with search), since < 50 per tablet |
| Face check | Existing 1:1 `verify-face-fast-file` (selfie vs chosen profile photo) |
| Punch | Existing `generate_log`, `DeviceID="KIOSK-<branch>"` |
| Face reference photos | Existing employee `profile_picture` (no new enrollment) |
| In vs Out | Two buttons (Clock In / Clock Out) |
| Security | Tap to pick + 1:1 face match must pass; no PIN |
| Log storage | Same path as mobile app → reports work unchanged |
| Tablet / network | Android, always online |
| Scale | < 50 employees per tablet |
| Side panel | "Today's Logs": photo, name·ID, time, In/Out tag; newest on top; last ~20 + counter; search box |
| Popup timing | Auto-return to idle after 3 seconds |
| Voice | Speak the greeting in **Tamil, female voice** (`expo-speech`, `ta-IN`): clock-in "வரவேற்கிறோம், <name>", clock-out "நன்றி, <name>". Tablet needs a Tamil TTS voice installed. |

## App flow

```
[React Native app on Android tablet]
  One-time setup:
    - Kiosk login (admin) → pick branch → store company/branch + bearer token
  Home (Pick screen):
    - Grid of employees for the branch: photo + name + ID, with a search box
    - Person taps themselves  → (and/or taps Clock In / Clock Out)
  Verify:
    - Camera opens, auto-captures a selfie (~2s, like the mobile app)
    - Fetch the chosen employee's profile photo (have URL, or
      GET /api/get-encoded-profile-picture/{imageUrl})
    - POST verify-face-fast-file { captured_image, existing_image }
    - match=false → "Face not matched, try again", back to camera/home
  Punch:
    - match=true → POST generate_log { UserID, LogTime, log_type, DeviceID, company_id }
    - Show Welcome/Thank-you popup, prepend to Today's Logs, return to Home (3s)

[Existing backend + reports — unchanged]
```

UI order options (decide in plan): tap name → face verify → then In/Out buttons; OR
tap name → tap In/Out → face verify → punch. Both reuse the same endpoints.

## App components

1. **Setup / kiosk login screen** — admin authenticates once, selects branch; token +
   company/branch in secure storage; app reopens to Home (kiosk lock-down via Android
   screen pinning / kiosk launcher).
2. **Employee pick screen** — grid of branch employees (photo, name, ID) + search box.
   Loads the employee list once on startup (which existing endpoint returns branch
   employees + profile photo to be picked in plan).
3. **Camera/verify module** — opens camera, auto-captures one selfie, calls
   `verify-face-fast-file`; surfaces match/score/message.
4. **Punch + result** — on match, calls `generate_log`; shows Welcome/Thank-you popup.
5. **Today's Logs panel** — seeded from today's logs (endpoint chosen in plan),
   prepends each new punch, search filter, last ~20 + counter.
6. **API client** — base URLs, bearer token, multipart upload for the selfie, retry.

## Data flow / edge cases

- **Cool-down:** ignore repeat punch from same person within ~60s.
- **Face not matched:** show message, let them retry; never punch.
- **No face detected (endpoint throws):** show "No face detected, look at the camera".
- **Camera permission denied:** clear message; camera must be granted at install.
- **Network error:** show "Try again", keep on the verify/home screen; no offline queue.
- **Profile photo missing / poor:** verify will fail; owner updates the profile photo.

## Build / tooling notes (this machine)

- Node 24 / npm 11 present; Android SDK + adb present (`ANDROID_HOME` set).
- **Java/JDK not on PATH** — use Android Studio's bundled JBR as `JAVA_HOME` for Gradle.
- Camera: a single still capture is enough (no frame processing). Pick
  `react-native-vision-camera` (takePhoto) or `expo-camera` (mobile app already uses
  expo-camera) in the plan; choose Expo vs bare RN there too.
- Deliverable: installable **APK** (debug for testing, release for deployment).

## Testing

- **Prototype:** `kiosk-sample.html` (look/flow approved).
- **App:** run on a real Android tablet via adb; verify pick → camera → 1:1 match →
  In/Out → generate_log; confirm the punch shows in the main software and the panel.
- **Backend:** No backend changes planned (reusing existing endpoints). Do NOT touch
  prod DB directly; backend tests hit live prod DB (no isolation) — avoid.

## Out of scope (YAGNI)

- On-device face recognition / TFLite / 1:N identify (using tap + existing 1:1 verify).
- New backend endpoints (reuse verify-face-fast-file + generate_log).
- Offline punching / sync queue (always online).
- PIN / strong anti-spoof liveness (revisit if abused).
- iOS build (Android tablet only for now).

## Open items to confirm during planning

- Which existing endpoint returns the branch employee list (+ profile photo) for the
  pick grid, and which returns today's logs for the panel.
- Whether `verify-face-fast-file` needs auth/token (mobile app showed only Accept header).
- Exact `existing_image` source: stored profile URL vs `get-encoded-profile-picture`.
- `DeviceID` value for the kiosk that existing reports/shift calc accept (e.g.
  `KIOSK-<branch>` vs reusing the `Mobile-` convention).
- Expo vs bare React Native; camera library; kiosk lock-down method.
- Kiosk language: English only, or Arabic too.
