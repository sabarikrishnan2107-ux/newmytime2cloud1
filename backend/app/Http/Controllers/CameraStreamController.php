<?php

namespace App\Http\Controllers;

use App\Models\AttendanceLog;
use App\Models\Device;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

class CameraStreamController extends Controller
{
    private const DEFAULT_RTSP_PORTS = [554, 8554, 10554];
    private const DEFAULT_RTSP_PATHS = [
        '/Streaming/Channels/101',
        '/cam/realmonitor?channel=1&subtype=0',
        '/h264Preview_01_main',
        '/live/ch00_0',
        '/live/main',
        '/stream1',
        '/11',
    ];

    public function index(Request $request)
    {
        $model = Device::query();

        $model->with(['branch', 'status']);
        $model->whereNotNull('camera_rtsp_ip');
        $model->where('camera_rtsp_ip', '!=', '');
        $model->where('company_id', $request->company_id);

        $model->when($request->filled('branch_ids'), function ($q) use ($request) {
            $branchIds = is_array($request->branch_ids) ? $request->branch_ids : [$request->branch_ids];
            $q->whereIn('branch_id', $branchIds);
        });

        $model->when($request->filled('search'), function ($q) use ($request) {
            $q->where(function ($qq) use ($request) {
                $qq->where('name', 'like', "%{$request->search}%");
                $qq->orWhere('camera_rtsp_ip', 'like', "%{$request->search}%");
                $qq->orWhere('location', 'like', "%{$request->search}%");
            });
        });

        $model->orderBy('name', 'asc');

        return $model->paginate($request->per_page ?? 10);
    }

    public function status($deviceId)
    {
        $device = Device::where('id', $deviceId)
            ->whereNotNull('camera_rtsp_ip')
            ->first();

        if (!$device) {
            return response()->json(['status' => false, 'message' => 'Camera not found'], 404);
        }

        return response()->json([
            'status' => true,
            'data' => [
                'id' => $device->id,
                'name' => $device->name,
                'camera_rtsp_ip' => $device->camera_rtsp_ip,
                'camera_rtsp_port' => $device->camera_rtsp_port,
                'camera_rtsp_path' => $device->camera_rtsp_path,
                'is_configured' => true,
            ]
        ]);
    }

    public function credentials($deviceId)
    {
        $device = Device::with('branch:id,branch_name')
            ->where('id', $deviceId)
            ->whereNotNull('camera_rtsp_ip')
            ->first();

        if (!$device) {
            return response()->json(['status' => false, 'message' => 'Camera not found'], 404);
        }

        $password = $device->camera_password;
        try {
            $password = Crypt::decryptString($device->camera_password);
        } catch (\Exception $e) {
            // Password may not be encrypted (legacy data), use as-is
        }

        return response()->json([
            'status' => true,
            'data' => [
                'rtsp_url' => null,
                'camera_rtsp_ip' => $device->camera_rtsp_ip,
                'camera_rtsp_port' => $device->camera_rtsp_port,
                'camera_rtsp_path' => $device->camera_rtsp_path,
                'camera_username' => $device->camera_username,
                'camera_password' => $password,
                'device_name' => $device->name,
                'device_serial' => $device->device_id,
                'branch_id' => $device->branch_id,
                'branch_name' => $device->branch->branch_name ?? null,
                'company_id' => $device->company_id,
                'device_type' => $device->device_type,
            ]
        ]);
    }

