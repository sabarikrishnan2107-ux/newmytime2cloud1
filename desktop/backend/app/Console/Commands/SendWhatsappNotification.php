<?php

namespace App\Console\Commands;

use App\Http\Controllers\AbsentController;
use App\Http\Controllers\WhatsappController;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;

class SendWhatsappNotification extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:send_whatsapp_notification {id}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send Whatsapp Notification';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $id = $this->argument('id');

        try {
            (new WhatsappController)->prepareSummary($id);
        } catch (\Throwable $th) {
            info($th);
            // Logger::channel("custom")->error('Cron: Send Whatsapp Notification. Error Details: ' . $th);
            // echo "[" . date("Y-m-d H:i:s") . "] Cron: Send Whatsapp Notification. Error occurred while inserting logs.\n";
        }
    }
}
