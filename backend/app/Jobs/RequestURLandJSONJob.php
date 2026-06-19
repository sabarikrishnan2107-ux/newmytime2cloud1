<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RequestURLandJSONJob  implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     *
     * @return void
     */

    public $data, $url;

    public function __construct($data, $url)
    {
        $this->data = $data;
        $this->url = $url;
    }

    /**
     * Execute the job.
     *
     * @return void
     */


    public function handle()
    {

        $data = $this->data;

        $returnFinalMessage = [];
        $devicePersonsArray = [];

        $returnMsg = Http::timeout(3000)->withoutVerifying()->withHeaders([
            'Content-Type' => 'application/json',
        ])->post($this->url, $data);
        if ($returnMsg && $returnMsg['data']) {
            $returnFinalMessage[] = $returnMsg['data'][0];
            //$devicePersonsArray[] = [$device => $returnMsg['data'][0]['userList']];
        } else {
            //$returnMsg = ["sn" => $device, "state" => false, "message" => "The device was not found - Network issue", "userList" => null];
            $returnFinalMessage[] = $returnMsg;
        }

        $returnContent = [
            "data" =>  $returnFinalMessage,
            "status" => 200,
            "message" => "",
            "transactionType" => 0,
            "request" => $data

        ];

        Log::channel('jobs')->info('RequestURLandJSONJob '   . $this->url . " - Request:" . json_encode($data) . " - Response:" . json_encode($returnContent, true));

        return $returnContent;
    }
}
