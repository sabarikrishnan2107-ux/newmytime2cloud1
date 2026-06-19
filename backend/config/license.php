<?php

// License verification config (DESKTOP backend / activation side).
//
// This side holds ONLY the public key — it can verify a signed license token
// but can never mint one (that requires the private key, which lives only on
// the live/master-app backend). The public PEM is committed under config/keys/
// so it always ships with the desktop build.

return [
    // RSA public key (PEM) used to verify license signatures.
    'public_key_path' => env('LICENSE_PUBLIC_KEY_PATH', config_path('keys/license_public.pem')),

    // Must match the live backend's token_version.
    'token_version' => 1,

    // This machine's hardware fingerprint, written into .env by Electron on boot
    // (electron/main.js -> ensureMachineFingerprint). A license only activates on
    // the machine whose fingerprint matches the one embedded in the token.
    'machine_fp' => env('MACHINE_FP', ''),
];
