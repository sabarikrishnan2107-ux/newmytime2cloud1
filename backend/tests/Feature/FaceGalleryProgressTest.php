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

    /**
     * If a very long build's lock TTL lapses and a newer build claims the company,
     * the stale job finishing must NOT release the newer build's lock (which would
     * let a third build start). markDone/markFailed only release when they own the lock.
     */
    public function test_a_non_owner_completion_does_not_release_the_running_lock(): void
    {
        $current = FaceGalleryProgress::tryStart(5);

        // A stale/foreign job for the same company reports done — it does not hold the lock.
        FaceGalleryProgress::markDone('stale-job-id', 5, 1, []);
        $this->assertSame($current, FaceGalleryProgress::runningJobId(5), 'done from a non-owner must not release the lock');

        FaceGalleryProgress::markFailed('stale-job-id', 5, 'whatever');
        $this->assertSame($current, FaceGalleryProgress::runningJobId(5), 'failed from a non-owner must not release the lock');

        // The real owner still can.
        FaceGalleryProgress::markDone($current, 5, 1, []);
        $this->assertNull(FaceGalleryProgress::runningJobId(5), 'the lock owner releases normally');
    }
}
