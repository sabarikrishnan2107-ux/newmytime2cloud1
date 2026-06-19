<?php

namespace App\Http\Controllers;

use App\Models\AIFeeds;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AIFeedsController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer',
            'type' => 'nullable|string|in:late,early,absent,birthday',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = AIFeeds::with('employee')
            ->where('company_id', $request->company_id)
            ->orderBy('created_at', 'desc');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $perPage = $request->input('per_page', 20);
        $feeds = $query->paginate($perPage);

        return response()->json($feeds);
    }


    /**
     * Return all employees in the company whose birthday falls within
     * the current Monday-Sunday calendar week. Each entry includes the
     * day-of-week, formatted date, and a wish line for display.
     */
    public function weeklyBirthdays(Request $request)
    {
        $request->validate(['company_id' => 'required|integer']);

        // Build the 7 MM-DD strings for current Mon..Sun
        $monday = Carbon::now()->startOfWeek(Carbon::MONDAY);
        $weekDates = [];
        for ($i = 0; $i < 7; $i++) {
            $weekDates[] = $monday->copy()->addDays($i)->format('m-d');
        }

        $employees = Employee::where('company_id', $request->company_id)
            ->with(['emirate', 'department', 'branch', 'designation'])
            ->where(function ($q) use ($weekDates) {
                // employees.date_of_birth is varchar 'YYYY-MM-DD' — compare the MM-DD slice
                $q->whereIn(DB::raw("SUBSTRING(date_of_birth FROM 6 FOR 5)"), $weekDates)
                  ->orWhereHas('emirate', function ($eq) use ($weekDates) {
                      // emirates_infos.date_of_birth is a real date
                      $eq->whereIn(DB::raw("TO_CHAR(date_of_birth, 'MM-DD')"), $weekDates);
                  });
            })
            ->get();

        $today = Carbon::now()->format('m-d');
        $result = $employees->map(function ($e) use ($monday, $today) {
            $dob = $e->date_of_birth ?? optional($e->emirate)->date_of_birth ?? null;
            $birth = $dob ? Carbon::parse($dob) : null;
            $mmdd = $birth ? $birth->format('m-d') : null;

            // Map MM-DD back into this week's actual date (so display shows e.g. "Sat, Apr 18")
            $dateThisYear = null;
            if ($mmdd) {
                for ($i = 0; $i < 7; $i++) {
                    $d = $monday->copy()->addDays($i);
                    if ($d->format('m-d') === $mmdd) {
                        $dateThisYear = $d;
                        break;
                    }
                }
            }

            $fullName = trim(($e->first_name ?? '') . ' ' . ($e->last_name ?? ''));
            if ($fullName === '') $fullName = 'Teammate';

            return [
                'employee_id'  => $e->id,
                'employee_code'=> $e->employee_id,
                'full_name'    => $fullName,
                'profile_picture' => $e->profile_picture ?? null,
                'department'   => optional($e->department)->name,
                'branch'       => optional($e->branch)->branch_name,
                'designation'  => optional($e->designation)->name,
                'birthday_date'=> $dateThisYear ? $dateThisYear->toDateString() : null,
                'day_of_week'  => $dateThisYear ? $dateThisYear->format('l') : null,
                'display_date' => $dateThisYear ? $dateThisYear->format('M j') : null,
                'is_today'     => $mmdd === $today,
                'age_turning'  => $birth ? Carbon::now()->year - $birth->year : null,
                'wish'         => "🎂 Wishing {$fullName} a wonderful birthday filled with joy!",
            ];
        })
        // Sort by date in week (Mon first, Sun last)
        ->sortBy(fn ($r) => $r['birthday_date'] ?? '9999-12-31')
        ->values();

        return response()->json(['data' => $result]);
    }

    public function aiFeedsByEmployeeId(Request $request, $id)
    {
        $request->validate([
            'type' => 'nullable|string|in:late,early,absent,birthday',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = AIFeeds::where('employee_id', $id)->orderBy('created_at', 'desc');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $perPage = $request->input('per_page', 20);
        $feeds = $query->paginate($perPage);

        return response()->json($feeds);
    }
}
