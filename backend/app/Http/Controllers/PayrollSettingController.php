<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\PayrollSetting;
use Illuminate\Http\Request;

class PayrollSettingController extends Controller
{
    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */

    public function index(Request $request)
    {
        $model = PayrollSetting::query();
        $model->where('company_id', $request->company_id);
        $model->when($request->branch_id, fn($q) => $q->where("branch_id", $request->branch_id));
        $model->with("branch");
        return $model->paginate($request->per_page ?? 100);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        
        try {
            $record = PayrollSetting::updateOrCreate([
                "company_id" => $data['company_id'],
                "branch_id" => $data['branch_id'],

            ], $data);

            if ($record) {
                return $this->response('Payroll generation date has been added.', $record, true);
            } else {
                return $this->response('Payroll generation date cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */

    public function update(Request $request, $id)
    {
        try {
            $record = PayrollSetting::where("id", $id)->update([
                "branch_id" => $request->branch_id,
                "date" => $request->date,
            ]);

            if ($record) {
                return $this->response('Payroll generation successfully added.', $record, true);
            } else {
                return $this->response('Payroll generation cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function show($id)
    {
        return PayrollSetting::where("company_id", $id)->first()->day_number ?? date("d");
    }

    public function destroy($id)
    {
        try {
            if (PayrollSetting::where("id", $id)->delete()) {
                return $this->response('Payroll Setting Successfully deleted.', null, true);
            } else {
                return $this->response('Payroll Setting cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
}
