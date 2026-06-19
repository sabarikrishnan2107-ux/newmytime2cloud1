<?php

namespace App\Http\Controllers;

// Activity.model_type holds the writing user's $user->user_type. Observed values
// in code (User.fillable, *Controller::create payloads): "company", "employee",
// "admin", "department", "department_group", "branch_group", "manager".
// The User Type dropdown surfaces "company" and "employee"; other values still
// match via the "All User Types" default.

use App\Models\Activity;
use App\Models\Branch;
use App\Models\Company;
use App\Models\Department;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request)
    {
        return $this->filters($request)->orderByDesc("id")->paginate($request->per_page ?? 10);
    }

    public function show(Request $request, $user_id)
    {
        return $this->filters($request)->where("user_id", $user_id)->orderByDesc("id")->first();
    }

    public function activitiesByUser(Request $request, $user_id)
    {
        return $this->filters($request)->where("user_id", $user_id)->orderByDesc("id")->get();
    }

    public function filters($request)
    {
        $model = Activity::query();
        $model->when($request->filled("company_id") && $request->company_id > 0, fn($q) => $q->where("company_id", $request->company_id));
        $model->when($request->filled("user_id"), fn($q) => $q->where("user_id", $request->user_id));


        $model->when($request->filled("branch_id"), function ($q) use ($request) {
            $q->whereHas("user.employee", fn($q) => $q->where("branch_id", $request->branch_id));
        });

        $model->when($request->filled("department_id") && $request->department_id > 0, function ($q) use ($request) {
            $q->whereHas("user.employee", fn($q) => $q->where("department_id", $request->department_id));
        });

        $model->when($request->filled("action"), fn($q) => $q->where("action", $request->action));
        $model->when($request->filled("type"), fn($q) => $q->where("type", $request->type));

        $model->when($request->from && $request->to, function ($q) use ($request) {
            $q->whereBetween("created_at", [$request->from . " 00:00:00", $request->to . " 23:59:59"]);
        });

        $model->when($request->filled("user_type"), fn($q) => $q->where("model_type",  $request->user_type));

        $model->when($request->filled("q"), function ($query) use ($request) {
            $term = "%" . $request->q . "%";
            $query->where(function ($inner) use ($term) {
                $inner->whereHas("user", fn($u) => $u->where("name", "ilike", $term))
                      ->orWhere("description", "ilike", $term);
            });
        });

        $model->with(["company", 'user' => fn($q) => $q->with('employee')]);
        return $model;
    }

    public function types(Request $request)
    {
        return Activity::query()
            ->when(
                $request->filled("company_id") && $request->company_id > 0,
                fn($q) => $q->where("company_id", $request->company_id)
            )
            ->whereNotNull("type")
            ->where("type", "!=", "")
            ->distinct()
            ->orderBy("type")
            ->pluck("type");
    }

    public function actions(Request $request)
    {
        return Activity::query()
            ->when(
                $request->filled("company_id") && $request->company_id > 0,
                fn($q) => $q->where("company_id", $request->company_id)
            )
            ->whereNotNull("action")
            ->where("action", "!=", "")
            ->distinct()
            ->orderBy("action")
            ->pluck("action");
    }

    public function exportPdf(Request $request)
    {
        $query = $this->filters($request)->orderByDesc("id");
        $count = $query->count();

        if ($count > 5000) {
            return response()->json([
                "message" => "Too many records ({$count}). Narrow the date range or apply more filters.",
            ], 422);
        }

        $rows = $query->get();
        $company = $request->filled('company_id')
            ? Company::find($request->company_id)
            : null;

        $pdf = Pdf::loadView('pdf.activity_logs.index', [
            'rows'          => $rows,
            'company'       => $company,
            'filterSummary' => $this->buildFilterSummary($request),
            'generatedAt'   => now(),
        ])->setPaper('a4', 'portrait');

        $filename = 'activity-logs-' . now()->format('Y-m-d') . '.pdf';
        return $pdf->download($filename);
    }

    private function buildFilterSummary(Request $request): array
    {
        $summary = [];

        if ($request->filled('from') && $request->filled('to')) {
            $summary['Date Range'] = date('d M Y', strtotime($request->from))
                                  . ' → '
                                  . date('d M Y', strtotime($request->to));
        }
        if ($request->filled('type'))      { $summary['Type']      = $request->type; }
        if ($request->filled('action'))    { $summary['Action']    = $request->action; }
        if ($request->filled('user_type')) { $summary['User Type'] = $request->user_type; }
        if ($request->filled('q'))         { $summary['Search']    = '"' . $request->q . '"'; }

        if ($request->filled('branch_id')) {
            $branch = Branch::find($request->branch_id);
            if ($branch) { $summary['Branch'] = $branch->branch_name; }
        }
        if ($request->filled('department_id')) {
            $department = Department::find($request->department_id);
            if ($department) { $summary['Department'] = $department->name; }
        }

        return $summary;
    }

    public function store(Request $request)
    {
        try {
            $record = Activity::create($request->all());

            if ($record) {
                return $this->response('Activity Successfully created.', $record, true);
            } else {
                return $this->response('Activity cannot create.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
}
