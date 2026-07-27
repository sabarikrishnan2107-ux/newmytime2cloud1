# Face Gallery Server-Side Async Build — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the v2 Laravel backend build a company's 1:N face gallery from the server's own disk in an async queued job, so the kiosk stops downloading and re-uploading every employee photo.

**Architecture:** A queued `BuildFaceGalleryJob` loads the company roster, reads each `profile_picture` from local disk, downscales it with GD (~320 px, cutting the payload ~10×), assembles one `{company_id, employees[]}` array, and POSTs it once to the face service `/build-gallery`. Progress and results live in the cache; two new `auth:sanctum` endpoints start the job and report status. The face service `/build-gallery` **replaces** the whole gallery and requires the full array, so the build is one atomic POST — a failure never corrupts a good gallery.

**Tech Stack:** PHP 8.1 / Laravel, `database` queue (workers already run under PM2 in prod), `file` cache in prod / `array` in tests, GD image extension (no Intervention Image), PHPUnit + `Http::fake()`.

## Global Constraints

- **NEVER touch the DB in tests.** `backend/.env` and `phpunit.xml` point at the **live prod pgsql** (no `.env.testing`, sqlite override commented out). No `RefreshDatabase`, no `migrate`, no Eloquent query in any test. Mirror `tests/Feature/SdkProcessUploadPersonsTest.php`: call methods directly with `Http::fake()` + filesystem only. Local php also lacks `pdo_pgsql`, so DB-touching code is verified **end-to-end on the server**, never by a local test.
- **`company_id` always comes from `auth()->user()`**, never the request body. All new routes are `auth:sanctum`.
- **Reuse, don't regress, the prod `FaceClient`.** Its `identify()`/`reasonToStatus()` handles the face service's "HTTP 200 always, outcome in `reason`" contract. Do not alter that behavior.
- **Downscale with raw GD only** (`imagecreatefromstring`, `imagecopyresampled`, `imagejpeg`). Intervention Image is NOT installed.
- **The gallery is company-wide** — `/identify` and `/build-gallery` are keyed by `company_id` only. Never scope a build to a branch.
- **Test runner:** `php vendor/bin/phpunit --filter <name> <path>` from `backend/`. Mockery deprecation warnings are expected noise; the trailing `OK (...)` line is the signal.
- **No git push.** The human owns all commits/pushes. "Commit" steps below are written for completeness; do not run them unless the human says so — stage and let them commit.

---

## Task 0 (Prerequisite gate — no code): Drop in prod face files

The prod face files were hand-uploaded and are **not in this repo**. Phase 1 extends them; do not reconstruct from scratch (risks regressing the tuned `reason` mapping).

- [ ] **Step 1: Obtain the live files from the prod server** (`/var/www/mytime2cloud/backend-v2`), copying each to the matching path in `d:\newmytime2cloud\backend`:
  - `app/Http/Controllers/FaceAttendanceController.php`
  - `app/Services/FaceClient.php`
  - `app/Support/EmployeePhotoReader.php`
  - `config/face.php`
  - `routes/company.php` (already in repo — **diff**, do not overwrite; confirm the 3 face routes match prod)

- [ ] **Step 2: Sanity-lint each dropped-in file**

Run: `cd backend && php -l app/Services/FaceClient.php && php -l app/Http/Controllers/FaceAttendanceController.php && php -l app/Support/EmployeePhotoReader.php`
Expected: `No syntax errors detected` for each.

- [ ] **Step 3: Record the real signatures** the later tasks depend on. Open `FaceClient.php`, `EmployeePhotoReader.php`, `FaceAttendanceController.php` and note:
  - `FaceClient`'s constructor + base-URL/config usage, and whether a `buildGallery()` already exists (the sync path may have one — if so, Task 4 adapts it instead of adding a new method).
  - `EmployeePhotoReader`'s method that resolves a `profile_picture` value to safe local bytes (used by Task 2 instead of re-implementing traversal/image guards).
  - `FaceAttendanceController`'s existing `galleryStatus()` (Task 6 extends it) and how it reads `company_id` from the user.

- [ ] **Step 4: Commit the baseline** (human runs)

```bash
git add app/Services/FaceClient.php app/Http/Controllers/FaceAttendanceController.php app/Support/EmployeePhotoReader.php config/face.php
git commit -m "chore(face): import prod face files as version-controlled baseline"
```

> If the real `EmployeePhotoReader` exposes a safe path→bytes reader, Task 2 calls it and skips re-implementing the guards. If it does not, Task 2 implements them (code below). The plan is written to work either way; Step 3 tells you which branch you are on.

---

## Task 1: Face-build config keys

**Files:**
- Modify: `backend/config/face.php` (add a `build` block; create the file if Task 0 could not supply it)

**Interfaces:**
- Produces: `config('face.build.max_edge')` (int 320), `config('face.build.jpeg_quality')` (int 80), `config('face.build.http_timeout')` (int 300), `config('face.build.lock_ttl')` (int 900), `config('face.build.base_url')` (string, face service origin), `config('face.build.gallery_path')` (string `/build-gallery`).

- [ ] **Step 1: Add the `build` block.** Merge into the existing return array in `config/face.php` (keep existing keys such as the identify base URL / threshold — do not remove them):

