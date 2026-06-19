<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TimezonePhotoUploadJob implements ShouldQueue
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


    // public function handle()
    // {
    //     try {
    //         return Http::timeout(60)->withoutVerifying()->withHeaders([
    //             'Content-Type' => 'application/json',
    //         ])->post($this->url, $this->data);
    //     } catch (\Exception $e) {
    //         return [
    //             "status" => 102,
    //             "message" => $e->getMessage(),
    //         ];
    //         // You can log the error or perform any other necessary actions here
    //     }
    // }
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
            "data" =>  $returnFinalMessage, "status" => 200,
            "message" => "",
            "transactionType" => 0,
            "request" => $data

        ];

        Log::channel('jobs')->info('TimezonePhotoUpload '   . $this->url . " - Request:" . json_encode($data) . " - Response:" . json_encode($returnContent, true));

        return $returnContent;
    }

    public function mergeDevicePersonslist($data)
    {
        $mergedData = [];

        foreach ($data as $item) {
            $sn = $item['sn'];
            $userList = $item['userList'];

            if (array_key_exists($sn, $mergedData)) {
                if (!empty($userList)) {
                    $mergedData[$sn] = array_merge($mergedData[$sn], $userList);
                }
            } else {
                $mergedData[$sn] = $item;
            }
        }

        $mergedList = [];

        foreach ($mergedData as $sn => $userList) {
            $mergedList[] = [
                "sn" => $sn,
                "state" => $userList['state'],
                "message" => $userList['message'],
                "userList" => $userList['userList'],
            ];
        }
        return $mergedList;
    }

    public function handle_old()
    {

        Log::channel('jobs')->info('TimezonePhotoUpload - Started' . date('Y-m-d H:i:s'));
        // return false;
        $url = "https://stagingsdk.ideahrms.com/Person/AddRange";
        // $data = json_decode($this->data, true);
        $data = $this->data;
        $personList = $data['personList'];
        $snList = $data['snList'];
        $returnFinalMessage = [];
        $devicePersonsArray = [];
        foreach ($snList as $key => $device) {

            $returnMsg = '';

            foreach ($personList as $keyPerson => $valuePerson) {
                # code...
                $newArray = [
                    "personList" => [$valuePerson],
                    "snList" => [$device],
                ];
                // try {
                $returnMsg = Http::timeout(60)->withoutVerifying()->withHeaders([
                    'Content-Type' => 'application/json',
                ])->post($url, $newArray);
                if ($returnMsg && $returnMsg['data']) {
                    $returnFinalMessage[] = $returnMsg['data'][0];
                    //$devicePersonsArray[] = [$device => $returnMsg['data'][0]['userList']];
                } else {
                    $returnMsg = ["sn" => $device, "state" => false, "message" => "The device was not found - Network issue", "userList" => null];
                    $returnFinalMessage[] = $returnMsg;
                }

                // } catch (\Exception $e) {
                //     $returnMsg = [
                //         "status" => 102,
                //         "message" => $e->getMessage(),
                //     ];

                //     $returnMsg = ["sn" => $device, "state" => false, "message" => "The device was not found - Network issue", "userList" => null];

                //     $returnFinalMessage[] = $returnMsg;

                // }
            }
        }
        //$returnFinalMessage = $this->mergeDevicePersonslist($returnFinalMessage);
        $returnContent = [
            "data" => $returnFinalMessage, "status" => 200,
            "message" => "",
            "transactionType" => 0
        ];
        // print_r($returnContent);
        //echo json_encode($returnContent, true);

        //Log::custom('TimezonePhotoUpload' . json_encode($returnContent, true));

        ///Log::custom('TimezonePhotoUpload - Ended-----------------' . date('Y-m-d H:i:s'));

        Log::channel('jobs')->info('TimezonePhotoUpload' . json_encode($returnContent, true));
        Log::channel('jobs')->info('TimezonePhotoUpload - Ended-----------------' . date('Y-m-d H:i:s'));

        return $returnContent;
    }
}
