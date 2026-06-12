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

    public function generate(Request $request, LicenseSigner $signer)
    {
        $data = $request->validate([
            'company_id'        => ['nullable', 'integer'],
            'machine_fp'        => ['required', 'string', 'min:6'],
            'allowed_devices'   => ['nullable', 'array'],
            'allowed_devices.*' => ['string'],
            'max_devices'       => ['required', 'integer', 'min:0'],
            'max_employees'     => ['required', 'integer', 'min:0'],
            'expiry'            => ['required', 'date'],
        ]);

        $company = $request->filled('company_id') ? Company::find($request->company_id) : null;

        $allowed = array_values(array_filter(array_map('trim', $data['allowed_devices'] ?? [])));

        $licenseId = 'LIC-' . date('Ymd') . '-' . strtoupper(Str::random(6));

        $signed = $signer->generate([
            'license_id'      => $licenseId,
            'company_id'      => $data['company_id'] ?? null,
            'company_name'    => $company->name ?? ($request->company_name ?? null),
            'machine_fp'      => $data['machine_fp'],
            'allowed_devices' => $allowed,
            'max_devices'     => $data['max_devices'],
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
}
