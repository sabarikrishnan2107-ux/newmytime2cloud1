<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\AITrigger;

class AITriggerController extends Controller
{
    public function index(AITrigger $AITrigger, Request $request)
    {
        return $AITrigger->orderBy("id", "desc")->paginate(500);
    }


    public function store(Request $request)
    {
        $message = $request->description;
        $companyId = $request->company_id ?? 2;

        $trigger = AITrigger::createFromMessage($message, $companyId);

        if (!$trigger) {
            return response()->json([
                'status' =>  false,
                'message' => 'Trigger invalid/unrelated or already exists.'
            ]);
        }

        return response()->json([
            'status' => true,
            'trigger' => $trigger
        ]);

    }

    public function destroy($id)
    {
        AITrigger::findOrFail($id)->delete();

        return response()->json([
            "status" => true,
            "message" => "Deleted"
        ]);
    }
}
