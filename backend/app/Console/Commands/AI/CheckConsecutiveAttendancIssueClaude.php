<?php

namespace App\Console\Commands\AI;

use Illuminate\Console\Command;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\AIFeeds;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class CheckConsecutiveAttendancIssueClaude extends Command
{
    protected $signature = 'ai:check-consecutive-attendanc-issue-claude {--company_id=} {--from_date=} {--to_date=} {--type=late} {--streak=3}';
    protected $description = 'Analyze consecutive attendance issues using Claude AI and insert results into ai_feeds.';

    public function handle()
    {
        $companyId = $this->option('company_id');
        if ($this->option('from_date')) {
            $fromDate = Carbon::parse($this->option('from_date'))->startOfDay();
        } else {
            $fromDate = Carbon::now()->subDays(2)->startOfDay();
        }
        if ($this->option('to_date')) {
            $toDate = Carbon::parse($this->option('to_date'))->endOfDay();
        } else {
            $toDate = Carbon::now()->endOfDay();
        }
        $type = strtolower($this->option('type') ?? 'late');
        $streakTarget = (int) ($this->option('streak') ?? 3);

        if (!in_array($type, ['late', 'early', 'absent'])) {
            $this->error('Invalid type. Allowed: late, early, absent');
            return 1;
        }
        if ($streakTarget < 2) {
            $this->error('Streak must be at least 2.');
            return 1;
        }
        if (!$companyId) {
            $this->error('company_id is required.');
            return 1;
        }

        // Fetch attendance data
        $fields = ['employee_id', 'date'];
        if ($type === 'late') {
            $fields[] = 'late_coming';
        } elseif ($type === 'early') {
            $fields[] = 'early_going';
        } elseif ($type === 'absent') {
            $fields[] = 'status';
        }
        $attendances = Attendance::where('company_id', $companyId)
            ->whereBetween('date', [$fromDate->toDateString(), $toDate->toDateString()])
            ->orderBy('employee_id')
            ->orderBy('date')
            ->get($fields);

        // Prepare data for Claude
        $claudePayload = [
            'company_id' => $companyId,
            'type' => $type,
            'streak' => $streakTarget,
            'from_date' => $fromDate->toDateString(),
            'to_date' => $toDate->toDateString(),
            'attendances' => $attendances->toArray(),
        ];

        // Call Claude API
        $apiKey = env('CLAUDE_API_KEY'); // Set your Claude API key in .env
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'Content-Type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/complete', [
            'model' => 'claude-3-opus-20240229',
            'prompt' => $this->buildPrompt($claudePayload),
            'max_tokens_to_sample' => 1024,
        ]);

        if (!$response->ok()) {
            $this->error('Claude API error: ' . $response->body());
            return 1;
        }

        $claudeResult = $response->json();
        $aiFeeds = $this->parseClaudeResult($claudeResult, $companyId, $type, $streakTarget);

        if (!empty($aiFeeds)) {
            DB::table('ai_feeds')->insertOrIgnore($aiFeeds);
            $this->info('AI feeds inserted: ' . count($aiFeeds));
        } else {
            $this->info('No AI feeds to insert.');
        }
        return 0;
    }

    protected function buildPrompt($payload)
    {
        return "Analyze the following attendance data for employees and return a JSON array of objects for each employee with a streak of {$payload['streak']} or more consecutive '{$payload['type']}' issues between {$payload['from_date']} and {$payload['to_date']}. Each object should have: employee_id, name, streak, dates (comma separated), and a description. Data: " . json_encode($payload['attendances']);
    }

    protected function parseClaudeResult($result, $companyId, $type, $streakTarget)
    {
        // Expecting Claude to return a JSON array in the completion field
        $json = $result['completion'] ?? '';
        $feeds = [];
        $parsed = json_decode($json, true);
        if (!is_array($parsed)) return [];
        foreach ($parsed as $row) {
            $feeds[] = [
                'company_id' => $companyId,
                'employee_id' => $row['employee_id'] ?? null,
                'type' => $type,
                'description' => $row['description'] ?? '',
                'data' => json_encode([
                    'employee_id' => $row['employee_id'] ?? null,
                    'name' => $row['name'] ?? null,
                    'streak' => $row['streak'] ?? $streakTarget,
                    'dates' => $row['dates'] ?? '',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        return $feeds;
    }
}
