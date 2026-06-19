<?php

namespace App\Http\Controllers;

use App\Http\Requests\ScheduleEmployee\StoreRequest;
use App\Http\Requests\ScheduleEmployee\UpdateRequest;
use App\Models\Company;
use App\Models\Employee;
use App\Models\Roster;
use App\Models\ScheduleEmployee;
use App\Models\ShiftType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class DefaultDataController extends Controller
{

    public function shifts() ///Common for all companies - Only one time 
    {
        $arr[] = [
            "id" => 1,
            "name" => "FILO",
            "slug" => "no_shift",
            "enable" => 1,

        ];
        $arr[] = [
            "id" => 2,
            "name" => "Multi In/Out Shift",
            "slug" => "multi_in_out_shift",
            "enable" => 1,

        ];
        $arr[] = [
            "id" => 3,
            "name" => "Auto Shift",
            "slug" => "auto_shift",
            "enable" => 1,

        ];
        $arr[] = [
            "id" => 4,
            "name" => "Night Shift",
            "slug" => "no_shift",
            "enable" => 1,

        ];
        $arr[] = [
            "id" => 5,
            "name" => "Split Shift",
            "slug" => "split_shift",
            "enable" => 1,

        ];
        $arr[] = [
            "id" => 6,
            "name" => "Single Shift",
            "slug" => "manual_shift",
            "enable" => 1,

        ];
    }
}
