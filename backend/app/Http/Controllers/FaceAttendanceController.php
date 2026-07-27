<?php

namespace App\Http\Controllers;

use App\Exceptions\FaceServiceUnavailable;
use App\Jobs\BuildFaceGalleryJob;
use App\Models\Employee;
use App\Services\FaceClient;
use App\Support\EmployeePhotoReader;
use App\Support\FaceGalleryProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Face attendance for the TimeAdmin mobile app.
 *
 * The phone posts base64 here; Laravel forwards raw bytes to the ArcFace service
 * and hydrates the Employee. The phone never learns the face service exists —
 * that service is unauthenticated and must stay behind this controller.
 *
 * company_id ALWAYS comes from the authenticated user, never the request body.
 */
class FaceAttendanceController extends Controller
{
    public function __construct(
        protected FaceClient $face,
        protected EmployeePhotoReader $photos,
    ) {
    }

    protected function companyId(): string
    {
        return (string) auth()->user()->company_id;
    }

    /**
     * GET /api/face-gallery/status
     *
     * Deliberately cheap: the app calls this on every login. `employees_with_photo`
     * counts the DB column only and does NOT stat the disk, so it is an upper bound.
     * `build()` reports the authoritative count in `skipped_no_photo`.
     */
    public function status(): JsonResponse
    {
        $companyId = $this->companyId();

        try {
            $gallerySize = $this->face->galleryStatus($companyId);
        } catch (FaceServiceUnavailable $e) {
            return response()->json(['error' => 'face_service_unavailable'], 503);
        }

        return response()->json([
            'gallery_size'         => $gallerySize,
            // Timestamp of the last successful async build, or null. The face service
            // does not report it, so we read it from where BuildFaceGalleryJob stored it.
            'built_at'             => FaceGalleryProgress::builtAt((int) $companyId),
            'employees_with_photo' => $this->companyEmployees($companyId)
                                            ->whereNotNull('profile_picture')
                                            ->where('profile_picture', '!=', '')
                                            ->count(),
            'employees_total'      => $this->companyEmployees($companyId)->count(),
        ]);
    }

    /**
     * POST /api/face-gallery/build-async
     *
     * Kicks off BuildFaceGalleryJob and returns immediately. The kiosk polls
     * buildStatus() for progress. One build per company at a time: if one is
     * already running, return its job_id with 409 rather than starting a second.
     */
    public function buildAsync(): JsonResponse
    {
        $companyId = (int) $this->companyId();

        if (($running = FaceGalleryProgress::runningJobId($companyId)) !== null) {
            return response()->json(['job_id' => $running], 409);
        }

        $jobId = FaceGalleryProgress::tryStart($companyId);
        if ($jobId === null) {
            // Lost the race between the check above and tryStart — report the winner.
            return response()->json(['job_id' => FaceGalleryProgress::runningJobId($companyId)], 409);
        }

        $total = $this->companyEmployees((string) $companyId)->count();
        FaceGalleryProgress::setTotal($jobId, $companyId, $total);

        try {
            BuildFaceGalleryJob::dispatch($companyId, $jobId);
        } catch (\Throwable $e) {
            // Queue backend unreachable: release the lock now instead of leaving a
            // phantom "running" for lock_ttl with no job behind it.
            FaceGalleryProgress::markFailed($jobId, $companyId, 'dispatch_failed');
            return response()->json(['error' => 'queue_unavailable'], 503);
        }

        return response()->json(['job_id' => $jobId, 'total' => $total], 202);
    }

    /**
     * GET /api/face-gallery/build-status?job_id=<id>
     *
     * Progress for a running/finished async build:
     *   { state, phase, processed, total, gallery_size, failed[], error? }
     * state is running | done | failed. 404 if the job_id is unknown/expired.
     */
    public function buildStatus(Request $request): JsonResponse
    {
        $status = FaceGalleryProgress::status((string) $request->query('job_id', ''));

        if ($status === null) {
            return response()->json(['error' => 'unknown_job'], 404);
        }

        return response()->json($status);
    }

    /** POST /api/face-gallery/build */
    public function build(): JsonResponse
    {
        $companyId = $this->companyId();
        $total     = $this->companyEmployees($companyId)->count();
        $payload   = $this->galleryCandidates($companyId)->values()->all();

        try {
            $result = $this->face->buildGallery($companyId, $payload);
        } catch (FaceServiceUnavailable $e) {
            return response()->json(['error' => 'face_service_unavailable'], 503);
        }

        return response()->json($result + ['skipped_no_photo' => $total - count($payload)]);
    }

