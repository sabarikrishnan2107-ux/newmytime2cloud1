<?php

namespace App\Jobs;

use App\Http\Controllers\Controller;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessSDKCommand implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $url;
    protected $preparedJson;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($url, $preparedJson)
    {
        $this->url = $url;
        $this->preparedJson = $preparedJson;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        return (new Controller)->SDKCommand($this->url, $this->preparedJson);
    }
}