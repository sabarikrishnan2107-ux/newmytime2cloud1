<?php

namespace App\Helpers;

class BenchmarkHelper
{
    // Example User:
    // $benchmark = BenchmarkHelper::measure(fn() => DB::table($table)->count());
    // $this->info("Table: $table, Row Count: {$benchmark['result']}");
    // $this->info("Execution Time: {$benchmark['execution_time']} sec");
    // $this->info("Memory Used: {$benchmark['memory_used']}");

    public static function measure(callable $callback)
    {
        $startTime = microtime(true);
        $startMemory = memory_get_usage();

        $result = $callback();

        $executionTime = microtime(true) - $startTime;
        $endMemory = memory_get_usage();
        $memoryUsed = $endMemory - $startMemory;

        return [
            'execution_time' => $executionTime,
            'memory_used' => number_format($memoryUsed / 1024, 2) . ' KB',
            'result' => $result,
        ];
    }
}
