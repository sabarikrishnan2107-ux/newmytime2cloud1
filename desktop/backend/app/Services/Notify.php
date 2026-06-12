<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Notify
{
    public static function push($clientId, $type, $message, $data = [])
    {
        // SSE push relay. Defaults to the local desktop push-service; override
        // with PUSH_NOTIFY_URL in .env for a hosted deployment. (Was hardcoded
        // to the live v2push server — that leaked local events to production.)
        $url = env('PUSH_NOTIFY_URL', 'http://127.0.0.1:8077/notify');

        Http::withoutVerifying()->post($url, [
            'clientId' => $clientId,
            'type' => $type,
            'message' => $message,
            'timestamp' => now()->toDateTimeString(),
            "data" =>  $data
        ]);

        Log::info('Push notification sent', [
            'clientId'    => $clientId,
            'type'       => $type,
            'message'    => $message,
            'timestamp'  => now()->toDateTimeString(),
            'data'       => json_encode($data, JSON_PRETTY_PRINT),
        ]);
    }
}
