<?php

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
        // Verifying downscaled JPEG dimensions needs GD JPEG encode+decode. The local
        // herd-lite GD is built without libjpeg; prod php8.1-fpm has it, where this runs.
        if (!function_exists('imagejpeg')) {
            $this->markTestSkipped('GD lacks JPEG support in this environment (local herd-lite); runs on prod php8.1-fpm.');
        }

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
        if (!function_exists('imagejpeg')) {
            $this->markTestSkipped('GD lacks JPEG support in this environment (local herd-lite); runs on prod php8.1-fpm.');
        }

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
