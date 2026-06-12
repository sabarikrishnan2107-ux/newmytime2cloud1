<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Voice assistant brain.
 *
 * Takes free-form speech (in ANY language) plus recent conversation history and
 * uses xAI (Grok) or Claude to either:
 *   - run a known data command (kind=query)
 *   - navigate to a page (kind=navigate)
 *   - ANSWER a question / guide the user on how to use the software (kind=answer)
 *   - greet / small talk (kind=greeting)
 *   - or admit it didn't understand (kind=none)
 *
 * The AI key stays server-side. The frontend tries cheap local keyword matching
 * first and calls this for anything else (questions, other languages, guidance).
 */
class VoiceAssistantController extends Controller
{
    /** Data-query intents the frontend knows how to execute. */
    private const QUERY_INTENTS = [
        'absent_list', 'present_count', 'late_list', 'attendance_summary',
        'leave_requests', 'change_requests', 'on_leave_today',
        'employee_count', 'upcoming_holidays',
    ];

    /** Navigation targets: route => spoken label. */
    private const NAV_ROUTES = [
        '/' => 'Dashboard',
        '/employees' => 'Employee List',
        '/employees/create' => 'Add Employee',
        '/department-tabs' => 'Departments',
        '/roles' => 'Designations',
        '/branch' => 'Branches',
        '/attendance' => 'Attendance Dashboard',
        '/manual-logs' => 'Manual Logs',
        '/attendance/change_request' => 'Change Requests',
        '/schedule' => 'Schedule',
        '/shift' => 'Shifts',
        '/leave-dashboard' => 'Leave Dashboard',
        '/leaves' => 'Leave Requests',
        '/payroll-tabs' => 'Payroll Dashboard',
        '/payslips' => 'Payslips',
        '/payslips/salary-structures' => 'Salary Structures',
        '/payslips/loans' => 'Loans',
        '/device' => 'Devices',
        '/device/create' => 'Add Device',
        '/live-camera' => 'Live Camera',
        '/live-camera/register' => 'Face Register',
        '/report' => 'Attendance Report',
        '/activity' => 'Activity Report',
        '/access_control' => 'Access Control',
        '/access_control_logs' => 'Access Logs',
        '/visitor/dashboard' => 'Visitor Dashboard',
        '/visitor/check-in' => 'Visitor Check-in',
        '/visitor/reception' => 'Visitor Reception',
        '/automation' => 'Automation',
        '/announcements' => 'Announcements',
        '/setup' => 'Setup',
        '/company' => 'Company',
        '/holiday' => 'Holidays',
    ];

