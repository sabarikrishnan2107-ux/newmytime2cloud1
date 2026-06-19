<?php

namespace App\Http\Controllers;

use App\Http\Requests\MailContent\StoreRequest;
use App\Http\Requests\MailContent\UpdateRequest;
use App\Models\MailContent;
use Illuminate\Http\Request;

class MailContentController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(MailContent $model, Request $request)
    {


        return $model->where('company_id', $request->company_id)->paginate($request->per_page);
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
    public function store(StoreRequest $request)
    {

        try {
            $data = $request->validated();
            if ($request->company_id) {
                $data['company_id'] = $request->company_id;
            }

            $record = MailContent::create($data);

            if ($record) {
                return $this->response('Role Successfully created.', $record, true);
            } else {
                return $this->response('Role cannot create.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\MailContent  $mailContent
     * @return \Illuminate\Http\Response
     */
    public function show(MailContent $mailContent)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Models\MailContent  $mailContent
     * @return \Illuminate\Http\Response
     */
    public function edit(MailContent $mailContent)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\MailContent  $mailContent
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateRequest $request, MailContent $mailContent)
    {
        try {
            $data = $request->validated();

            if ($data) {

                $isNameExist = MailContent::where('name', $request->name)
                    ->where('company_id', $request->company_id)
                    ->first();


                if ($isNameExist) {
                    if ($isNameExist->id != $mailContent->id) {
                        return $this->response($request->room_no . ' Room Details are already Exist', null, false);
                    }
                }
                $record = $mailContent->update($request->all());
                return $this->response('Role successfully updated.', $record, true);
            } else {
                return $this->response('Role cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\MailContent  $mailContent
     * @return \Illuminate\Http\Response
     */
    public function destroy(MailContent $mailContent)
    {
        //
    }
}