    /** POST /api/face-identify */
    public function identify(Request $request): JsonResponse
    {
        $request->validate([
            // A 640px JPEG at quality 0.6 is ~80KB → ~110k base64 chars. Cap well above that
            // so a hostile or buggy client cannot OOM a worker by decoding a giant string.
            'image_base64' => ['required', 'string', 'max:10000000'],
        ]);

        $bytes = base64_decode($this->stripDataUri($request->input('image_base64')), true);
        if ($bytes === false || $bytes === '') {
            return response()->json(['error' => 'invalid_image'], 422);
        }

        try {
            $result = $this->face->identify($bytes, $this->companyId());
        } catch (FaceServiceUnavailable $e) {
            return response()->json(['error' => 'face_service_unavailable'], 503);
        }

        // The face service answers 200 for everything and explains itself in `reason`.
        // Translate the two reasons the app can act on into real status codes; treat
        // every other reason as an ordinary no-match rather than inventing an error.
        if ($status = $this->reasonToStatus($result['reason'])) {
            return response()->json(['error' => $status[0]], $status[1]);
        }

        if (! $result['match'] || ! FaceClient::passesThreshold($result['score'])) {
            return response()->json(['matched' => false, 'score' => $result['score']]);
        }

        // FaceClient may report match:true while omitting system_user_id. Passing null
        // into ->where() becomes `WHERE system_user_id IS NULL`, which would match an
        // arbitrary un-enrolled employee in this company. Treat it as no match.
        $systemUserId = $result['system_user_id'];
        if ($systemUserId === null || $systemUserId === '') {
            return response()->json(['matched' => false, 'score' => $result['score']]);
        }

        $employee = Employee::where('company_id', $this->companyId())
            ->where('system_user_id', $systemUserId)
            ->first();

        // The gallery can outlive the employee row it was built from.
        if (! $employee) {
            return response()->json(['matched' => false, 'score' => $result['score']]);
        }

        return response()->json([
            'matched'  => true,
            'score'    => $result['score'],
            'employee' => $this->present($employee),
        ]);
    }

    /**
     * Map a face-service failure string to [app_error_code, http_status], or null to
     * let the caller fall through to the ordinary matched/no-match path.
     *
     * ORDER MATTERS. The contract document's no-match string is "No matching face",
     * which contains the word "face". A naive `str_contains($r, 'face')` would turn an
     * ordinary stranger into a 422 "no face detected" and tell the admin to retake a
     * photo that was perfectly fine. No-match is therefore ruled out *before* the
     * face check.
     *
     * Confirmed reason: "gallery_empty". The faceless-photo string is unverified —
     * see Task 5 Step 5, which replaces these substring guesses with observed values.
     *
     * @return array{0: string, 1: int}|null
     */
    protected function reasonToStatus(?string $reason): ?array
    {
        if ($reason === null || $reason === '') {
            return null;
        }

        $r = strtolower($reason);

        if (str_contains($r, 'gallery')) {
            return ['gallery_empty', 409];
        }

        // An ordinary miss. Not an error — the app shows its no-match sheet.
        if (str_contains($r, 'no matching') || str_contains($r, 'no_match')) {
            return null;
        }

        if (str_contains($r, 'face')) {
            return ['no_face_detected', 422];
        }

        return null;
    }

    /**
     * Active employees of this company. `is_active` is excluded here (rather than
     * only at the point of use) because an inactive/terminated employee must not
     * remain identifiable in the face gallery — every caller of this method
     * (status() counts, build()'s payload, galleryCandidates()) needs the same
     * active-only scope so the reported counts agree with what build() sends.
     *
     * Employee::$with eager-loads six relations (schedule, department, designation,
     * sub_department, branch, user). None of them are needed to read a filename, and
     * loading them for every employee in the company is a large, pointless join.
     * setEagerLoads([]) switches them off for this query only.
     */
    protected function companyEmployees(string $companyId)
    {
        return Employee::query()->setEagerLoads([])
            ->where('company_id', $companyId)
            ->where('is_active', true);
    }

    /**
     * Employees of this company that have real image bytes on disk. Anyone whose
     * photo is missing or corrupt is excluded rather than sent as an empty face —
     * an empty face silently degrades the gallery for everyone.
     *
     * @return \Illuminate\Support\Collection<int, array{system_user_id: string, image_base64: string}>
     */
    protected function galleryCandidates(string $companyId)
    {
        return $this->companyEmployees($companyId)
            ->select(['id', 'system_user_id', 'profile_picture'])
            ->get()
            ->map(function (Employee $e) {
                $b64 = $this->photos->base64ForRawName($e->profile_picture_raw);

                return $b64 === null ? null : [
                    'system_user_id' => (string) $e->system_user_id,
                    'image_base64'   => $b64,
                ];
            })
            ->filter();
    }

    /** The popup payload. `system_user_id` is the punch key; `employee_id` is display-only. */
    protected function present(Employee $e): array
    {
        $last = $e->attendance_logs()
            ->where('company_id', $e->company_id)
            ->orderByDesc('LogTime')
            ->first();

        return [
            'system_user_id' => (string) $e->system_user_id,
            'name'           => $e->full_name,
            'employee_id'    => $e->employee_id,
            'department'     => $e->department->name ?? null,
            'designation'    => $e->designation->name ?? null,
            'branch'         => $e->branch->branch_name ?? null,
            'photo_base64'   => $this->photos->base64ForRawName($e->profile_picture_raw),
            'last_punch'     => $last ? ['log_type' => $last->log_type, 'at' => (string) $last->LogTime] : null,
        ];
    }

    protected function stripDataUri(string $b64): string
    {
        return preg_replace('#^data:image/\w+;base64,#', '', trim($b64)) ?? $b64;
    }
}
