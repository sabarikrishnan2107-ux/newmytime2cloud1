<?php

namespace App\Http\Controllers;

use App\Models\UserLocation;
use Illuminate\Http\Request;

class UserLocationController extends Controller
{
    public function index(Request $request)
    {
        return UserLocation::where("company_id", $request->input("company_id"))
            ->whereDate("created_at", now()->toDateString())
            ->orderBy("created_at", "desc")
            ->get();
    }
}
