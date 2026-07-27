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
        self::releaseIfOwner($jobId, $companyId);
    }

    public static function markFailed(string $jobId, int $companyId, string $error): void
    {
        self::patch($jobId, ['state' => 'failed', 'error' => $error]);
        self::releaseIfOwner($jobId, $companyId);
    }

    /**
     * Release the per-company run-lock only if it still points at THIS job. If the
     * TTL lapsed on a very long build and a newer build already claimed the lock,
     * this stale job must not forget the newer one's lock (which would let a third
     * build start). Also makes the job's double markFailed (in-handle catch + the
     * failed() hook) idempotent.
     */
    private static function releaseIfOwner(string $jobId, int $companyId): void
    {
        if (Cache::get(self::runKey($companyId)) === $jobId) {
            Cache::forget(self::runKey($companyId));
        }
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
