<?php

namespace App\Console\Commands\Test;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TestWhatsappMessage extends Command
{
    // Example: php artisan test:whatsapp 3 971554501483 testing....
    protected $signature = 'test:whatsapp {company_id} {whatsapp_number} {message}';
    protected $description = 'Test sending a WhatsApp message via API';

    public function handle()
    {
        $company_id = $this->argument('company_id');
        $whatsapp_number = $this->argument('whatsapp_number');
        $message = $this->argument('message');

        $lastClientIdEndpoint = "https://hms-backend.test/api/get_last_whatsapp_client_id/{$company_id}";
        $clientIdResponse = Http::withoutVerifying()->get($lastClientIdEndpoint);
        $clientId = $clientIdResponse->json()["clientId"];

        if (!$clientId) {
            $this->error('Failed to retrieve client ID');
            return;
        }

        try {
            $endpoint = 'https://wa.mytime2cloud.com/send-message';
            $payload = [
                'clientId' => $clientId,
                'recipient' => $whatsapp_number,
                'text' => $message,
            ];

            $res = Http::withoutVerifying()->post($endpoint, $payload);

            if ($res->successful()) {
                $this->info('WhatsApp Request Created Successfully');
            } else {
                $this->error('Desktop WhatsApp is not enabled');
            }
        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
        }
    }
}
