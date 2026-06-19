<?php

namespace App\Http\Controllers;

use App\Http\Requests\EmployeeLeaveDocument\StoreRequest;
use App\Models\EmployeeLeaveDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class EmployeeLeaveDocumentController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        return EmployeeLeaveDocument::where("documentable_type", "\\App\\Models\\EmployeeLeaveDocument")
            ->where("company_id", $request->company_id)
            ->where("leave_id", $request->leave_id)
            ->get();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreRequest $request)
    {

        $arr = [];
        foreach ($request->items as $item) {
            $arr[] = [
                "key" => $item["key"],
                "value" => $this->saveFile($item["value"], $item["key"], $request->company_id, $request->employee_id, $request->leave_id),

                "documentable_id" => (string) $request->company_id,
                "documentable_type" => "\App\Models\EmployeeLeaveDocument",
                "company_id" => $request->company_id,
                "employee_id" => $request->employee_id,
                "leave_id" => $request->leave_id,
            ];
        }
        try {

            $record = EmployeeLeaveDocument::insert($arr);

            if ($record) {
                return $this->response('Leave Document uploaded.', $this->index($request), true);
            } else {
                return $this->response('Leave Document cannot upload.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function saveFile($file, $id, $company_id, $employee_id, $leave_id)
    {
        $filename = $company_id . "_" . $employee_id . "_" . $leave_id . "_" . rand(1000, 9000) . '_' . $file->getClientOriginalName();
        $file->move(public_path('leave_documents/'), $filename);
        return $filename;
    }

    public function destroy($id)
    {
        try {
            $EmployeeLeaveDocument = EmployeeLeaveDocument::find($id);
            File::delete(public_path('leave_documents/' . $EmployeeLeaveDocument->value));

            if ($EmployeeLeaveDocument->delete()) {

                return $this->response('Leave Document has been deleted.', null, true);
            } else {
                return $this->response('Leave Document cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
}