    /**
     * Log attendance from camera face detection.
     *
     * Called by the Python camera-service when a face is recognized.
     * Creates an AttendanceLog entry via Eloquent so the Observer fires
     * and recalculates the employee's daily attendance automatically.
     */
    public function logAttendance(Request $request)
    {
        $request->validate([
            'user_id' => 'required',
            'company_id' => 'required|integer',
            'branch_id' => 'nullable|integer',
            'log_time' => 'required|date',
            'camera_name' => 'nullable|string',
            'device_serial' => 'nullable|string',
        ]);

        $logDate = date('Y-m-d', strtotime($request->log_time));
        $userId = $request->user_id;
        $companyId = $request->company_id;

        // Get today's camera logs for this employee
        $todayLogs = AttendanceLog::where('UserID', $userId)
            ->where('company_id', $companyId)
            ->where('channel', 'camera')
            ->where('LogTime', '>=', $logDate)
            ->where('LogTime', '<', date('Y-m-d', strtotime($logDate . ' +1 day')))
            ->orderBy('LogTime', 'asc')
            ->get();

        $hasIn = $todayLogs->where('log_type', 'In')->isNotEmpty();
        $hasOut = $todayLogs->where('log_type', 'Out')->isNotEmpty();

        // If both IN and OUT exist, stop — no more logs needed today
        if ($hasIn && $hasOut) {
            return response()->json([
                'status' => true,
                'inserted' => false,
                'reason' => 'in_and_out_already_logged',
            ]);
        }

        // Get employee's shift to check off-duty time
        $employee = Employee::where('system_user_id', $userId)
            ->where('company_id', $companyId)
            ->first();

        $offDutyTime = null;
        if ($employee) {
            $schedule = \App\Models\ScheduleEmployee::where('employee_id', $employee->system_user_id)
                ->whereHas('shift')
                ->latest('updated_at')
                ->first();
            if ($schedule && $schedule->shift) {
                $offDutyTime = $schedule->shift->off_duty_time;
            }
        }

        $now = strtotime($request->log_time);
        $shiftEndToday = $offDutyTime ? strtotime($logDate . ' ' . $offDutyTime) : null;

        if (!$hasIn) {
            // No IN yet — create IN log
            $log = AttendanceLog::create([
                'UserID' => $userId,
                'LogTime' => $request->log_time,
                'DeviceID' => $request->device_serial ?? ('Camera-' . ($request->camera_name ?? 'unknown')),
                'company_id' => $companyId,
                'branch_id' => $request->branch_id ?? 0,
                'status' => 'Allowed',
                'mode' => 'Face',
                'channel' => 'camera',
                'gps_location' => $request->camera_name ?? 'Camera',
                'log_date' => $logDate,
                'log_type' => 'In',
            ]);

            return response()->json([
                'status' => true,
                'inserted' => true,
                'reason' => 'in_logged',
                'log_id' => $log->id,
            ]);
        }

        // IN exists, no OUT yet — only log OUT if after shift end time
        if ($shiftEndToday && $now >= $shiftEndToday) {
            $log = AttendanceLog::create([
                'UserID' => $userId,
                'LogTime' => $request->log_time,
                'DeviceID' => $request->device_serial ?? ('Camera-' . ($request->camera_name ?? 'unknown')),
                'company_id' => $companyId,
                'branch_id' => $request->branch_id ?? 0,
                'status' => 'Allowed',
                'mode' => 'Face',
                'channel' => 'camera',
                'gps_location' => $request->camera_name ?? 'Camera',
                'log_date' => $logDate,
                'log_type' => 'Out',
            ]);

            return response()->json([
                'status' => true,
                'inserted' => true,
                'reason' => 'out_logged',
                'log_id' => $log->id,
            ]);
        }

        // IN exists but not yet shift end time — skip
        return response()->json([
            'status' => true,
            'inserted' => false,
            'reason' => 'waiting_for_shift_end',
        ]);
    }