    public function interpret(Request $request)
    {
        // Light guard: only logged-in app users (who send a Bearer token) may call this.
        if (!$request->bearerToken()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $text = trim((string) $request->input('text', ''));
        $language = trim((string) $request->input('language', '')); // optional BCP-47, e.g. ta-IN
        $history = $this->cleanHistory($request->input('history', []));
        // "voice" = concise spoken replies; "chat" = professional, detailed, full step-by-step.
        $mode = strtolower((string) $request->input('mode', 'voice'));
        if (!in_array($mode, ['voice', 'chat'], true)) $mode = 'voice';

        if ($text === '') {
            return response()->json(['error' => 'No text provided'], 422);
        }

        $provider = strtolower((string) env('VOICE_AI_PROVIDER', 'xai'));

        try {
            $content = $provider === 'claude'
                ? $this->callClaude($text, $language, $history, $mode)
                : $this->callXai($text, $language, $history, $mode);

            if ($content === null) {
                return response()->json(['error' => 'AI service error', 'detail' => $this->lastError], 502);
            }

            $parsed = $this->extractJson($content);
            if (!is_array($parsed)) {
                return response()->json(['kind' => 'none', 'speech' => "Sorry, I didn't understand that.", 'language' => $language ?: 'en-US']);
            }

            return response()->json($this->sanitize($parsed, $language));
        } catch (\Throwable $e) {
            Log::error('voice interpret exception', ['msg' => $e->getMessage()]);
            return response()->json(['error' => 'AI request failed', 'detail' => $e->getMessage()], 500);
        }
    }

    /** Most recent provider error detail (for the 502 response). */
    private $lastError = null;

    /** Keep only the last few clean {role, content} turns for context. */
    private function cleanHistory($history): array
    {
        if (!is_array($history)) return [];
        $clean = [];
        foreach ($history as $turn) {
            $role = $turn['role'] ?? null;
            $content = $turn['content'] ?? null;
            if (in_array($role, ['user', 'assistant'], true) && is_string($content) && trim($content) !== '') {
                $clean[] = ['role' => $role, 'content' => mb_substr(trim($content), 0, 500)];
            }
        }
        return array_slice($clean, -6);
    }

    /** Call xAI (Grok). Returns the raw model text, or null on failure. */
    private function callXai(string $text, string $language, array $history, string $mode = 'voice'): ?string
    {
        $apiKey = env('XAI_API_KEY');
        $model = env('XAI_MODEL', 'grok-4.3');
        if (!$apiKey) { $this->lastError = 'XAI_API_KEY not set'; return null; }

        $messages = array_merge(
            [['role' => 'system', 'content' => $this->systemPrompt($mode)]],
            $history,
            [['role' => 'user', 'content' => $this->userPrompt($text, $language)]]
        );

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(30)->post('https://api.x.ai/v1/chat/completions', [
            'model' => $model,
            'temperature' => 0.2,
            'max_tokens' => $mode === 'chat' ? 1500 : 900,
            'response_format' => ['type' => 'json_object'],
            'messages' => $messages,
        ]);

        if (!$response->ok()) {
            $this->lastError = $response->json('error.message') ?? $response->json('error') ?? $response->body();
            Log::warning('xAI interpret failed', ['status' => $response->status(), 'body' => $response->body()]);
            return null;
        }
        return (string) $response->json('choices.0.message.content', '');
    }

    /** Call Claude (Anthropic). Returns the raw model text, or null on failure. */
    private function callClaude(string $text, string $language, array $history, string $mode = 'voice'): ?string
    {
        $apiKey = env('CLAUDE_API_KEY');
        $model = env('CLAUDE_VOICE_MODEL', 'claude-3-5-haiku-latest');
        if (!$apiKey) { $this->lastError = 'CLAUDE_API_KEY not set'; return null; }

        $messages = array_merge(
            $history,
            [['role' => 'user', 'content' => $this->userPrompt($text, $language)]]
        );

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
            'Content-Type' => 'application/json',
        ])->timeout(30)->post('https://api.anthropic.com/v1/messages', [
            'model' => $model,
            'max_tokens' => $mode === 'chat' ? 1500 : 900,
            'system' => $this->systemPrompt($mode),
            'messages' => $messages,
        ]);

        if (!$response->ok()) {
            $this->lastError = $response->json('error.message') ?? $response->body();
            Log::warning('Claude interpret failed', ['status' => $response->status(), 'body' => $response->body()]);
            return null;
        }
        return (string) $response->json('content.0.text', '');
    }

    private function systemPrompt(string $mode = 'voice'): string
    {
        $queries = implode(', ', self::QUERY_INTENTS);
        $routes = collect(self::NAV_ROUTES)
            ->map(fn ($label, $route) => "$route ($label)")
            ->implode(', ');
        $guide = $this->appGuide();

        $style = $mode === 'chat'
            ? <<<STYLE

=== RESPONSE STYLE: PROFESSIONAL SUPPORT CHAT (the user is TYPING) ===
- Write like a warm, helpful HUMAN support agent having a real conversation — natural and friendly, never robotic or canned. Open with a short acknowledging line (e.g. "Sure!", "Happy to help with that.") when it fits, then get to the point.
- Understand the user's intent even if their wording, spelling or grammar is rough — answer what they actually meant.
- For "how to" / feature questions, give the COMPLETE step-by-step procedure as a numbered list (Step 1, Step 2, ...). Cover every step from opening the menu to saving/finishing.
- If a question is vague, briefly answer the most likely meaning and offer to go deeper, rather than refusing.
- Name the exact menu and page (and the route in brackets) the user must click.
- Mention important fields, options, or prerequisites where relevant, and add a short tip at the end if helpful.
- You may write longer, well-structured answers (use line breaks between steps). Quality and completeness matter more than brevity here.
- Put the entire formatted answer (with numbered steps and line breaks) in the "speech" field. Still reply in the user's language.
STYLE
            : <<<STYLE

=== RESPONSE STYLE: VOICE (the user is SPEAKING) ===
- Keep replies short and natural to be read aloud. For steps, use brief numbered points. Avoid long paragraphs.
STYLE;

        return <<<PROMPT
You are "MyTime Assistant", the friendly in-app voice helper for MyTime2Cloud, an HR / attendance / payroll web application used by company admins and managers.

The user talks to you by voice in ANY language. You must:
1) Help them run quick data commands.
2) Take them to the right page.
3) ANSWER their questions and GUIDE them step-by-step on how to use ANY part of the software.
4) Make small talk / greetings politely.

