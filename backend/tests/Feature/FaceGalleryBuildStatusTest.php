<?php

namespace Tests\Feature;

use App\Http\Controllers\FaceAttendanceController;
use App\Services\FaceClient;
use App\Support\EmployeePhotoReader;
use App\Support\FaceGalleryProgress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * FaceAttendanceController::buildStatus is cache-only (reads a FaceGalleryProgress
 * blob by job_id), so it can be exercised directly with no DB — same pattern as
 * SdkProcessUploadPersonsTest. buildAsync()/status() are DB+auth bound and are
 * verified end-to-end on the server instead.
 */
class FaceGalleryBuildStatusTest extends TestCase
{
    private function controller(): FaceAttendanceController
    {
        return new FaceAttendanceController(new FaceClient(), new EmployeePhotoReader());
    }

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush(); // array driver in tests — safe
    }

    public function test_unknown_job_id_is_404(): void
    {
        $resp = $this->controller()->buildStatus(new Request(['job_id' => 'does-not-exist']));

        $this->assertSame(404, $resp->getStatusCode());
        $this->assertSame(['error' => 'unknown_job'], $resp->getData(true));
    }

    public function test_missing_job_id_is_404(): void
    {
        $resp = $this->controller()->buildStatus(new Request());

        $this->assertSame(404, $resp->getStatusCode());
    }

    public function test_running_job_returns_progress_blob(): void
    {
        $job = FaceGalleryProgress::tryStart(77);
        FaceGalleryProgress::setTotal($job, 77, 5);
        FaceGalleryProgress::setPhase($job, 'preparing');
        FaceGalleryProgress::advance($job);

        $resp = $this->controller()->buildStatus(new Request(['job_id' => $job]));

        $this->assertSame(200, $resp->getStatusCode());
        $data = $resp->getData(true);
        $this->assertSame('running', $data['state']);
        $this->assertSame('preparing', $data['phase']);
        $this->assertSame(1, $data['processed']);
        $this->assertSame(5, $data['total']);
    }

    public function test_done_job_reports_gallery_size_and_failures(): void
    {
        $job = FaceGalleryProgress::tryStart(78);
        FaceGalleryProgress::setTotal($job, 78, 2);
        FaceGalleryProgress::markDone($job, 78, 2, [['system_user_id' => '9', 'reason' => 'no_photo']]);

        $resp = $this->controller()->buildStatus(new Request(['job_id' => $job]));
        $data = $resp->getData(true);

        $this->assertSame(200, $resp->getStatusCode());
        $this->assertSame('done', $data['state']);
        $this->assertSame(2, $data['gallery_size']);
        $this->assertCount(1, $data['failed']);
    }
}
