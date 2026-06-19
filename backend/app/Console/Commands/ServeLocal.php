<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ServeLocal extends Command
{
    // The name and signature of the console command
    protected $signature = 'serve:local {--port=8001}';

    // The console command description
    protected $description = 'Serve the application on the local network IP';

    public function handle()
    {
        // Get local IP address
        $localIp = gethostbyname(gethostname());
        $port = $this->option('port');

        $this->info("Starting Laravel server on http://{$localIp}:{$port}");
        $this->comment("Press Ctrl+C to stop the server");

        // Execute the native serve command with our custom host and port
        passthru("php artisan serve --host={$localIp} --port={$port}");
    }
}