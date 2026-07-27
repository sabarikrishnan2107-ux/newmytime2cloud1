<?php

namespace App\Services;

use App\Models\ActiveLicense;
use App\Models\Company;
use App\Models\Device;
use App\Models\Employee;

/**
 * Verifies and enforces the offline desktop license.
 *
 * - Verifies RSA-signed tokens with the embedded PUBLIC key (cannot mint).
 * - Binds to this machine's fingerprint and to a whitelist of device serials.
 * - Enforces expiry, max employees, and max devices on add operations.
 *
 * Re-activation is non-destructive: activate() upserts the single
 * active_license row and mirrors the license limits onto the local company
 * profile — it never touches employees/devices/attendance data.
 */
class LicenseService
{
    /** Verify a token's signature and return its payload array, or false. */
    public function verifyToken(string $token)
    {
        $parts = explode('.', trim($token));
        if (count($parts) !== 2) {
            return false;
        }

        $payloadJson = $this->base64UrlDecode($parts[0]);
        $signature   = $this->base64UrlDecode($parts[1]);
        if ($payloadJson === '' || $signature === '') {
            return false;
        }

        $pub = $this->publicKeyPem();
        if (! $pub) {
            return false;
        }

        $ok = openssl_verify($payloadJson, $signature, $pub, OPENSSL_ALGO_SHA256);
        if ($ok !== 1) {
            return false;
        }

        $payload = json_decode($payloadJson, true);
        if (! is_array($payload) || empty($payload['machine_fp']) || empty($payload['expiry'])) {
            return false;
        }

        return $payload;
    }

    /** This machine's fingerprint (written into .env by Electron on boot). */
    public function currentMachineFp(): string
    {
        return (string) config('license.machine_fp', '');
    }

    /**
     * Activate a license on THIS machine.
     * Returns ['ok' => bool, 'message' => string, 'license' => ?ActiveLicense].
     */
    public function activate(string $token): array
    {
        $payload = $this->verifyToken($token);
        if (! $payload) {
            return ['ok' => false, 'message' => 'Invalid or tampered license key.'];
        }

        $fp = $this->currentMachineFp();
        if ($fp === '') {
            return ['ok' => false, 'message' => 'Machine fingerprint is not available on this device yet. Restart the app and try again.'];
        }

        if (! hash_equals((string) $payload['machine_fp'], $fp)) {
            return ['ok' => false, 'message' => 'This license is bound to a different machine.'];
        }

        if ($this->isExpired($payload['expiry'])) {
            return ['ok' => false, 'message' => 'This license has already expired (' . $payload['expiry'] . ').'];
        }

        // Non-destructive single-row upsert. Only the license row changes.
        ActiveLicense::query()->delete();
        $license = ActiveLicense::create([
            'license_id'      => $payload['lid'] ?? 'LIC',
            'company_id'      => $payload['company_id'] ?? null,
            'company_name'    => $payload['company_name'] ?? null,
            'machine_fp'      => $payload['machine_fp'],
            'allowed_devices' => array_values($payload['allowed_devices'] ?? []),
            'max_devices'     => (int) ($payload['max_devices'] ?? 0),
            'max_branches'    => (int) ($payload['max_branches'] ?? 0),
            'max_employees'   => (int) ($payload['max_employees'] ?? 0),
            'issued_at'       => $payload['issued_at'] ?? null,
            'expiry'          => $payload['expiry'],
            'token'           => $token,
            'activated_at'    => now(),
        ]);

        $this->syncCompanyFromLicense($payload);

        return ['ok' => true, 'message' => 'License activated successfully.', 'license' => $license];
    }

    /**
     * Mirror the license limits onto the local company profile so the Company
     * page (name, max branches/devices/employees, expiry) matches the license.
     * The desktop is single-tenant; the token's company_id is a master-side id
     * that does not map to the locally-seeded company, so we always target the
     * one local company row. Touches no employees/devices/attendance data.
     */
    private function syncCompanyFromLicense(array $payload): void
    {
        $company = Company::query()->orderBy('id')->first();
        if (! $company) {
            return;
        }

        $updates = [
            'max_devices'  => (int) ($payload['max_devices'] ?? 0),
            'max_employee' => (int) ($payload['max_employees'] ?? 0),
            'expiry'       => $payload['expiry'],
        ];

        if (! empty($payload['company_name'])) {
            $updates['name'] = $payload['company_name'];
        }

        // 0 means the key was minted before branch limits existed — leave as is.
        if ((int) ($payload['max_branches'] ?? 0) > 0) {
            $updates['max_branches'] = (int) $payload['max_branches'];
        }

        $company->forceFill($updates)->save();
    }

