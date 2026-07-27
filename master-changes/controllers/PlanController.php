<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    public function index()
    {
        return Plan::orderBy('id')->get();
    }

    public function store(Request $request)
    {
        $plan = Plan::create($this->validateData($request));

        return response()->json($plan, 201);
    }

    public function show($id)
    {
        return Plan::findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $plan = Plan::findOrFail($id);
        $plan->update($this->validateData($request));

        return response()->json($plan);
    }

    public function destroy($id)
    {
        Plan::findOrFail($id)->delete();

        return response()->json(['status' => true, 'message' => 'Plan deleted.']);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'name'           => ['required', 'string', 'max:100'],
            'tag'            => ['nullable', 'string', 'max:255'],
            'price'          => ['nullable', 'numeric', 'min:0'],
            'color'          => ['nullable', 'string', 'max:50'],
            'deployment'     => ['nullable', 'string', 'max:50'],
            'features'       => ['nullable', 'array'],
            'limits'         => ['nullable', 'array'],
            'feature_limits' => ['nullable', 'array'],
        ]);
    }
}
