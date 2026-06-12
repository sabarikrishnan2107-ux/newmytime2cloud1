<?php

namespace App\Console\Commands\Automation\Alerts;

use App\Http\Controllers\WhatsappController;
use App\Mail\AdminAlertAbsent;
use App\Mail\EmployeeAlertAbsent;
use App\Models\Employee;
use App\Models\ReportNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log as Logger;


class AlertAbsents extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'alert:absents {id} {company_id}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     *
     * @return int
     */

    public function handle()
    {
        $todayDate = date("D, F j, Y");

        // (new WhatsappController)->sendMessage("hi", "971554501483");
        // return;

        // Mail::to("francisgill1000@gmail.com")->queue(new EmployeeAlertAbsent($todayDate, "francis"));
        // $this->info("mail sent");
        // return;

        $id = $this->argument("id");
        $company_id = $this->argument("company_id");

        $absentEmployees = Employee::where("company_id", $company_id)
            ->whereHas("today_absent")
            ->whereNotNull("whatsapp_number")
            ->whereNotNull("local_email")
            ->get(["id", "first_name", "last_name", "whatsapp_number", "local_email", "system_user_id"]);

        $script_name = "Alert Absents";

        $date = date("Y-m-d H:i:s");

        try {

            $model = ReportNotification::where("type", "alert")
                ->with(["company.company_mail_content"])
                ->with("managers", function ($query) use ($company_id) {
                    $query->where("company_id", $company_id);
                })
                ->where("id", $id)
                ->first();

            if (in_array("Email", $model->mediums ?? [])) {
                Mail::to($model->managers->pluck("email") ?? [])->queue(new AdminAlertAbsent($todayDate, $absentEmployees));
            }

            foreach ($absentEmployees as $key => $absentEmployee) {

                $employeeName =  $absentEmployee->first_name;

                if (in_array("Email", $model->mediums ?? [])) {
                    Mail::to($absentEmployee->local_email)->queue(new EmployeeAlertAbsent($todayDate, $absentEmployee->first_name));
                }

                if (in_array("Whatsapp", $model->mediums ?? [])) {

                    $adminName = "Admin";
                    $systemName = "MyTime2@Cloud";

                    $message = "Subject: System Notification: Absent Employees Update\n\n";
                    $message .= "Dear $adminName,\n\n";
                    $message .= "This is an automated message to inform you that a total of " . count($absentEmployees) . " employees were absent today ($todayDate).\n\n";

                    $message .= "Employee List:\n\n";

                    $message .= ++$key . ". " . $absentEmployee->first_name . " " . $absentEmployee->last_name . " (" . $absentEmployee->system_user_id . ")" . "\n";
                    $message .= "Thank you,\n$systemName";


                    $employeeName =  $absentEmployee->first_name;
                    $employeeMessage = "Hi $employeeName,\n\n";
                    $employeeMessage .= "";
                    $employeeMessage .= "We noticed that you were absent today ($todayDate). If there's a valid reason for your absence, please let us know.\n\n";
                    $employeeMessage .= "Thank you,\n" . "Admin";

                    foreach ($model->managers as $manager) {
                        (new WhatsappController)->sendMessage($message, $manager->whatsapp_number);
                    }
                    (new WhatsappController)->sendMessage($employeeMessage, $absentEmployee->whatsapp_number);
                }

                echo "[" . $date . "] Cron: $script_name. Report Notification Crons has been sent.\n";
            }
        } catch (\Exception $e) {

            $this->info($e->getMessage());
            Logger::error("Cron: $script_name. Error Details: " . $e->getMessage());
            return;
        }
    }
}
