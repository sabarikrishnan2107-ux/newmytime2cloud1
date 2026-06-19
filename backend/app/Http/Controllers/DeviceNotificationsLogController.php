<?php

namespace App\Http\Controllers;

use App\Models\device_notifications_log;
use App\Models\DeviceNotificationsLog;
use Illuminate\Http\Request;

class DeviceNotificationsLogController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        return DeviceNotificationsLog::where('notification_id', $request->notification_id)->orderBy("created_at", "desc")->paginate($request->per_page);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\device_notifications_log  $device_notifications_log
     * @return \Illuminate\Http\Response
     */
    public function show(DeviceNotificationsLog $device_notifications_log)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Models\device_notifications_log  $device_notifications_log
     * @return \Illuminate\Http\Response
     */
    public function edit(DeviceNotificationsLog $device_notifications_log)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\device_notifications_log  $device_notifications_log
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, DeviceNotificationsLog $device_notifications_log)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\device_notifications_log  $device_notifications_log
     * @return \Illuminate\Http\Response
     */
    public function destroy(DeviceNotificationsLog $device_notifications_log)
    {
        //
    }
}
