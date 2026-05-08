<?php

namespace App\Http\Controllers;

use App\Models\Visitor;
use App\Models\VisitorAttendance;
use App\Models\VisitorBlacklist;
use App\Models\VisitorPreRegistration;
use App\Models\Employee;
use App\Models\Zone;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VisitorManagementController extends Controller
{
    private function resolveVisitorHostName(Visitor $visitor): ?string
    {
        $employee = $visitor->host?->employee;
        $employeeName = trim((string) ($employee?->display_name ?: trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? ''))));

        if ($employeeName !== '') {
            return $employeeName;
        }

        foreach ([$visitor->host_name ?? null, $visitor->host_company_name ?? null] as $value) {
            $label = trim((string) $value);
            if ($label !== '') {
                return $label;
            }
        }

        return null;
    }
    // ── Dashboard Stats ──
    public function dashboardStats(Request $request)
    {
        $companyId = $request->company_id;
        $today = Carbon::today()->toDateString();

        $totalToday = Visitor::where('company_id', $companyId)->whereDate('date', $today)->count();
        $checkedIn = Visitor::where('company_id', $companyId)->whereDate('date', $today)->where('status_id', 6)->count();
        $pending = Visitor::where('company_id', $companyId)->whereDate('date', $today)->where('status_id', 1)->count();
        $preRegistered = VisitorPreRegistration::where('company_id', $companyId)
            ->where('expected_date', '>=', $today)->where('status', 'pending')->count();

        // Overstayed visitors (checked in but past expected time_out)
        $overstayed = Visitor::where('company_id', $companyId)
            ->whereDate('date', $today)
            ->where('status_id', 6)
            ->whereNotNull('time_out')
            ->whereRaw("CONCAT(date, ' ', time_out) < ?", [now()])
            ->count();

        $blacklisted = VisitorBlacklist::where('company_id', $companyId)->where('status', 'active')->count();

        // Weekly visitor count
        $weekStart = Carbon::now()->startOfWeek()->toDateString();
        $weeklyCount = Visitor::where('company_id', $companyId)
            ->whereDate('date', '>=', $weekStart)->count();

        return response()->json([
            'total_today' => $totalToday,
            'checked_in' => $checkedIn,
            'pending_approvals' => $pending,
            'pre_registered' => $preRegistered,
            'overstayed' => $overstayed,
            'blacklisted' => $blacklisted,
            'weekly_count' => $weeklyCount,
        ]);
    }

    // ── Dashboard Analytics ──
    public function dashboardAnalytics(Request $request)
    {
        $companyId = $request->company_id;
        $today = Carbon::today();

        // Hourly traffic for today
        $hourlyData = [];
        $todayAttendance = VisitorAttendance::where('company_id', $companyId)
            ->whereDate('date', $today->toDateString())->get();

        for ($h = 6; $h <= 18; $h++) {
            $hour = str_pad($h, 2, '0', STR_PAD_LEFT);
            $count = $todayAttendance->filter(function ($a) use ($hour) {
                $inHour = $a->in ? (int) substr($a->in, 0, 2) : -1;
                return $inHour == (int) $hour;
            })->count();
            $label = $h < 12 ? "{$h}AM" : ($h == 12 ? "12PM" : ($h - 12) . "PM");
            $hourlyData[] = ['hour' => $label, 'visitors' => $count, 'expected' => 0];
        }

        // Weekly trend (this week vs last week, day by day)
        $weeklyTrend = [];
        $days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        $thisWeekStart = $today->copy()->startOfWeek();
        $lastWeekStart = $today->copy()->subWeek()->startOfWeek();

        for ($i = 0; $i < 7; $i++) {
            $thisDay = $thisWeekStart->copy()->addDays($i)->toDateString();
            $lastDay = $lastWeekStart->copy()->addDays($i)->toDateString();
            $weeklyTrend[] = [
                'day' => $days[$i],
                'thisWeek' => Visitor::where('company_id', $companyId)->whereDate('date', $thisDay)->count(),
                'lastWeek' => Visitor::where('company_id', $companyId)->whereDate('date', $lastDay)->count(),
            ];
        }

        // Visitor type breakdown (from pre-registrations + visitors)
        $typeData = [];
        $types = VisitorPreRegistration::where('company_id', $companyId)
            ->selectRaw('visitor_type, count(*) as cnt')
            ->groupBy('visitor_type')
            ->pluck('cnt', 'visitor_type');

        $typeColors = [
            'Business' => 'hsl(173, 58%, 39%)', 'Contractor' => 'hsl(222, 60%, 30%)',
            'Delivery' => 'hsl(217, 91%, 60%)', 'Interview' => 'hsl(38, 92%, 50%)',
            'VIP' => 'hsl(160, 60%, 45%)', 'Other' => 'hsl(215, 16%, 47%)',
        ];
        $totalTypes = max($types->sum(), 1);
        foreach ($types as $type => $count) {
            $typeData[] = [
                'name' => $type,
                'value' => round(($count / $totalTypes) * 100),
                'color' => $typeColors[$type] ?? 'hsl(215, 16%, 47%)',
            ];
        }

        // Recent notifications (overstayed + recent check-ins)
        $notifications = [];
        $recentCheckins = Visitor::where('company_id', $companyId)
            ->whereDate('date', $today->toDateString())
            ->where('status_id', 6)
            ->with('host.employee:id,first_name,last_name,display_name')
            ->orderBy('updated_at', 'desc')
            ->limit(3)
            ->get(['id', 'first_name', 'last_name', 'updated_at', 'host_company_id', 'host_name', 'host_company_name']);

        foreach ($recentCheckins as $v) {
            $hostName = $this->resolveVisitorHostName($v);
            $notifications[] = [
                'id' => $v->id,
                'visitor' => trim("{$v->first_name} {$v->last_name}"),
                'host' => $hostName,
                'time' => Carbon::parse($v->updated_at)->format('g:i A'),
                'type' => 'arrival',
                'message' => 'has arrived',
            ];
        }

        // Overstayed notifications
        $overstayed = Visitor::where('company_id', $companyId)
            ->whereDate('date', $today->toDateString())
            ->where('status_id', 6)
            ->whereNotNull('time_out')
            ->whereRaw("CONCAT(date, ' ', time_out) < ?", [now()])
            ->with('host.employee:id,first_name,last_name,display_name')
            ->limit(3)
            ->get(['id', 'first_name', 'last_name', 'time_out', 'host_company_id', 'host_name', 'host_company_name']);

        foreach ($overstayed as $v) {
            $hostName = $this->resolveVisitorHostName($v);
            $notifications[] = [
                'id' => 'overstay-' . $v->id,
                'visitor' => trim("{$v->first_name} {$v->last_name}"),
                'host' => $hostName,
                'time' => $v->time_out ?? '---',
                'type' => 'overstay',
                'message' => 'has exceeded expected visit duration',
            ];
        }

        return response()->json([
            'hourly_data' => $hourlyData,
            'weekly_trend' => $weeklyTrend,
            'type_data' => $typeData,
            'notifications' => $notifications,
        ]);
    }

    // ── Visitor Logs (for Logs page) ──
    public function visitorLogs(Request $request)
    {
        $companyId = $request->company_id;

        return VisitorAttendance::where('company_id', $companyId)
            ->with('visitor:id,first_name,last_name,visitor_company_name,system_user_id')
            ->when($request->date, fn($q) => $q->whereDate('date', $request->date))
            ->when($request->branch_id, fn($q) => $q->where('branch_id', $request->branch_id))
            ->orderBy('id', 'desc')
            ->paginate($request->per_page ?? 50);
    }

    // ── Directory (all visitors) ──
    public function directory(Request $request)
    {
        $companyId = $request->company_id;

        return Visitor::where('company_id', $companyId)
            ->select('id', 'first_name', 'last_name', 'phone_number', 'email', 'visitor_company_name',
                'id_type', 'id_number', 'logo', 'status_id', 'zone_id', 'date', 'created_at')
            ->with('zone:id,name')
            ->when($request->branch_id, fn($q) => $q->where('branch_id', $request->branch_id))
            ->when($request->search, function ($q) use ($request) {
                $q->where(function ($q2) use ($request) {
                    $q2->where('first_name', 'like', "%{$request->search}%")
                        ->orWhere('last_name', 'like', "%{$request->search}%")
                        ->orWhere('visitor_company_name', 'like', "%{$request->search}%")
                        ->orWhere('phone_number', 'like', "%{$request->search}%");
                });
            })
            ->orderBy('id', 'desc')
            ->paginate($request->per_page ?? 50);
    }

    // ── Pre-Registration ──
    public function preRegistrations(Request $request)
    {
        return VisitorPreRegistration::where('company_id', $request->company_id)
            ->with('hostEmployee:id,first_name,last_name')
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->date, fn($q) => $q->whereDate('expected_date', $request->date))
            ->orderBy('expected_date', 'asc')
            ->paginate($request->per_page ?? 50);
    }

    public function storePreRegistration(Request $request)
    {
        $data = $request->only([
            'company_id', 'branch_id', 'visitor_name', 'company_name', 'email', 'phone',
            'id_type', 'id_number', 'host_employee_id', 'host_name', 'purpose',
            'visitor_type', 'expected_date', 'expected_time', 'notes', 'photo',
        ]);
        $data['qr_code'] = 'VPR-' . strtoupper(Str::random(10));
        $data['status'] = 'pending';
        $data['created_by'] = $request->user_id;

        $reg = VisitorPreRegistration::create($data);
        return response()->json(['status' => true, 'data' => $reg]);
    }

    public function updatePreRegistration(Request $request, $id)
    {
        $reg = VisitorPreRegistration::where('company_id', $request->company_id)->findOrFail($id);
        $reg->update($request->only(['status', 'visitor_name', 'expected_date', 'expected_time', 'notes']));
        return response()->json(['status' => true, 'data' => $reg]);
    }

    public function deletePreRegistration(Request $request, $id)
    {
        VisitorPreRegistration::where('company_id', $request->company_id)->findOrFail($id)->delete();
        return response()->json(['status' => true, 'message' => 'Deleted']);
    }

    // ── Blacklist ──
    public function blacklist(Request $request)
    {
        return VisitorBlacklist::where('company_id', $request->company_id)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->orderBy('id', 'desc')
            ->paginate($request->per_page ?? 50);
    }

    public function storeBlacklist(Request $request)
    {
        $data = $request->only([
            'company_id', 'branch_id', 'name', 'company_name', 'id_type', 'id_number',
            'phone_number', 'email', 'reason', 'added_by',
        ]);
        $data['status'] = 'active';
        $data['incidents'] = 1;

        // Check if already blacklisted
        $existing = VisitorBlacklist::where('company_id', $request->company_id)
            ->where('id_number', $data['id_number'] ?? '')
            ->where('status', 'active')
            ->first();

        if ($existing) {
            $existing->increment('incidents');
            $existing->update(['reason' => $data['reason']]);
            return response()->json(['status' => true, 'data' => $existing, 'message' => 'Incident count updated']);
        }

        $bl = VisitorBlacklist::create($data);
        return response()->json(['status' => true, 'data' => $bl]);
    }

    public function removeBlacklist(Request $request, $id)
    {
        $bl = VisitorBlacklist::where('company_id', $request->company_id)->findOrFail($id);
        $bl->update(['status' => 'removed']);
        return response()->json(['status' => true, 'message' => 'Removed from blacklist']);
    }

    // ── Check Blacklist (called during check-in) ──
    public function checkBlacklist(Request $request)
    {
        $companyId = $request->company_id;
        $match = VisitorBlacklist::where('company_id', $companyId)
            ->where('status', 'active')
            ->where(function ($q) use ($request) {
                if ($request->id_number) $q->orWhere('id_number', $request->id_number);
                if ($request->phone_number) $q->orWhere('phone_number', $request->phone_number);
            })
            ->first();

        return response()->json([
            'blacklisted' => !!$match,
            'data' => $match,
        ]);
    }

    // ── Zone list (for frontend) ──
    public function zones(Request $request)
    {
        return Zone::where('company_id', $request->company_id)
            ->withCount('devices')
            ->orderBy('name')
            ->get();
    }

    // ── Employee list for host dropdown ──
    public function hostEmployees(Request $request)
    {
        return Employee::where('company_id', $request->company_id)
            ->when($request->branch_id, fn($q) => $q->where('branch_id', $request->branch_id))
            ->select('id', 'first_name', 'last_name', 'employee_id', 'department_id')
            ->with('department:id,name')
            ->orderBy('first_name')
            ->get();
    }
}
