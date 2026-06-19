<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Http;

class AITrigger extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'days',
        'run_time',
        'frequency',
        'weekdays',
        'month_day',
        'message_hash',
        'fingerprint',
        'description',
        'company_id'
    ];

    protected $casts = [
        'created_at' => 'datetime:d-M-Y H:i:s',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Claude Prompt
    |--------------------------------------------------------------------------
    */

    public static function buildPrompt($message)
    {
        return "
Convert this message into JSON.

Fields:
type: absent|late|early|present|leave
days: integer
time: HH:MM
frequency: daily|weekly|monthly
weekdays: optional array
month_day: optional integer

Message: {$message}

Return ONLY JSON.
";
    }

    /*
    |--------------------------------------------------------------------------
    | Basic Message Parser (to reduce AI calls)
    |--------------------------------------------------------------------------
    */

    public static function parseMessage(string $message): ?array
    {
        $types = ['absent', 'late', 'early', 'present', 'leave'];
        $type = null;

        foreach ($types as $t) {
            if (stripos($message, $t) !== false) {
                $type = $t;
                break;
            }
        }

        $hasDays = preg_match('/\d+/', $message);
        $hasTime = preg_match('/(\d+)\s*(am|pm)/i', $message);

        if (!$type || (!$hasDays && !$hasTime)) {
            return null;
        }

        // Detect days
        if (preg_match('/(\d+)\s+(consecutive\s+)?(day|days)/i', $message, $daysMatch)) {
            $days = (int)$daysMatch[1];
        } else {
            $days = 1;
        }

        // Detect time
        if (preg_match('/(\d+)\s*(am|pm)/i', $message, $timeMatch)) {
            $time = date('H:i', strtotime("{$timeMatch[1]} {$timeMatch[2]}"));
        } else {
            $time = '06:00';
        }

        // Detect weekday
        $weekday = null;
        if (preg_match('/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i', $message, $dayMatch)) {
            $weekday = substr($dayMatch[0], 0, 3);
        }

        return [
            'type' => $type,
            'days' => $days,
            'run_time' => $time,
            'weekday' => $weekday
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Fingerprint Generator (prevents duplicate triggers)
    |--------------------------------------------------------------------------
    */

    public static function generateFingerprint(array $parsedData): string
    {
        $weekdayPart = $parsedData['weekday'] ?? 'any';

        return strtolower(
            "{$parsedData['type']}{$parsedData['days']}{$parsedData['run_time']}_{$weekdayPart}"
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Call Claude AI
    |--------------------------------------------------------------------------
    */

    public static function callAI(string $message): ?array
    {
        $response = Http::withHeaders([
            'x-api-key' => env('CLAUDE_API_KEY'),
            'anthropic-version' => '2023-06-01'
        ])->post('https://api.anthropic.com/v1/messages', [
            "model" => "claude-3-sonnet-20240229",
            "max_tokens" => 200,
            "messages" => [
                [
                    "role" => "user",
                    "content" => self::buildPrompt($message)
                ]
            ]
        ]);

        $json = $response->json();

        $content = $json['content'][0]['text'] ?? '{}';
        $content = preg_replace('/json|/', '', trim($content));

        $data = json_decode($content, true);

        if (!$data || !isset($data['type'])) {
            return null;
        }

        return $data;
    }

    /*
    |--------------------------------------------------------------------------
    | Main Trigger Creator
    |--------------------------------------------------------------------------
    */

    public static function createFromMessage(string $message, int $companyId = 2): ?self
    {
        $hash = md5(strtolower(trim($message)));

        // Parse message locally first
        $parsed = self::parseMessage($message);

        if (!$parsed) {
            return null;
        }

        $fingerprint = self::generateFingerprint($parsed);

        // Prevent duplicates
        $exists = self::where('message_hash', $hash)
            ->orWhere('fingerprint', $fingerprint)
            ->exists();

        if ($exists) {
            return null;
        }

        // Call AI for better interpretation
        $aiData = self::callAI($message);

        $data = $aiData ?? $parsed;

        return self::create([
            'type' => $data['type'],
            'days' => $data['days'],
            'run_time' => $data['time'] ?? $data['run_time'],
            'frequency' => $data['frequency'] ?? 'daily',
            'weekdays' => isset($data['weekdays'])
                ? implode(',', $data['weekdays'])
                : ($parsed['weekday'] ?? null),
            'month_day' => $data['month_day'] ?? null,
            'message_hash' => $hash,
            'fingerprint' => $fingerprint,
            'description' => $message,
            'company_id' => $companyId
        ]);
    }
}