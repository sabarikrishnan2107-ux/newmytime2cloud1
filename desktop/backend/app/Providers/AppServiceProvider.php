<?php

namespace App\Providers;

use App\Models\AttendanceLog;
use App\Observers\AttendanceLogObserver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        // Auto-recalculate attendance when any new log is inserted
        AttendanceLog::observe(AttendanceLogObserver::class);

        DB::listen(function ($query) {
            // Log only slow queries > 1000ms
            if ($query->time > 1000) {
                Log::warning('SLOW QUERY DETECTED', [
                    'sql'      => $query->sql,
                    'bindings' => $query->bindings,
                    'time_ms'  => $query->time,
                ]);
            }
        });
    }
}
