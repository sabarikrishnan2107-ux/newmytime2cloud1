<?php

namespace App\Http\Controllers;

use App\Models\HostCompany;
use App\Models\Notification as NotificationModel;
use App\Models\UserLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log as FacadesLog;
use Illuminate\Support\Facades\Notification;

class NotificationsController extends Controller
{
    public static function toSend($model, $notificationClass, $object)
    {
        Notification::send($model, new $notificationClass($object));
    }

    public function test()
    {
        $host = HostCompany::where("id", request("host_company_id"))->with("employee:id,user_id,employee_id")->first();

        return NotificationModel::create([
            "data" => "Test",
            "action" => "Registration",
            "model" => "visitor",
            "user_id" => $host->employee->user_id ?? 0,
            "company_id" => 2,
        ]);

        // Notification::send($model, new $notificationClass($object));
    }



    public function index(Request $request)
    {
        return $this->getDefaultModelSetting($request)->where("read_at", null)->paginate($request->input("per_page", 100));
    }

    public function unread(Request $request)
    {
        return $this->getDefaultModelSetting($request)->where("read_at", null)->get();
    }

    public function read(Request $request)
    {
        return $this->getDefaultModelSetting($request)->whereNot("read_at", null)->get();
    }


    public function getDefaultModelSetting(Request $request)
    {

        $model = NotificationModel::query();

        $model->where("company_id", $request->input("company_id"));

        $model->when($request->filled("user_id"), fn($q) => $q->where("user_id", $request->user_id));

        $model->orderByDesc("id");

        return $model;
    }

    public function update($id)
    {
        try {
            $model = NotificationModel::where("id", $id)->update(["read_at" => date("d-M-y H:i:s")]);
            return $this->response('Visitor successfully created.', $model, true);
        } catch (\Throwable $th) {
            return $this->response($th, null, true);
        }
    }

    public function storeNotifications(Request $request)
    {
        // Log the incoming request to see what's happening
        FacadesLog::info("Incoming Payload:", $request->all());

        // Only the live-tracker "map" push carries a location to persist.
        if ($request->boolean('debug') || $request->type !== 'map') {
            FacadesLog::warning("store-notifications ignored, type: " . $request->type);
            return response()->json(['status' => 'ignored'], 200);
        }

        // The live-tracker "map" payload (see AttendanceLogObserver / RealTimeLocation) uses
        // these keys: data.UserID, data.latitude, data.longitude, data.datetime, data.full_name,
        // data.company_id. Fall back to the older key names in case any caller still sends them.
        $userId    = $request->input('data.UserID', $request->input('data.user_id'));
        $lat       = $request->input('data.latitude', $request->input('data.lat'));
        $lon       = $request->input('data.longitude', $request->input('data.lon'));
        $timestamp = $request->input('data.datetime', $request->input('data.timestamp'));
        $name      = $request->input('data.full_name', $request->input('data.name'));
        $companyId = $request->input('data.company_id', $request->clientId);

        // company_id/user_id/lat/lon/recorded_at are NOT NULL. If any are missing, skip cleanly
        // with a 200 instead of letting the insert throw a 500 (this was the Background Sync 500).
        if ($userId === null || $lat === null || $lon === null || $timestamp === null) {
            FacadesLog::warning("store-notifications skipped: missing location fields", compact('userId', 'lat', 'lon', 'timestamp'));
            return response()->json(['status' => 'ignored', 'reason' => 'missing_fields'], 200);
        }

        // De-dupe on (user_id, recorded_at).
        if (UserLocation::where('user_id', $userId)->where('recorded_at', $timestamp)->exists()) {
            return response()->json(['status' => 'duplicate'], 200);
        }

        $created = UserLocation::create([
            'company_id'  => $companyId,
            'user_id'     => $userId,
            'user_name'   => $name,
            'avatar'      => $request->input('data.avatar'),
            'lat'         => $lat,
            'lon'         => $lon,
            'recorded_at' => $timestamp,
        ]);

        FacadesLog::info("Location Saved Successfully", $created->toArray());

        return response()->json(['status' => 'success'], 201);
    }
}
