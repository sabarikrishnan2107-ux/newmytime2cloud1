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
            $content = match ($provider) {
                'claude' => $this->callClaude($text, $language, $history, $mode),
                'gemini', 'google' => $this->callGemini($text, $language, $history, $mode),
                default => $this->callXai($text, $language, $history, $mode),
            };

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

    /**
     * Call Google Gemini via its OpenAI-compatible endpoint. Free-tier keys come
     * from Google AI Studio (aistudio.google.com). Runs on Google's servers — no
     * load on our box. Returns the raw model text, or null on failure.
     */
    private function callGemini(string $text, string $language, array $history, string $mode = 'voice'): ?string
    {
        $apiKey = env('GEMINI_API_KEY');
        $model = env('GEMINI_MODEL', 'gemini-2.5-flash');
        if (!$apiKey) { $this->lastError = 'GEMINI_API_KEY not set'; return null; }

        $messages = array_merge(
            [['role' => 'system', 'content' => $this->systemPrompt($mode)]],
            $history,
            [['role' => 'user', 'content' => $this->userPrompt($text, $language)]]
        );

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(30)->post('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', [
            'model' => $model,
            'temperature' => 0.2,
            'max_tokens' => $mode === 'chat' ? 1500 : 900,
            'response_format' => ['type' => 'json_object'],
            'messages' => $messages,
        ]);

        if (!$response->ok()) {
            $this->lastError = $response->json('error.message') ?? $response->json('error') ?? $response->body();
            Log::warning('Gemini interpret failed', ['status' => $response->status(), 'body' => $response->body()]);
            return null;
        }
        return (string) $response->json('choices.0.message.content', '');
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
- For "how to" / feature questions, give the COMPLETE step-by-step procedure as a numbered list (Step 1, Step 2, ...). Cover every step from opening the menu to saving/finishing. Do NOT give a short, vague answer — be thorough and professional, like a proper user manual.
- ALWAYS call out the MANDATORY / required fields the user must fill for that form (say clearly which are required vs optional), mention any prerequisite that must exist first, and say what happens after they Save.
- If a question is vague, briefly answer the most likely meaning and offer to go deeper, rather than refusing.
- Name the exact menu and page (and the route in brackets) the user must click.
- Use ONLY the app knowledge below for steps and field names — never invent a field, button or page that is not listed. If a detail isn't in the knowledge, say so and point to the closest page.
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
The app has a left-side menu. Below is the module map, then detailed step-by-step procedures. When you answer a "how to" question, use these steps, name the menu > page and /route, and clearly mark which fields are REQUIRED. (req) = mandatory field the user must fill; everything else is optional.

=== MODULE MAP ===
- Dashboard (/): today's attendance, headcount and quick stats.
- Employees: Employee List (/employees); Add Employee (/employees/create); Employee Upload (/employees/employee_photo_upload) to upload face photos AND push employees onto biometric/face devices; Departments (/department-tabs); Designations (/roles); Branches (/branch).
- Attendance: Attendance Dashboard (/attendance); Manual Logs (/manual-logs) to add/correct a punch; Change Requests (/attendance/change_request) to approve/reject employee correction requests.
- Schedule: Schedule (/schedule) to assign shifts to employees; Shifts (/shift) to define shift timings.
- Leave: Leave Dashboard (/leave-dashboard); Leave Requests (/leaves) to apply/approve/reject leave.
- Payroll: Payroll Dashboard (/payroll-tabs); Payslips (/payslips); Salary Structures (/payslips/salary-structures); Loans (/payslips/loans).
- Devices: Device List (/device); Add Device (/device/create).
- Live Camera: Live Camera (/live-camera); Face Register (/live-camera/register).
- Reports: Attendance Report (/report); Activity Report (/activity).
- Access Control: Access Control (/access_control); Access Logs (/access_control_logs).
- Visitor: Visitor Dashboard (/visitor/dashboard); Check-in (/visitor/check-in); Reception (/visitor/reception).
- Automation (/automation); Announcements (/announcements); Settings: Setup (/setup), Company (/company).

=== STEP-BY-STEP PROCEDURES ===

# Add a new employee  (Employees > Add Employee, /employees/create)
Prerequisite: the Branch, Department and Designation you want to assign must already exist (create them first if not — see below).
1. In the top menu click Employees, then Add Employee.
2. Fill the form. REQUIRED fields:
   - First Name (req)
   - Employee ID (req) — the staff code/number; must be UNIQUE within the company.
   - System User ID (req) — the device user code. THIS IS IMPORTANT: it is what links the person to their biometric/face-device punches, so it must match the code enrolled on the device. Attendance will not map correctly if it is wrong.
   - Branch (req), Department (req), Designation (req).
   - Joining Date (req).
3. Optional but recommended: Title (Mr./Ms.), Last Name, Display Name, Gender, Date of Birth, Nationality, Religion, Blood Group, Marital Status, Mobile/Phone number, WhatsApp number, Email, RFID Card Number (only if they use card access), Profile Photo.
4. Optional: set a Password only if the employee will log in to the staff self-service portal.
5. Click Save. The employee now shows in Employee List and can be scheduled, given leave, and pushed to devices.
After saving: enrol their face/photo and push them to the device (see "Upload employees to a device"), and assign a shift (see "Assign a shift").

# Add a Branch (Employees > Branches, /branch)
1. Open Employees > Branches. 2. Click Add/New. 3. REQUIRED: Branch Name (req) (and location/company details if shown). 4. Save.

# Add a Department (Employees > Departments, /department-tabs)
1. Open Employees > Departments. 2. Click Add. 3. REQUIRED: Department Name (req). 4. Save.

# Add a Designation / job title (Employees > Designations, /roles)
1. Open Employees > Designations. 2. Click Add. 3. REQUIRED: Designation Name (req). 4. Save.

# Register / enrol an employee's face (Live Camera > Face Register, /live-camera/register)
1. Open Live Camera > Face Register. 2. Pick the employee. 3. Capture from the camera or upload a clear, front-facing photo. 4. Save. This face is used for camera recognition attendance.

# Upload / push employees to a biometric or face device (Employees > Employee Upload, /employees/employee_photo_upload)
Prerequisite: the employee must have a photo on the server (if it says "Photo missing on server", upload the photo first); and the device must be registered (Devices > Add Device).
1. Open Employees > Employee Upload. 2. Choose the Branch (and device model, if shown). 3. Tick the employees to send. 4. Tick the target device(s). 5. Click Submit. A Sync Progress window shows the result per person per device ("Success", "Already exists on device", etc.).
To see/remove which devices a person is already on: Employees > Employee List > that person's Actions menu > Devices.

# Add a device (Devices > Add Device, /device/create)
1. Open Devices > Add Device. 2. REQUIRED: Device Serial Number (req) and device name/model as shown. 3. Save. The device appears in Device List with its online status.

# Add or correct a punch manually (Attendance > Manual Logs, /manual-logs)
1. Open Attendance > Manual Logs. 2. REQUIRED: Employee (req), Date (req), Time (req), In/Out type (req). 3. Save — the log is added and attendance recalculates.

# Approve or reject an attendance correction request (Attendance > Change Requests, /attendance/change_request)
1. Open Attendance > Change Requests. 2. Find the pending request. 3. Review the requested change. 4. Click Approve or Reject.

# Define a shift (Schedule > Shifts, /shift)
1. Open Schedule > Shifts. 2. Click Add. 3. REQUIRED: Shift Name (req), On-duty (start) time (req), Off-duty (end) time (req); plus grace/late rules if shown. 4. Save.

# Assign a shift / schedule to employees (Schedule, /schedule)
Prerequisite: the Shift must exist (see above).
1. Open Schedule. 2. Select the employee(s), the Shift, and the date range/days. 3. Save. Attendance now evaluates those employees against that shift.

# Apply for / approve leave (Leave > Leave Requests, /leaves)
To apply: 1. Open Leave > Leave Requests > Apply/Add. 2. REQUIRED: Employee (req), Leave Type (req), Start Date (req), End Date (req); Reason recommended. 3. Save.
To approve: 1. Open Leave > Leave Requests. 2. Find the pending request. 3. Approve or Reject.

# Salary structure (Payroll > Salary Structures, /payslips/salary-structures)
1. Open Payroll > Salary Structures. 2. Add/edit a structure. 3. REQUIRED: the employee/structure name and at least the Basic salary; add earnings and deductions as needed. 4. Save.

# Generate a payslip (Payroll > Payslips, /payslips)
Prerequisite: the employee needs a salary structure.
1. Open Payroll > Payslips. 2. Pick the pay period/month (req) and the employee(s) (req). 3. Generate. 4. Review and finalise/download.

# Record a loan or advance (Payroll > Loans, /payslips/loans)
1. Open Payroll > Loans. 2. REQUIRED: Employee (req), Amount (req), and the repayment/installment terms. 3. Save.

# Run an attendance report (Reports > Attendance Report, /report)
1. Open Reports > Attendance Report. 2. REQUIRED: Date range (req); optionally filter by Branch/Department/employee. 3. Generate, then Export/Download.

# Post an announcement (Announcements, /announcements)
1. Open Announcements. 2. Click Add. 3. REQUIRED: Title (req) and Message (req); choose the audience if shown. 4. Publish.

# Quick data (no navigation needed): to see who is absent/present/late today, who is on leave, pending leave or change requests, employee count, or upcoming holidays — the user can just ask the assistant and it shows the list instantly.
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
