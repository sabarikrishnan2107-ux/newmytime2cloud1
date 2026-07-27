<?php

return [

    /*
     | Base URL of the ArcFace service (FastAPI, "Face APIs 2.0.0").
     | It is UNAUTHENTICATED — never expose this URL to a client application.
     | Only Laravel may call it.
     */
    'base_url' => env('FACE_API_URL', 'https://face-validator.mytime2cloud.com'),

    /*
     | Minimum 1:N similarity (0..1) for /identify to count as a match.
     | Below this, no employee is returned and no punch is written.
     | Kept server-side so it can be tuned without shipping a new APK.
     */
    'identify_threshold' => (float) env('FACE_IDENTIFY_THRESHOLD', 0.80),

    /*
     | Seconds to wait on the face service. Gallery builds are much slower than
     | identifies because they embed every employee photo.
     */
    'timeout'         => (int) env('FACE_HTTP_TIMEOUT', 20),
    'gallery_timeout' => (int) env('FACE_GALLERY_TIMEOUT', 300),

    /*
     | Async gallery build (BuildFaceGalleryJob). Photos are downscaled before the
     | single /build-gallery POST so a large company fits in one request:
     |   max_edge     - longest side in px after downscale (never upscales)
     |   jpeg_quality - re-encode quality of the downscaled JPEG
     |   lock_ttl     - backstop seconds for the per-company "build running" lock,
     |                  in case a worker dies without releasing it. MUST exceed the
     |                  job timeout (BuildFaceGalleryJob::$timeout = 900) or the lock
     |                  can expire mid-build and let a second build start.
     */
    'build' => [
        'max_edge'     => (int) env('FACE_BUILD_MAX_EDGE', 320),
        'jpeg_quality' => (int) env('FACE_BUILD_JPEG_QUALITY', 80),
        'lock_ttl'     => (int) env('FACE_BUILD_LOCK_TTL', 1200),
    ],

];
