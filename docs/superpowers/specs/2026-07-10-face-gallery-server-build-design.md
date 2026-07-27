# Face gallery — server-side async build (Laravel-orchestrated)

**Date:** 2026-07-10
**For:** v2 Laravel backend (`d:\newmytime2cloud\backend`)
**Client:** v2faceapp kiosk (`d:\v2faceapp`)
**Face service:** `https://face-validator.mytime2cloud.com` (FastAPI, PM2 `face-apis`, ArcFace 1:N)

## Problem

The kiosk builds a company's 1:N face gallery by downloading every employee photo
and POSTing them back to the face service as base64. For 2000 employees that is
~293 MB of downloads and a ~401 MB upload in a single request, on every login and
every rebuild. It times out and does not scale.

The photos already live on the **v2 server's own disk**
(`backend/public/media/employee/profile_picture/<file>`), and Laravel runs on that
same server. So Laravel can assemble the gallery from local disk with no HTTP photo
transfer, and the kiosk drops out of the build loop entirely.

## Verified facts (checked against live service + code, 2026-07-10)

- `GET /gallery-status?company_id=<id>` **already exists**. Returns
  `{"company_id":"82","gallery_size":8}`. No `built_at`. `gallery_size:0` = no gallery.
- `POST /build-gallery` requires `{company_id, employees:[{system_user_id, image_base64}]}`.
  `employees` is **required** in the live OpenAPI schema — it cannot build from
  `company_id` alone today.
- `/build-gallery` **replaces** the whole gallery (full-snapshot API; also company 82
  went 9→8 across rebuilds, consistent with replace, not append). **A replace cannot
  be chunked** — the builder must send all faces in one POST.
- The face service has **no auth**. `/build-gallery` is a public endpoint that
  overwrites biometric galleries. (Addressed in Phase 2.)
- `/identify` and the whole gallery are **keyed by `company_id` only** — the gallery
  must cover the whole company, not one branch.
- `/identify` returns HTTP 200 always, signalling outcome via a `reason` key
  (`no_face` | `low_confidence` | `gallery_empty`) or `match:true` with `system_user_id`.
  The existing prod `FaceClient::reasonToStatus()` maps these — **do not regress it.**
- Laravel queue = `database` driver; workers already run in prod under PM2. Cache = `file`.
- Existing prod face files (hand-uploaded, **not in git**): `FaceAttendanceController`,
  `FaceClient`, `EmployeePhotoReader`, `config/face.php`, 3 routes in `routes/company.php`
  (`POST /api/face-identify`, `POST /api/face-gallery/build`, `GET /api/face-gallery/status`,
  all `auth:sanctum`, `company_id` from the token).

## Core constraint that shapes everything

Because `/build-gallery` replaces and requires the full array, **the gallery must be
sent in exactly one POST containing every face.** Relocating that POST from the kiosk
to Laravel fixes the kiosk (server-to-server, LAN disk reads, kiosk stops holding
biometrics) but does **not** remove the single large request. At true 2000-employee
scale that one POST still risks nginx `client_max_body_size` and an HTTP timeout while
the model embeds for minutes.

Therefore the fix is **phased**:

- **Phase 1 (this repo, buildable now):** Laravel async job assembles from disk,
  downscales each photo, sends one POST. Fixes the kiosk for realistic company sizes
  (tens–few hundred; company 82 = 8, kiosk target ~50/branch). Payload shrunk ~10× by
  downscaling.
- **Phase 2 (needs Python source):** teach `/build-gallery` to accept `{company_id}`
  alone, fetch photos itself, run its own async job with real per-face progress, and
  add auth. Only this scales cleanly to 2000 and gives true "640/2000" progress.

---

## Phase 1 — Laravel design

### Endpoints (all `auth:sanctum`; `company_id` from `auth()->user()`, never the body)

