<?php

/**
 * Laravel - A PHP Framework For Web Artisans
 * Router script for PHP built-in server (fixes ini loading on Windows PHP 8.5)
 */

// Manually load extensions if not loaded (workaround for PHP 8.5 Windows built-in server)
$extensionDir = 'D:/php/ext';
$requiredExtensions = ['curl', 'fileinfo', 'mbstring', 'openssl', 'pdo_pgsql', 'pgsql'];

foreach ($requiredExtensions as $ext) {
    if (!extension_loaded($ext)) {
        $dllFile = $extensionDir . '/php_' . $ext . '.dll';
        if (file_exists($dllFile) && function_exists('dl')) {
            @dl($dllFile);
        }
    }
}

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

// This file allows us to emulate Apache's "mod_rewrite" functionality from the
// built-in PHP web server. This provides a convenient way to test a Laravel
// application without having installed a "real" web server software here.
if ($uri !== '/' && file_exists(__DIR__.'/public'.$uri)) {
    return false;
}

require_once __DIR__.'/public/index.php';
