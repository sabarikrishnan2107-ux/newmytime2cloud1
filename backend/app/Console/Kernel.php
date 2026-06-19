<?php

namespace App\Console;

use App\Models\Company;
use App\Models\PayrollSetting;
use App\Models\ReportNotification;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{

    protected function schedule(Schedule $schedule)
    {
        $month = now()->month;

        $schedule
            ->command("check:mytime2cloud-health")
            ->everyThirtyMinutes()
            ->runInBackground();

        // ----------------------------------- Background Jobs for pdf generation access ------------------------------- //
        // $schedule->command("pdf:access-control-report-generate " . date("Y-m-d", strtotime("yesterday")))->dailyAt('04:35')->runInBackground();
        // ----------------------------------- Background Jobs for pdf generation access ------------------------------- //

        // ----------------------------------- Background Jobs for pdf generation ------------------------------- //

        // $schedule->command("pdf:generate")->monthlyOn(1, '03:35')->runInBackground();

        // $schedule->command("pdf:generate")
        //     ->dailyAt('03:35')
        //     ->when(fn() => now()->day == now()->endOfMonth()->day)
        //     ->runInBackground();

        // ----------------------------------- Background Jobs for pdf generation ------------------------------- //

        // $schedule->command('whatsapp:proxy-health-check')
        //     ->hourly()
        //     ->withoutOverlapping();

        $schedule->command('monitor:system')->dailyAt('08:00');

        $schedule->command('birthday:wish')->dailyAt('00:00');

        $schedule->command('ai:birthday-feed')->dailyAt('00:05')->withoutOverlapping();

        $schedule->command('delete_old_records')->monthlyOn(1, '00:00');

        // Remove walk-in visitors from devices once their allowed time window ends.
        $schedule->command('visitors:expire-device-access')->everyFiveMinutes()->withoutOverlapping();

        $schedule
            ->command('sync_datetime_to_device')
            ->dailyAt('02:45')
            ->runInBackground();

        $schedule
            ->command('employees:process-special-access')
            ->everyFiveMinutes()
            ->runInBackground();

        $schedule
            ->command('attendance:auto-regenerate')
            ->everyMinute()->runInBackground();

        $schedule
            ->command('employees:auto-reactivate')
            ->dailyAt('00:30')
            ->runInBackground();

        $schedule
            ->command('task:sync_attendance_logs')
            ->everyFifteenMinutes()->runInBackground();

  

        $schedule
            ->command('task:sync_alarm_logs')
            ->everyFifteenMinutes()->runInBackground();

        // --------------------Daily Report Generation for automation-------------------- //
        $schedule
            ->command("task:generate_daily_report")
            ->dailyAt('05:00')
            ->runInBackground();
        // --------------------Daily Report Generation for automation-------------------- //

        // (new DeviceController())->deviceAccessControllAllwaysOpen($schedule);

        // $schedule->command('logs:process-gps')->everyMinute();

        $schedule
            ->command('task:update_company_ids')
            ->everyMinute()
            ->runInBackground();

        // $schedule
        //     ->command('attendance:rectify')
        //     ->everyMinute()
        //     ->runInBackground();


        // $schedule->command("render:weekoff --month={$month}")
        //     ->when(fn() => now()->isLastOfMonth())
        //     ->withoutOverlapping();

        // Weekoff rendering — covers ongoing and previous month across all companies.
        // Commands evaluate month/year at runtime inside the command itself.
        $schedule->command("render:weekoff-all " . now()->month . " " . now()->year)
            ->dailyAt('05:15')
            ->withoutOverlapping();

        $schedule->command("render:weekoff-all " . now()->subMonth()->month . " " . now()->subMonth()->year)
            ->monthlyOn(1, '05:45')
            ->withoutOverlapping();

        $schedule
            ->command("alert:offline_device_all")
            ->hourly()
            ->runInBackground();

        $schedule
            ->command("attendance:manual-check")
            ->everyFiveMinutes()
            ->runInBackground();

        $companyIds = Company::pluck("id");

        foreach ($companyIds as $companyId) {

            // AI Streak Commands: late, early, absent
            $schedule->command("ai:check-consecutive-attendanc-issue --company_id={$companyId} --type=late --streak=3")
                ->dailyAt('06:00');
            $schedule->command("ai:check-consecutive-attendanc-issue --company_id={$companyId} --type=early --streak=3")
                ->dailyAt('06:10');
            $schedule->command("ai:check-consecutive-attendanc-issue --company_id={$companyId} --type=absent --streak=3")
                ->dailyAt('06:20');

            $schedule
                ->command("task:sync_attendance_missing_shift_ids {$companyId} " . date("Y-m-d") . "  ")
                ->everyThirtyMinutes()
                ->runInBackground();

            $schedule
                ->command("task:sync_auto_shift $companyId " . date("Y-m-d"))
                ->everyThirtyMinutes()
                ->runInBackground();

            $schedule
                ->command("task:sync_auto_shift $companyId " . date("Y-m-d", strtotime("yesterday")))
                ->hourly()
                ->between('03:00', '10:00')
                ->runInBackground();

            $schedule
                ->command("task:sync_except_auto_shift $companyId " . date("Y-m-d"))
                ->everyThirtyMinutes()
                ->runInBackground();

            $schedule->command("task:sync_multi_shift {$companyId} " . date("Y-m-d"))
                ->everyThirtyMinutes()
                ->between('5:00', '23:59')
                ->runInBackground();

            $schedule->command("task:sync_double_shift {$companyId} " . date("Y-m-d"))
                ->everyThirtyMinutes()
                ->between('5:00', '23:59')
                ->withoutOverlapping()
                ->runInBackground();


            $schedule->command("task:sync_multi_shift_dual_day {$companyId} " . date("Y-m-d", strtotime("yesterday")) . " true")
                // ->everyThirtyMinutes()
                ->dailyAt('5:20')
                ->runInBackground();

            // $schedule->command("task:sync_multishift_includes_two_datesonly")
            //     ->everySixHours()
            //     ->runInBackground();

            // $schedule
            //     ->command("task:sync_multi_shift {$companyId} " . date("Y-m-d", strtotime("yesterday")))
            //     ->dailyAt('3:50')
            //     ->runInBackground();

            $schedule
                ->command("task:sync_visitor_attendance {$companyId} " . date("Y-m-d"))
                ->everyFiveMinutes()
                ->runInBackground();

            $schedule
                ->command("default_attendance_seeder {$companyId}")
                ->monthlyOn(1, "00:00")
                ->runInBackground();

            $schedule
                ->command("alert:access_control {$companyId}")
                ->everyFifteenMinutes()
                ->runInBackground();

            $schedule
                ->command("alert:attendance {$companyId}")
                ->everyFifteenMinutes()
                ->runInBackground();

            $schedule
                ->command("task:sync_leaves $companyId")
                ->dailyAt('01:00');

            $schedule
                ->command("task:sync_holidays $companyId")
                ->dailyAt('01:30');

            $schedule
                ->command("task:sync_monthly_flexible_holidays --company_id=$companyId")
                ->dailyAt('02:00')
                ->runInBackground();

            // $schedule
            //     ->command("task:sync_off $companyId")
            //     ->dailyAt('02:20')
            //     ->runInBackground();

            // $schedule
            //     ->command("task:sync_flexible_off $companyId")
            //     ->dailyAt('04:20')
            //     ->runInBackground();



            $schedule
                ->command("task:sync_visitor_set_expire_dates $companyId")
                ->everyFiveMinutes()
                ->runInBackground();
        }

        $schedule
            ->command("task:files-delete-old-log-files")
            ->dailyAt('23:30')
            ->runInBackground();

        // $schedule->call(function () {
        //     $count = Company::where("is_offline_device_notificaiton_sent", true)->update(["is_offline_device_notificaiton_sent" => false, "offline_notification_last_sent_at" => date('Y-m-d H:i:s')]);
        // })->dailyAt('05:00');
        //->withoutOverlapping();
        $schedule->call(function () {
            exec('chown -R www-data:www-data /var/www/mytime2cloud/backend');
            // Artisan::call('cache:clear');
            // info("Cache cleared successfully at " . date("d-M-y H:i:s"));
        })->hourly();

        $schedule
            ->command('task:render_missing')
            ->dailyAt('02:15');

        $payroll_settings = PayrollSetting::get(["id", "date", "company_id"]);

        foreach ($payroll_settings as $payroll_setting) {

            $payroll_date = (int) (new \DateTime($payroll_setting->date))->modify('-24 hours')->format('d');

            $schedule
                ->command("task:payslip_generation $payroll_setting->company_id")
                ->monthlyOn((int) $payroll_date, "00:00");
        }

        //whatsapp and email notifications
        $models = ReportNotification::where("type", "attendance")
            ->get();

        foreach ($models as $model) {
            $companyId = $model->company_id;
            $schedule
                ->command("task:report_notification_crons $companyId $model->id")
                ->dailyAt($model->time)
                ->runInBackground();
        }

        // Absent alerts
        $absentModels = ReportNotification::where("type", "alert")->get();
        foreach ($absentModels as $model) {
            if ($model->time) {
                $schedule
                    ->command("alert:absents {$model->id} {$model->company_id}")
                    ->dailyAt($model->time)
                    ->runInBackground();
            }
        }

        // Device alerts (offline)
        $deviceModels = ReportNotification::where("type", "device")->get();
        foreach ($deviceModels as $model) {
            if ($model->time) {
                $schedule
                    ->command("alert:offline_device {$model->company_id}")
                    ->dailyAt($model->time)
                    ->runInBackground();
            }
        }
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__ . '/Commands');

        require base_path('routes/console.php');
    }
}
