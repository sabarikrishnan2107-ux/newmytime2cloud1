<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Models\AITrigger;
use Illuminate\Support\Facades\Log;

use function Psy\info;

class CreateAITrigger extends Command
{
    protected $signature = 'ai:create-trigger {message}';

    protected $description = 'Create AI Trigger using natural language';

    public function handle()
    {
        $message = $this->argument('message');

        // ------------------------
        // Step 1: Use model method to create trigger
        // Returns null if already exists or invalid
        // ------------------------
        $trigger = AITrigger::createFromMessage($message, 2);

        if (!$trigger) {
            $this->warn("Trigger already exists or message invalid/unrelated. Skipping AI call.");
            return;
        }

        // ------------------------
        // Step 2: Output success table
        // ------------------------
        $this->info("AI Trigger Created Successfully!");
        $this->table(
            ['ID', 'Type', 'Days', 'Run Time', 'Frequency', 'Weekdays'],
            [[
                $trigger->id,
                $trigger->type,
                $trigger->days,
                $trigger->run_time,
                $trigger->frequency,
                $trigger->weekdays
            ]]
        );
    }
}
