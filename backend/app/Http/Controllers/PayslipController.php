<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Company;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\Payslips;
use Barryvdh\DomPDF\Facade\Pdf;
use DateTime;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use NumberFormatter;

class PayslipController extends Controller
{
    public function index($department_id, request $request)
    {

        //$request = $request->all();
        $employees = Employee::where("department_id", $department_id)
            ->withOut("schedule")
            ->with("payroll", "designation")
            ->where("company_id", $request->company_id)
            ->get(["id", "employee_id", "display_name", "first_name", "last_name"]);
        $data = [];

        foreach ($employees as $employee) {
            $singleEmployee = $this->renderPayslip($employee, $request);
            $data[] = $singleEmployee;

            $this->renderPdf($singleEmployee, $request);
        }

        return $data;
    }
    public function generateWithDepartmentId(request $request)
    {

        //$request = $request->all();
        $employees = Employee::withOut("schedule")
            ->with("payroll", "designation")
            ->where("company_id", $request->company_id)
            ->when($request->filled('department_id'), function ($q) use ($request) {
                $q->where('department_id', $request->department_id);
            })
            ->get(["id", "employee_id", "display_name", "first_name", "last_name"]);
        $data = [];

        foreach ($employees as $employee) {

            $singleEmployee = $this->renderPayslip($employee, $request);
            $data[] = $singleEmployee;

            $this->renderPdf($singleEmployee, $request);
        }

        return $data;
    }
    public function generateWithCompanyIds($company_Id)
    {
        $request = [
            "year" => date('Y'),
            "month" => date('m') - 1,
            "company_id" => $company_Id,
        ];
        $employees = Employee::withOut("schedule")
            ->with("payroll", "designation")

            ->where("company_id", $request["company_id"])
            ->get(["id", "employee_id", "display_name", "first_name", "last_name"]);
        $data = [];

        foreach ($employees as $employee) {

            $singleEmployee = $this->renderPayslip($employee, $request);

            $data[] = $singleEmployee;

            $this->renderPdf($singleEmployee, $request);
        }

        return $data;
    }
    public function generateWithEmployeeids(request $request)
    {

        // $request = $request->all();

        $employees = Employee::withOut("schedule")
            ->with("payroll", "designation")
            ->wherein("id", $request["employee_ids"])
            ->where("company_id", $request["company_id"])
            ->get(["id", "employee_id", "display_name", "first_name", "last_name"]);

        $data = [];
        foreach ($employees as $employee) {
            $singleEmployee = [];
            try {
                $singleEmployee = $this->renderPayslip($employee, $request);

                $this->renderPdf($singleEmployee, $request);

                if ($this->getPayslipstatus($request["company_id"], $employee->employee_id, $request['month'], $request['year'])) {
                    $singleEmployee['status'] = true;
                    $singleEmployee['status_message'] = $employee->employee_id . ': ' . $employee->first_name . ' ' . $employee->last_name . " - Payslip Generated Successfully";
                } else {
                    $singleEmployee['status'] = false;
                    $singleEmployee['status_message'] = $employee->employee_id . ': ' . $employee->first_name . ' ' . $employee->last_name . " - Salary Details are not available";
                }
            } catch (\Throwable $th) {
                //throw $th;

                $singleEmployee['status'] = false;
                $singleEmployee['status_message'] = $employee->employee_id . ': ' . $employee->first_name . ' ' . $employee->last_name . " -  Salary Details are not available";
            }

            $data[] = $singleEmployee;
        }

        return $data;
    }
    public function getPayslipstatus($company_id, $employee_id, $month, $year)
    {
        $pdfFile_name = 'payslips/' . $company_id . '/' . $company_id . '_' . $employee_id . '_' . $month . '_' . $year . '_payslip.pdf';
        if (Storage::disk('local')->exists($pdfFile_name)) {
            return true;
        } else {
            return false;
        }
    }
    public function downloadAllPayslipszip(request $request)
    {

        // $request = $request->all();

        $company_Id = $request->company_id;
        $month = $request->month;
        $year = $request->year;
        $employee_ids = explode(',', $request->employee_ids);

        $zip_file = 'payslips_' . $month . '_' . $year . ' .zip'; // Name of our archive to download
        $results = [];
        // Initializing PHP class
        $zip = new \ZipArchive();
        $zip->open($zip_file, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        foreach ($employee_ids as $employee_id) {
            $invoice_file = 'app/payslips/' . $company_Id . '/' . $company_Id . '_' . $employee_id . '_' . $month . '_' . $year . '_payslip.pdf';
            $invoice_file1 = 'payslips/' . $company_Id . '/' . $company_Id . '_' . $employee_id . '_' . $month . '_' . $year . '_payslip.pdf';

            if (Storage::disk('local')->exists($invoice_file1)) {

                $results[] = $invoice_file;
                // Adding file: second parameter is what will the path inside of the archive
                // So it will create another folder called "storage/" inside ZIP, and put the file there.
                $zip->addFile(storage_path($invoice_file), $invoice_file);
            }
        }

        $zip->close();

        // We return the file immediately after download
        return response()->download($zip_file);
    }
    public function renderPayslip($employee, $request)
    {



        if (!$employee->payroll) {

            $payroll['status'] = false;
            $payroll['status_message'] = $employee->employee_id . ': ' . $employee->display_name . " - Salary Details are not available";
        }
        $payroll = [];

        try {
            //code...
            $company_id = $employee->payroll->company_id;
            $employee_id = $employee->employee_id;
            $month = $request['month']; // date('m');
            $dateObj = DateTime::createFromFormat('!m', $month);
            $monthName = $dateObj->format('F'); // March

            $year = $request['year']; //date('Y');
            $attendances = Attendance::where(["company_id" => $company_id, "employee_id" => $employee_id])
                ->whereMonth('date', '=', $month)
                ->whereIn('status', ['P', 'A'])
                ->get();

            $present = $attendances->where('status', 'P')->count();
            $absent = $attendances->where('status', 'A')->count();
            // $present = 29;
            // $absent = 1;
            $payroll = $employee->payroll;
            $payroll->payslip_number = "#" . $employee_id . (int) date("m") - 1 . (int) date("y");
            $salary_type = $payroll->payroll_formula->salary_type;
            $payroll->salary_type = ucwords(str_replace("_", " ", $salary_type));

            $salary_type = $payroll->payroll_formula->salary_type;
            $payroll->SELECTEDSALARY = $salary_type == "basic_salary" ? $payroll->basic_salary : $payroll->net_salary;

            $payroll->perDaySalary = $this->getPerDaySalary($payroll->SELECTEDSALARY ?? 0);
            $payroll->perHourSalary = $this->getPerHourSalary($payroll->perDaySalary ?? 0);

            $payroll->earnedSalary = $present * $payroll->perDaySalary;
            $payroll->deductedSalary = $absent * $payroll->perDaySalary;
            $payroll->earningsCount = $payroll->net_salary - $payroll->basic_salary;

            $extraEarnings = [
                "label" => "Basic",
                "value" => $payroll->basic_salary,
            ];

            $payroll->earnings = array_merge([$extraEarnings], $payroll->earnings);

            $payroll->deductions = [
                [
                    "label" => "Abents",
                    "value" => $payroll->deductedSalary,
                ],
            ];

            $payroll->earnedSubTotal = ($payroll->earningsCount) + ($payroll->earnedSalary);
            $payroll->salary_and_earnings = ($payroll->earningsCount) + ($payroll->SELECTEDSALARY);

            $payroll->finalSalary = ($payroll->salary_and_earnings) - $payroll->deductedSalary;

            $payroll->monthName = $monthName;
            $payroll->month = $month;
            $payroll->year = $year;
            $payroll->date = date('j F Y');
            $payroll->presentDays = $present;
            $payroll->absentDays = $absent;
            $payroll['employee_table_id'] = $employee->id;
            $payroll['employee_id'] = $employee->employee_id;
            $payroll['display_name'] = $employee->display_name;
            $payroll['first_name'] = $employee->first_name;
            $payroll['last_name'] = $employee->last_name;
            $payroll['position'] = $employee->designation->name;

            $payroll['status'] = true;
            $payroll['status_message'] = $employee->employee_id . ': ' . $employee->display_name . " - Payslip Generated Successfully";
            //company details

            $payslips = [
                'company_id' => $employee->payroll->company_id,
                'employee_id' => $employee->employee_id,
                'employee_table_id' => $employee->id,
                'month' => $month,
                'year' => $year,
                'basic_salary' => $payroll->basic_salary,
                'net_salary' => $payroll->net_salary,
                'final_salary' => $payroll->finalSalary
            ];




            Payslips::updateOrCreate([
                'company_id' => $employee->payroll->company_id,
                'employee_id' => $employee->employee_id,
                'employee_table_id' => $employee->id,
                'month' => $month,
                'year' => $year,
            ], $payslips);


            $payroll->company = Company::where('id', $employee->payroll->company_id)->first();
        } catch (\Throwable $th) {
            //throw $th;
            $payroll['status'] = false;
            $payroll['status_message'] = $employee->employee_id . ': ' . $employee->display_name . " - Salary Details are not available";
        }
        return $payroll;
    }

    public function show(Request $request, $id)
    {
        // return $this->generateWithEmployeeids($request);
        //code...

        $Payroll = Payroll::where(["employee_id" => $id])->with(["company", "payroll_formula"])
            ->with(["employee" => function ($q) {
                $q->withOut(["user", "schedule"]);
            }])
            ->first(["basic_salary", "net_salary", "earnings", "employee_id", "company_id"]);
        $Payroll->payslip_number = "#" . $id . (int) date("m") - 1 . (int) date("y");


        //$days_countdate = DateTime::createFromFormat('Y-m-d', date('y') . '-' . date('m') . '-01');
        $days_countdate = DateTime::createFromFormat('Y-m-d', $request->year . '-' . $request->month  . '-01');
        $Payroll->total_month_days = $days_countdate->format('t');

        $salary_type = $Payroll->payroll_formula->salary_type ?? "basic_salary";

        $Payroll->salary_type = ucwords(str_replace("_", " ", $salary_type));
        $Payroll->date = date('j F Y');

        $Payroll->SELECTEDSALARY = $salary_type == "basic_salary" ? $Payroll->basic_salary : $Payroll->net_salary;

        $Payroll->perDaySalary = $this->getPerDaySalary($Payroll->SELECTEDSALARY ?? 0);
        $Payroll->perHourSalary = $this->getPerHourSalary($Payroll->perDaySalary ?? 0);

        $conditions = ["company_id" => $request->company_id, "employee_id" => $Payroll->employee->system_user_id];

        $attendances = Attendance::where($conditions)
            ->whereMonth('date', '=', $request->month <= 9 ? "0" . $request->month : date("m"))
            ->whereIn('status', ['P', 'A', 'M', 'O', "LC", "EG"])
            ->get();

        $Payroll->present = $attendances->where('status', 'P')->count();
        $Payroll->absent = $attendances->where('status', 'A')->count();
        $Payroll->missing = $attendances->where('status', 'M')->count();
        $Payroll->off = $attendances->where('status', 'O')->count();

        $Payroll->late_coming = $attendances->where('status', 'LC')->count();
        $Payroll->early_going = $attendances->where('status', 'EG')->count();

        $Payroll->earnedSalary = ($Payroll->present + $Payroll->off) * $Payroll->perDaySalary;

        $Payroll->deductedSalary = round($Payroll->absent * $Payroll->perDaySalary);

        $Payroll->earningsCount = $Payroll->net_salary - $Payroll->basic_salary;

        //OT calculations
        $OTHours = 0;
        $totalOTMinutes = 0;
        $OTSalary = 0;
        foreach ($attendances as $attendance) {

            $OT =  $attendance->ot;
            if ($OT != '---') {
                list($hours, $minutes) = explode(':', $OT);
                $totalOTMinutes = $totalOTMinutes + ($hours * 60 + $minutes);
            }
        }
        if ($totalOTMinutes > 0) {
            $OTHours = round($totalOTMinutes / 60);
        }
        if ($OTHours > 0) {
            $OTSalary = round($Payroll->perHourSalary * $OTHours);
        }

        //--------------------------
        $OTSalaryEarning = [
            "label" => "OT",
            "value" => $OTSalary,
        ];
        $extraEarnings = [
            "label" => "Basic",
            "value" => $Payroll->SELECTEDSALARY,
        ];

        $Earnings = array_merge($Payroll->earnings, [$OTSalaryEarning]);

        $Payroll->earnings = array_merge([$extraEarnings], $Earnings);

        $Payroll->deductions = [
            [
                "label" => "Abents",
                "value" => round($Payroll->deductedSalary),
            ],
        ];

        $Payroll->earnedSubTotal = round(($Payroll->earningsCount) + ($Payroll->earnedSalary) + $OTSalary);


        if ($Payroll->earningsCount > 0) {
            $Payroll->salary_and_earnings = round(($Payroll->earningsCount) + ($Payroll->SELECTEDSALARY) + $OTSalary);
        } else {
            $Payroll->salary_and_earnings = round(($Payroll->earningsCount) + $OTSalary);
        }


        $Payroll->finalSalary = round(($Payroll->salary_and_earnings) - $Payroll->deductedSalary);

        $formatter = new NumberFormatter('en_US', NumberFormatter::SPELLOUT);
        $Payroll->final_salary_in_words  = ucfirst($formatter->format(round($Payroll->finalSalary)));
        $Payroll->payslip_month_year = $days_countdate->format('F Y');


        return $Payroll;
    }

    public function getPerHourSalary($perDaySalary)
    {
        return number_format($perDaySalary / 8, 2);
    }
    public function getPerDaySalary($salary)
    {
        return number_format($salary / 30, 2);
    }

    public function renderFakeData($company_id, $id)
    {
        $arr = [
            [
                "date" => date("Y-m-01"),
                "status" => "P",
                "employee_id" => $id,
                "company_id" => $company_id,
            ],
            [
                "date" => date("Y-m-02"),
                "status" => "P",
                "employee_id" => $id,
                "company_id" => $company_id,
            ],
            [
                "date" => date("Y-m-03"),
                "status" => "A",
                "employee_id" => $id,
                "company_id" => $company_id,
            ],
            [
                "date" => date("Y-m-04"),
                "status" => "P",
                "employee_id" => $id,
                "company_id" => $company_id,
            ],

        ];

        return Attendance::insert($arr);
    }

    public function renderPdf($data, $request)
    {

        if ($data && isset($data['employee_id'])) {

            $pdf = Pdf::loadView('pdf.payslip', compact("data"))->output();

            $pdfFile_name = 'payslips/' . $request["company_id"] . '/' . $request["company_id"] . '_' . $data->employee_id . '_' . $request["month"] . '_' . $request["year"] . '_payslip.pdf';
            Storage::disk('local')->put($pdfFile_name, $pdf);

            return $data;
        } else {
            return $data;
        }
    }

    public function downloadPayslipPdf(request $request)
    {
        $pdfFile_name = 'payslips/' . $request["company_id"] . '/' . $request["company_id"] . '_' . $request["employee_id"] . '_' . $request["month"] . '_' . $request["year"] . '_payslip.pdf';

        return Storage::download($pdfFile_name);
    }

    public function renderPayslipByEmployee(Request $request)
    {
        $id = $request->employee_id;


        // $data = $this->show($request, $request->employee_id);

        $Payroll = Payroll::where(["employee_id" => $id])
            ->with(["company", "payroll_formula"])
            ->with(["employee" => function ($q) {
                $q->withOut(["user", "schedule"]);
            }])
            ->first(["basic_salary", "net_salary", "earnings", "employee_id", "company_id"]);

        if (!$Payroll) {
            return "No Data Found";
        }


        $Payroll->payslip_number = "#" . $id . (int) date("m") - 1 . (int) date("y");

        $days_countdate = DateTime::createFromFormat('Y-m-d', $request->year . '-' . $request->month  . '-01');

        $Payroll->total_month_days = $days_countdate->format('t');

        $salary_type = $Payroll->payroll_formula->salary_type ?? "basic_salary";

        $Payroll->salary_type = ucwords(str_replace("_", " ", $salary_type));

        $Payroll->date = date('j F Y');

        $Payroll->SELECTEDSALARY = $salary_type == "basic_salary" ? $Payroll->basic_salary : $Payroll->net_salary;
        $Payroll->perDaySalary = number_format($Payroll->SELECTEDSALARY / $Payroll->total_month_days, 2);
        info('Per Day Salary:', ['perDaySalary' => $Payroll->perDaySalary]);
        $Payroll->perHourSalary = number_format($Payroll->perDaySalary / 8, 2);
        info('Per Hour Salary:', ['perHourSalary' => $Payroll->perHourSalary]);

        $conditions = [
            "company_id" => $request->company_id,
            "employee_id" => $Payroll->employee->system_user_id
        ];

        $month = str_pad($request->month, 2, "0", STR_PAD_LEFT);

        $year = $request->year;

        $allStatuses = ['P', 'A', 'M', 'O', 'LC', 'EG'];

        $attendances = Attendance::where($conditions)
            ->whereMonth('date', $month)  // Filter by month
            ->whereYear('date', $year)          // Filter by year
            ->whereIn('status', $allStatuses)
            ->orderBy("date", "asc")
            ->get();

        // filter $attendances based on this (late_coming) column which are not equals to ---

        $otherCalculations = $attendances;

        $lateHours = $otherCalculations->filter(function ($attendance) {
            return $attendance->late_coming !== '---';
        })->pluck('late_coming')->toArray();

        $earlyHours = $otherCalculations->filter(function ($attendance) {
            return $attendance->early_going !== '---'; // Exclude records where 'late_coming' is '---'
        })->pluck('early_going')->toArray();

        $otHours = $otherCalculations->filter(function ($attendance) {
            return $attendance->ot !== '---'; // Exclude records where 'late_coming' is '---'
        })->pluck('ot')->toArray();

        $Payroll->lateHours = $this->calculateHoursAndMinutes($lateHours);
        $Payroll->earlyHours = $this->calculateHoursAndMinutes($earlyHours);
        $Payroll->otHours = $this->calculateHoursAndMinutes($otHours);
        $shortHours = array_merge($lateHours, $earlyHours);
        $Payroll->combimedShortHours = $this->calculateHoursAndMinutes($shortHours);
        $totalMinutes = $Payroll->combimedShortHours;
        $totalHours = $Payroll->combimedShortHours["hours"] ?? 0; // Calculate total hours
        $remainingMinutes = $Payroll->combimedShortHours["minutes"] ?? "00:00"; // Calculate remaining minutes
        $decimalHours = $totalHours + ($remainingMinutes / 60);
        $rate = $Payroll->perHourSalary;
        $shortHours = $decimalHours * $rate * $Payroll->payroll_formula->deduction_value;

        $grouByStatus = $attendances
            ->groupBy('status')  // Group by 'status'
            ->map(fn($group) => $group->count())  // Count each group by status
            ->toArray();

        $attendanceCounts = array_merge(array_fill_keys($allStatuses, 0), $grouByStatus);

        $Payroll->present = array_sum([
            $attendanceCounts["P"],
            $attendanceCounts["LC"],
            $attendanceCounts["EG"],
        ]);

        $Payroll->absent = array_sum([
            $attendanceCounts["A"],
            $attendanceCounts["M"]
        ]);

        $Payroll->week_off = $attendanceCounts["O"];

        $Payroll->earnedSalary =    round(($Payroll->present + $Payroll->week_off) * $Payroll->perDaySalary);

        $Payroll->deductedSalary =  round($Payroll->absent * $Payroll->perDaySalary);

        $OTHours = $Payroll->otHours["hours"];

        $totalOTMinutes = $Payroll->otHours["minutes"];

        $OTEarning = $Payroll->perHourSalary * $OTHours * $Payroll->payroll_formula->ot_value;

        $Payroll->earnings = array_merge(
            [
                [
                    "label" => "Basic",
                    "value" => (int) $Payroll->SELECTEDSALARY,
                ],
                [
                    "label" => "OT",
                    "value" => $OTEarning,
                ],

            ],
            $Payroll->earnings,
        );

        $Payroll->deductions = [
            [
                "label" => "Abents",
                "value" => $Payroll->deductedSalary,
            ],
            [
                "label" => "Short Hours",
                "value" => $shortHours,
            ],
        ];

        $Payroll->totalDeductions = ($Payroll->deductedSalary + $shortHours);

        $Payroll->salary_and_earnings = array_sum(array_column($Payroll->earnings, "value"));

        if ($Payroll->present == 0) {
            $Payroll->salary_and_earnings = 0;
        }

        $Payroll->finalSalary = (($Payroll->salary_and_earnings) - $Payroll->totalDeductions);

        $formatter = new NumberFormatter('en_US', NumberFormatter::SPELLOUT);
        $Payroll->final_salary_in_words  = ucfirst($formatter->format(($Payroll->finalSalary)));
        $Payroll->payslip_month_year = $days_countdate->format('F Y');

        $data = $Payroll;

        $data->month = date('F', mktime(0, 0, 0, $request->month, 1));

        $data->year = $request->year;

        return  Pdf::loadView('pdf.payslip', compact('data'))->setPaper('A4', 'portrait')->stream();
        $fileName = $data->payslip_number . '_' . $data->employee->first_name . '_' . $data->employee->last_name . '_' . $data->employee->employee_id . '_' . $data->payslip_month_year . '.pdf';
        return Pdf::loadView('pdf.payslip', compact('data'))->setPaper('A4', 'portrait')->download($fileName);
    }


    public function calculateHoursAndMinutes(array $timeStrings): array
    {
        $totalMinutes = array_reduce($timeStrings, function ($carry, $time) {
            // Ensure the time is in the correct format
            if (preg_match('/^\d{1,2}:\d{2}$/', $time)) {
                list($hours, $minutes) = explode(':', $time);
                return $carry + ($hours * 60) + $minutes; // Convert to total minutes
            }

            throw new \InvalidArgumentException("Invalid time format: {$time}. Expected 'hh:mm'.");
        }, 0);

        $hours = intdiv($totalMinutes, 60);
        $minutes = $totalMinutes % 60;

        return [
            "hours" => $hours,
            "minutes" => $minutes,
            "hm" => sprintf("%02d:%02d", $hours, $minutes), // Format as 'hh:mm'
        ];
    }
}
