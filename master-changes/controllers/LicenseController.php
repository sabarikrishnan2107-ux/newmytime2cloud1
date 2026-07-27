<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\License;
use App\Services\LicenseSigner;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Desktop license GENERATOR (master-app / live backend side).
 *
 * Issues offline, RSA-signed license tokens. The desktop verifies them with the
 * embedded public key — this side is the only place that can mint a license.
 */
class LicenseController extends Controller
{
    public function index(Request $request)
    {
        $model = License::query();

        if ($request->filled('company_id')) {
            $model->where('company_id', $request->company_id);
        }

        if ($request->filled('key')) {
            $key = $request->key;
            $model->where(function ($q) use ($key) {
                $q->where('license_id', 'ILIKE', "%$key%")
                    ->orWhere('company_name', 'ILIKE', "%$key%")
                    ->orWhere('machine_fp', 'ILIKE', "%$key%");
            });
        }

        return $model->paginate($request->per_page ?? 50);
    }

    public function show($id)
    {
        $record = License::where('id', $id)->orWhere('license_id', $id)->first();
        return $this->response(null, $record, (bool) $record);
    }

    public function destroy($id)
    {
        $record = License::where('id', $id)->orWhere('license_id', $id)->first();

        if (! $record) {
            return response()->json(['status' => false, 'message' => 'License not found.'], 404);
        }

        $record->delete();

        return response()->json(['status' => true, 'message' => 'License deleted successfully.'], 200);
    }

    public function generate(Request $request, LicenseSigner $signer)
    {
        $data = $request->validate([
            // company_name is a free-text label for the license (admin reference);
            // it is NOT tied to a real company record. company_id is optional.
            'company_name'      => ['required', 'string', 'max:191'],
            'company_id'        => ['nullable', 'integer'],
            'machine_fp'        => ['required', 'string', 'min:6'],
            // At least one whitelisted device serial is required.
            'allowed_devices'   => ['required', 'array', 'min:1'],
            'allowed_devices.*' => ['string'],
            'max_devices'       => ['required', 'integer', 'min:1'],
            'max_branches'      => ['nullable', 'integer', 'min:0'],
            'max_employees'     => ['required', 'integer', 'min:0'],
            'expiry'            => ['required', 'date'],
        ]);

        $allowed = array_values(array_filter(array_map('trim', $data['allowed_devices'] ?? [])));

        if (empty($allowed)) {
            return response()->json([
                'status'  => false,
                'message' => 'At least one device serial is required.',
                'errors'  => ['allowed_devices' => ['At least one device serial is required.']],
            ], 422);
        }

        $licenseId = 'LIC-' . date('Ymd') . '-' . strtoupper(Str::random(6));

        $signed = $signer->generate([
            'license_id'      => $licenseId,
            'company_id'      => $data['company_id'] ?? null,
            'company_name'    => $data['company_name'],
            'machine_fp'      => $data['machine_fp'],
            'allowed_devices' => $allowed,
            'max_devices'     => $data['max_devices'],
            'max_branches'    => $data['max_branches'] ?? 0,
            'max_employees'   => $data['max_employees'],
            'issued_at'       => date('Y-m-d'),
            'expiry'          => date('Y-m-d', strtotime($data['expiry'])),
        ]);

        // Supersede earlier licenses for the same company+machine so the list
        // shows the latest as the active one (does not affect the desktop, which
        // only trusts the token the user actually pastes in).
        if ($data['company_id'] ?? null) {
            License::where('company_id', $data['company_id'])
                ->where('machine_fp', $data['machine_fp'])
                ->where('status', 'active')
                ->update(['status' => 'superseded']);
        }

        $license = License::create([
            'license_id'      => $licenseId,
            'company_id'      => $data['company_id'] ?? null,
            'company_name'    => $signed['payload']['company_name'],
            'machine_fp'      => $data['machine_fp'],
            'allowed_devices' => $allowed,
            'max_devices'     => $data['max_devices'],
            'max_branches'    => $data['max_branches'] ?? 0,
            'max_employees'   => $data['max_employees'],
            'issued_at'       => $signed['payload']['issued_at'],
            'expiry'          => $signed['payload']['expiry'],
            'status'          => 'active',
            'token'           => $signed['token'],
        ]);

        return response()->json([
            'status'        => true,
            'message'       => 'License generated successfully.',
            'record'        => $license,
            'token'         => $signed['token'],
            'license_id'    => $licenseId,
            'download_name' => $licenseId . '.lic',
        ], 200);
    }

    /**
     * Edit an existing license. Because the token is RSA-signed, any change to a
     * signed field means re-issuing the token. We keep the same license_id and
     * issued_at, re-sign with the new values, and replace the stored token. The
     * customer must re-paste the new key into their desktop.
     */
    public function update(Request $request, $id, LicenseSigner $signer)
    {
        $record = License::where('id', $id)->orWhere('license_id', $id)->first();

        if (! $record) {
            return response()->json(['status' => false, 'message' => 'License not found.'], 404);
        }

        $data = $request->validate([
            'company_name'      => ['required', 'string', 'max:191'],
            'company_id'        => ['nullable', 'integer'],
            'machine_fp'        => ['required', 'string', 'min:6'],
            'allowed_devices'   => ['required', 'array', 'min:1'],
            'allowed_devices.*' => ['string'],
            'max_devices'       => ['required', 'integer', 'min:1'],
            'max_branches'      => ['nullable', 'integer', 'min:0'],
            'max_employees'     => ['required', 'integer', 'min:0'],
            'expiry'            => ['required', 'date'],
        ]);

        $allowed = array_values(array_filter(array_map('trim', $data['allowed_devices'] ?? [])));

        if (empty($allowed)) {
            return response()->json([
                'status'  => false,
                'message' => 'At least one device serial is required.',
                'errors'  => ['allowed_devices' => ['At least one device serial is required.']],
            ], 422);
        }

        $issuedAt = $record->issued_at ? $record->issued_at->format('Y-m-d') : date('Y-m-d');

        $signed = $signer->generate([
            'license_id'      => $record->license_id,
            'company_id'      => $data['company_id'] ?? null,
            'company_name'    => $data['company_name'],
            'machine_fp'      => $data['machine_fp'],
            'allowed_devices' => $allowed,
            'max_devices'     => $data['max_devices'],
            'max_branches'    => $data['max_branches'] ?? 0,
            'max_employees'   => $data['max_employees'],
            'issued_at'       => $issuedAt,
            'expiry'          => date('Y-m-d', strtotime($data['expiry'])),
        ]);

        $record->update([
            'company_id'      => $data['company_id'] ?? null,
            'company_name'    => $signed['payload']['company_name'],
            'machine_fp'      => $data['machine_fp'],
            'allowed_devices' => $allowed,
            'max_devices'     => $data['max_devices'],
            'max_branches'    => $data['max_branches'] ?? 0,
            'max_employees'   => $data['max_employees'],
            'issued_at'       => $signed['payload']['issued_at'],
            'expiry'          => $signed['payload']['expiry'],
            'token'           => $signed['token'],
        ]);

        return response()->json([
            'status'        => true,
            'message'       => 'License updated successfully.',
            'record'        => $record,
            'token'         => $signed['token'],
            'license_id'    => $record->license_id,
            'download_name' => $record->license_id . '.lic',
        ], 200);
    }
}
