<?php

namespace App\Http\Controllers;

use App\Models\Zone;
use App\Http\Requests\StoreZoneRequest;
use App\Http\Requests\UpdateZoneRequest;
use App\Models\ZoneDevices;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ZoneController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function zone_list(Request $request)
    {
        return Zone::whereCompanyId($request->company_id)->get();
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $model = Zone::query();

        $fields = ['name'];

        $model = $this->process_ilike_filter($model, $request, $fields);

        $model->when($request->filled('devices'), function ($q) use ($request) {

            $q->orWhereHas('devices', fn (Builder $query) => $query->where('short_name', env('WILD_CARD') ?? 'ILIKE', $request->input("devices") . '%'));
        });

        $model->where("company_id", $request->input("company_id"));


        return $model->with(["devices"])->paginate($request->input("per_page", 100));
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \App\Http\Requests\StoreZoneRequest  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreZoneRequest $request)
    {
        try {
            $zone = Zone::create($request->except(["device_ids"]));

            $zoneDevices = [];

            foreach ($request->device_ids as $device_id) {
                $zoneDevices[] = [
                    'zone_id' => $zone->id,
                    'device_id' => $device_id,
                ];
            }

            $zoneDevice = ZoneDevices::insert($zoneDevices);

            if ($zoneDevice) {
                return $this->response("Zone created successfully", null, true);
            }
            return $this->response("Zone cannot successfully", null, true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Zone  $zone
     * @return \Illuminate\Http\Response
     */
    public function show(Zone $zone)
    {
        return $zone->with(["devices"])->find($zone->id);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \App\Http\Requests\UpdateZoneRequest  $request
     * @param  \App\Models\Zone  $zone
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateZoneRequest $request, $id)
    {
        try {

            $zone = Zone::where("id", $id)->update($request->except(["device_ids"]));

            $zoneDevices = [];

            foreach ($request->device_ids as $device_id) {
                $zoneDevices[] = [
                    'zone_id' => $id,
                    'device_id' => $device_id,
                ];
            }

            $zoneDevice = ZoneDevices::query();
            $zoneDevice->where("zone_id", $id);
            $zoneDevice->delete();
            $zoneDevice->insert($zoneDevices);

            if ($zone) {
                return $this->response("Zone updated successfully", null, true);
            }
            return $this->response("Zone cannot update", null, true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Zone  $zone
     * @return \Illuminate\Http\Response
     */
    public function destroy(Zone $zone)
    {
        return $zone->delete();
    }
}