ALWAYS reply with STRICT JSON only (no markdown, no extra text), in this shape:
{
  "kind": "query" | "navigate" | "answer" | "greeting" | "none",
  "intent": <one of the query intents, or null>,
  "route": <one of the navigation routes, or null>,
  "speech": <your reply, in the SAME language the user spoke>,
  "language": <BCP-47 code of the user's language, e.g. en-US, ta-IN, hi-IN, ar-SA, fr-FR>
}

How to choose "kind":
- "query": user wants live data now. Set intent to ONE of: $queries. Keep speech to a short confirming sentence.
- "navigate": user wants to open/go to a page. Set route to ONE of: $routes. Keep speech short.
- "answer": ANY question the user asks. This includes (a) how to use the software / doubts about features, and (b) general questions (general knowledge, math, dates, translations, simple advice, etc.). ALWAYS try to give a genuinely helpful answer in "speech" - never refuse just because a question is not about the app.
- "greeting": hello / thanks / "what can you do".
- "none": almost never. Only if the input is pure noise/unintelligible. If it is any real question, use "answer".

Rules:
- You are primarily the MyTime2Cloud expert, but you are also a friendly general helper. Answer EVERY question.
- For app how-to questions: give clear step-by-step help using the app knowledge below (short numbered steps), and mention which menu/page to open. Never invent app features that are not in the knowledge; if unsure about the app, say so and suggest the closest page.
- For general (non-app) questions: give a short, correct, helpful answer (1-3 sentences). You may add a brief friendly nudge that you can also help with attendance, leave, payroll, reports, etc. - but answer the question first.
- "speech" MUST be in the user's own language (translate naturally, including any steps).
- Be warm, simple and concise.
- Reply with ONLY the JSON object.

Query intent meanings:
- absent_list: who is absent today
- present_count: how many present today
- late_list: who came late today
- attendance_summary: today's overall present/absent/late/leave summary
- leave_requests: pending leave requests
- change_requests: pending attendance change requests
- on_leave_today: who is on leave today
- employee_count: total number of employees
- upcoming_holidays: next / upcoming holidays

$style

