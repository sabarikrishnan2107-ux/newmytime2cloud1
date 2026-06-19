<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AddPerson implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     *
     * @return void
     */

    public $url;
    public $data;

    public function __construct(string $url, array $data)
    {
        $this->url = $url;
        $this->data = $data;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        try {
            // Send HTTP POST request
            $response = Http::timeout(30)
                ->withoutVerifying()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->post($this->url, $this->data);

            // Log the response status and body
            if ($response->successful()) {
                Log::info('AddPerson job succeeded', [
                    'url' => $this->url,
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);
            } else {
                Log::warning('AddPerson job failed', [
                    'url' => $this->url,
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);
            }
        } catch (\Exception $e) {
            // Log any exceptions encountered
            Log::error('AddPerson job encountered an error', [
                'url' => $this->url,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
