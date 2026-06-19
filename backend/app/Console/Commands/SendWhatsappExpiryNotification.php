<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SendWhatsappExpiryNotification extends Command
{
    protected $signature = 'send_whatsapp_expiry_notification {client_whatsapp_number}';

    protected $description = 'send_whatsapp_expiry_notification';

    public function __construct()
    {
        parent::__construct();
    }

    public function handle()
    {
        $WHATSAPP_PROXY_CLIENT = env("WHATSAPP_PROXY_CLIENT");
        $whatsapp = $this->argument("client_whatsapp_number");

        $payload = [
            'clientId' => $WHATSAPP_PROXY_CLIENT,
            'recipient' => $whatsapp,
            'text' => $this->generateMessage(),
        ];

        $url = 'https://wa.mytime2cloud.com/send-message';

        $response = Http::withoutVerifying()->post($url, $payload);

        if ($response->successful()) {
            echo json_encode($payload, JSON_PRETTY_PRINT);
        } else {
            echo ("\nMessage cannot $whatsapp.");
        }
    }

    private function generateMessage()
    {
        return "🔔 Whatsapp Expiry Notification! !\n" .
            "\n" .
            "Dear Admin,\n\n" .
            "Your WhatsApp account for Mytime2Cloud has expired.\n\n" .
            "Please reconnect your WhatsApp as soon as possible to continue using the service..\n\n" .
            "Thank you!\n";
    }
}
