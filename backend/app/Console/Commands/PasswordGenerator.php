<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class PasswordGenerator extends Command
{
    protected $signature = 'app:password-generator {password}';

    protected $description = 'Command description';

    public function handle()
    {
        $this->info(Hash::make($this->argument("password"))); // }KK=,*7eyz


    }
}
