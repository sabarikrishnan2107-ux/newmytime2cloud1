<?php

namespace App\Http\Controllers;

use App\Http\Requests\Visitor\Store;
use App\Http\Requests\Visitor\Update;

use App\Models\Visitor;
use Illuminate\Http\Request;

class VisitorMappingController extends Controller
{
    public function get_visitors_with_timezonename(Visitor $visitor, Request $request)
    {
        return $visitor->with("timezone")->where('company_id', $request->company_id)->get();
    }

    public function store(Request $request)
    {
        try {
            $SDKObj = new SDKController;
            //$SDKresponse = ($SDKObj->processSDKRequest("localhost:5000/Person/AddRange", $SDKjsonRequest));
            return $SDKresponse = ($SDKObj->PersonAddRangeWithData($request->all()));

            $finalArray['SDKResponse'] = json_decode($SDKresponse, true);

            return $this->response('Visitor Timezone Mapping Successfully created.', $finalArray, true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }
}
