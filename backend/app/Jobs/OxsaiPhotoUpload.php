<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OxsaiPhotoUpload implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     *
     * @return void
     */

    public $sessionId, $sxdmToken, $sxdmSn, $json, $camera_sdk_url, $json2_withourimage;

    public function __construct($sessionId, $sxdmToken, $sxdmSn, $json, $camera_sdk_url, $json2_withourimage)
    {
        $this->sessionId = $sessionId;
        $this->sxdmToken = $sxdmToken;
        $this->sxdmSn = $sxdmSn;
        $this->json = $json;
        $this->camera_sdk_url = $camera_sdk_url;
        $this->json2_withourimage = $json2_withourimage;
    }

    /**
     * Execute the job.
     *
     * @return void
     */



    public function handle()
    {


        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => $this->camera_sdk_url . '/api/persons/item',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => $this->json,
            CURLOPT_HTTPHEADER => array(
                'Content-Type: application/json',
                'Cookie: sessionID=' . $this->sessionId,
                'sxdmToken: ' . $this->sxdmToken, //get from Device manufacturer
                'sxdmSn:  ' . $this->sxdmSn //get from Device serial number
            ),
        ));


        $response = curl_exec($curl);

        curl_close($curl);



        $returnContent = [
            "data" =>  $response, "status" => 200,
            "message" => "",
            "transactionType" => 0,
            "request" =>  ""

        ];

        Log::channel('jobs')->info('OXsai900 '   . $this->camera_sdk_url . " - Request:" . $this->json2_withourimage . " - Response:" . $response);

        return $returnContent;
    }
}