    public function testConnection(Request $request)
    {
        $payload = $request->validate([
            'id' => ['nullable', 'integer'],
            'camera_rtsp_ip' => ['nullable', 'ip'],
            'camera_rtsp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'camera_rtsp_path' => ['nullable', 'string', 'max:255'],
            'camera_username' => ['nullable', 'string', 'max:255'],
            'camera_password' => ['nullable', 'string', 'max:255'],
        ]);

        $cameraConfig = $this->resolveCameraConfig($payload);
        $candidates = $this->buildRtspCandidates($cameraConfig);

        if (empty($candidates)) {
            return $this->response(
                'Enter a camera IP address or a full RTSP URL to test the connection.',
                null,
                false
            );
        }

        $portStatus = [];
        $testedPorts = [];
        $reachablePorts = [];
        $probes = [];
        $bestCandidate = null;
        $pathIssueCandidate = null;

        foreach ($candidates as $candidate) {
            $portKey = $candidate['host'] . ':' . $candidate['port'];
            if (!array_key_exists($portKey, $portStatus)) {
                $portStatus[$portKey] = $this->isTcpReachable($candidate['host'], $candidate['port']);
                $testedPorts[$candidate['port']] = $candidate['port'];
                if ($portStatus[$portKey]) {
                    $reachablePorts[$candidate['port']] = $candidate['port'];
                }
            }

            $probe = [
                'host' => $candidate['host'],
                'camera_rtsp_port' => $candidate['port'],
                'camera_rtsp_path' => $candidate['camera_rtsp_path'],
                'rtsp_url' => $this->maskRtspUrl($candidate['rtsp_url']),
                'tcp_reachable' => $portStatus[$portKey],
                'rtsp_detected' => false,
                'status_code' => null,
                'status_text' => null,
                'message' => $portStatus[$portKey]
                    ? 'TCP port is reachable. Probing RTSP service...'
                    : 'TCP port is not reachable.',
            ];

            if ($portStatus[$portKey]) {
                $rtspProbe = $this->probeRtspCandidate(
                    $candidate['rtsp_url'],
                    $cameraConfig['camera_username'] ?? null,
                    $cameraConfig['camera_password'] ?? null
                );

                $probe = array_merge($probe, $rtspProbe);

                if ($probe['rtsp_detected'] && in_array($probe['status_code'], [200, 401], true) && $bestCandidate === null) {
                    $bestCandidate = $probe;
                } elseif ($probe['rtsp_detected'] && in_array($probe['status_code'], [404, 454], true) && $pathIssueCandidate === null) {
                    $pathIssueCandidate = $probe;
                }
            }

            $probes[] = $probe;
        }

        sort($testedPorts);
        sort($reachablePorts);

        $record = [
            'camera_rtsp_ip' => $cameraConfig['camera_rtsp_ip'] ?? null,
            'ports_tested' => array_values($testedPorts),
            'reachable_ports' => array_values($reachablePorts),
            'best_candidate' => $bestCandidate,
            'probes' => array_slice($probes, 0, 10),
        ];

        if ($bestCandidate !== null) {
            $pathLabel = $bestCandidate['camera_rtsp_path'] ?: 'auto-detected full RTSP URL';
            $message = "Camera responded on port {$bestCandidate['camera_rtsp_port']} using {$pathLabel}.";

            if ($bestCandidate['status_code'] === 401) {
                $message .= ' RTSP service is reachable and authentication is required, which is expected for many cameras.';
            }

            return $this->response($message, $record, true);
        }

        if (!empty($reachablePorts) && $pathIssueCandidate !== null) {
            return $this->response(
                "Camera is reachable on port {$pathIssueCandidate['camera_rtsp_port']}, but the RTSP path looks invalid. Set a custom RTSP path and test again.",
                $record,
                false
            );
        }

        if (!empty($reachablePorts)) {
            return $this->response(
                'Camera port is reachable, but the RTSP service did not return a usable response. Verify the camera brand settings, username, password, and RTSP path.',
                $record,
                false
            );
        }

        $portsText = implode(', ', $testedPorts ?: self::DEFAULT_RTSP_PORTS);
        return $this->response(
            "Camera is not accepting RTSP connections on ports {$portsText}. Check the IP address, network reachability, and RTSP settings on the camera.",
            $record,
            false
        );
    }

