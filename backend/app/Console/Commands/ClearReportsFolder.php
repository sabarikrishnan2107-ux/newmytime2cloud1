<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ClearReportsFolder extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reports:clear';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all files in the public/reports folder';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $reportsDirectory = public_path('reports');

        if (File::exists($reportsDirectory)) {
            // Delete all files in the folder
            File::cleanDirectory($reportsDirectory);
            $this->info('Reports folder has been cleared successfully!');
        } else {
            $this->error('Reports folder does not exist.');
        }

        return 0;
    }
}
