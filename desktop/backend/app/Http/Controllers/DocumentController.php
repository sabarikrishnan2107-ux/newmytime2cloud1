<?php

namespace App\Http\Controllers;

use App\Http\Requests\Document\StoreRequest;
use App\Http\Requests\Document\UpdateRequest;
use App\Models\Company;
use App\Models\Document;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return Document::where("documentable_type", "\\App\\Models\\Company")->get();
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
                "value" => $this->saveFile($item["value"], $item["key"]),
                "documentable_id" => (string) $request->company_id,
                "documentable_type" => "\App\Models\Company"
            ];
        }
        try {

            $record = Document::insert($arr);

            if ($record) {
                return $this->response('Company Document uploaded.', $this->index(), true);
            } else {
                return $this->response('Company Document cannot upload.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function saveFile($file, $id)
    {
        $filename = $file->getClientOriginalName();
        $file->move(public_path('documents/' . $id . "/"), $filename);
        return $filename;
    }    

    public function destroy($id)
    {
        try {

            if (Document::find($id)->delete()) {
                return $this->response('Company Document has been deleted.', null, true);
            } else {
                return $this->response('Company Document cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
}
