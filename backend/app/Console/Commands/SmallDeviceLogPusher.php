<?php

namespace App\Console\Commands;

use App\Models\AttendanceLog;
use DateTime;
use DateTimeZone;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class SmallDeviceLogPusher extends Command
{
    // public $baseUrl = "https://aquhrsys.alqasimia.ac.ae/hrendpoint/api";
    // public $loginEnpoint = '/login';
    // public $InsertAccessLogEnpoint = '/InsertAccessLog';

    public $baseUrl = 'https://mytime2cloud-backend.test/api';
    public $loginEnpoint = '/sharjah-uni-test/login';
    public $InsertAccessLogEnpoint = '/sharjah-uni-test/InsertAccessLog';


    public $payload = [
        "userName" => "attendanceuser",
        "password" => "AQU@Password123",
        "key" => "7112484a-e08b-11ea-87d0-0242ac130003"
    ];
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'small_device_log_pusher';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Attendance camera Logs';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {

        $this->addEmptyLine();

        $this->logToFile(str_repeat('=', 20) . ' 🟢 Process Started ' . str_repeat('=', 20));

        $result = $this->handleFile();

        if (!$result) {
            $this->logToFile(str_repeat('=', 20) . ' ✅ Process Ended ' . str_repeat('=', 20));
            return;
        }

        $filteredData = array_filter($result["data"], fn($row) => !str_ends_with($row, ',None'));

        // Remove duplicates and reindex
        $result["data"] = array_values(array_unique($filteredData));

        $records = collect($result["data"]) // $rawRows is your original array of CSV strings
            ->map(function ($row) {
                $columns = str_getcsv($row);
                return [
                    'logDate'     => \Carbon\Carbon::parse($columns[2])->toISOString(),
                    'terminalID'  => $columns[1],
                    'createdDate' => \Carbon\Carbon::parse($columns[2])->toISOString(),
                    'functionNo'  => $columns[4],
                    'depNo'       => null,
                ];
            })
            ->filter(function ($item) {
                return strtolower($item['functionNo']) !== 'none';
            })
            ->unique(fn($item) => json_encode($item))
            ->values()
            ->toArray();



        echo $this->push($records);


        $recordsForDB = collect($result["data"]) // $rawRows is your original array of CSV strings
            ->map(function ($row) {
                $columns = str_getcsv($row);
                return [
                    'UserID'  => $columns[0],
                    'DeviceID'  => $columns[1],
                    'LogTime' => $columns[2],
                    'log_date_time' => $columns[2],
                    'LogTime' => $columns[2],
                    'log_date'  => date('Y-m-d', strtotime($columns[2])),
                    'SerialNumber'  => $columns[3],
                    'index_serial_number'  => $columns[3],
                    'log_type'       => $columns[4],
                ];
            })
            ->filter(function ($item) {
                return strtolower($item['log_type']) !== 'none';
            })
            ->unique(fn($item) => json_encode($item))
            ->values()
            ->toArray();

        // echo json_encode($recordsForDB, JSON_PRETTY_PRINT);

        AttendanceLog::insert($recordsForDB);

        $this->logToFile(count($recordsForDB) . " Recordes inserted");

        Storage::put("camera/camera-logs-count-" . $result['date'] . ".txt", $result['totalLines']);

        $this->logToFile(str_repeat('=', 20) . ' ✅ Process Ended ' . str_repeat('=', 20));
    }

    public function handleFile()
    {
        $date = date("d-m-Y");

        $csvPath = "app/camera/camera-logs-$date.csv"; // The path to the file relative to the "Storage" folder

        $fullPath = storage_path($csvPath);

        if (!file_exists($fullPath)) {
            $this->logToFile('File doest not exist.');
            return false;
        }

        $file = fopen($fullPath, 'r');

        $data = file($fullPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if (!count($data)) {
            $this->logToFile('File is empty.');
            return false;
        }

        $previoulyAddedLineNumbers = Storage::get("camera/camera-logs-count-$date.txt") ?? 0;
        $previoulyAddedLineNumbers = explode("\n", $previoulyAddedLineNumbers)[0];
        if (is_array($previoulyAddedLineNumbers)) {
            $previoulyAddedLineNumbers = $previoulyAddedLineNumbers[0];
        }

        $totalLines = count($data);

        $currentLength = 0;

        if ($previoulyAddedLineNumbers == $totalLines) {
            $this->logToFile('No new data found.');
            return false;
        } else if ($totalLines > 0) {
            $currentLength = $previoulyAddedLineNumbers;
        }

        fclose($file);

        return [
            "date" => $date,
            "totalLines" => $totalLines,
            "data" => array_slice($data, $currentLength)
        ];
    }

    public function push(array $postData)
    {
        $tokenObject = $this->getToken();

        if (!$tokenObject || !isset($tokenObject['token'])) {
            return;
        }

        $token = $tokenObject['token'];

        $this->logToFile("Token Object:\n" . json_encode($tokenObject, JSON_PRETTY_PRINT));
        $this->logToFile("Payload:\n" . json_encode($postData, JSON_PRETTY_PRINT));
        try {
            $response = Http::timeout(300)
                ->withoutVerifying()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $token
                ])
                ->post($this->baseUrl . $this->InsertAccessLogEnpoint, $postData);

            $responseBody = $response->successful() ? $response->json() : $response->body();

            $this->logToFile("Response:\n" . json_encode($responseBody, JSON_PRETTY_PRINT));
        } catch (\Exception $e) {
            $this->logToFile("Exception: " . $e->getMessage());
        }
    }

    public function getToken()
    {
        try {
            $response = Http::timeout(300)
                ->withoutVerifying()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->post($this->baseUrl . $this->loginEnpoint, $this->payload);

            if ($response->successful()) {
                return $response->json();
            }
            $this->logToFile('Push Failed: Token not available');
            $this->logToFile($response->body());
            return null;
        } catch (\Exception $e) {
            $this->logToFile("Exception: " . $e->getMessage());
            return null;
        }

        return Cache::remember('hr_system_token', now()->addHours(23), function () {
            try {
                $response = Http::timeout(300)
                    ->withoutVerifying()
                    ->withHeaders([
                        'Content-Type' => 'application/json',
                    ])
                    ->post($this->baseUrl . "/sharjah-uni-test/login", $this->payload);

                if ($response->successful()) {
                    return $response->json();
                }
                $this->logToFile('Push Failed: Token not available');
                $this->logToFile($response->body());
                return null;
            } catch (\Exception $e) {
                $this->logToFile("Exception: " . $e->getMessage());
                return null;
            }
        });
    }

    protected function logToFile(string $message)
    {
        $timestamp = now()->format('Y-m-d H:i:s');
        $logFile = "sharjah_attendance_api_logs/" . now()->format('d-m-Y') . ".log";
        $finalMessage = "[$timestamp] $message";
        $this->info($finalMessage);
        Storage::append($logFile, $finalMessage);
    }

    protected function addEmptyLine()
    {
        $logFile = "sharjah_attendance_api_logs/" . now()->format('d-m-Y') . ".log";
        Storage::append($logFile, "");
    }
}