```php
// config/face.php  — add inside the returned array
'build' => [
    // Face service origin + path for the gallery build POST.
    'base_url'     => env('FACE_BUILD_BASE_URL', env('FACE_BASE_URL', 'https://face-validator.mytime2cloud.com')),
    'gallery_path' => env('FACE_BUILD_GALLERY_PATH', '/build-gallery'),
    // Downscale target: longest edge in px, JPEG quality.
    'max_edge'     => (int) env('FACE_BUILD_MAX_EDGE', 320),
    'jpeg_quality' => (int) env('FACE_BUILD_JPEG_QUALITY', 80),
    // The single build POST embeds every face — allow minutes.
    'http_timeout' => (int) env('FACE_BUILD_HTTP_TIMEOUT', 300),
    // Backstop TTL for the per-company build lock (seconds).
    'lock_ttl'     => (int) env('FACE_BUILD_LOCK_TTL', 900),
],
```

- [ ] **Step 2: Verify config loads**

Run: `cd backend && php -r "require 'vendor/autoload.php'; \$app = require 'bootstrap/app.php'; \$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap(); var_dump(config('face.build.max_edge'), config('face.build.gallery_path'));"`
Expected: `int(320)` and `string(14) "/build-gallery"`.

- [ ] **Step 3: Commit** (human runs)

```bash
git add config/face.php
git commit -m "feat(face): add gallery-build config keys"
```

---

## Task 2: Photo downscaler (`FaceGalleryImageProcessor`)

DB-free, fully locally testable. Resolves a `profile_picture` filename to safe local bytes, validates it is a real image, downscales it, returns base64 JPEG — or `null` if missing/invalid.

**Files:**
- Create: `backend/app/Support/FaceGalleryImageProcessor.php`
- Test: `backend/tests/Feature/FaceGalleryImageProcessorTest.php`

**Interfaces:**
- Consumes: `config('face.build.max_edge')`, `config('face.build.jpeg_quality')` (Task 1). Optionally `EmployeePhotoReader` (Task 0) for the safe path resolve.
- Produces: `FaceGalleryImageProcessor::encode(string $profilePicture): ?string` — base64 of a downscaled JPEG, or `null` when the file is missing, outside the media dir, or not a decodable image.

- [ ] **Step 1: Write the failing test**

```php
<?php
namespace Tests\Feature;

use App\Support\FaceGalleryImageProcessor;
use Tests\TestCase;

class FaceGalleryImageProcessorTest extends TestCase
{
    private function picDir(): string
    {
        return public_path('media/employee/profile_picture');
    }

    protected function setUp(): void
    {
        parent::setUp();
        if (!is_dir($this->picDir())) {
            mkdir($this->picDir(), 0777, true);
        }
    }

    private array $made = [];

    private function writeJpeg(string $name, int $w, int $h): string
    {
        $img = imagecreatetruecolor($w, $h);
        imagefilledrectangle($img, 0, 0, $w, $h, imagecolorallocate($img, 120, 40, 200));
        $path = $this->picDir() . DIRECTORY_SEPARATOR . $name;
        imagejpeg($img, $path, 90);
        imagedestroy($img);
        $this->made[] = $path;
        return $name;
    }

    protected function tearDown(): void
    {
        foreach ($this->made as $p) {
            if (is_file($p)) @unlink($p);
        }
        $t = public_path('__fgip_traversal__.jpg');
        if (is_file($t)) @unlink($t);
        parent::tearDown();
    }

    public function test_large_photo_is_downscaled_to_max_edge(): void
    {
        $name = $this->writeJpeg('__fgip_big__.jpg', 800, 600);

        $b64 = (new FaceGalleryImageProcessor())->encode($name);

        $this->assertNotNull($b64);
        $out = base64_decode($b64);
        $img = @imagecreatefromstring($out);
        $this->assertNotFalse($img, 'output must be a valid JPEG');
        $this->assertLessThanOrEqual(320, max(imagesx($img), imagesy($img)));
        // aspect ratio preserved (800x600 -> 320x240)
        $this->assertSame(320, imagesx($img));
        $this->assertSame(240, imagesy($img));
        imagedestroy($img);
    }

    public function test_small_photo_is_not_upscaled(): void
    {
        $name = $this->writeJpeg('__fgip_small__.jpg', 100, 100);
        $b64 = (new FaceGalleryImageProcessor())->encode($name);
        $img = @imagecreatefromstring(base64_decode($b64));
        $this->assertSame(100, imagesx($img));
        imagedestroy($img);
    }

    public function test_missing_file_returns_null(): void
    {
        $this->assertNull((new FaceGalleryImageProcessor())->encode('does-not-exist.jpg'));
    }

    public function test_non_image_returns_null(): void
    {
        $path = $this->picDir() . DIRECTORY_SEPARATOR . '__fgip_bad__.bin';
        file_put_contents($path, '<html>not an image</html>');
        $this->made[] = $path;
        $this->assertNull((new FaceGalleryImageProcessor())->encode('__fgip_bad__.bin'));
    }

    public function test_path_traversal_returns_null(): void
    {
        file_put_contents(public_path('__fgip_traversal__.jpg'), file_get_contents(__FILE__));
        $this->assertNull((new FaceGalleryImageProcessor())->encode('../__fgip_traversal__.jpg'));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php vendor/bin/phpunit tests/Feature/FaceGalleryImageProcessorTest.php`
