<?php
namespace App\Console\Commands;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateAttendanceReportPDF;
use App\Models\Company;
use App\Models\Employee;
use Illuminate\Console\Command;

class pdfGenerate extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pdf:generate {from_date?} {to_date?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'pdf:generate';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {

        $fromDate = $this->argument("from_date") ?? date("Y-m-01");
        $toDate   = $this->argument("to_date") ?? date("Y-m-t");

        $companyIds = Company::pluck("id");

        $this->info("Total " . count($companyIds) . "companies found");

        foreach ($companyIds as $companyId) {

            $requestPayload = [
                'company_id'  => $companyId,
                'status'      => "-1",
                'status_slug' => (new Controller)->getStatusSlug("-1"),
                'from_date'   => $fromDate,
                'to_date'     => $toDate,
            ];

            $this->processReportForCompany($requestPayload);
        }

    }

    private function processReportForCompany($requestPayload)
    {
        $companyId = $requestPayload["company_id"];

        $company = Company::whereId($companyId)
            ->with('contact:id,company_id,number')
            ->first(["logo", "name", "company_code", "location", "p_o_box_no", "id"]);

        // Count total employees for this company
        $totalEmployees = Employee::where('company_id', $companyId)->count();
        $this->info("Total employees for company $companyId: $totalEmployees");

        Employee::with(["schedule" => function ($q) use ($companyId) {
            $q->where("company_id", $companyId)
                ->select("id", "shift_id", "shift_type_id", "company_id", "employee_id")
                ->withOut(["shift", "shift_type"]);
        }])
            ->withOut(["branch", "designation", "sub_department", "user"])
            ->where("company_id", $companyId)
            ->chunk(50, function ($employees) use ($company, $requestPayload) {
                foreach ($employees as $employee) {
                    GenerateAttendanceReportPDF::dispatch(
                        $employee->system_user_id,
                        $company,
                        $employee,
                        $requestPayload,
                        $employee->schedule->shift_type_id
                    );

                    // $this->info("[$processed] Employee processed: {$employee->full_name}");
                }

                gc_collect_cycles();
            });

    }
}