    /** The currently stored license, or null. */
    public function active(): ?ActiveLicense
    {
        return ActiveLicense::query()->latest('id')->first();
    }

    /**
     * Why the desktop is not usable right now, or null if it's fine.
     * Re-checks the machine binding when a fingerprint is available.
     */
    public function invalidReason(): ?string
    {
        $lic = $this->active();
        if (! $lic) {
            return 'No license activated. Please activate a license key to continue.';
        }

        $fp = $this->currentMachineFp();
        if ($fp !== '' && ! hash_equals((string) $lic->machine_fp, $fp)) {
            return 'This license is bound to a different machine.';
        }

        if ($this->isExpired($lic->expiry)) {
            return 'License expired on ' . (string) $lic->expiry . '. Please activate a renewed key.';
        }

        return null;
    }

    /** Structured status for the activation UI / banner. */
    public function status(): array
    {
        $lic = $this->active();
        $reason = $this->invalidReason();

        if (! $lic) {
            return [
                'activated'   => false,
                'valid'       => false,
                'reason'      => $reason,
                'machine_fp'  => $this->currentMachineFp(),
            ];
        }

        return [
            'activated'       => true,
            'valid'           => $reason === null,
            'reason'          => $reason,
            'license_id'      => $lic->license_id,
            'company_id'      => $lic->company_id,
            'company_name'    => $lic->company_name,
            'machine_fp'      => $this->currentMachineFp(),
            'expiry'          => (string) $lic->expiry,
            'expired'         => $this->isExpired($lic->expiry),
            'max_employees'   => $lic->max_employees,
            'max_devices'     => $lic->max_devices,
            'max_branches'    => $lic->max_branches,
            'used_employees'  => $this->employeeCount($lic->company_id),
            'used_devices'    => $this->deviceCount($lic->company_id),
            'allowed_devices' => $lic->allowed_devices ?? [],
            'activated_at'    => optional($lic->activated_at)->toDateTimeString(),
        ];
    }

    /** Returns null if an employee can be added, or an error message. */
    public function canAddEmployee($companyId): ?string
    {
        if ($reason = $this->invalidReason()) {
            return $reason;
        }
        $lic = $this->active();

        if ($this->employeeCount($companyId) >= (int) $lic->max_employees) {
            return 'Employee limit reached. Your license allows a maximum of ' . $lic->max_employees . ' employees.';
        }

        return null;
    }

    /** Returns null if the device can be added, or an error message. */
    public function canAddDevice($companyId, ?string $serial): ?string
    {
        if ($reason = $this->invalidReason()) {
            return $reason;
        }
        $lic = $this->active();

        if ($this->deviceCount($companyId) >= (int) $lic->max_devices) {
            return 'Device limit reached. Your license allows a maximum of ' . $lic->max_devices . ' devices.';
        }

        // Whitelist: when the license lists specific serials, only those may be
        // added. An empty list means "any serial up to max_devices".
        $allowed = $lic->allowed_devices ?? [];
        if (! empty($allowed) && (! $serial || ! in_array($serial, $allowed, true))) {
            return 'Device serial "' . ($serial ?: 'unknown') . '" is not allowed by this license.';
        }

        return null;
    }

    private function employeeCount($companyId): int
    {
        // Desktop is single-tenant. The license token may carry no company_id
        // (NULL), which won't match the locally-seeded company — so when it's
        // empty, count across the whole (single) install rather than scoping to
        // a NULL company that matches nothing.
        return Employee::when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->count();
    }

    private function deviceCount($companyId): int
    {
        return Device::when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->where('model_number', '!=', 'Manual')
            ->where('model_number', 'not like', '%Mobile%')
            ->count();
    }

    private function isExpired($expiry): bool
    {
        // Inclusive of the expiry date itself.
        return strtotime((string) $expiry) < strtotime(date('Y-m-d'));
    }

    private function publicKeyPem()
    {
        $path = config('license.public_key_path');
        if (! $path || ! is_file($path)) {
            return false;
        }
        return openssl_pkey_get_public(file_get_contents($path));
    }

    private function base64UrlDecode(string $s): string
    {
        $b64 = strtr($s, '-_', '+/');
        $pad = strlen($b64) % 4;
        if ($pad) {
            $b64 .= str_repeat('=', 4 - $pad);
        }
        return (string) base64_decode($b64, true);
    }
}