    private function resolveCameraConfig(array $payload): array
    {
        $device = null;
        if (!empty($payload['id'])) {
            $device = Device::find($payload['id']);
        }

        $resolved = [
            'camera_rtsp_ip' => $payload['camera_rtsp_ip'] ?? null,
            'camera_rtsp_port' => $payload['camera_rtsp_port'] ?? null,
            'camera_rtsp_path' => $payload['camera_rtsp_path'] ?? null,
            'camera_username' => $payload['camera_username'] ?? null,
            'camera_password' => $payload['camera_password'] ?? null,
        ];

        if ($device) {
            $resolved['camera_rtsp_ip'] = $resolved['camera_rtsp_ip'] ?: $device->camera_rtsp_ip;
            $resolved['camera_rtsp_port'] = $resolved['camera_rtsp_port'] ?: $device->camera_rtsp_port;
            $resolved['camera_rtsp_path'] = $resolved['camera_rtsp_path'] ?: $device->camera_rtsp_path;
            $resolved['camera_username'] = $resolved['camera_username'] ?: $device->camera_username;

            if (empty($resolved['camera_password']) && !empty($device->camera_password)) {
                try {
                    $resolved['camera_password'] = Crypt::decryptString($device->camera_password);
                } catch (\Exception $e) {
                    $resolved['camera_password'] = $device->camera_password;
                }
            }
        }

        return $resolved;
    }

    private function buildRtspCandidates(array $cameraConfig): array
    {
        $configuredPath = trim((string)($cameraConfig['camera_rtsp_path'] ?? ''));
        $configuredPort = !empty($cameraConfig['camera_rtsp_port']) ? (int)$cameraConfig['camera_rtsp_port'] : null;
        $ports = $configuredPort ? [$configuredPort] : self::DEFAULT_RTSP_PORTS;

        $candidates = [];
        $seen = [];

        if ($this->isFullRtspUrl($configuredPath)) {
            $candidate = $this->buildCandidateFromFullUrl($configuredPath);
            if ($candidate) {
                $candidates[] = $candidate;
            }
            return $candidates;
        }

        $ip = trim((string)($cameraConfig['camera_rtsp_ip'] ?? ''));
        if ($ip === '') {
            return [];
        }

        foreach ($ports as $port) {
            if ($configuredPath !== '') {
                $candidate = $this->buildCandidateFromParts($ip, $port, $configuredPath, $cameraConfig);
                if ($candidate && !isset($seen[$candidate['rtsp_url']])) {
                    $seen[$candidate['rtsp_url']] = true;
                    $candidates[] = $candidate;
                }
            }

            foreach (self::DEFAULT_RTSP_PATHS as $path) {
                $candidate = $this->buildCandidateFromParts($ip, $port, $path, $cameraConfig);
                if ($candidate && !isset($seen[$candidate['rtsp_url']])) {
                    $seen[$candidate['rtsp_url']] = true;
                    $candidates[] = $candidate;
                }
            }
        }

        return $candidates;
    }

    private function buildCandidateFromParts(string $host, int $port, string $path, array $cameraConfig): ?array
    {
        $normalizedPath = $this->normalizeRtspPath($path);
        if ($normalizedPath === '') {
            return null;
        }

        $userInfo = '';
        if (!empty($cameraConfig['camera_username']) && !empty($cameraConfig['camera_password'])) {
            $userInfo = rawurlencode($cameraConfig['camera_username']) . ':' . rawurlencode($cameraConfig['camera_password']) . '@';
        } elseif (!empty($cameraConfig['camera_username'])) {
            $userInfo = rawurlencode($cameraConfig['camera_username']) . '@';
        }

        return [
            'host' => $host,
            'port' => $port,
            'camera_rtsp_path' => $normalizedPath,
            'rtsp_url' => "rtsp://{$userInfo}{$host}:{$port}{$normalizedPath}",
        ];
    }

