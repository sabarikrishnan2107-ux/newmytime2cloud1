<?php
namespace App\Support;

/**
 * Returns a DOWNSCALED base64 JPEG of an employee profile photo, for the
 * face-gallery build. The read + traversal/SSRF/image guards are delegated to
 * EmployeePhotoReader (the same reader the synchronous build and identify paths
 * use), so there is one source of that security-critical logic; this class only
 * adds the downscale. Returns null on any failure so the caller records the
 * employee as "failed" rather than pushing garbage into the gallery.
 */
class FaceGalleryImageProcessor
{
    public function __construct(
        private ?EmployeePhotoReader $reader = null,
    ) {
        $this->reader ??= new EmployeePhotoReader();
    }

    public function encode(string $profilePicture): ?string
    {
        // EmployeePhotoReader enforces basename-only, media-dir containment, null-byte
        // rejection, and an image-signature check; it returns full-size base64 or null.
        $b64 = $this->reader->base64ForRawName($profilePicture);
        if ($b64 === null) {
            return null;
        }
        $bytes = base64_decode($b64, true);
        if ($bytes === false || $bytes === '') {
            return null;
        }

        $src = @\imagecreatefromstring($bytes);
        if ($src === false) {
            return null; // not a real image
        }

        $maxEdge = (int) config('face.build.max_edge', 320);
        $quality = (int) config('face.build.jpeg_quality', 80);

        $w = \imagesx($src);
        $h = \imagesy($src);
        $scale = min(1.0, $maxEdge / max($w, $h)); // never upscale
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));

        $dst = \imagecreatetruecolor($nw, $nh);
        \imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);

        ob_start();
        \imagejpeg($dst, null, $quality);
        $out = ob_get_clean();

        \imagedestroy($src);
        \imagedestroy($dst);

        // Never return '' as a "successful" empty face — FaceClient::buildGallery warns
        // that an empty image_base64 silently degrades the gallery. Match the decode guard.
        return ($out === false || $out === '') ? null : \base64_encode($out);
    }
}
