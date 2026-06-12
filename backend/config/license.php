<?php

// License signing config (LIVE backend / master-app generator side).
//
// The PRIVATE key signs license tokens and must NEVER be committed or shipped
// with the desktop build. It lives under storage/license/ (gitignored) by
// default, or wherever LICENSE_PRIVATE_KEY_PATH points. The matching PUBLIC key
// is embedded in the desktop backend (desktop/backend/config/keys/) so the
// desktop can verify — but never mint — licenses.

return [
    // Absolute or storage-relative path to the RSA private key (PEM).
    'private_key_path' => env('LICENSE_PRIVATE_KEY_PATH', storage_path('license/license_private.pem')),

    // Optional: public key path, only used for self-verification / sanity checks.
    'public_key_path' => env('LICENSE_PUBLIC_KEY_PATH', storage_path('license/license_public.pem')),

    // Bumped if the token payload shape changes; desktop checks this.
    'token_version' => 1,
];