Expected: FAIL — `Class "App\Support\FaceGalleryImageProcessor" not found`.

- [ ] **Step 3: Write minimal implementation**

```php
<?php
namespace App\Support;

/**
 * Reads an employee profile photo from the local media dir and returns a
 * downscaled base64 JPEG for the face-gallery build. Traversal-safe and
 * image-validated: never reads outside the media dir, never returns bytes
 * that are not a decodable image. Returns null on any failure so the caller
 * records the employee as "failed" rather than pushing garbage.
 */
class FaceGalleryImageProcessor
{
    public function encode(string $profilePicture): ?string
    {
        $bytes = $this->readLocalBytes($profilePicture);
        if ($bytes === null) {
            return null;
        }

        $src = @imagecreatefromstring($bytes);
        if ($src === false) {
            return null; // not a real image
        }

        $maxEdge = (int) config('face.build.max_edge', 320);
        $quality = (int) config('face.build.jpeg_quality', 80);

        $w = imagesx($src);
        $h = imagesy($src);
        $scale = min(1.0, $maxEdge / max($w, $h)); // never upscale
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));

        $dst = imagecreatetruecolor($nw, $nh);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);

        ob_start();
        imagejpeg($dst, null, $quality);
        $out = ob_get_clean();

        imagedestroy($src);
        imagedestroy($dst);

        return $out === false ? null : base64_encode($out);
    }

    /**
     * Resolve a profile_picture value to bytes from public/media/employee/profile_picture,
     * rejecting anything that escapes that directory. Mirrors the SDK upload guard.
     */
    private function readLocalBytes(string $profilePicture): ?string
    {
        $name = basename($profilePicture); // strip any directory component
        if ($name === '' || $name !== $profilePicture) {
            // a traversal or nested path was supplied
            if ($name === '' || str_contains($profilePicture, '..') || str_contains($profilePicture, '/') || str_contains($profilePicture, '\\')) {
                return null;
            }
        }

        $dir  = realpath(public_path('media/employee/profile_picture'));
        if ($dir === false) {
            return null;
        }
        $path = realpath($dir . DIRECTORY_SEPARATOR . $name);
        if ($path === false || !str_starts_with($path, $dir . DIRECTORY_SEPARATOR)) {
            return null; // outside the media dir
        }
        if (!is_file($path)) {
            return null;
        }
        $bytes = @file_get_contents($path);
        return $bytes === false ? null : $bytes;
    }
}
```

> If Task 0 Step 3 found a safe reader on `EmployeePhotoReader`, replace `readLocalBytes()` with a call to it and delete the private method — keep one source of truth for the traversal/image guard.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && php vendor/bin/phpunit tests/Feature/FaceGalleryImageProcessorTest.php`
Expected: `OK (5 tests, ...)`.

- [ ] **Step 5: Commit** (human runs)

```bash
git add app/Support/FaceGalleryImageProcessor.php tests/Feature/FaceGalleryImageProcessorTest.php
git commit -m "feat(face): downscale employee photos for gallery build"
```

---

## Task 3: Progress + concurrency helper (`FaceGalleryProgress`)

DB-free (uses cache — `array` in tests). Holds the per-job status blob the kiosk polls, and the per-company build lock.

**Files:**
- Create: `backend/app/Support/FaceGalleryProgress.php`
- Test: `backend/tests/Feature/FaceGalleryProgressTest.php`

**Interfaces:**
- Consumes: `config('face.build.lock_ttl')` (Task 1); Laravel `Cache`.
- Produces (static methods, all keyed by `company_id` / `job_id`):
  - `tryStart(int $companyId): ?string` — returns a new `job_id` and records `running` status, or `null` if a build is already running for the company.
  - `runningJobId(int $companyId): ?string` — the in-flight `job_id`, or `null`.
  - `setTotal(string $jobId, int $companyId, int $total): void`
  - `advance(string $jobId): void` — `processed++`.
  - `setPhase(string $jobId, string $phase): void` — `preparing` | `embedding`.
  - `markDone(string $jobId, int $companyId, int $gallerySize, array $failed): void`
  - `markFailed(string $jobId, int $companyId, string $error): void`
  - `status(string $jobId): ?array` — `{state, phase, processed, total, gallery_size, failed, error?}` or `null` if unknown.
  - `builtAt(int $companyId): ?string` — ISO8601 of the last successful build, or `null`.

- [ ] **Step 1: Write the failing test**

```php
<?php
namespace Tests\Feature;

