<?php

namespace App\Console\Commands;

use App\Services\Notify;
use Illuminate\Console\Command;

class NotifyPush extends Command
{
    protected $signature = 'notify:push
                            {clientId : Client ID to notify}
                            {type : Notification type, e.g. info/success/error}
                            {message : Notification message}
                            {--data= : Optional JSON object for extra data}';

    protected $description = 'Send a real push notification using App\\Services\\Notify';

    public function handle()
    {
        // Notify::push(107, 'test', "from francis test notifications");

        $clientId = $this->argument('clientId');
        $type = $this->argument('type');
        $message = $this->argument('message');
        $dataOption = $this->option('data');

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
