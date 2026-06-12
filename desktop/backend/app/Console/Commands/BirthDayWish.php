<?php

namespace App\Console\Commands;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsappMessageJob;
use App\Models\EmiratesInfo;
use Illuminate\Console\Command;
use App\Models\Employee;
use Carbon\Carbon;

class BirthDayWish extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'birthday:wish';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send birthday wishes to employees with WhatsApp numbers';

    /**
     * Execute the console command.
     */
    public function handle()
    {

        $logger = new Controller;

        $logFilePath = 'logs/whatsapp/birthday_wish';

        $logger->logOutPut($logFilePath, "*****Cron started for birthday:wish *****");

        $today = Carbon::now()->format('m-d');

        $employees = Employee::whereNotNull('whatsapp_number')
            ->where('whatsapp_number', 'like', '971%')
            ->whereHas("emirate", function ($q) use ($today) {
                $q->whereRaw("TO_CHAR(date_of_birth, 'MM-DD') = ?", [$today]);
            })
            ->get(['first_name', 'whatsapp_number']);

        if (!count($employees)) {
            $this->info('No birthdays today.');
            return;
        }

        foreach ($employees as $employee) {


            $message = $this->prepareMessage($employee->first_name);

            SendWhatsappMessageJob::dispatch(
                $employee->whatsapp_number,
                $message,
                0,
                "client_id_1743854058940",
                $logFilePath
            );

            $logger->logOutPut($logFilePath, $message);

            $this->info($message);
        }

        $logger->logOutPut($logFilePath, "*****Cron ended for birthday:wish *****");
    }

    function prepareMessage($name)
    {
        return "🎉 Happy Birthday, $name! 🎂\n\n"
            . "Wishing you a day filled with happiness, laughter, and all the things you love the most!\n"
            . "May this year bring you success, good health, and countless joyful moments.\n\n"
            . "Enjoy your special day! 🥳\n"
            . "Regards, Mytime2Cloud";
    }
}
