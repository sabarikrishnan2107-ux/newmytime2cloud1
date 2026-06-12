<?php

namespace App\Services;

use RuntimeException;

/**
 * Signs desktop license tokens with the RSA private key.
 *
 * Token format (JWT-like, no header):
 *     base64url(payload_json) . "." . base64url(rsa_sha256_signature_over_payload_json)
 *
 * The desktop verifies the exact transmitted payload bytes against the public
 * key, so there is no canonicalization ambiguity. The private key lives ONLY on
 * this (live) backend — see config/license.php.
 */
class LicenseSigner
{
    public function generate(array $data): array
    {
        $payload = [
            'v'               => (int) config('license.token_version', 1),
            'lid'             => $data['license_id'],
            'company_id'      => isset($data['company_id']) ? (int) $data['company_id'] : null,
            'company_name'    => $data['company_name'] ?? null,
            'machine_fp'      => $data['machine_fp'],
            'allowed_devices' => array_values($data['allowed_devices'] ?? []),
            'max_devices'     => (int) $data['max_devices'],
            'max_employees'   => (int) $data['max_employees'],
            'issued_at'       => $data['issued_at'],
            'expiry'          => $data['expiry'],
        ];

        $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $signature = $this->sign($payloadJson);

        $token = $this->base64UrlEncode($payloadJson) . '.' . $this->base64UrlEncode($signature);

        return ['token' => $token, 'payload' => $payload];
    }

    private function sign(string $data): string
    {
        $key = openssl_pkey_get_private($this->privateKeyPem());
        if ($key === false) {
            throw new RuntimeException('Invalid license private key.');
        }

        $signature = '';
        if (! openssl_sign($data, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Failed to sign license payload.');
        }

        return $signature;
    }

    private function privateKeyPem(): string
    {
        $path = config('license.private_key_path');
        if (! $path || ! is_file($path)) {
            throw new RuntimeException('License private key not found at: ' . $path);
        }
        return file_get_contents($path);
    }

    private function base64UrlEncode(string $bin): string
    {
        return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
    }
}
