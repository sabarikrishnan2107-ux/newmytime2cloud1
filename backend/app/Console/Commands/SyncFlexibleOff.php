<?php

namespace App\Console\Commands;

use App\Http\Controllers\Shift\RenderController;
use App\Models\Attendance;
use DateTime;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log as Logger;

class SyncFlexibleOff extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_flexible_off {id} {ask?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Off';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $ask = $this->argument('ask');

        $daysAgo = 1;

        if ($ask) {
            $daysAgo = $this->ask("daysAgo", $daysAgo);
        }

        try {
            $id = $this->argument('id');

            $date = date('Y-m-d', strtotime("-{$daysAgo} day"));

            // $result = Attendance::where("date", $date)->where("employee_id", "24007")->update(["status" => "A"]);
            // return $result;
            // if ($ask) {
            //     $this->info($result ? "record has been updated. you can close the window" : "Server Error");
            //     while (true) {};
            // }


            $UserIds = $this->renderOffScript($id, $date);

            if ($ask) {
                $this->info(count($UserIds) > 0 ? "Records has been updated. you can close the window" : "Server Error");
                while (true) {};
            }

            echo json_encode($UserIds, JSON_PRETTY_PRINT);
        } catch (\Throwable $th) {
            echo "[" . date("Y-m-d H:i:s") . "] Cron: SyncOff. Error occurred while inserting logs.\n";
            Logger::channel("custom")->error('Cron: SyncOff. Error Details: ' . $th);
        }
    }

    public function renderOffScript($company_id, $date, $user_id = 0)
    {
        try {
            $employees_absent = Attendance::query();

            $employees_absent = $employees_absent->with(["schedule" => function ($q) use ($company_id, $date) {
                $q->where("company_id",  $company_id);
                $q->where("from_date", "<=", $date);
                $q->where("to_date", ">=", $date);
                $q->withOut("shift_type");
                $q->whereHas('shift', fn(Builder $query) =>  $query->where("from_date", "<=", $date));
                $q->whereHas('shift', fn(Builder $query) =>  $query->where("to_date", ">=", $date));


                $q->orderBy("to_date", "asc");
            }])->where("company_id", $company_id)->where("date", $date)->get();

            $records = [];

            foreach ($employees_absent as $employee) {
                $data = null;

                //$records[] = null; // $employee->schedule;
                $weekend1 = "";
                $weekend2 = "";
                if ($employee->schedule != null) {
                    if ($employee->schedule->shift != null) {

                        $weekend1  = $employee->schedule->shift->weekend1;
                        $weekend2  = $employee->schedule->shift->weekend2;
                    }
                    $weekStart = date('Y-m-d', strtotime('this week', strtotime($date)));
                    $weekEnd = date('Y-m-d', strtotime('next week', strtotime($date)));

                    $maximum_weekends = 0;
                    if ($weekend1 == 'Not Applicable' && $weekend2 != 'Not Applicable') {
                        $maximum_weekends = 1;
                    } else if ($weekend1 != 'Not Applicable' && $weekend2 == 'Not Applicable') {
                        $maximum_weekends = 1;
                    } else  if ($weekend1 != 'Not Applicable' && $weekend2 != 'Not Applicable') {
                        $maximum_weekends = 2;
                    }
                    if ($maximum_weekends) {

                        $employees_current_week_off_count = Attendance::where("company_id", $company_id)->where("employee_id", $employee->employee_id)
                            ->where("date", ">=", $weekStart)->where("date", "<=", $weekEnd)->where("status", "O")->count();

                        if ($maximum_weekends - $employees_current_week_off_count > 0) {
                            if (
                                $weekend1 == date('l', strtotime($date))
                                || $weekend2 == date('l', strtotime($date))
                                || $weekend1 == 'Flexi'
                                || $weekend2 == 'Flexi'
                            ) {
                                $data = [
                                    "company_id" => $company_id,
                                    "date" => $date,
                                    "status" => "O",
                                    "employee_id" => $employee->employee_id,
                                    "shift_id" => $employee->shift_id,
                                    "shift_type_id" => $employee->shift_type_id,
                                    "created_at"    => date('Y-m-d H:i:s'),
                                    "updated_at"    => date('Y-m-d H:i:s'),
                                    "updated_func" => "Final-renderOffScript"
                                ];
                            }
                        }
                    } //week off applied 

                    //verify monthly flexible off off 

                    $monthly_flexi_holidays  = $employee->schedule->shift->monthly_flexi_holidays;
                    if ($monthly_flexi_holidays != 'Not Applicable') {

                        $dateTime = new DateTime($date);

                        $MonthstartDate = $dateTime->modify('first day of this month')->format('Y-m-d');
                        $MonthendDate = $dateTime->modify('last day of this month')->format('Y-m-d');



                        $employees_current_month_off_count = Attendance::where("company_id", $company_id)->where("employee_id", $employee->employee_id)
                            ->where("date", ">=", $MonthstartDate)->where("date", "<=", $MonthendDate)->where("status", "O")->count();

                        if ($monthly_flexi_holidays - $employees_current_month_off_count > 0) {

                            $data = [
                                "company_id" => $company_id,
                                "date" => $date,
                                "status" => "O",
                                "employee_id" => $employee->employee_id,
                                "shift_id" => $employee->shift_id,
                                "shift_type_id" => $employee->shift_type_id,
                                "created_at"    => date('Y-m-d H:i:s'),
                                "updated_at"    => date('Y-m-d H:i:s'),
                                "updated_func" => "Final-renderOffScript Monthly"
                            ];
                        }
                    }
                }

                if ($data)
                    $records[] = $data;
            }


            $UserIds = array_column($records, "employee_id");


            if (count($records) > 0) {

                $model = Attendance::query();
                // $model->where("shift_id", -1);
                $model->where("company_id", $company_id);
                $model->where("date", $date);

                $model->whereIn("employee_id", $UserIds);
                $model->when($user_id, function ($q) use ($user_id) {
                    return $q->where("employee_id", $user_id);
                });

                $model->delete();

                Attendance::insert($records);
            }
            $UserIds = array_column($records, "employee_id");

            return $UserIds;
        } catch (\Exception $e) {
            return false;
        }
    }
}
