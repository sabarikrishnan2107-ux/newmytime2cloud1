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
        if (!function_exists('imagejpeg')) { $this->markTestSkipped('GD lacks JPEG support locally (herd-lite); runs on prod php8.1-fpm.'); }

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

    /**
     * The failed/skipped branches and the advance-once-per-row count are
     * JPEG-independent (no row here reaches imagejpeg), so this runs on every
     * machine — it gives local coverage of the assembler's core logic even
     * where GD lacks libjpeg. Only the happy path lives in the skip-guarded test above.
     */
    public function test_failed_and_skipped_rows_are_classified_without_jpeg(): void
    {
        $job = FaceGalleryProgress::tryStart(4);
        FaceGalleryProgress::setTotal($job, 4, 4);

        $roster = [
            ['system_user_id' => '20', 'profile_picture' => null],          // no photo
            ['system_user_id' => '21', 'profile_picture' => ''],            // empty -> no photo
            ['system_user_id' => '22', 'profile_picture' => 'ghost.jpg'],   // file missing -> unreadable
            ['system_user_id' => '',   'profile_picture' => 'x.jpg'],       // no id -> skipped entirely
        ];

        $out = FaceGalleryBuilder::assemble($job, $roster);

        $this->assertSame([], $out['employees']);
        $reasons = array_column($out['failed'], 'reason', 'system_user_id');
        $this->assertSame('no_photo', $reasons['20']);
        $this->assertSame('no_photo', $reasons['21']);
        $this->assertSame('photo_unreadable', $reasons['22']);
        $this->assertCount(3, $out['failed']); // the id-less row is skipped, not failed
        $this->assertSame(4, FaceGalleryProgress::status($job)['processed']); // every row advances
    }
}
