<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use phpseclib3\Net\SFTP;

class AutomationConnectionTestController extends Controller
{
    public function testApi(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|url',
            'auth_type' => 'required|in:none,api_key,bearer,basic',
            'auth_value' => 'nullable|string',
            'auth_header_name' => 'nullable|string',
        ]);

        try {
            $client = Http::timeout(10);
            $headers = self::buildAuthHeaders($request->all());
            if ($headers) {
                $client = $client->withHeaders($headers);
            }
            $resp = $client->head($request->input('endpoint'));
            return response()->json([
                'ok' => $resp->successful(),
                'status_code' => $resp->status(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function testFtp(Request $request)
    {
        $request->validate([
            'protocol' => 'required|in:ftp,sftp',
            'host' => 'required|string',
            'port' => 'nullable|integer',
            'username' => 'required|string',
            'password' => 'required|string',
            'remote_path' => 'required|string',
        ]);

        try {
            self::probe($request->all());
            return response()->json(['ok' => true]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Connect to the FTP/SFTP endpoint and list the remote path.
     * Used by the test-connection button — succeeds silently or throws.
     */
    public static function probe(array $cfg): void
    {
        if (($cfg['protocol'] ?? 'ftp') === 'sftp') {
            $sftp = new SFTP($cfg['host'], (int) ($cfg['port'] ?? 22), 10);
            if (!$sftp->login($cfg['username'], $cfg['password'])) {
                throw new \RuntimeException('SFTP login failed');
            }
            $list = $sftp->nlist($cfg['remote_path'] ?: '/');
            if ($list === false) {
                throw new \RuntimeException('SFTP cannot list remote path');
            }
            return;
        }

        $conn = @ftp_connect($cfg['host'], (int) ($cfg['port'] ?? 21), 10);
        if (!$conn) {
            throw new \RuntimeException('FTP connect failed');
        }
        try {
            if (!@ftp_login($conn, $cfg['username'], $cfg['password'])) {
                throw new \RuntimeException('FTP login failed');
            }
            @ftp_pasv($conn, true);
            $list = @ftp_nlist($conn, $cfg['remote_path'] ?: '/');
            if ($list === false) {
                throw new \RuntimeException('FTP cannot list remote path');
            }
        } finally {
            @ftp_close($conn);
        }
    }

    /**
     * Upload a local file to the configured FTP/SFTP destination.
     * Throws on failure; returns the full remote path on success.
     */
    public static function upload(array $cfg, string $localPath, string $remoteFilename): string
    {
        $remoteDir = rtrim((string) ($cfg['remote_path'] ?? '/'), '/');
        $remotePath = ($remoteDir === '' ? '' : $remoteDir) . '/' . $remoteFilename;

        if (($cfg['protocol'] ?? 'ftp') === 'sftp') {
            $sftp = new SFTP($cfg['host'], (int) ($cfg['port'] ?? 22), 30);
            if (!$sftp->login($cfg['username'], $cfg['password'])) {
                throw new \RuntimeException('SFTP login failed');
            }
            if (!$sftp->put($remotePath, $localPath, SFTP::SOURCE_LOCAL_FILE)) {
                throw new \RuntimeException('SFTP put failed');
            }
            return $remotePath;
        }

        $conn = @ftp_connect($cfg['host'], (int) ($cfg['port'] ?? 21), 30);
        if (!$conn) {
            throw new \RuntimeException('FTP connect failed');
        }
        try {
            if (!@ftp_login($conn, $cfg['username'], $cfg['password'])) {
                throw new \RuntimeException('FTP login failed');
            }
            @ftp_pasv($conn, true);
            if (!@ftp_put($conn, $remotePath, $localPath, FTP_BINARY)) {
                throw new \RuntimeException('FTP put failed');
            }
            return $remotePath;
        } finally {
            @ftp_close($conn);
        }
    }

    public static function buildAuthHeaders(array $cfg): array
    {
        $type = $cfg['auth_type'] ?? 'none';
        $val = $cfg['auth_value'] ?? null;

        return match ($type) {
            'api_key' => [($cfg['auth_header_name'] ?? 'X-API-Key') => (string) $val],
            'bearer'  => ['Authorization' => 'Bearer ' . (string) $val],
            'basic'   => ['Authorization' => 'Basic ' . base64_encode((string) $val)],
            default   => [],
        };
    }
}