    private function buildCandidateFromFullUrl(string $rtspUrl): ?array
    {
        $parsed = parse_url($rtspUrl);
        if (!$parsed || empty($parsed['host'])) {
            return null;
        }

        return [
            'host' => $parsed['host'],
            'port' => (int)($parsed['port'] ?? 554),
            'camera_rtsp_path' => $rtspUrl,
            'rtsp_url' => $rtspUrl,
        ];
    }

    private function normalizeRtspPath(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return '';
        }

        if ($this->isFullRtspUrl($path)) {
            return $path;
        }

        return str_starts_with($path, '/') ? $path : '/' . $path;
    }

    private function isFullRtspUrl(string $value): bool
    {
        return str_starts_with(strtolower($value), 'rtsp://');
    }

    private function isTcpReachable(string $host, int $port, int $timeoutSeconds = 2): bool
    {
        $socket = @stream_socket_client(
            "tcp://{$host}:{$port}",
            $errno,
            $errstr,
            $timeoutSeconds,
            STREAM_CLIENT_CONNECT
        );

        if ($socket === false) {
            return false;
        }

        fclose($socket);
        return true;
    }

    private function probeRtspCandidate(string $rtspUrl, ?string $username, ?string $password, int $timeoutSeconds = 3): array
    {
        $parsed = parse_url($rtspUrl);
        if (!$parsed || empty($parsed['host'])) {
            return [
                'rtsp_detected' => false,
                'status_code' => null,
                'status_text' => null,
                'message' => 'Invalid RTSP URL.',
            ];
        }

        $host = $parsed['host'];
        $port = (int)($parsed['port'] ?? 554);

        $socket = @stream_socket_client(
            "tcp://{$host}:{$port}",
            $errno,
            $errstr,
            $timeoutSeconds,
            STREAM_CLIENT_CONNECT
        );

        if ($socket === false) {
            return [
                'rtsp_detected' => false,
                'status_code' => null,
                'status_text' => null,
                'message' => 'Unable to open RTSP socket.',
            ];
        }

        stream_set_timeout($socket, $timeoutSeconds);

        $headers = [
            "OPTIONS {$rtspUrl} RTSP/1.0",
            'CSeq: 1',
            'User-Agent: MyTime2Cloud Camera Test',
        ];

        if (!empty($username) && !empty($password)) {
            $headers[] = 'Authorization: Basic ' . base64_encode($username . ':' . $password);
        }

        fwrite($socket, implode("\r\n", $headers) . "\r\n\r\n");

        $response = '';
        while (!feof($socket)) {
            $line = fgets($socket, 2048);
            if ($line === false) {
                break;
            }
            $response .= $line;
            if (trim($line) === '') {
                break;
            }
        }

        $meta = stream_get_meta_data($socket);
        fclose($socket);

        if (preg_match('/RTSP\/1\.0\s+(\d+)\s*(.*)$/mi', $response, $matches)) {
            $statusCode = (int)$matches[1];
            $statusText = trim($matches[2] ?? '');

            $message = match ($statusCode) {
                200 => 'RTSP service responded successfully.',
                401 => 'RTSP service is reachable and requires authentication.',
                404 => 'RTSP path was not found on the camera.',
                454 => 'RTSP session/path was rejected by the camera.',
                default => "RTSP service responded with status {$statusCode}.",
            };

            return [
                'rtsp_detected' => true,
                'status_code' => $statusCode,
                'status_text' => $statusText,
                'message' => $message,
            ];
        }

        if (!empty($meta['timed_out'])) {
            return [
                'rtsp_detected' => false,
                'status_code' => null,
                'status_text' => null,
                'message' => 'Timed out while waiting for RTSP response.',
            ];
        }

        return [
            'rtsp_detected' => false,
            'status_code' => null,
            'status_text' => null,
            'message' => 'No RTSP response received from the camera.',
        ];
    }

    private function maskRtspUrl(string $rtspUrl): string
    {
        return preg_replace('/\/\/([^:@\/]+):([^@\/]+)@/', '//$1:***@', $rtspUrl) ?: $rtspUrl;
    }
}
