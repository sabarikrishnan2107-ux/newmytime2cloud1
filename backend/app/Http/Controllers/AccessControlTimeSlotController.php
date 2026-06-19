<?php

namespace App\Http\Controllers;

use App\Models\AccessControlTimeSlot;
use Illuminate\Http\Request;

class AccessControlTimeSlotController extends Controller
{
    public function index()
    {
        return $devices = AccessControlTimeSlot::get();

        foreach ($devices as $device) {
            // return $slot->json["OpenSlots"];
            $slots  = $device->json;
            foreach ($slots as $slot) {
                $slot["startTimeOpen"];
                return $slot["endTimeOpen"];
            }
        }
    }

    public function store(Request $request)
    {
        try {
            AccessControlTimeSlot::create(['device_id' => $request->device_id, 'json' => $request->json]);
            return $this->response("Record inserted", null, true);
        } catch (\Throwable $th) {
            return $this->response($th->getMessage(), null, false);
        }
    }
}
