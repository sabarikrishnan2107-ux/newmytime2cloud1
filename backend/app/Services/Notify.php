<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Notify
{
    public static function push($clientId, $type, $message, $data = [])
    {
        // $url = "http://139.59.69.241:5778/notify"; // Node.js SSE server
        $url = "https://v2push.mytime2cloud.com/notify"; // Node.js SSE server

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
