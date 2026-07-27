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
