<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;

class SyncMultiShiftDualDayJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $companyId;
    public $date;
    public $flag;
    public $UserID;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($companyId, $date, $flag, $UserID)
    {
        $this->companyId = $companyId;
        $this->date = $date;
        $this->flag = $flag;
        $this->UserID = $UserID;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $payload = [
            'company_id' => $this->companyId,
            'date' => $this->date,
            'checked' => $this->flag,
        ];

        if ($this->UserID) {
            $payload["UserID"] = $this->UserID;
        }
        Artisan::call('task:sync_multi_shift_dual_day', $payload);
    }
}
