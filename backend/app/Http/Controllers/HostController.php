<?php

namespace App\Http\Controllers;

use App\Http\Requests\HostCompany\Store;
use App\Http\Requests\HostCompany\Update;
use App\Models\Employee;
use App\Models\HostCompany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class HostController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */

    public function host_list(Request $request)
    {
        $model = HostCompany::query();

        $model->with("employee:id,user_id,employee_id,system_user_id,first_name,last_name,display_name,profile_picture");

        $model->where("company_id", $request->input("company_id"));

        return $model->get();
    }
    // public function host_employees_list(Request $request)


    // {

    //     $model = HostCompany::query();
    //     $model->with("employee");
    //     return   $model->where("company_id", $request->input("company_id"))->pluck("employee.id");

    //     $model = Employee::query();



    //     $model->where("company_id", $request->input("company_id"));
    //     $model->whereIn("id",);

    //     return $model->get();
    // }

    public function show($id)
    {
        return HostCompany::where("employee_id", $id)->first();
    }

    public function index(Request $request)
    {
        $model = HostCompany::query();

        $fields = ['flat_number', 'number', 'emergency_phone', 'open_time', 'close_time', 'branch_id', 'zone_id'];

        $model = $this->process_ilike_filter($model, $request, $fields);
        $fields = ['branch_id', 'zone_id'];
        $model = $this->process_column_filter($model, $request, $fields);

        $model->with(["zone", "branch", "employee:id,branch_id,user_id,employee_id,system_user_id,first_name,last_name,display_name,profile_picture"]);

        $model->when($request->filled("employee_id"), fn ($q) => $q->where(" employee_id", $request->employee_id));

        $model->where("company_id", $request->input("company_id"));

        $model->when($request->filled('first_name'), function ($q) use ($request) {

            $q->whereHas(
                'employee',
                fn (Builder $query) =>

                $query->where('first_name', env('WILD_CARD') ?? 'ILIKE', "$request->first_name%")


            );
        });

        return $model->paginate($request->input("per_page", 100));
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Store $request)
    {
        $data = $request->validated();

        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $ext = $file->getClientOriginalExtension();
            $fileName = time() . '.' . $ext;
            $request->logo->move(public_path('media/company/logo/'), $fileName);
            $data['logo'] = $fileName;
        }

        try {



            $host = HostCompany::create($data);
            if (!$host) {
                return $this->response('Host cannot add.', null, false);
            }

            $host->logo = asset('media/company/logo' . $host->logo);

            return $this->response('Host successfully created.', $host, true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Host  $host
     * @return \Illuminate\Http\Response
     */
    public function update(Update $request, $id)
    {
        $data = $request->validated();

        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $ext = $file->getClientOriginalExtension();
            $fileName = time() . '.' . $ext;
            $request->logo->move(public_path('media/company/logo/'), $fileName);
            $data['logo'] = $fileName;
        }

        try {

            $host = HostCompany::whereId($id)->update($data);
            if (!$host) {
                return $this->response('Host cannot update.', null, false);
            }

            return $this->response('Host successfully updated.', null, true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Host  $host
     * @return \Illuminate\Http\Response
     */
    public function destroy(HostCompany $host)
    {
        return $host->delete();
    }
}
