<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class ServerInit extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'serve:init';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Server Init';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $localIp = gethostbyname(gethostname());


        // $ip = $this->ask('Enter IP address.', $localIp);
        // $port = $this->ask('Enter port no.', 8000);
        $port = 8000;


        // Validate IP address
        if (!filter_var($localIp, FILTER_VALIDATE_IP)) {
            $this->error('Invalid IP address format.');
            return;
        }

        Artisan::call('serve', [
            '--host' => $localIp,
            '--port' => $port,
        ], $this->output);
    }
}
