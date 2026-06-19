<?php

namespace App\Console\Commands;

use App\Http\Controllers\SDKController;
use App\Models\AccessControlTimeSlot;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class AccessControlTimeSlots extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:AccessControlTimeSlots {device_id} {sdkCommand}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'AccessControlTimeSlots device_id command';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $id = $this->argument("device_id");
        $command = $this->argument("sdkCommand");


        $result = (new SDKController)->handleCommand($id, $command);

        $date = date("Y-m-d");
        $file_name_raw = "kernal_logs/$date-device-$command-access.log";
        Storage::append($file_name_raw,  date("d-m-Y H:i:s") . '_door_$command_logs' . '-' . $command . '-' . json_encode($result));


        return $this->info($result);
    }
}
