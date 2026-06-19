<?php

namespace App\Jobs;

use App\Http\Controllers\Controller;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class SendWhatsappMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $recipient;
    protected $message;
    protected $logId;
    protected $clientId;
    protected $logFilePath;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($recipient, $message, $logId, $clientId, $logFilePath)
    {
        $this->recipient = $recipient;
        $this->message = $message;
        $this->logId = $logId;
        $this->clientId = $clientId;
        $this->logFilePath = $logFilePath;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $logger = new Controller;

        $logFilePath = $this->logFilePath;

        try {
            $response = Http::withoutVerifying()->post(
                'https://wa.mytime2cloud.com/send-message',
                [
                    'clientId' => $this->clientId,
                    'recipient' => $this->recipient,
                    'text' => $this->message,
                ]
            );

            if ($response->successful()) {
                $logger->logOutPut($logFilePath, "Message sent successfully to {$this->recipient}. Reference #: {$this->logId}");
                echo ("\nMessage sent successfully to {$this->recipient}. Reference #: {$this->logId}");

            } else {
                $logger->logOutPut($logFilePath, "Failed to send message to {$this->recipient}. Reference #: {$this->logId}");
                echo ("\nMessage sent successfully to {$this->recipient}. Reference #: {$this->logId}");
            }
        } catch (\Throwable $e) {
            $logger->logOutPut($logFilePath, "Exception while sending message to {$this->recipient}: " . $e->getMessage());
        }
    }
}
