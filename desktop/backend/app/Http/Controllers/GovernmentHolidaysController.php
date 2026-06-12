<?php

namespace App\Http\Controllers;

use App\Models\EmployeeGovernmentHoliday;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class GovernmentHolidaysController extends Controller
{
    private $nagerBaseUrl = 'https://date.nager.at/api/v3';

    /**
     * Get government holidays by country and year
     * Fallback chain:
     * 1. Try Nager.Date API
     * 2. For UAE (AE), try Google Calendar API
     * 3. Return empty array
     * 
     * @param Request $request - Expects: country_code (ISO 3166-1 alpha-2), year
     */
    public function index(Request $request)
    {
        $countryCode = $request->get('country_code') ?? $request->get('country');
        $year = $request->get('year') ?? date('Y');

        if (!$countryCode) {
            return response()->json([
                'success' => false,
                'message' => 'country_code parameter is required',
                'data' => [],
            ], 400);
        }

        $countryCode = strtoupper(trim($countryCode));

        // Validate country code format (must be 2 characters)
        if (strlen($countryCode) !== 2) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid country code format. Must be 2-letter ISO code (e.g., AE, IN, GB)',
                'data' => [],
            ], 400);
        }

        // Cache for 30 days to reduce API calls
        $cacheKey = "government_holidays_{$countryCode}_{$year}";
        
        try {
            $result = Cache::remember($cacheKey, now()->addDays(30), function () use ($countryCode, $year) {
                // Try Nager.Date API first
                $holidays = $this->fetchFromNagerDate($countryCode, $year);
                if (!empty($holidays)) {
                    return $holidays;
                }

                // Fall back to the sync-calendar Node service for any country it
                // knows about (Google Calendar ICS feeds). Covers IN, GB, US, SA, etc.
                // where Nager.Date returns 204.
                $holidays = $this->fetchFromSyncCalendar($countryCode, $year);
                if (!empty($holidays)) {
                    return $holidays;
                }

                // No holidays found
                \Log::warning("No government holidays found for {$countryCode} in {$year}");
                return [
                    'success' => true,
                    'data' => [],
                    'country' => $countryCode,
                    'message' => 'No government holidays data available'
                ];
            });

            return response()->json($result);

        } catch (\Exception $e) {
            \Log::error("Government holidays error: " . $e->getMessage(), ['exception' => $e]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => [],
            ], 500);
        }
    }

    /**
     * Fetch holidays from Nager.Date API
     */
    private function fetchFromNagerDate($countryCode, $year)
    {
        try {
            \Log::info("Fetching holidays from Nager.Date for {$countryCode}/{$year}");
            
            $response = Http::withoutVerifying()
                ->timeout(10)
                ->get("{$this->nagerBaseUrl}/PublicHolidays/{$year}/{$countryCode}");

            \Log::info("Nager.Date response: " . $response->status());

            if ($response->status() === 200) {
                $holidays = $response->json();
                
                if (is_array($holidays) && !empty($holidays)) {
                    return [
                        'success' => true,
                        'data' => array_map(function ($holiday) use ($countryCode) {
                            return [
                                'id' => md5($holiday['date'] . $holiday['name']),
                                'name' => $holiday['name'],
                                'start_date' => $holiday['date'],
                                'end_date' => $holiday['date'],
                                'year' => substr($holiday['date'], 0, 4),
                                'total_days' => 1,
                                'country_code' => $countryCode,
                                'type' => 'government',
                                'is_public' => $holiday['types'][0] ?? 'Public',
                            ];
                        }, $holidays),
                        'country' => $countryCode,
                        'source' => 'nager.date'
                    ];
                }
            }
        } catch (\Exception $e) {
            \Log::warning("Nager.Date API failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Fetch holidays for the given country from the sync-calendar Node service,
     * which proxies Google Calendar's regional holiday ICS feeds. Works for any
     * country code the Node service has in its CALENDAR_IDS map (AE, IN, GB, ...).
     */
    private function fetchFromSyncCalendar($countryCode, $year)
    {
        try {
            $nodeUrl = env('SYNC_CALENDAR_URL', 'http://127.0.0.1:5780')
                . "/holidays/{$year}?country=" . urlencode($countryCode);
            \Log::info("Fetching {$countryCode} holidays from sync-calendar: {$nodeUrl}");

            $response = Http::timeout(8)->get($nodeUrl);

            if ($response->successful()) {
                $list = $response->json();
                if (is_array($list) && !empty($list)) {
                    $data = array_map(function ($h) use ($countryCode) {
                        $start = $h['start_date'] ?? $h['date'] ?? null;
                        $end = $h['end_date'] ?? $start;
                        return [
                            'id' => md5(($start ?? '') . ($h['name'] ?? '')),
                            'name' => $h['name'] ?? 'Holiday',
                            'start_date' => $start,
                            'end_date' => $end,
                            'year' => (string) ($h['year'] ?? substr($start ?? '', 0, 4)),
                            'total_days' => (int) ($h['total_days'] ?? 1),
                            'country_code' => $countryCode,
                            'type' => 'government',
                            'is_public' => 'Public',
                        ];
                    }, $list);

                    \Log::info("✅ Got " . count($data) . " {$countryCode} holidays from sync-calendar service");
                    return [
                        'success' => true,
                        'data' => $data,
                        'country' => $countryCode,
                        'source' => 'sync-calendar-service',
                    ];
                }
            } else {
                \Log::info("sync-calendar responded " . $response->status() . " for {$countryCode}/{$year}");
            }
        } catch (\Exception $e) {
            \Log::warning("sync-calendar service fetch failed: " . $e->getMessage());
        }

        // Only fall through to the direct ICS (UAE-only legacy path) when the caller
        // asked for UAE — other countries have no hardcoded ICS below this point.
        if ($countryCode !== 'AE') {
            return null;
        }

        // Fallback: fetch Google Calendar ICS directly
        try {
            \Log::info("Fetching UAE holidays directly from Google Calendar for {$year}");
            $icsUrl = 'https://calendar.google.com/calendar/ical/en.ae%23holiday%40group.v.calendar.google.com/public/basic.ics';

            $response = Http::withoutVerifying()
                ->timeout(10)
                ->get($icsUrl);

            if ($response->successful()) {
                $holidays = $this->parseICS($response->body(), $year);
                if (!empty($holidays)) {
                    \Log::info("✅ Found " . count($holidays) . " UAE holidays from Google Calendar ICS");
                    return [
                        'success' => true,
                        'data' => $holidays,
                        'country' => 'AE',
                        'source' => 'google.calendar',
                    ];
                }
            }
        } catch (\Exception $e) {
            \Log::warning("Google Calendar ICS fetch failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Parse ICS (iCalendar) format to extract holidays
     */
    private function parseICS($icsContent, $year)
    {
        $holidays = [];
        
        try {
            $lines = explode("\n", $icsContent);
            $currentEvent = [];
            $inEvent = false;

            foreach ($lines as $line) {
                $line = trim($line);
                
                if ($line === 'BEGIN:VEVENT') {
                    $inEvent = true;
                    $currentEvent = [];
                } elseif ($line === 'END:VEVENT') {
                    $inEvent = false;
                    
                    if (!empty($currentEvent)) {
                        // Find DTSTART regardless of the key format (VALUE=DATE etc.)
                        $dtstart = null;
                        foreach ($currentEvent as $key => $value) {
                            if (strpos($key, 'DTSTART') === 0) {
                                $dtstart = $value;
                                break;
                            }
                        }
                        
                        if ($dtstart && preg_match('/(\d{8})/', $dtstart, $matches)) {
                            $dateStr = $matches[1];
                            $eventYear = substr($dateStr, 0, 4);
                            
                            // Only include events for the requested year
                            if ($eventYear == $year) {
                                $date = substr($dateStr, 0, 4) . "-" . substr($dateStr, 4, 2) . "-" . substr($dateStr, 6, 2);
                                $summary = $currentEvent['SUMMARY'] ?? 'Holiday';
                                
                                $holidays[] = [
                                    'id' => md5($date . $summary),
                                    'name' => $summary,
                                    'start_date' => $date,
                                    'end_date' => $date,
                                    'year' => $year,
                                    'total_days' => 1,
                                    'country_code' => 'AE',
                                    'type' => 'government',
                                    'is_public' => 'Public',
                                ];
                            }
                        }
                    }
                } elseif ($inEvent) {
                    if (strpos($line, ':') !== false) {
                        [$key, $value] = explode(':', $line, 2);
                        $currentEvent[$key] = $value;
                    }
                }
            }
        } catch (\Exception $e) {
            \Log::error("ICS parsing error: " . $e->getMessage());
        }

        return $holidays;
    }

    /**
     * Get government holidays for a specific employee.
     * If custom holidays exist, return those (with is_enabled flags).
     * If no custom holidays, return default government holidays (all enabled).
     */
    public function employeeHolidays(Request $request, $employeeId)
    {
        $countryCode = $request->get('country_code', 'AE');
        $year = $request->get('year', date('Y'));
        $companyId = $request->get('company_id');

        // Check if employee has custom holidays saved
        $query = EmployeeGovernmentHoliday::where('employee_id', $employeeId)
            ->where('year', $year)
            ->where('country_code', strtoupper($countryCode));

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $customHolidays = $query->get();

        if ($customHolidays->isNotEmpty()) {
            return response()->json([
                'success' => true,
                'is_custom' => true,
                'data' => $customHolidays,
            ]);
        }

        // No custom holidays — fetch default government holidays directly
        $countryCode = strtoupper(trim($countryCode));
        $cacheKey = "government_holidays_{$countryCode}_{$year}";

        $result = Cache::remember($cacheKey, now()->addDays(30), function () use ($countryCode, $year) {
            $holidays = $this->fetchFromNagerDate($countryCode, $year);
            if (!empty($holidays)) return $holidays;

            if ($countryCode === 'AE') {
                $holidays = $this->fetchFromGoogleCalendar($year);
                if (!empty($holidays)) return $holidays;
            }

            return ['success' => true, 'data' => [], 'country' => $countryCode];
        });

        $holidays = $result['data'] ?? [];

        // Mark all as enabled by default
        $holidays = array_map(function ($h) {
            $h['is_enabled'] = true;
            return $h;
        }, $holidays);

        return response()->json([
            'success' => true,
            'is_custom' => false,
            'data' => $holidays,
        ]);
    }

    /**
     * Save custom government holidays for an employee.
     * Receives the full list of holidays with is_enabled flag per holiday.
     */
    public function saveEmployeeHolidays(Request $request, $employeeId)
    {
        $request->validate([
            'company_id' => 'required',
            'country_code' => 'required|string|size:2',
            'year' => 'required|integer',
            'holidays' => 'required|array',
            'holidays.*.holiday_id' => 'required|string',
            'holidays.*.name' => 'required|string',
            'holidays.*.start_date' => 'required|date',
            'holidays.*.end_date' => 'required|date',
            'holidays.*.is_enabled' => 'required|boolean',
        ]);

        $companyId = $request->company_id;
        $countryCode = strtoupper($request->country_code);
        $year = $request->year;

        // Delete existing custom holidays for this employee/year/country/company
        EmployeeGovernmentHoliday::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->where('year', $year)
            ->where('country_code', $countryCode)
            ->delete();

        // Insert all holidays with their enabled/disabled status
        foreach ($request->holidays as $holiday) {
            EmployeeGovernmentHoliday::create([
                'employee_id' => $employeeId,
                'company_id' => $companyId,
                'country_code' => $countryCode,
                'year' => $year,
                'holiday_id' => $holiday['holiday_id'],
                'name' => $holiday['name'],
                'start_date' => $holiday['start_date'],
                'end_date' => $holiday['end_date'],
                'total_days' => $holiday['total_days'] ?? 1,
                'is_enabled' => $holiday['is_enabled'],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Employee government holidays saved successfully',
        ]);
    }

    /**
     * Reset employee to default government holidays (remove custom overrides).
     */
    public function resetEmployeeHolidays(Request $request, $employeeId)
    {
        $year = $request->get('year', date('Y'));
        $countryCode = strtoupper($request->get('country_code', 'AE'));
        $companyId = $request->get('company_id');

        $query = EmployeeGovernmentHoliday::where('employee_id', $employeeId)
            ->where('year', $year)
            ->where('country_code', $countryCode);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $query->delete();

        return response()->json([
            'success' => true,
            'message' => 'Reset to default government holidays',
        ]);
    }

    /**
     * Get which employees have custom government holidays.
     * Returns employee_id => enabled count for the given year.
     */
    public function employeesCustomStatus(Request $request)
    {
        $year = $request->get('year', date('Y'));
        $companyId = $request->get('company_id');

        $query = EmployeeGovernmentHoliday::where('year', $year)
            ->selectRaw('employee_id, count(*) as total, sum(case when is_enabled then 1 else 0 end) as enabled_count')
            ->groupBy('employee_id');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $results = $query->get()->keyBy('employee_id');

        return response()->json([
            'success' => true,
            'data' => $results,
        ]);
    }
}
