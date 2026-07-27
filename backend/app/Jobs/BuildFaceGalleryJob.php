<?php

namespace App\Jobs;

use App\Exceptions\FaceServiceUnavailable;
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

/**
 * Builds (replaces) a company's 1:N face gallery asynchronously.
 *
 * The face service /build-gallery REPLACES the whole gallery and requires the
 * full employee array, so this sends ONE atomic POST. It reads each photo from
 * the server's own disk and downscales it (FaceGalleryBuilder ->
 * FaceGalleryImageProcessor), which is what lets a large company fit in that one
 * request. Progress + the per-company "already running" guard live in the cache
 * (FaceGalleryProgress); the controller starts the job and the kiosk polls status.
 *
 * tries = 1: a failed/partial build must never overwrite a good gallery. On any
 * error we simply never POST, so the face service keeps the previous gallery.
 */
class BuildFaceGalleryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 900; // photo prep for the whole company + one long embedding POST

    public function __construct(
        public int $companyId,
        public string $jobId,
    ) {
    }

    public function handle(FaceClient $face): void
    {
        try {
            // Same scope as FaceAttendanceController::companyEmployees(): active only
            // (a terminated employee must not stay identifiable) and eager-loads off.
            // We read profile_picture_raw (the bare filename) — NOT profile_picture,
            // which an accessor rewrites into a URL. Only system_user_id and
            // profile_picture_raw are touched, so the narrowed select is safe.
            $roster = Employee::query()->setEagerLoads([])
                ->where('company_id', $this->companyId)
                ->where('is_active', true)
                ->select(['id', 'system_user_id', 'profile_picture'])
                ->get()
                ->map(fn (Employee $e) => [
                    'system_user_id'  => (string) $e->system_user_id,
                    'profile_picture' => (string) $e->profile_picture_raw,
                ]);

            FaceGalleryProgress::setTotal($this->jobId, $this->companyId, $roster->count());
            FaceGalleryProgress::setPhase($this->jobId, 'preparing');

            // Disk read + downscale for every employee; advances progress per row.
            $assembled = FaceGalleryBuilder::assemble($this->jobId, $roster);

            // The single opaque embedding POST — progress cannot advance inside it.
            FaceGalleryProgress::setPhase($this->jobId, 'embedding');
            $result = $face->buildGallery((string) $this->companyId, $assembled['employees']);

            $failed = array_merge($assembled['failed'], $result['failed']);
            FaceGalleryProgress::markDone($this->jobId, $this->companyId, $result['gallery_size'], $failed);
        } catch (Throwable $e) {
            FaceGalleryProgress::markFailed($this->jobId, $this->companyId, self::coarseError($e));
            throw $e; // surface the real exception to failed_jobs; tries=1 means no retry
        }
    }

    /**
     * If handle() dies before its own catch (e.g. the worker is killed), release the
     * company lock so a fresh build can start instead of being wedged as "running".
     * releaseIfOwner() makes this second markFailed idempotent with the one above.
     */
    public function failed(Throwable $e): void
    {
        FaceGalleryProgress::markFailed($this->jobId, $this->companyId, self::coarseError($e));
    }

    /**
     * A coarse, client-safe error label for the status blob the kiosk polls. The full
     * exception (which for a DB/GD error could carry internal detail) still reaches the
     * failed_jobs log via the re-throw — the kiosk only ever sees these two strings.
     */
    private static function coarseError(Throwable $e): string
    {
        return $e instanceof FaceServiceUnavailable ? 'face_service_unavailable' : 'build_error';
    }
}
