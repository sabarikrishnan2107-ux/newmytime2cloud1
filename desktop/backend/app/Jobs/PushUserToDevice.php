<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushUserToDevice implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $url;
    protected array $payload;

    /**
     * Create a new job instance.
     */
    public function __construct(string $url, array $payload)
    {
        $this->url = $url;
        $this->payload = $payload;
    }

    public function handle(): void
    {
        $response = Http::post($this->url, $this->payload);

        if (! $response->successful()) {
            Log::error('PushUserToDevice failed', [
                'url' => $this->url,
                'payload' => $this->payload,
                'response' => $response->body(),
                'status' => $response->status(),
            ]);
        }
    }
}
