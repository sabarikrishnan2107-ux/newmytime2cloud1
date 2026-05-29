<?php

namespace App\Console\Commands;

use App\Models\Employee;
use Illuminate\Console\Command;

class AutoReactivateEmployees extends Command
{
    protected $signature = 'employees:auto-reactivate';
    protected $description = 'Flip non-active employees back to active when their inactive_to date has passed.';

    public function handle(): int
    {
        $today = now()->toDateString();

        $count = Employee::query()
            ->where('is_active', false)
            ->whereNotNull('inactive_to')
            ->where('inactive_to', '<', $today)
            ->update([
                'is_active'             => true,
                'inactive_reason_type'  => null,
                'inactive_reason_note'  => null,
                'inactive_from'         => null,
                'inactive_to'           => null,
            ]);

        $this->info("Reactivated {$count} employee(s).");
        return self::SUCCESS;
    }
}
