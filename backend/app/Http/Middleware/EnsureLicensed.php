<?php

namespace App\Http\Middleware;

use App\Services\LicenseService;
use Closure;
use Illuminate\Http\Request;

/**
 * Generic license gate: blocks the request when the desktop is not activated,
 * expired, or running on a machine the license is not bound to.
 *
 * Resource-specific limits (max employees / max devices / serial whitelist) are
 * enforced in the controllers via LicenseService — this middleware only answers
 * "is the desktop licensed right now?". Activation/status routes are never gated.
 */
class EnsureLicensed
{
    public function __construct(private LicenseService $licenses) {}

    public function handle(Request $request, Closure $next)
    {
        if ($reason = $this->licenses->invalidReason()) {
            return response()->json([
                'message'        => $reason,
                'record'         => null,
                'status'         => false,
                'license_locked' => true,
            ], 403);
        }

        return $next($request);
    }
}
