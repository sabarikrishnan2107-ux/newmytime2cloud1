<?php

namespace App\Http\Controllers;

use App\Models\PayrollFormula;
use App\Http\Requests\PayrollFormula\StoreRequest;
use Illuminate\Http\Request;

class PayrollFormulaController extends Controller
{
    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */

    public function index(Request $request)
    {
        $model = PayrollFormula::query();
        $model->where('company_id', $request->company_id);
        $model->when($request->branch_id, fn($q) => $q->where("branch_id", $request->branch_id));
        $model->with("branch");
        return $model->paginate($request->per_page ?? 100);
    }

    public function store(StoreRequest $request)
    {
        $data = $request->validated();

        try {
            $record = PayrollFormula::updateOrCreate([
                "company_id" => $data['company_id'],
                "branch_id" => $data['branch_id'],
            ], $data);

            if ($record) {
                return $this->response('Payroll formula successfully added.', $record, true);
            } else {
                return $this->response('Payroll formula cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\PayrollFormula  $payrollFormula
     * @return \Illuminate\Http\Response
     */

    public function update(StoreRequest $request, $id)
    {
        $data = $request->validated();

        try {
            $record = PayrollFormula::where("id", $id)->update($data);

            if ($record) {
                return $this->response('Payroll formula successfully added.', $record, true);
            } else {
                return $this->response('Payroll formula cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function show($id)
    {
        return PayrollFormula::where("company_id", $id)->first();
    }

    public function destroy(PayrollFormula $PayrollFormula)
    {
        try {

            $record = $PayrollFormula->delete();

            if ($record) {
                return $this->response('Payroll Formula Successfully deleted.', $record, true);
            } else {
                return $this->response('Payroll Formula cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
}
