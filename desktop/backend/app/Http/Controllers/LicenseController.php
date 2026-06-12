<?php

namespace App\Http\Controllers;

use App\Services\LicenseService;
use Illuminate\Http\Request;

/**
 * Desktop license ACTIVATION + status (desktop backend side).
 *
 * Verifies offline, RSA-signed tokens against the embedded public key, binds to
 * this machine, and reports enforcement status. It can never mint a license.
 */
class LicenseController extends Controller
{
    public function __construct(private LicenseService $licenses) {}

    /** Current activation/enforcement status for the UI + banner. */
    public function status()
    {
        return response()->json(['status' => true, 'record' => $this->licenses->status()], 200);
    }

    /** This machine's Activation Code, shown to the customer to request a key. */
    public function fingerprint()
    {
        $fp = $this->licenses->currentMachineFp();

        return response()->json([
            'status'     => $fp !== '',
            'machine_fp' => $fp,
            'message'    => $fp !== '' ? null : 'Machine fingerprint is not available yet. Restart the desktop app.',
        ], 200);
    }

    /** Activate (or re-activate / renew) with a pasted license key. */
    public function activate(Request $request)
    {
        $request->validate(['token' => ['required', 'string']]);

        $result = $this->licenses->activate($request->token);

        return response()->json([
            'status'  => $result['ok'],
            'message' => $result['message'],
            'record'  => $result['ok'] ? $this->licenses->status() : null,
        ], $result['ok'] ? 200 : 422);
    }
}
