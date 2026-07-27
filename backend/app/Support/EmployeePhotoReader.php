<?php

namespace App\Support;

/**
 * Resolves an employee's stored face photo to raw base64 (no `data:` prefix).
 *
 * Do NOT use Employee::$profile_picture_base64 — that accessor begins with
 * `return null;` and its body is dead code.
 *
 * Security:
 *  - The filename can originate from request data, so it is basename()'d and the
 *    resolved real path is confirmed to sit inside the photo directory. No traversal.
 *  - We never fetch a caller-supplied URL. That would be an SSRF vector.
 *
 * Returns null whenever real image bytes cannot be obtained, so callers refuse to
 * send an empty face rather than silently blanking a device enrolment.
 */
class EmployeePhotoReader
{
    public static function photoDir(): string
    {
        return public_path('media/employee/profile_picture');
    }

    public function base64ForRawName(?string $raw): ?string
    {
        $trimmed = trim((string) $raw);

        // realpath() throws a ValueError on null bytes (PHP 8+), and basename() does
        // not strip them. This class must never throw, so reject up front before any
        // filesystem call.
        if (str_contains($trimmed, "\0")) {
            return null;
        }

        $name = basename($trimmed);
        if ($name === '' || $name === '.' || $name === '..') {
            return null;
        }

        $dir  = self::photoDir();
        $path = $dir . DIRECTORY_SEPARATOR . $name;

        // Defence in depth on top of basename(): confirm containment.
        $real    = realpath($path);
        $realDir = realpath($dir);
        if ($real === false || $realDir === false
            || ! str_starts_with($real, rtrim($realDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR)) {
            return null;
        }

        $bytes = @file_get_contents($real);
        if (! self::isImageData($bytes)) {
            return null;
        }

        return base64_encode($bytes);
    }

    /**
     * Best-effort check that a byte string is a real image rather than, say, an
     * HTML error page served with a 200.
     */
    public static function isImageData($bytes): bool
    {
        if (! is_string($bytes) || strlen($bytes) < 12) {
            return false;
        }
        $sig = substr($bytes, 0, 12);

        return str_starts_with($sig, "\xFF\xD8\xFF")                            // JPEG
            || str_starts_with($sig, "\x89PNG\x0D\x0A\x1A\x0A")                 // PNG
            || str_starts_with($sig, 'GIF87a') || str_starts_with($sig, 'GIF89a')
            || str_starts_with($sig, 'BM')                                      // BMP
            || (str_starts_with($sig, 'RIFF') && substr($bytes, 8, 4) === 'WEBP');
    }
}
