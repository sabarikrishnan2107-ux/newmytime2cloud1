<?php

namespace Tests\Feature;

use App\Http\Controllers\SDKController;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Guards the OX / SDK device-upload path (SDKController::processUploadPersons).
 *
 * Root bug: the method read the employee photo from local disk and, when the file
 * was missing/unreadable, silently sent an EMPTY faceImage. On OX face devices that
 * does not enrol a usable face and, on re-upload, collapses the working set to one
 * blank record — which customers see as "uploading the 2nd employee deleted the 1st".
 *
 * The fix reads ONLY the local media file (traversal-safe, image-validated) and never
 * fetches a caller-supplied URL (SSRF). A missing/invalid photo yields HTTP 422 and is
 * not pushed.
 */
class SdkProcessUploadPersonsTest extends TestCase
{
    private string $deviceUrl = 'https://sdk.example.test/DEV123/AddPerson';
    private string $deviceId = 'DEV123';
    private string $localFile = '__test_face__.jpg';
    private string $nonImageFile = '__test_notimg__.bin';
    private string $traversalTarget = '__traversal_target__.jpg';

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

    protected function tearDown(): void
    {
        foreach ([
            $this->picDir() . DIRECTORY_SEPARATOR . $this->localFile,
            $this->picDir() . DIRECTORY_SEPARATOR . $this->nonImageFile,
            public_path($this->traversalTarget),
        ] as $p) {
            if (is_file($p)) {
                @unlink($p);
            }
        }
        parent::tearDown();
    }

    /** Minimal valid JPEG (SOI + EOI markers) so image-signature checks pass. */
    private function fakeJpegBytes(): string
    {
        return "\xFF\xD8\xFF" . str_repeat("\x00", 16) . "\xFF\xD9";
    }

    /** A face-less employee must NOT be pushed, and the caller-supplied URL must NOT be fetched (SSRF). */
    public function test_missing_photo_is_not_pushed_and_url_not_fetched(): void
    {
        Http::fake([
            'backend.example.test/*' => Http::response('not found', 404),
            '*/AddPerson'            => Http::response(['message' => 'Person added'], 200),
        ]);

        $person = [
            'name'                => 'No Photo',
            'userCode'            => 999,
            'profile_picture_raw' => 'does-not-exist.jpg',
            'faceImage'           => 'https://backend.example.test/media/employee/profile_picture/does-not-exist.jpg',
        ];

        $result = (new SDKController())->processUploadPersons($this->deviceUrl, $this->deviceId, $person);

        $this->assertSame(422, $result['status'], 'A missing photo must surface as an error, not a silent push.');
        Http::assertNotSent(fn (ClientRequest $r) => str_contains($r->url(), 'AddPerson'));
        // SSRF guard: the client-supplied faceImage URL must never be fetched server-side.
        Http::assertNotSent(fn (ClientRequest $r) => str_contains($r->url(), 'backend.example.test'));
    }

    /** A photo present on local disk is used directly. */
    public function test_local_photo_is_used(): void
    {
        $bytes = $this->fakeJpegBytes();
        file_put_contents($this->picDir() . DIRECTORY_SEPARATOR . $this->localFile, $bytes);

        Http::fake(['*/AddPerson' => Http::response(['message' => 'Person added'], 200)]);

        $person = [
            'name'                => 'Local Photo',
            'userCode'            => 55,
            'profile_picture_raw' => $this->localFile,
            'faceImage'           => 'https://unused.example.test/x.jpg',
        ];

        $result = (new SDKController())->processUploadPersons($this->deviceUrl, $this->deviceId, $person);

        $this->assertSame(200, $result['status']);
        Http::assertSent(function (ClientRequest $r) use ($bytes) {
            return str_contains($r->url(), 'AddPerson')
                && ($r->data()['faceImage'] ?? '') === base64_encode($bytes);
        });
    }

    /** profile_picture_raw with a traversal path must not read a file outside the media dir. */
    public function test_path_traversal_is_blocked(): void
    {
        // A valid image placed OUTSIDE the profile-picture directory.
        file_put_contents(public_path($this->traversalTarget), $this->fakeJpegBytes());

        Http::fake(['*/AddPerson' => Http::response(['message' => 'Person added'], 200)]);

        $person = [
            'name'                => 'Traversal',
            'userCode'            => 7,
            'profile_picture_raw' => '../' . $this->traversalTarget,
            'faceImage'           => '',
        ];

        $result = (new SDKController())->processUploadPersons($this->deviceUrl, $this->deviceId, $person);

        $this->assertSame(422, $result['status'], 'Traversal path must not resolve to a file outside the media dir.');
        Http::assertNotSent(fn (ClientRequest $r) => str_contains($r->url(), 'AddPerson'));
    }

    /** A local file that is not a real image must be rejected (no garbage face pushed). */
    public function test_non_image_local_file_is_blocked(): void
    {
        file_put_contents(
            $this->picDir() . DIRECTORY_SEPARATOR . $this->nonImageFile,
            "<html><body>not an image</body></html>"
        );

        Http::fake(['*/AddPerson' => Http::response(['message' => 'Person added'], 200)]);

        $person = [
            'name'                => 'Not Image',
            'userCode'            => 8,
            'profile_picture_raw' => $this->nonImageFile,
            'faceImage'           => '',
        ];

        $result = (new SDKController())->processUploadPersons($this->deviceUrl, $this->deviceId, $person);

        $this->assertSame(422, $result['status']);
        Http::assertNotSent(fn (ClientRequest $r) => str_contains($r->url(), 'AddPerson'));
    }
}