=== APP KNOWLEDGE (how the software is organised) ===
$guide
PROMPT;
    }

    /** Concise description of every module so the AI can guide users accurately. */
    private function appGuide(): string
    {
        return <<<GUIDE
The app has a left-side menu with these modules. Pages are opened from there.

- Dashboard (/): overview of today's attendance, headcount and quick stats.
- Employees: Employee List (/employees) to view/search staff; Add Employee (/employees/create) to create a new employee (fill personal info, branch, department, designation, then save); Employee Upload (/employees/employee_photo_upload) to bulk-upload employee face photos AND to transfer/sync employees onto biometric/face devices; Departments (/department-tabs); Designations (/roles); Branches (/branch).
- Attendance: Attendance Dashboard (/attendance) shows daily in/out, late and absent; Manual Logs (/manual-logs) to add or correct a punch manually; Change Requests (/attendance/change_request) to approve/reject employee correction requests.
- Schedule: Schedule (/schedule) assigns shifts to employees; Shifts (/shift) defines shift timings and rules.
- Leave: Leave Dashboard (/leave-dashboard) to see balances and approvals; Leave Requests (/leaves) to view/apply/approve leave; leave types and balances are managed under the leave section.
- Payroll: Payroll Dashboard (/payroll-tabs); Payslips (/payslips) to generate and view payslips; Salary Structures (/payslips/salary-structures) to define earnings/deductions; Loans (/payslips/loans).
- Devices: Device List (/device) shows biometric/face devices and their online status; Add Device (/device/create) to register a new device (enter serial number / details).
- Live Camera: Live Camera (/live-camera) for face-recognition camera feeds; Face Register (/live-camera/register) to enroll an employee's face.
- Reports: Attendance Report (/report) for date-range attendance export; Activity Report (/activity).
- Access Control: Access Control (/access_control) for door/access rules; Access Logs (/access_control_logs).
- Visitor: Visitor Dashboard (/visitor/dashboard); Visitor Check-in (/visitor/check-in); Reception (/visitor/reception) for the front-desk view.
- Automation (/automation): set up automatic rules and notifications.
- Announcements (/announcements): post company-wide announcements.
- Settings: Setup (/setup) for general configuration; Company (/company) for company profile; Theme (/theme) for appearance.

General how-to tips:
- To add an employee: open Employees > Add Employee, fill the form (name, branch, department, designation, joining date), then Save.
- To register a face for camera recognition: open Live Camera > Face Register, pick the employee and capture/upload the photo.
- To transfer / upload / sync employees onto a device (push their data, face, RFID or PIN to a biometric or face terminal): open Employees > Employee Upload, choose the branch (and device model if shown), tick the employees you want to send and tick the target device(s), then click Submit. Each selected employee is pushed to each selected device and a Sync Progress window shows the result per device. To see or remove which devices an employee is already on, open Employees > Employee List, open that person's Actions menu and choose Devices.
- To correct attendance: open Attendance > Manual Logs to add a punch, or approve the worker's request under Change Requests.
- To approve leave: open Leave > Leave Requests, find the pending request, and Approve or Reject.
- To run an attendance report: open Reports > Attendance Report, pick the date range and branch, then export.
- To check who is absent/present/late today, just ask the assistant directly (it shows the list instantly).
GUIDE;
    }

    private function userPrompt(string $text, string $language): string
    {
        $hint = $language ? " (the user's selected language is $language)" : '';
        return "User said{$hint}: \"{$text}\"";
    }

    /** Pull the first JSON object out of the model's text response. */
    private function extractJson(string $content)
    {
        $content = trim($content);
        $data = json_decode($content, true);
        if (is_array($data)) return $data;

        if (preg_match('/\{.*\}/s', $content, $m)) {
            $data = json_decode($m[0], true);
            if (is_array($data)) return $data;
        }
        return null;
    }

    /** Validate the model output against our known intents/routes. */
    private function sanitize(array $p, string $language): array
    {
        $kind = $p['kind'] ?? 'none';
        $intent = $p['intent'] ?? null;
        $route = $p['route'] ?? null;
        $speech = isset($p['speech']) && is_string($p['speech']) ? trim($p['speech']) : '';
        $lang = isset($p['language']) && is_string($p['language']) && $p['language'] !== '' ? $p['language'] : ($language ?: 'en-US');

        if ($kind === 'query' && !in_array($intent, self::QUERY_INTENTS, true)) {
            // Unknown intent but clearly a question -> treat as guidance instead of failing
            $kind = $speech !== '' ? 'answer' : 'none';
            $intent = null;
        }
        if ($kind === 'navigate' && !array_key_exists($route, self::NAV_ROUTES)) {
            $kind = $speech !== '' ? 'answer' : 'none';
            $route = null;
        }
        if (!in_array($kind, ['query', 'navigate', 'answer', 'greeting', 'none'], true)) {
            $kind = $speech !== '' ? 'answer' : 'none';
        }
        if ($speech === '') {
            $speech = $kind === 'none' ? "Sorry, I didn't understand that." : 'Okay.';
        }

        return [
            'kind' => $kind,
            'intent' => $kind === 'query' ? $intent : null,
            'route' => $kind === 'navigate' ? $route : null,
            'label' => $kind === 'navigate' ? (self::NAV_ROUTES[$route] ?? null) : null,
            'speech' => $speech,
            'language' => $lang,
        ];
    }
}