| Method | Path | New? | Purpose | Response |
|---|---|---|---|---|
| POST | `/api/face-gallery/build-async` | **new** | Start a build for the caller's company | `202 {job_id, total}`; `409 {job_id}` if one is already running |
| GET | `/api/face-gallery/build-status?job_id=<id>` | **new** | Poll progress | `200 {state, phase, processed, total, gallery_size, failed[], error?}` |
| GET | `/api/face-gallery/status` | exists | Kiosk login check: is a gallery already built? | `200 {gallery_size, built_at}` |

- Only the two `build-*` routes are new. `GET /api/face-gallery/status` already exists
  on prod (`FaceAttendanceController::galleryStatus()`, proxies the face service
  `/gallery-status`); Phase 1 only **extends** it to also return `built_at` from cache.
- `build-async` is a **new** route so it never collides with the existing synchronous
  `POST /api/face-gallery/build` (kept for backward compatibility during migration).
- `state` ∈ `running` | `done` | `failed`. `phase` ∈ `preparing` | `embedding` (see
  progress note). On `failed`, include a human-readable `error`.
- `status` proxies the face service `/gallery-status` and merges `built_at` from cache
  (the face service does not return it).

### `BuildFaceGalleryJob` (queued, `database` connection)

Constructor: `(int $companyId, string $jobId)`. `tries = 1` (a partial replace must
never overwrite a good gallery; on failure we simply do not POST — see Atomicity).

`handle()`:

1. **Guard already handled by dispatcher** (see Concurrency).
2. Load roster: `Employee::where('company_id', $companyId)->whereNotNull('profile_picture')`.
   `total = count`. Employees with no `profile_picture` are counted in `failed[]` as
   `{system_user_id, reason:"no_photo"}` and skipped (they cannot be enrolled).
3. **Preparing phase** — for each employee:
   - Resolve disk path `public_path('media/employee/profile_picture/'.$file)`.
   - Missing file → `failed[] {system_user_id, reason:"photo_missing"}`, continue.
   - Read + **downscale to ~320 px longest edge, JPEG q~80** (GD via Intervention Image
     if available, else raw GD). ~150 KB → ~15–25 KB. base64-encode.
   - Append `{system_user_id, image_base64}` to the payload array.
   - Update cache: `processed++`, `phase:preparing`. (Throttle writes, e.g. every 10.)
4. **Embedding phase** — set `phase:embedding`, then send **one** POST to
   `/build-gallery {company_id, employees[]}` via `FaceClient` (long timeout, e.g. 300 s).
5. On 2xx: parse `gallery_size` + any service-side `failed[]`, merge with our skip list,
   write cache `{state:done, gallery_size, built_at:now, failed[]}`.
6. On error/timeout: write cache `{state:failed, error:"<message>"}`. Do **not** clear
   the existing gallery (we never sent anything, so the face service still holds the
   previous good gallery).
7. Always release the concurrency lock (in a `finally`).

### Concurrency

- Dispatcher acquires `Cache::lock("face-gallery-build:{$companyId}", ttl)`.
- If not acquired, look up the running `job_id` from
  `Cache::get("face-gallery-job:{$companyId}")` and return `409 {job_id}`.
- If acquired, generate `job_id` (`Str::uuid()`), store
  `face-gallery-job:{$companyId} = job_id` and an initial status blob under
  `face-gallery-status:{$job_id}`, dispatch the job, return `202 {job_id, total}`.
- Job releases the lock in `finally`; lock TTL is a backstop against a dead worker.

### Atomicity

We build the complete `employees[]` in memory and send it in one POST. The face
service's replace is all-or-nothing on its side, and we never send a partial. So a
failed build **cannot** corrupt or shrink a previously good gallery.

### Progress honesty (known Phase 1 limitation)

`processed/total` advances only during the **preparing** phase (disk read + downscale,
fast). The **embedding** phase is one opaque POST — we cannot observe per-face progress
inside the face service. The kiosk shows "Preparing… N/total", then "Embedding faces…"
as an indeterminate step. True per-face embedding progress is a Phase 2 (Python) feature.

