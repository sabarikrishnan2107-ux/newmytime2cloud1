# Face 1:N "Identify" Endpoint — Contract for the face-validator team

**Date:** 2026-06-18
**For:** whoever maintains `https://face-validator.mytime2cloud.com`
**Why:** The tablet kiosk needs "pure show-face" — a person just looks at the camera
and the system finds **who** they are (1:N). The current service only has 1:1
(`verify-face-fast-file`, compare two photos). This document specifies the new
endpoint the kiosk will call.

## What exists today (1:1 — for reference)

```
POST /verify-face-fast-file        (multipart/form-data)
  captured_image = <selfie.jpg>
  existing_image = <known profile.jpg>
→ { "match": true, "score": 0.91, "message": "Face matched" }
```
This answers "are these two the same person?" — it needs you to already know who.

## What the kiosk needs (1:N — please build this)

```
POST /identify-face-fast-file       (multipart/form-data)
Headers: Accept: application/json
Body:
  captured_image = <selfie.jpg>     # just-taken camera photo
  company_id     = <number>         # search only this company's enrolled faces

Success (someone matched):
{
  "match": true,
  "system_user_id": "3021",         # REQUIRED — the matched employee's system_user_id
  "score": 0.93,                    # optional confidence
  "name": "ARI KUMARAN"             # optional, for display
}

No match:
{ "match": false, "message": "No matching face" }

No face in the photo (or error): HTTP 4xx/5xx with
{ "error": "No face detected in captured_image" }
```

The **decisive field is `match`**, and on a match the kiosk needs
**`system_user_id`** (so it can write the punch and look up the photo/name).

## Prerequisite: an enrolled face gallery per company

1:N means the server must hold a **gallery** of each company's employee faces to
search against. Two ways to populate it (your choice):

- **Enroll from existing profile photos:** for each employee, store a face template
  keyed by `company_id` + `system_user_id`, computed from their `profile_picture`
  (same photo the 1:1 flow uses as `existing_image`). A one-time/just-in-time batch.
- **Reuse device enrollment:** if the face devices already enrolled these faces, index
  those templates by `company_id` + `system_user_id`.

Whatever the storage, the only thing the kiosk cares about is the request/response
above. Matching threshold and gallery management are yours to tune.

## Notes

- One company per tablet, < ~50 employees per branch — galleries are small.
- Latency target: a punch should feel instant, so ideally < ~1.5 s per identify.
- Auth: the kiosk currently sends the 1:1 call with no token (only `Accept`). Keep the
  same for `identify`, or tell us what header you need and we'll add it.
- The kiosk already has the matched employee's photo/name locally (from
  `employeesList`), so `name` is optional; `system_user_id` is the must-have.

## How the kiosk will use it

```
camera (idle) → auto-capture selfie → POST /identify-face-fast-file {captured_image, company_id}
  match:false → keep scanning
  match:true  → show "Welcome <name>" + Clock In/Out → POST /api/generate_log → popup + Tamil voice
```
