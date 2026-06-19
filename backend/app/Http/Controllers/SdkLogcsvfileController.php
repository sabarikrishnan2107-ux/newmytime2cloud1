<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubDepartment\SubDepartmentRequest;
use App\Http\Requests\SubDepartment\SubDepartmentUpdateRequest;
use App\Models\SubDepartment;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;


class SdkLogcsvfileController extends Controller
{
    public function list()
    {
        // $directory = "./";

        // $allItems1 = Storage::allFiles($directory);

        // $allItems = [];

        // foreach ($allItems1 as $key => $value) {


        //     if (!strpos($value, '/') && $value != '.gitignore' && !strpos($value, '.txt')) {
        //         $value = str_replace('logs-', '', $value);
        //         $value = str_replace('.csv', '', $value);
        //         $allItems[] =   $value;
        //     }
        // }
        // rsort($allItems);

        // // Get the current date
        $currentDate = Carbon::now();

        $datesArray = [];


        for ($i = 0; $i < 60; $i++) {

            $datesArray[] = 'logs-' . $currentDate->format('d-m-Y') . '.csv';
            $currentDate->subDay();
        }

        return view('sdk.downloadcsv', ["files" => $datesArray]);
    }

    public function download($file_name)
    {
        return Storage::download($file_name);
    }

    public function download1()
    {
        // Storage::get('logs-05-10-2023');
        // return   Storage::download('logs-05-10-2023.csv');
    }
}
