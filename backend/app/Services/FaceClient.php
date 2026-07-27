<?php

namespace App\Services;

use App\Exceptions\FaceServiceUnavailable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Sole owner of HTTP calls to the ArcFace service. Knows nothing about Eloquent
 * or about the authenticated user — pass company_id in explicitly.
 */
class FaceClient
{
    protected function baseUrl(): string
    {
        return rtrim((string) config('face.base_url'), '/');
    }

    /**
     * Number of faces currently in the company's gallery. The gallery does not
     * survive a face-service restart, so 0 is a normal answer, not an error.
     *
     * @throws FaceServiceUnavailable
     */
    public function galleryStatus(string $companyId): int
    {
        try {
            $resp = Http::timeout((int) config('face.timeout'))
                ->acceptJson()
                ->get($this->baseUrl() . '/gallery-status', ['company_id' => $companyId]);
        } catch (ConnectionException $e) {
            throw new FaceServiceUnavailable('face service unreachable', 0, $e);
        }

        if (! $resp->successful()) {
            throw new FaceServiceUnavailable('gallery-status returned ' . $resp->status());
        }

        return (int) ($resp->json('gallery_size') ?? 0);
    }

    /**
     * A score exactly equal to the threshold is a match.
     */
    public static function passesThreshold(float $score, ?float $threshold = null): bool
    {
        $threshold ??= (float) config('face.identify_threshold');

        return $score >= $threshold;
    }

    /**
     * 1:N — "who is this?". `$jpegBytes` is the decoded image, NOT base64:
     * the service takes multipart/form-data. Http::attach() accepts the bytes
     * directly, so nothing is written to disk.
     *
     * The service ALWAYS answers 200 and reports failure in a `reason` key
     * (verified 2026-07-09: an empty gallery yields
     * `200 {"match": false, "reason": "gallery_empty"}`). It never uses 4xx.
     * We pass `reason` through untouched — interpreting it is the controller's
     * job — so a new reason string added upstream cannot silently become the
     * wrong error here.
     *
     * Only transport failures (5xx, timeout, connection refused) throw.
     *
     * @return array{match: bool, system_user_id: ?string, score: float, reason: ?string}
     * @throws FaceServiceUnavailable
     */
    public function identify(string $jpegBytes, string $companyId): array
    {
        try {
            $resp = Http::timeout((int) config('face.timeout'))
                ->acceptJson()
                ->attach('captured_image', $jpegBytes, 'captured.jpg')
                ->post($this->baseUrl() . '/identify', ['company_id' => $companyId]);
        } catch (ConnectionException $e) {
            throw new FaceServiceUnavailable('face service unreachable', 0, $e);
        }

        if ($resp->serverError()) {
            throw new FaceServiceUnavailable('identify returned ' . $resp->status());
        }

        $score = (float) ($resp->json('score') ?? 0.0);

        if (! $resp->json('match')) {
            return [
                'match'          => false,
                'system_user_id' => null,
                'score'          => $score,
                'reason'         => $this->failureReason($resp->json()),
            ];
        }

        $systemUserId = $resp->json('system_user_id');

        return [
            'match'          => true,
            'system_user_id' => $systemUserId !== null ? (string) $systemUserId : null,
            'score'          => $score,
            'reason'         => null,
        ];
    }

    /**
     * The running service reports failures in `reason`. Its contract document
     * (specs/2026-06-18-face-1n-identify-endpoint-contract.md) instead specifies
     * `message` for a no-match and `error` for a bad photo — that document describes
     * what was asked for, not what was built. Accept any of the three so this keeps
     * working whichever way the service is corrected.
     */
    protected function failureReason(?array $body): ?string
    {
        foreach (['reason', 'message', 'error'] as $key) {
            $value = $body[$key] ?? null;
            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    /**
     * Rebuild the company's 1:N gallery. Slow — it embeds every photo — so it
     * uses its own timeout. Callers must never pass an employee with an empty
     * image_base64: an empty face silently degrades the gallery.
     *
     * @param  array<int, array{system_user_id: string, image_base64: string}>  $employees
     * @return array{built: int, gallery_size: int, failed: array}
     * @throws FaceServiceUnavailable
     */
    public function buildGallery(string $companyId, array $employees): array
    {
        try {
            $resp = Http::timeout((int) config('face.gallery_timeout'))
                ->acceptJson()
                ->post($this->baseUrl() . '/build-gallery', [
                    'company_id' => $companyId,
                    'employees'  => array_values($employees),
                ]);
        } catch (ConnectionException $e) {
            throw new FaceServiceUnavailable('face service unreachable', 0, $e);
        }

        if (! $resp->successful()) {
            throw new FaceServiceUnavailable('build-gallery returned ' . $resp->status());
        }

        return [
            'built'        => (int) ($resp->json('built') ?? 0),
            'gallery_size' => (int) ($resp->json('gallery_size') ?? 0),
            'failed'       => (array) ($resp->json('failed') ?? []),
        ];
    }
}