### Failure reporting

`failed[]` accumulates: `no_photo` (no `profile_picture`), `photo_missing` (file gone),
plus anything the face service reports. The kiosk warns the operator that those staff
will not be recognised. A partial gallery is never reported as a clean success.

### Files (Phase 1)

**New:**
- `app/Jobs/BuildFaceGalleryJob.php`
- `app/Support/FaceGalleryProgress.php` — thin cache read/write helper for status blobs
  (keys, TTLs, shape) so the controller and job share one source of truth.
- Controller methods on the existing `FaceAttendanceController`:
  `buildGalleryAsync()`, `buildGalleryStatus()` (and reuse/extend `galleryStatus()`).
- 3 routes in `routes/company.php` under `auth:sanctum`.

**Reused (must be dropped in from prod first — see Open items):**
- `FaceClient` — add a `buildGallery(companyId, employees)` method (or reuse existing).
  Do not touch its `identify()` / `reasonToStatus()` behavior.
- `EmployeePhotoReader` — reuse its disk-path resolution so async build and the existing
  sync path read photos identically.
- `config/face.php` — add `build.max_edge` (320), `build.jpeg_quality` (80),
  `build.http_timeout` (300), `build.lock_ttl`.

### Kiosk changes (`d:\v2faceapp`) — after backend ships

- On login: `GET /api/face-gallery/status`. `gallery_size > 0` → skip to kiosk screen.
- Else `POST /api/face-gallery/build-async` → poll `build-status` → show progress.
- "Rebuild gallery" → same async call.
- Delete client-side photo download + base64 upload (`collectGalleryPayload`,
  `fetchProfilePhotoBase64`, the direct `buildGallery` to the face service).
- Point the kiosk at **Laravel** (`auth:sanctum` token) for gallery ops, not the face
  service directly. `/identify` stays direct-to-face-service (or also proxy — separate
  decision).

---

## Phase 2 — Python face service (spec only; needs prod source)

Pull `face-apis` source from prod (`/var/www/...`, PM2 `face-apis`), then:

1. `POST /build-gallery {company_id}` (no `employees`) → server fetches roster + photos
   itself, returns `202 {job_id, total}`; keep the `employees`-present behavior for
   backward compatibility.
2. `GET /build-gallery/status?job_id=` → real `{state, processed, total, gallery_size, failed[]}`
   with per-face progress.
3. Add `built_at` to `/gallery-status`.
4. **Auth**: a service credential so only the v2 backend can build/overwrite a gallery.
5. Atomicity: build into a staging slot, swap on success.

When Phase 2 lands, Laravel's `build-async` becomes a thin proxy (kick off the Python
job, relay its status), and the single-large-POST ceiling disappears.

**Incremental add** (`POST /gallery/employee`) — deferred to Phase 2. With replace
semantics a single add forces a full rebuild, so it is only worth building once the
Python service supports true append/staging.

---

## Out of scope

- On-device embeddings export (`{system_user_id, vector[512]}`) for offline matching —
  roadmap only.
- Changing `/identify` behavior or the punch flow (`POST /api/generate_log`).

## Open items (blockers to implementation)

1. **Prod Laravel face files** dropped into the repo (chosen: user provides them), so
   Phase 1 extends the real `FaceClient`/`EmployeePhotoReader` instead of a reconstruction
   that could regress the tuned `reason` mapping.
2. **Phase 2 only:** face-apis Python source pulled from prod.
3. A **non-employee test face** (stock/synthetic JPEG) for verifying build/identify
   without uploading real biometrics. Outbound image fetches are proxy-blocked in this
   environment; the probe to confirm replace-vs-append could not be run and was inferred.
4. nginx `client_max_body_size` on the face service host must be raised to fit the
   downscaled payload (verify actual limit before relying on Phase 1 at larger sizes).
