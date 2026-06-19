<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TestNN extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:nn';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'test:nn';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $response = Http::withoutVerifying()->get('http://localhost:5678/webhook/3ca00e92-c32a-46b0-9f66-6acea88fb921');

        echo json_encode($response->json(), JSON_PRETTY_PRINT);


        
    }
}
