<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SimulateWeekOff extends Command
{
    protected $signature = 'simulate:weekoff';
    protected $description = 'Simulate monthly weekoff calculation based on 7-day present rule';

    public function handle()
    {
        $this->info("=== MONTHLY WEEKOFF SIMULATION START ===");

        // Assume total days in month
        $totalDays = 31;
        $weekDays = 6;

        // Test different present counts
        $presentOptions = range(0, 31); // Presents from 0 to 31

        $rows = []; // table rows

        foreach ($presentOptions as $totalPresents) {
            // Calculate weekoffs: 1 weekoff per 7 presents
            $weekoffs = intdiv($totalPresents, $weekDays);

            // Absents = remaining days
            $absents = $totalDays - $totalPresents - $weekoffs;
            $absents = max(0, $absents);

            $rows[] = [
                'Presents' => $totalPresents,
                'WeekOffs (O)' => $weekoffs,
                'Absents (A)' => $absents,
            ];

            // $this->info("Presents: $totalPresents | Weekoffs (O): $weekoffs | Absents: $absents");
        }

        $this->table(
            ['Presents', 'WeekOffs (O)', 'Absents (A)'],
            $rows
        );

        $this->info("\n=== SIMULATION COMPLETE ===");

        return Command::SUCCESS;
    }
}