use App\Support\FaceGalleryProgress;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class FaceGalleryProgressTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush(); // array driver in tests — safe
    }

    public function test_tryStart_returns_job_and_blocks_second_start(): void
    {
        $first = FaceGalleryProgress::tryStart(5);
        $this->assertNotNull($first);
        $this->assertSame($first, FaceGalleryProgress::runningJobId(5));

        $second = FaceGalleryProgress::tryStart(5);
        $this->assertNull($second, 'a second concurrent build must be refused');
    }

    public function test_progress_lifecycle(): void
    {
        $job = FaceGalleryProgress::tryStart(9);
        FaceGalleryProgress::setTotal($job, 9, 3);
        FaceGalleryProgress::setPhase($job, 'preparing');
        FaceGalleryProgress::advance($job);
        FaceGalleryProgress::advance($job);

        $s = FaceGalleryProgress::status($job);
        $this->assertSame('running', $s['state']);
        $this->assertSame('preparing', $s['phase']);
        $this->assertSame(2, $s['processed']);
        $this->assertSame(3, $s['total']);
    }

    public function test_markDone_records_size_and_releases_company(): void
    {
        $job = FaceGalleryProgress::tryStart(7);
        FaceGalleryProgress::setTotal($job, 7, 2);
        FaceGalleryProgress::markDone($job, 7, 2, [['system_user_id' => '99', 'reason' => 'no_photo']]);

        $s = FaceGalleryProgress::status($job);
        $this->assertSame('done', $s['state']);
        $this->assertSame(2, $s['gallery_size']);
        $this->assertCount(1, $s['failed']);
        $this->assertNotNull(FaceGalleryProgress::builtAt(7));
        // company released -> a new build can start
        $this->assertNotNull(FaceGalleryProgress::tryStart(7));
    }

    public function test_markFailed_sets_state_and_releases_company(): void
    {
        $job = FaceGalleryProgress::tryStart(4);
        FaceGalleryProgress::markFailed($job, 4, 'face service timeout');

        $s = FaceGalleryProgress::status($job);
        $this->assertSame('failed', $s['state']);
        $this->assertSame('face service timeout', $s['error']);
        $this->assertNull(FaceGalleryProgress::builtAt(4), 'a failed build must not record built_at');
        $this->assertNotNull(FaceGalleryProgress::tryStart(4));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php vendor/bin/phpunit tests/Feature/FaceGalleryProgressTest.php`
Expected: FAIL — `Class "App\Support\FaceGalleryProgress" not found`.

- [ ] **Step 3: Write minimal implementation**

```php
<?php
namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Cache-backed progress + concurrency for the async face-gallery build.
 * One "running" flag per company_id guarantees a single in-flight build;
 * one status blob per job_id is what the kiosk polls.
 */
class FaceGalleryProgress
{
    private const TTL = 3600; // status blobs live 1h past completion

    private static function runKey(int $companyId): string { return "face-gallery-run:{$companyId}"; }
    private static function statusKey(string $jobId): string { return "face-gallery-status:{$jobId}"; }
    private static function builtKey(int $companyId): string { return "face-gallery-built:{$companyId}"; }

    public static function tryStart(int $companyId): ?string
    {
        if (Cache::get(self::runKey($companyId)) !== null) {
            return null;
        }
        $jobId = (string) Str::uuid();
        $ttl = (int) config('face.build.lock_ttl', 900);
        Cache::put(self::runKey($companyId), $jobId, $ttl);
        Cache::put(self::statusKey($jobId), [
            'state' => 'running', 'phase' => 'preparing',
            'processed' => 0, 'total' => 0, 'gallery_size' => 0, 'failed' => [],
        ], self::TTL);
        return $jobId;
    }

    public static function runningJobId(int $companyId): ?string
    {
        return Cache::get(self::runKey($companyId));
    }

    public static function setTotal(string $jobId, int $companyId, int $total): void
    {
        self::patch($jobId, ['total' => $total]);
    }

    public static function setPhase(string $jobId, string $phase): void
    {
        self::patch($jobId, ['phase' => $phase]);
    }

    public static function advance(string $jobId): void
    {
        $s = self::status($jobId) ?? [];
        self::patch($jobId, ['processed' => (int) ($s['processed'] ?? 0) + 1]);
    }

    public static function markDone(string $jobId, int $companyId, int $gallerySize, array $failed): void
    {
        self::patch($jobId, [
            'state' => 'done', 'phase' => 'embedding',
            'gallery_size' => $gallerySize, 'failed' => array_values($failed),
        ]);
        Cache::put(self::builtKey($companyId), now()->toIso8601String(), self::TTL * 24 * 30);
        Cache::forget(self::runKey($companyId));
    }

    public static function markFailed(string $jobId, int $companyId, string $error): void
    {
        self::patch($jobId, ['state' => 'failed', 'error' => $error]);
        Cache::forget(self::runKey($companyId));
    }

    public static function status(string $jobId): ?array
    {
        return Cache::get(self::statusKey($jobId));
    }

    public static function builtAt(int $companyId): ?string
    {
        return Cache::get(self::builtKey($companyId));
    }

    private static function patch(string $jobId, array $changes): void
    {
        $s = Cache::get(self::statusKey($jobId)) ?? [
            'state' => 'running', 'phase' => 'preparing',
            'processed' => 0, 'total' => 0, 'gallery_size' => 0, 'failed' => [],
        ];
        Cache::put(self::statusKey($jobId), array_merge($s, $changes), self::TTL);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && php vendor/bin/phpunit tests/Feature/FaceGalleryProgressTest.php`
Expected: `OK (4 tests, ...)`.

> **Note on the lock:** `tryStart` uses check-then-put on the cache, which is not atomic under two truly simultaneous requests. `array` cache in tests is single-process so the test is deterministic. In prod (`file` cache), the residual race window is one duplicated build at worst — harmless because the build is idempotent (replace). If you later move cache to Redis, upgrade `tryStart` to `Cache::lock(...)->get()` for a true atomic guard. Documented, not fixed, per YAGNI.

- [ ] **Step 5: Commit** (human runs)

```bash
git add app/Support/FaceGalleryProgress.php tests/Feature/FaceGalleryProgressTest.php
git commit -m "feat(face): cache-backed progress + per-company build guard"
```

---

## Task 4: `FaceClient::buildGallery()` — the single build POST

Adds one method to the (Task 0) prod `FaceClient`, tested with `Http::fake()`. Does NOT touch `identify()`.

**Files:**
- Modify: `backend/app/Services/FaceClient.php`
- Test: `backend/tests/Feature/FaceClientBuildGalleryTest.php`

**Interfaces:**
- Consumes: `config('face.build.base_url')`, `config('face.build.gallery_path')`, `config('face.build.http_timeout')` (Task 1).
- Produces: `FaceClient::buildGallery(string $companyId, array $employees): array` where `$employees` is a list of `['system_user_id' => string, 'image_base64' => string]`. Returns `['gallery_size' => int, 'failed' => array]`. Throws `\RuntimeException` on non-2xx / transport error (so the job marks the build failed and leaves the old gallery intact).

- [ ] **Step 1: Write the failing test**

```php
<?php
namespace Tests\Feature;

use App\Services\FaceClient;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FaceClientBuildGalleryTest extends TestCase
{
    public function test_posts_full_array_and_parses_size(): void
    {
        Http::fake(['*/build-gallery' => Http::response(['gallery_size' => 2, 'failed' => []], 200)]);

        $out = (new FaceClient())->buildGallery('5', [
            ['system_user_id' => '10', 'image_base64' => 'AAA'],
            ['system_user_id' => '11', 'image_base64' => 'BBB'],
        ]);

        $this->assertSame(2, $out['gallery_size']);
        Http::assertSent(function (ClientRequest $r) {
            $body = $r->data();
            return str_contains($r->url(), '/build-gallery')
                && $r->method() === 'POST'
                && ($body['company_id'] ?? null) === '5'
                && count($body['employees'] ?? []) === 2
                && ($body['employees'][0]['system_user_id'] ?? null) === '10';
        });
    }

    public function test_non_2xx_throws(): void
    {
        Http::fake(['*/build-gallery' => Http::response('too big', 413)]);
        $this->expectException(\RuntimeException::class);
        (new FaceClient())->buildGallery('5', [['system_user_id' => '1', 'image_base64' => 'AAA']]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php vendor/bin/phpunit tests/Feature/FaceClientBuildGalleryTest.php`
Expected: FAIL — `Call to undefined method App\Services\FaceClient::buildGallery()` (or class-shape mismatch to reconcile).

- [ ] **Step 3: Add the method** to `FaceClient` (adapt the constructor/base-url access to match the real class from Task 0 Step 3):

```php
    /**
     * Build (replace) a company's 1:N gallery in one POST. The face service
     * requires the FULL employee array and replaces the whole gallery, so this
     * is atomic: on any error we throw and the previous gallery stays intact.
     *
     * @param array<int,array{system_user_id:string,image_base64:string}> $employees
     * @return array{gallery_size:int,failed:array}
     */
    public function buildGallery(string $companyId, array $employees): array
    {
        $base = rtrim((string) config('face.build.base_url'), '/');
        $path = config('face.build.gallery_path', '/build-gallery');

        $resp = \Illuminate\Support\Facades\Http::timeout((int) config('face.build.http_timeout', 300))
            ->acceptJson()
            ->post($base . $path, [
                'company_id' => $companyId,
                'employees'  => array_values($employees),
            ]);

        if (! $resp->successful()) {
            throw new \RuntimeException("build-gallery failed: HTTP {$resp->status()} {$resp->body()}");
        }

        $data = $resp->json() ?? [];
        return [
            'gallery_size' => (int) ($data['gallery_size'] ?? 0),
            'failed'       => is_array($data['failed'] ?? null) ? $data['failed'] : [],
        ];
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && php vendor/bin/phpunit tests/Feature/FaceClientBuildGalleryTest.php`
Expected: `OK (2 tests, ...)`.

- [ ] **Step 5: Commit** (human runs)

```bash
git add app/Services/FaceClient.php tests/Feature/FaceClientBuildGalleryTest.php
git commit -m "feat(face): FaceClient::buildGallery single-POST gallery replace"
```

---

## Task 5: Payload assembler (`FaceGalleryBuilder::assemble`)

The DB-free core of the job: turn a roster (plain array of employee rows) into the `employees[]` payload + `failed[]`, driving progress. The job (Task 6) supplies the roster from the DB; this pure function is what we test.

**Files:**
- Create: `backend/app/Support/FaceGalleryBuilder.php`
- Test: `backend/tests/Feature/FaceGalleryBuilderTest.php`

**Interfaces:**
- Consumes: `FaceGalleryImageProcessor` (Task 2), `FaceGalleryProgress` (Task 3).
- Produces: `FaceGalleryBuilder::assemble(string $jobId, iterable $roster): array` where each roster item is `['system_user_id' => string|int, 'profile_picture' => ?string]`. Returns `['employees' => array, 'failed' => array]`. Calls `FaceGalleryProgress::advance($jobId)` once per roster item. An item with no `profile_picture`, an unreadable/invalid photo → added to `failed[]` with a `reason`, not to `employees[]`.

- [ ] **Step 1: Write the failing test**

```php
<?php
namespace Tests\Feature;

use App\Support\FaceGalleryBuilder;
use App\Support\FaceGalleryProgress;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class FaceGalleryBuilderTest extends TestCase
{
    private function picDir(): string { return public_path('media/employee/profile_picture'); }

    private array $made = [];

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        if (!is_dir($this->picDir())) mkdir($this->picDir(), 0777, true);
    }

    private function writeJpeg(string $name): string
    {
        $img = imagecreatetruecolor(400, 400);
        imagejpeg($img, $this->picDir() . DIRECTORY_SEPARATOR . $name, 90);
        imagedestroy($img);
        $this->made[] = $this->picDir() . DIRECTORY_SEPARATOR . $name;
        return $name;
    }

    protected function tearDown(): void
    {
        foreach ($this->made as $p) if (is_file($p)) @unlink($p);
        parent::tearDown();
    }

    public function test_assemble_splits_good_and_failed_and_advances_progress(): void
    {
        $good = $this->writeJpeg('__fgb_ok__.jpg');
        $job = FaceGalleryProgress::tryStart(3);
        FaceGalleryProgress::setTotal($job, 3, 3);

        $roster = [
            ['system_user_id' => '10', 'profile_picture' => $good],
            ['system_user_id' => '11', 'profile_picture' => null],            // no photo
            ['system_user_id' => '12', 'profile_picture' => 'ghost.jpg'],     // missing file
        ];

        $out = FaceGalleryBuilder::assemble($job, $roster);

        $this->assertCount(1, $out['employees']);
        $this->assertSame('10', $out['employees'][0]['system_user_id']);
        $this->assertNotEmpty($out['employees'][0]['image_base64']);

        $this->assertCount(2, $out['failed']);
        $reasons = array_column($out['failed'], 'reason', 'system_user_id');
        $this->assertSame('no_photo', $reasons['11']);
        $this->assertSame('photo_unreadable', $reasons['12']);

        $this->assertSame(3, FaceGalleryProgress::status($job)['processed']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && php vendor/bin/phpunit tests/Feature/FaceGalleryBuilderTest.php`
Expected: FAIL — `Class "App\Support\FaceGalleryBuilder" not found`.

- [ ] **Step 3: Write minimal implementation**

```php
<?php
namespace App\Support;

/**
 * Pure (DB-free) assembler: roster rows -> {employees[], failed[]}, advancing
 * the job's progress once per row. Kept separate from the queued job so it can
 * be unit-tested without a database (tests must never touch the prod DB).
 */
class FaceGalleryBuilder
{
    public static function assemble(string $jobId, iterable $roster): array
    {
        $processor = new FaceGalleryImageProcessor();
        $employees = [];
        $failed = [];

        foreach ($roster as $row) {
            $sid = (string) ($row['system_user_id'] ?? '');
            $pic = $row['profile_picture'] ?? null;

            if ($sid === '') {
                FaceGalleryProgress::advance($jobId);
                continue; // cannot key an employee with no system_user_id
            }
            if (empty($pic)) {
                $failed[] = ['system_user_id' => $sid, 'reason' => 'no_photo'];
                FaceGalleryProgress::advance($jobId);
                continue;
            }

            $b64 = $processor->encode((string) $pic);
            if ($b64 === null) {
                $failed[] = ['system_user_id' => $sid, 'reason' => 'photo_unreadable'];
            } else {
                $employees[] = ['system_user_id' => $sid, 'image_base64' => $b64];
            }
            FaceGalleryProgress::advance($jobId);
        }

        return ['employees' => $employees, 'failed' => $failed];
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && php vendor/bin/phpunit tests/Feature/FaceGalleryBuilderTest.php`
Expected: `OK (1 test, ...)`.

- [ ] **Step 5: Commit** (human runs)

```bash
git add app/Support/FaceGalleryBuilder.php tests/Feature/FaceGalleryBuilderTest.php
git commit -m "feat(face): DB-free gallery payload assembler"
```

---

## Task 6: Queued job wiring (`BuildFaceGalleryJob`)

Wires the tested units to the DB roster. The DB query makes this **not** locally unit-testable (Global Constraints) — verify by `php -l` + end-to-end on the server (Task 8).

**Files:**
- Create: `backend/app/Jobs/BuildFaceGalleryJob.php`

**Interfaces:**
- Consumes: `FaceGalleryBuilder` (Task 5), `FaceClient` (Task 4), `FaceGalleryProgress` (Task 3), `Employee` model.
- Produces: dispatchable `BuildFaceGalleryJob::dispatch(int $companyId, string $jobId)`.

- [ ] **Step 1: Write the job** (no local test — DB)

```php
<?php
namespace App\Jobs;

use App\Models\Employee;
use App\Services\FaceClient;
use App\Support\FaceGalleryBuilder;
use App\Support\FaceGalleryProgress;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class BuildFaceGalleryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;      // a partial replace must never overwrite a good gallery
    public int $timeout = 900;  // photo prep + one long embedding POST

    public function __construct(
        public int $companyId,
        public string $jobId,
    ) {}

    public function handle(FaceClient $face): void
    {
        try {
            $roster = Employee::query()
                ->where('company_id', $this->companyId)
                ->get(['system_user_id', 'profile_picture'])
                ->map(fn ($e) => [
                    'system_user_id'  => $e->system_user_id,
                    'profile_picture' => $e->profile_picture,
                ]);

            FaceGalleryProgress::setTotal($this->jobId, $this->companyId, $roster->count());
            FaceGalleryProgress::setPhase($this->jobId, 'preparing');

            $assembled = FaceGalleryBuilder::assemble($this->jobId, $roster);

            FaceGalleryProgress::setPhase($this->jobId, 'embedding');
            $result = $face->buildGallery((string) $this->companyId, $assembled['employees']);

            $failed = array_merge($assembled['failed'], $result['failed']);
            FaceGalleryProgress::markDone($this->jobId, $this->companyId, $result['gallery_size'], $failed);
        } catch (Throwable $e) {
            FaceGalleryProgress::markFailed($this->jobId, $this->companyId, $e->getMessage());
            throw $e; // let the queue log it; tries=1 so no retry
        }
    }

    public function failed(Throwable $e): void
    {
        // Belt-and-suspenders: if handle() died before its catch, release the company.
        FaceGalleryProgress::markFailed($this->jobId, $this->companyId, $e->getMessage());
    }
}
```

- [ ] **Step 2: Lint**

Run: `cd backend && php -l app/Jobs/BuildFaceGalleryJob.php`
Expected: `No syntax errors detected`.

- [ ] **Step 3: Confirm the `Employee` model column names** used above exist (`system_user_id`, `profile_picture`).

Run: `cd backend && grep -nE "system_user_id|profile_picture" app/Models/Employee.php | head`
Expected: both appear (fillable/casts or referenced). If `profile_picture` is stored under a different column, adjust the `get([...])` and mapping.

- [ ] **Step 4: Commit** (human runs)

```bash
git add app/Jobs/BuildFaceGalleryJob.php
git commit -m "feat(face): queued BuildFaceGalleryJob (roster -> assemble -> POST)"
```

---

## Task 7: Controller endpoints + routes

Two new endpoints + extend the existing `galleryStatus()`. DB-touching (roster count, auth) — `php -l` + end-to-end verify.

**Files:**
- Modify: `backend/app/Http/Controllers/FaceAttendanceController.php`
- Modify: `backend/routes/company.php`

**Interfaces:**
- Consumes: `FaceGalleryProgress` (Task 3), `BuildFaceGalleryJob` (Task 6), `Employee` model, existing `galleryStatus()`.
- Produces routes:
  - `POST /api/face-gallery/build-async` → `202 {job_id, total}` | `409 {job_id}`
  - `GET /api/face-gallery/build-status?job_id=` → `200 {state, phase, processed, total, gallery_size, failed, error?}` | `404`
  - `GET /api/face-gallery/status` (extended) → adds `built_at`

- [ ] **Step 1: Add controller methods** (place next to the existing `galleryStatus`; use the class's existing way of reading `company_id` from the user — shown here as `auth()->user()->company_id`, adjust to match Task 0 Step 3):

```php
use App\Jobs\BuildFaceGalleryJob;
use App\Models\Employee;
use App\Support\FaceGalleryProgress;

public function buildGalleryAsync(): \Illuminate\Http\JsonResponse
{
    $companyId = (int) auth()->user()->company_id;

    $running = FaceGalleryProgress::runningJobId($companyId);
    if ($running !== null) {
        return response()->json(['job_id' => $running], 409);
    }

    $jobId = FaceGalleryProgress::tryStart($companyId);
    if ($jobId === null) {
        // lost a race between the check above and tryStart
        return response()->json(['job_id' => FaceGalleryProgress::runningJobId($companyId)], 409);
    }

    $total = Employee::where('company_id', $companyId)->count();
    FaceGalleryProgress::setTotal($jobId, $companyId, $total);

    BuildFaceGalleryJob::dispatch($companyId, $jobId);

    return response()->json(['job_id' => $jobId, 'total' => $total], 202);
}

public function buildGalleryStatus(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
{
    $jobId = (string) $request->query('job_id', '');
    $status = FaceGalleryProgress::status($jobId);
    if ($status === null) {
        return response()->json(['error' => 'unknown job_id'], 404);
    }
    return response()->json($status, 200);
}
```

- [ ] **Step 2: Extend `galleryStatus()`** to merge `built_at`. Find the existing method (it proxies the face service `/gallery-status`) and add `built_at` to its JSON payload:

```php
// inside galleryStatus(), where it builds the response array, add:
//   'built_at' => FaceGalleryProgress::builtAt((int) auth()->user()->company_id),
// so the kiosk gets { gallery_size, built_at }.
```

- [ ] **Step 3: Register routes** in `routes/company.php`, inside the same `auth:sanctum` group as the existing face routes (place near the existing `face-gallery/build` / `face-gallery/status` lines):

```php
Route::post('face-gallery/build-async', [FaceAttendanceController::class, 'buildGalleryAsync']);
Route::get('face-gallery/build-status', [FaceAttendanceController::class, 'buildGalleryStatus']);
// existing: Route::get('face-gallery/status', ...);  // now also returns built_at
```

- [ ] **Step 4: Lint both files**

Run: `cd backend && php -l app/Http/Controllers/FaceAttendanceController.php && php -l routes/company.php`
Expected: `No syntax errors detected` for each.

- [ ] **Step 5: Confirm routes register**

Run: `cd backend && php artisan route:list --path=face-gallery 2>&1 | cat`
Expected: three `face-gallery/*` rows incl. `build-async` (POST) and `build-status` (GET), all with `auth:sanctum`. (If artisan cannot boot locally due to pdo_pgsql, defer this to the server in Task 8.)

- [ ] **Step 6: Commit** (human runs)

```bash
git add app/Http/Controllers/FaceAttendanceController.php routes/company.php
git commit -m "feat(face): async build endpoints + built_at on gallery status"
```

---

## Task 8: End-to-end verification on the server

DB-touching code is verified here, not by local tests (Global Constraints). Run on the prod/staging server after deploy, using a **demo company** (e.g. company 82, 8 employees) so no large gallery is disturbed.

- [ ] **Step 1: Deploy** the changed files, then clear caches (see `deployment_live_backend` memory):

```bash
composer dump-autoload -o
sudo systemctl restart php8.1-fpm      # OPcache
pm2 restart <queue-worker>             # pick up the new Job class
```

- [ ] **Step 2: Confirm a queue worker is running** so dispatched jobs execute.

Run: `pm2 list | grep -i queue`
Expected: a running queue worker (e.g. `queue-jobs-v2` / `mytime2cloud-queue`).

- [ ] **Step 3: Get a sanctum token** for a user in the demo company (via the app login or an existing token). Export it as `$TOK`.

- [ ] **Step 4: Start a build**

Run:
```bash
curl -s -X POST https://v2backend.mytime2cloud.com/api/face-gallery/build-async \
  -H "Authorization: Bearer $TOK" -H "Accept: application/json"
```
Expected: `202` with `{"job_id":"...","total":8}` (total = demo company employee count).

- [ ] **Step 5: Immediately start a second build → expect 409**

Run: same curl again within a second or two.
Expected: `409 {"job_id":"<same id>"}` (concurrency guard).

- [ ] **Step 6: Poll status to completion**

Run:
```bash
curl -s "https://v2backend.mytime2cloud.com/api/face-gallery/build-status?job_id=<job_id>" \
  -H "Authorization: Bearer $TOK"
```
Expected progression: `phase:preparing` with `processed` climbing to `total`, then `phase:embedding`, then `state:done` with `gallery_size` > 0 and any `failed[]` listed.

- [ ] **Step 7: Cross-check the face service actually holds the gallery**

Run: `curl -s "https://face-validator.mytime2cloud.com/gallery-status?company_id=82"`
Expected: `gallery_size` matches the `state:done` payload.

- [ ] **Step 8: Confirm `built_at` surfaces**

Run:
```bash
curl -s https://v2backend.mytime2cloud.com/api/face-gallery/status \
  -H "Authorization: Bearer $TOK"
```
Expected: `{ "gallery_size": <n>, "built_at": "<ISO8601>" }`.

- [ ] **Step 9: Failure path** — temporarily point `FACE_BUILD_BASE_URL` at an unreachable host (or a company with all-missing photos), run a build, and confirm status ends `state:failed` with an `error`, the previous gallery on the face service is unchanged, and a subsequent build can start (company released). Restore config after.

---

## Out of scope for this plan (tracked in the spec)

- **Kiosk changes** (`d:\v2faceapp`) — switching login/rebuild to the Laravel async endpoints and deleting the client-side photo upload. Different repo/stack; gets its own plan after this backend ships.
- **Phase 2** — teaching the Python face service to build from `company_id` alone with real per-face progress + auth. Needs prod Python source.
- **Incremental single-employee add** — deferred (replace semantics force a full rebuild anyway).

## Self-review notes

- **Spec coverage:** async build (T6/T7), progress polling (T3/T7), concurrency 409 (T3/T7, verified T8-5), atomicity/no-partial (T4 throws + T6 leaves gallery intact, verified T8-9), company-wide scope (roster query keyed by `company_id` only, T6), failure reporting `failed[]` (T5 reasons + T4 merge), `built_at` on status (T7), downscaling to shrink payload (T2), config (T1) — all mapped.
- **Progress-honesty limitation** (embedding phase opaque) is carried from the spec into T3/T7 as the `phase` field; the kiosk shows an indeterminate "Embedding…" step. Real per-face progress is Phase 2.
- **Known residual:** cache-lock check-then-put race (documented in T3 Step 4). Harmless due to idempotent replace; upgrade to `Cache::lock` if cache moves to Redis.
- **DB testability:** every locally-tested unit (T2–T5) is DB-free; T6/T7 DB code is lint + end-to-end verified (T8), matching the repo's only safe pattern.
