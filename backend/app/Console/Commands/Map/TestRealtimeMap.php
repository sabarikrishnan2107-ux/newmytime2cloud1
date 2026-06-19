<?php

namespace App\Console\Commands\Map;

use App\Services\Notify;
use Illuminate\Console\Command;

class TestRealtimeMap extends Command
{
    protected $signature = 'test:realtime-map';

    protected $description = 'Send a real push notification using App\\Services\\Notify';

    public function handle()
    {
        // Notify::push(107, 'test', "from francis test notifications");

        $clientId = 2;
        $type = "map";
        $message = "real-time map update";
        // for dubai related location updates, e.g. bus positions, traffic conditions, etc.

        $dataOption = json_encode([
            "user_id" => 677,
            "lat" => 25.276987,
            "lng" => 55.296249,
        ]);

        $data = [];

        if (!empty($dataOption)) {
            try {
                $decoded = json_decode($dataOption, true, 512, JSON_THROW_ON_ERROR);

                if (!is_array($decoded)) {
                    $this->error('The --data option must be a valid JSON object/array.');
                    return self::FAILURE;
                }

                $data = $decoded;
            } catch (\JsonException $exception) {
                $this->error('Invalid JSON in --data: ' . $exception->getMessage());
                return self::FAILURE;
            }
        }

        Notify::push($clientId, $type, $message, $data);

        $this->info('Notification pushed successfully.');
        return self::SUCCESS;
    }
}
