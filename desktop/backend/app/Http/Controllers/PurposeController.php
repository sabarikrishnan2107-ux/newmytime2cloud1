<?php

namespace App\Http\Controllers;

use App\Http\Requests\Purpose\Store;
use App\Http\Requests\Purpose\Update;
use App\Models\Purpose;
use Illuminate\Http\Request;

class PurposeController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function purposeList(Purpose $model, Request $request)
    {
        return $model->where('company_id', $request->company_id)->orderBy("name", "asc")->get();
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Purpose $model, Request $request)
    {

        return $model->where('company_id', $request->company_id)->paginate($request->per_page);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Store $request)
    {
        try {

            $record = Purpose::create($request->validated());

            if ($record) {
                return $this->response('Purpose Successfully created.', $record, true);
            } else {
                return $this->response('Purpose cannot create.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Purpose  $purpose
     * @return \Illuminate\Http\Response
     */
    public function update(Update $request, Purpose $purpose)
    {
        try {
            $record = $purpose->update($request->all());

            if ($record) {
                return $this->response('Purpose successfully updated.', $record, true);
            } else {
                return $this->response('Purpose cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Purpose  $purpose
     * @return \Illuminate\Http\Response
     */
    public function destroy(Purpose $purpose)
    {
        $record = $purpose->delete();

        if ($record) {
            return $this->response('Purpose successfully deleted.', $record, true);
        } else {
            return $this->response('Purpose cannot delete.', null, false);
        }
    }
}
