# Automation Mediums (FTP, API) and Format (PDF, Excel) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the five automation dialogs to deliver reports via Email, FTP, or API in PDF and/or Excel format, generating new daily reports for the four non-attendance types so they actually have a file to send.

**Architecture:**
- DB: add `formats`, `ftp_config`, `api_config` to `report_notifications`; `medium` to `report_notification_logs`.
- New queued jobs `DeliverReportViaFtpJob` / `DeliverReportViaApiJob` fire after the existing per-manager Email loop in `ReportNotificationCrons`.
- New PDF + Excel generator jobs for Absent / AccessControl / Device / DocumentExpiry parallel the existing Attendance Daily PDF pipeline. Files land under `storage/app/public/{pdf|xlsx}/{date}/{company_id}/{type}_report_{branchId}.{ext}`.
- Frontend: two shared section components (`FtpDestinationSection`, `ApiDestinationSection`), new Format chips, mounted across all five `Create.js` dialogs.

**Tech Stack:** Laravel 10 (PHPUnit feature tests), `maatwebsite/excel` 3.1 (already a dependency), Flysystem FTP/SFTP adapters, Guzzle (already used), Next.js / React 18, Tailwind, no frontend test framework currently installed (manual verification for UI).

**Spec:** [docs/superpowers/specs/2026-05-16-automation-ftp-api-excel-design.md](../specs/2026-05-16-automation-ftp-api-excel-design.md)

---

## Phase 1 — Schema & model

### Task 1: Migration — `formats`, `ftp_config`, `api_config` on `report_notifications`

**Files:**
- Create: `backend/database/migrations/2026_05_16_100000_add_formats_ftp_api_to_report_notifications_table.php`

- [ ] **Step 1: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_notifications', function (Blueprint $table) {
            $table->json('formats')->nullable()->after('mediums');
            $table->json('ftp_config')->nullable()->after('formats');
            $table->json('api_config')->nullable()->after('ftp_config');
        });

        DB::table('report_notifications')
            ->whereNull('formats')
            ->update(['formats' => json_encode(['PDF'])]);
    }

    public function down(): void
    {
        Schema::table('report_notifications', function (Blueprint $table) {
            $table->dropColumn(['formats', 'ftp_config', 'api_config']);
        });
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

Expected output includes: `Migrating: 2026_05_16_100000_add_formats_ftp_api_to_report_notifications_table` followed by `Migrated`.

- [ ] **Step 3: Verify columns exist with correct defaults**

```bash
cd backend && php artisan tinker --execute="echo App\Models\ReportNotification::query()->first()?->formats;"
```

Expected: `["PDF"]` (or similar JSON for an existing row).

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_05_16_100000_add_formats_ftp_api_to_report_notifications_table.php
git commit -m "feat(automation): add formats/ftp_config/api_config to report_notifications"
```

---

### Task 2: Migration — `medium` column on `report_notification_logs`

**Files:**
- Create: `backend/database/migrations/2026_05_16_100100_add_medium_to_report_notification_logs_table.php`

- [ ] **Step 1: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_notification_logs', function (Blueprint $table) {
            $table->string('medium', 16)->default('Email')->after('notification_id');
            $table->index('medium');
        });
    }

    public function down(): void
    {
        Schema::table('report_notification_logs', function (Blueprint $table) {
            $table->dropIndex(['medium']);
            $table->dropColumn('medium');
        });
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

Expected: `Migrated: 2026_05_16_100100_add_medium_to_report_notification_logs_table`.

- [ ] **Step 3: Commit**

```bash
git add backend/database/migrations/2026_05_16_100100_add_medium_to_report_notification_logs_table.php
git commit -m "feat(automation): add medium column to report_notification_logs"
```

---

### Task 3: Update `ReportNotification` model — casts for new JSON columns

**Files:**
- Modify: `backend/app/Models/ReportNotification.php`

- [ ] **Step 1: Write the failing feature test**

Create `backend/tests/Feature/ReportNotificationCastsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\ReportNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportNotificationCastsTest extends TestCase
{
    use RefreshDatabase;

    public function test_formats_cast_returns_array(): void
    {
        $rule = ReportNotification::create([
            'company_id' => 1,
            'branch_id' => 1,
            'type' => 'attendance',
            'subject' => 'x',
            'frequency' => 'Daily',
            'time' => '09:00',
            'mediums' => ['Email'],
            'formats' => ['PDF', 'Excel'],
        ]);

        $fresh = ReportNotification::find($rule->id);
        $this->assertSame(['PDF', 'Excel'], $fresh->formats);
    }

    public function test_ftp_config_round_trips_with_encryption(): void
    {
        $cfg = [
            'protocol' => 'sftp',
            'host' => 'sftp.example.com',
            'port' => 22,
            'username' => 'svc',
            'password' => 's3cret',
            'remote_path' => '/reports/',
        ];

        $rule = ReportNotification::create([
            'company_id' => 1,
            'branch_id' => 1,
            'type' => 'attendance',
            'subject' => 'x',
            'frequency' => 'Daily',
            'time' => '09:00',
            'mediums' => ['FTP'],
            'formats' => ['PDF'],
            'ftp_config' => $cfg,
        ]);

        $fresh = ReportNotification::find($rule->id);
        $this->assertSame($cfg, $fresh->ftp_config);

        $rawValue = \DB::table('report_notifications')->where('id', $rule->id)->value('ftp_config');
        $this->assertStringNotContainsString('s3cret', (string) $rawValue, 'ftp_config must be encrypted at rest');
    }

    public function test_api_config_round_trips_with_encryption(): void
    {
        $cfg = [
            'endpoint' => 'https://api.example.com/x',
            'auth_type' => 'bearer',
            'auth_value' => 'tok_supersecret',
            'auth_header_name' => null,
        ];

        $rule = ReportNotification::create([
            'company_id' => 1,
            'branch_id' => 1,
            'type' => 'attendance',
            'subject' => 'x',
            'frequency' => 'Daily',
            'time' => '09:00',
            'mediums' => ['API'],
            'formats' => ['PDF'],
            'api_config' => $cfg,
        ]);

        $fresh = ReportNotification::find($rule->id);
        $this->assertSame($cfg, $fresh->api_config);

        $rawValue = \DB::table('report_notifications')->where('id', $rule->id)->value('api_config');
        $this->assertStringNotContainsString('tok_supersecret', (string) $rawValue);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && php artisan test --filter=ReportNotificationCastsTest
```

Expected: 3 failures (likely `formats` returns string not array, and `ftp_config`/`api_config` are plain JSON not encrypted).

- [ ] **Step 3: Add the casts**

Edit `backend/app/Models/ReportNotification.php` — extend the `$casts` array:

```php
protected $casts = [
    'body' => 'array',
    'reports' => 'array',
    'mediums' => 'array',
    'tos' => 'array',
    'ccs' => 'array',
    'bccs' => 'array',
    'days' => 'array',
    'formats' => 'array',
    'ftp_config' => 'encrypted:array',
    'api_config' => 'encrypted:array',
];
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd backend && php artisan test --filter=ReportNotificationCastsTest
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Models/ReportNotification.php backend/tests/Feature/ReportNotificationCastsTest.php
git commit -m "feat(automation): cast formats as array; encrypt ftp_config and api_config"
```

---

## Phase 2 — Validation, secret masking, test-connection endpoints

### Task 4: Validation rules for `formats`, `ftp_config`, `api_config`

**Files:**
- Modify: `backend/app/Http/Requests/ReportNotification/StoreRequest.php`
- Modify: `backend/app/Http/Requests/ReportNotification/UpdateRequest.php`
- Test: `backend/tests/Feature/ReportNotificationValidationTest.php`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/ReportNotificationValidationTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportNotificationValidationTest extends TestCase
{
    use RefreshDatabase;

    private function basePayload(array $overrides = []): array
    {
        return array_merge([
            'company_id' => 1,
            'branch_id' => 1,
            'type' => 'attendance',
            'subject' => 'x',
            'frequency' => 'Daily',
            'time' => '09:00',
            'mediums' => ['Email'],
            'formats' => ['PDF'],
            'managers' => [['name' => 'a', 'email' => 'a@b.c']],
        ], $overrides);
    }

    public function test_formats_required_when_present(): void
    {
        $res = $this->postJson('/api/report-notification', $this->basePayload(['formats' => []]));
        $res->assertStatus(422);
    }

    public function test_ftp_config_required_when_ftp_medium_selected(): void
    {
        $res = $this->postJson('/api/report-notification', $this->basePayload([
            'mediums' => ['FTP'],
            'ftp_config' => null,
        ]));
        $res->assertStatus(422)->assertJsonValidationErrors(['ftp_config']);
    }

    public function test_ftp_config_host_required(): void
    {
        $res = $this->postJson('/api/report-notification', $this->basePayload([
            'mediums' => ['FTP'],
            'ftp_config' => ['protocol' => 'ftp', 'username' => 'u', 'password' => 'p', 'remote_path' => '/'],
        ]));
        $res->assertStatus(422)->assertJsonValidationErrors(['ftp_config.host']);
    }

    public function test_api_config_endpoint_required_url(): void
    {
        $res = $this->postJson('/api/report-notification', $this->basePayload([
            'mediums' => ['API'],
            'api_config' => ['endpoint' => 'not-a-url', 'auth_type' => 'none'],
        ]));
        $res->assertStatus(422)->assertJsonValidationErrors(['api_config.endpoint']);
    }

    public function test_happy_path_accepts_full_payload(): void
    {
        $res = $this->postJson('/api/report-notification', $this->basePayload([
            'mediums' => ['Email', 'FTP', 'API'],
            'formats' => ['PDF', 'Excel'],
            'ftp_config' => [
                'protocol' => 'sftp', 'host' => 'h', 'port' => 22,
                'username' => 'u', 'password' => 'p', 'remote_path' => '/',
            ],
            'api_config' => [
                'endpoint' => 'https://x.com', 'auth_type' => 'bearer', 'auth_value' => 't',
            ],
        ]));
        $res->assertSuccessful();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && php artisan test --filter=ReportNotificationValidationTest
```

Expected: 5 failures (validation rules not yet added).

- [ ] **Step 3: Update `StoreRequest::rules()`**

Replace the `rules()` method body in `backend/app/Http/Requests/ReportNotification/StoreRequest.php`:

```php
public function rules()
{
    $isAccessControl = $this->type === "access_control";
    $mediums = (array) $this->input('mediums', []);

    $arr = [
        'automation' => 'nullable',
        'subject' => 'required',
        'email_body' => 'nullable|string|max:5000',
        'day' => 'nullable',
        'date' => 'nullable',
        'company_id' => 'required',
        'branch_id' => 'required',
        'frequency' => 'required',
        'time' => $isAccessControl ? 'nullable' : 'required',
        'reports' => 'nullable|array|max:5',
        'mediums' => 'required|array|min:1',
        'mediums.*' => 'in:Email,Whatsapp,FTP,API',
        'formats' => 'required|array|min:1',
        'formats.*' => 'in:PDF,Excel',
        'managers' => 'nullable|array',
    ];

    if (in_array('FTP', $mediums, true)) {
        $arr['ftp_config'] = 'required|array';
        $arr['ftp_config.protocol'] = 'required|in:ftp,sftp';
        $arr['ftp_config.host'] = 'required|string';
        $arr['ftp_config.port'] = 'nullable|integer';
        $arr['ftp_config.username'] = 'required|string';
        $arr['ftp_config.password'] = 'required|string';
        $arr['ftp_config.remote_path'] = 'required|string';
    }

    if (in_array('API', $mediums, true)) {
        $arr['api_config'] = 'required|array';
        $arr['api_config.endpoint'] = 'required|url';
        $arr['api_config.auth_type'] = 'required|in:none,api_key,bearer,basic';
        $arr['api_config.auth_value'] = 'required_unless:api_config.auth_type,none|string|nullable';
        $arr['api_config.auth_header_name'] = 'required_if:api_config.auth_type,api_key|string|nullable';
    }

    if ($isAccessControl) {
        $arr['from_time'] = 'required';
        $arr['to_time']   = 'required';
        $arr['days']      = 'required';
    } else {
        if ($this->frequency == "Weekly")  $arr['day']  = "required";
        if ($this->frequency == "Monthly") $arr['date'] = "required";
    }

    return $arr;
}
```

- [ ] **Step 4: Mirror the changes in `UpdateRequest`**

In `backend/app/Http/Requests/ReportNotification/UpdateRequest.php` apply the same `rules()` body **except** make `ftp_config.password` and `api_config.auth_value` optional when omitted, so a user can save without retyping the secret:

```php
// Inside the FTP block:
$arr['ftp_config.password'] = 'nullable|string';

// Inside the API block (auth_value):
$arr['api_config.auth_value'] = 'nullable|string';
```

(Keep the rest identical to StoreRequest.)

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && php artisan test --filter=ReportNotificationValidationTest
```

Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Http/Requests/ReportNotification backend/tests/Feature/ReportNotificationValidationTest.php
git commit -m "feat(automation): validate formats, ftp_config, api_config"
```

---

### Task 5: Mask secrets in `show` / `index` responses; preserve secret on update when omitted

**Files:**
- Modify: `backend/app/Http/Controllers/ReportNotificationController.php`
- Test: `backend/tests/Feature/ReportNotificationSecretMaskingTest.php`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/ReportNotificationSecretMaskingTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\ReportNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportNotificationSecretMaskingTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_masks_ftp_password_and_api_auth_value(): void
    {
        $rule = ReportNotification::create([
            'company_id' => 1, 'branch_id' => 1, 'type' => 'attendance',
            'subject' => 'x', 'frequency' => 'Daily', 'time' => '09:00',
            'mediums' => ['FTP', 'API'], 'formats' => ['PDF'],
            'ftp_config' => ['protocol' => 'ftp', 'host' => 'h', 'port' => 21,
                'username' => 'u', 'password' => 'secret-pw', 'remote_path' => '/'],
            'api_config' => ['endpoint' => 'https://x', 'auth_type' => 'bearer',
                'auth_value' => 'secret-tok', 'auth_header_name' => null],
        ]);

        $res = $this->getJson("/api/report-notification/{$rule->id}");
        $res->assertOk();
        $this->assertSame('********', $res->json('ftp_config.password'));
        $this->assertSame('********', $res->json('api_config.auth_value'));
        // non-secret fields still visible
        $this->assertSame('h', $res->json('ftp_config.host'));
        $this->assertSame('https://x', $res->json('api_config.endpoint'));
    }

    public function test_update_with_empty_password_preserves_existing(): void
    {
        $rule = ReportNotification::create([
            'company_id' => 1, 'branch_id' => 1, 'type' => 'attendance',
            'subject' => 'x', 'frequency' => 'Daily', 'time' => '09:00',
            'mediums' => ['FTP'], 'formats' => ['PDF'],
            'ftp_config' => ['protocol' => 'ftp', 'host' => 'h', 'port' => 21,
                'username' => 'u', 'password' => 'original-pw', 'remote_path' => '/'],
        ]);

        $res = $this->putJson("/api/report-notification/{$rule->id}", [
            'company_id' => 1, 'branch_id' => 1, 'type' => 'attendance',
            'subject' => 'x2', 'frequency' => 'Daily', 'time' => '09:00',
            'mediums' => ['FTP'], 'formats' => ['PDF'],
            'managers' => [],
            'ftp_config' => ['protocol' => 'ftp', 'host' => 'h2', 'port' => 21,
                'username' => 'u', 'remote_path' => '/'], // no password key
        ]);
        $res->assertSuccessful();

        $fresh = ReportNotification::find($rule->id);
        $this->assertSame('original-pw', $fresh->ftp_config['password']);
        $this->assertSame('h2', $fresh->ftp_config['host']);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && php artisan test --filter=ReportNotificationSecretMaskingTest
```

Expected: both tests fail (no masking, no preservation logic yet).

- [ ] **Step 3: Add masking helper + update controller methods**

In `backend/app/Http/Controllers/ReportNotificationController.php` add a private helper and call it from `show` and `index`. Also add merge-secret logic to `update`:

```php
private function maskSecrets(ReportNotification $model): ReportNotification
{
    if (is_array($model->ftp_config) && array_key_exists('password', $model->ftp_config)) {
        $cfg = $model->ftp_config;
        if ($cfg['password'] !== null && $cfg['password'] !== '') {
            $cfg['password'] = '********';
            $model->ftp_config = $cfg;
        }
    }
    if (is_array($model->api_config) && array_key_exists('auth_value', $model->api_config)) {
        $cfg = $model->api_config;
        if ($cfg['auth_value'] !== null && $cfg['auth_value'] !== '') {
            $cfg['auth_value'] = '********';
            $model->api_config = $cfg;
        }
    }
    return $model;
}
```

Update `show`:

```php
public function show(ReportNotification $ReportNotification)
{
    return $this->maskSecrets($ReportNotification->load("branch"));
}
```

Update `index` — wrap the paginator result so each item is masked. After the existing `paginate` call, transform:

```php
$page = $model->with("branch")->paginate($request->per_page);
$page->getCollection()->transform(fn ($n) => $this->maskSecrets($n));
return $page;
```

Update `update` — before `$ReportNotification->update(...)`, merge missing secret fields from the existing record:

```php
public function update(UpdateRequest $request, ReportNotification $ReportNotification)
{
    try {
        \Log::info('ReportNotification update', ['id' => $ReportNotification->id, 'data' => $request->all()]);

        if (!$request->validated()) return false;

        $data = $request->except('managers');

        if (array_key_exists('ftp_config', $data) && is_array($data['ftp_config'])
            && !array_key_exists('password', $data['ftp_config'])
            && is_array($ReportNotification->ftp_config)) {
            $data['ftp_config']['password'] = $ReportNotification->ftp_config['password'] ?? null;
        }
        if (array_key_exists('api_config', $data) && is_array($data['api_config'])
            && !array_key_exists('auth_value', $data['api_config'])
            && is_array($ReportNotification->api_config)) {
            $data['api_config']['auth_value'] = $ReportNotification->api_config['auth_value'] ?? null;
        }

        $record = $ReportNotification->update($data);

        if ($record) {
            $notification_id = $ReportNotification->id;
            ReportNotificationManagers::where("notification_id", $notification_id)->delete();

            foreach ($request->input('managers', []) as $manager) {
                $manager['notification_id'] = $notification_id;
                ReportNotificationManagers::create($manager);
            }
            return $this->response('Report Notification updated.', $record, true);
        }
        return $this->response('Report Notification not updated.', null, false);
    } catch (\Throwable $th) {
        throw $th;
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd backend && php artisan test --filter=ReportNotificationSecretMaskingTest
```

Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Controllers/ReportNotificationController.php backend/tests/Feature/ReportNotificationSecretMaskingTest.php
git commit -m "feat(automation): mask secrets in show/index; preserve on update"
```

---

### Task 6: Test-connection endpoints for FTP and API

**Files:**
- Create: `backend/app/Http/Controllers/AutomationConnectionTestController.php`
- Modify: `backend/routes/api.php` (or `backend/routes/attendance.php` — pick the file where automation routes already live; grep `report-notification` to confirm)
- Test: `backend/tests/Feature/AutomationConnectionTestTest.php`

- [ ] **Step 1: Locate the existing automation routes file**

```bash
cd backend && grep -rn "report-notification" routes/
```

Use the file you find (likely `routes/api.php` or `routes/attendance.php`) for the new routes in Step 4.

- [ ] **Step 2: Write the failing test**

Create `backend/tests/Feature/AutomationConnectionTestTest.php`:

```php
<?php

namespace Tests\Feature;

use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AutomationConnectionTestTest extends TestCase
{
    public function test_test_api_returns_ok_on_2xx(): void
    {
        Http::fake([
            'https://example.com/health' => Http::response('', 200),
        ]);

        $res = $this->postJson('/api/automation/test-api', [
            'endpoint' => 'https://example.com/health',
            'auth_type' => 'none',
        ]);
        $res->assertOk()->assertJson(['ok' => true, 'status_code' => 200]);
    }

    public function test_test_api_returns_failure_on_non_2xx(): void
    {
        Http::fake([
            'https://example.com/*' => Http::response('nope', 403),
        ]);

        $res = $this->postJson('/api/automation/test-api', [
            'endpoint' => 'https://example.com/x',
            'auth_type' => 'bearer',
            'auth_value' => 't',
        ]);
        $res->assertOk()->assertJson(['ok' => false, 'status_code' => 403]);
    }

    public function test_test_ftp_returns_failure_on_unreachable_host(): void
    {
        $res = $this->postJson('/api/automation/test-ftp', [
            'protocol' => 'ftp',
            'host' => '127.0.0.1',
            'port' => 1,
            'username' => 'u',
            'password' => 'p',
            'remote_path' => '/',
        ]);
        $res->assertOk()->assertJsonPath('ok', false);
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd backend && php artisan test --filter=AutomationConnectionTestTest
```

Expected: 3 failures (route not defined).

- [ ] **Step 4: Create controller**

`backend/app/Http/Controllers/AutomationConnectionTestController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use League\Flysystem\Filesystem;
use League\Flysystem\Ftp\FtpAdapter;
use League\Flysystem\Ftp\FtpConnectionOptions;
use League\Flysystem\PhpseclibV3\SftpAdapter;
use League\Flysystem\PhpseclibV3\SftpConnectionProvider;

class AutomationConnectionTestController extends Controller
{
    public function testApi(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|url',
            'auth_type' => 'required|in:none,api_key,bearer,basic',
            'auth_value' => 'nullable|string',
            'auth_header_name' => 'nullable|string',
        ]);

        try {
            $client = Http::timeout(10);
            $headers = $this->buildAuthHeaders($request->all());
            if ($headers) $client = $client->withHeaders($headers);

            $resp = $client->head($request->input('endpoint'));
            return response()->json([
                'ok' => $resp->successful(),
                'status_code' => $resp->status(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    public function testFtp(Request $request)
    {
        $request->validate([
            'protocol' => 'required|in:ftp,sftp',
            'host' => 'required|string',
            'port' => 'nullable|integer',
            'username' => 'required|string',
            'password' => 'required|string',
            'remote_path' => 'required|string',
        ]);

        try {
            $fs = $this->buildFlysystem($request->all());
            $fs->listContents($request->input('remote_path'), false)->toArray();
            return response()->json(['ok' => true]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    public static function buildFlysystem(array $cfg): Filesystem
    {
        if (($cfg['protocol'] ?? 'ftp') === 'sftp') {
            $adapter = new SftpAdapter(
                new SftpConnectionProvider(
                    $cfg['host'],
                    $cfg['username'],
                    $cfg['password'],
                    null,                       // privateKey
                    null,                       // passphrase
                    (int) ($cfg['port'] ?? 22), // port
                    false,                      // useAgent
                    10,                         // timeout
                ),
                '/'
            );
        } else {
            $adapter = new FtpAdapter(FtpConnectionOptions::fromArray([
                'host' => $cfg['host'],
                'root' => '/',
                'username' => $cfg['username'],
                'password' => $cfg['password'],
                'port' => (int) ($cfg['port'] ?? 21),
                'ssl' => false,
                'timeout' => 10,
                'passive' => true,
            ]));
        }
        return new Filesystem($adapter);
    }

    public static function buildAuthHeaders(array $cfg): array
    {
        $type = $cfg['auth_type'] ?? 'none';
        $val = $cfg['auth_value'] ?? null;

        return match ($type) {
            'api_key' => [$cfg['auth_header_name'] ?? 'X-API-Key' => $val],
            'bearer'  => ['Authorization' => "Bearer {$val}"],
            'basic'   => ['Authorization' => 'Basic ' . base64_encode((string) $val)],
            default   => [],
        };
    }
}
```

- [ ] **Step 5: Register routes**

In the routes file from Step 1, add (inside whatever auth middleware group the existing automation routes use):

```php
Route::post('/automation/test-ftp', [\App\Http\Controllers\AutomationConnectionTestController::class, 'testFtp']);
Route::post('/automation/test-api', [\App\Http\Controllers\AutomationConnectionTestController::class, 'testApi']);
```

- [ ] **Step 6: Run tests to verify**

```bash
cd backend && php artisan test --filter=AutomationConnectionTestTest
```

Expected: all 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/app/Http/Controllers/AutomationConnectionTestController.php backend/routes backend/tests/Feature/AutomationConnectionTestTest.php
git commit -m "feat(automation): add test-connection endpoints for FTP and API"
```

---

## Phase 3 — Delivery jobs

### Task 7: `DeliverReportViaFtpJob`

**Files:**
- Create: `backend/app/Jobs/DeliverReportViaFtpJob.php`
- Test: `backend/tests/Feature/DeliverReportViaFtpJobTest.php`

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature;

use App\Jobs\DeliverReportViaFtpJob;
use App\Models\ReportNotification;
use App\Models\ReportNotificationLogs;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DeliverReportViaFtpJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_logs_file_not_ready_when_pdf_missing(): void
    {
        $rule = ReportNotification::create([
            'company_id' => 1, 'branch_id' => 5, 'type' => 'attendance',
            'subject' => 'x', 'frequency' => 'Daily', 'time' => '09:00',
            'mediums' => ['FTP'], 'formats' => ['PDF'],
            'ftp_config' => ['protocol' => 'ftp', 'host' => 'h', 'port' => 21,
                'username' => 'u', 'password' => 'p', 'remote_path' => '/'],
        ]);

        (new DeliverReportViaFtpJob($rule->id, 'daily', '2026-05-15', 'PDF'))->handle();

        $log = ReportNotificationLogs::where('notification_id', $rule->id)->first();
        $this->assertNotNull($log);
        $this->assertSame('FTP', $log->medium);
        $this->assertSame('file_not_ready', $log->status);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && php artisan test --filter=DeliverReportViaFtpJobTest
```

Expected: failure — job class doesn't exist.

- [ ] **Step 3: Create the job**

`backend/app/Jobs/DeliverReportViaFtpJob.php`:

```php
<?php

namespace App\Jobs;

use App\Http\Controllers\AutomationConnectionTestController;
use App\Models\ReportNotification;
use App\Models\ReportNotificationLogs;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DeliverReportViaFtpJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function backoff(): array { return [60, 300, 900]; }

    public function __construct(
        public int $notificationId,
        public string $fileSlug,        // "daily" | "absent" | "access_control" | "device" | "document_expiry"
        public string $date,            // "YYYY-MM-DD"
        public string $format,          // "PDF" | "Excel"
    ) {}

    public function handle(): void
    {
        $rule = ReportNotification::find($this->notificationId);
        if (!$rule || !$rule->ftp_config) {
            $this->logAttempt($rule?->id, 'missing_config', 'rule or ftp_config missing');
            return;
        }

        $ext = $this->format === 'Excel' ? 'xlsx' : 'pdf';
        $dir = $this->format === 'Excel' ? 'xlsx' : 'pdf';
        $relative = "{$dir}/{$this->date}/{$rule->company_id}/{$this->fileSlug}_report_{$rule->branch_id}.{$ext}";
        $absolute = storage_path("app/public/{$relative}");

        if (!file_exists($absolute)) {
            $this->logAttempt($rule->id, 'file_not_ready', $relative);
            return;
        }

        try {
            $fs = AutomationConnectionTestController::buildFlysystem($rule->ftp_config);
            $remoteName = "{$this->fileSlug}_report_{$rule->branch_id}_{$this->date}.{$ext}";
            $remotePath = rtrim($rule->ftp_config['remote_path'], '/') . '/' . $remoteName;
            $fs->writeStream($remotePath, fopen($absolute, 'r'));
            $this->logAttempt($rule->id, 'success', "uploaded {$remotePath}");
        } catch (\Throwable $e) {
            $this->logAttempt($rule->id, 'failed', substr($e->getMessage(), 0, 500));
            throw $e; // triggers retry
        }
    }

    private function logAttempt(?int $id, string $status, string $detail): void
    {
        if (!$id) return;
        ReportNotificationLogs::create([
            'notification_id' => $id,
            'medium' => 'FTP',
            'status' => $status,
            'attempt' => $this->attempts(),
            'response_summary' => $detail,
        ]);
    }
}
```

> If `ReportNotificationLogs` does not already have `status`, `attempt`, `response_summary` columns, add them in a small migration here. Quick check: `php artisan tinker --execute="print_r(Schema::getColumnListing('report_notification_logs'));"` — if missing, create migration `2026_05_16_100200_add_status_attempt_response_summary_to_report_notification_logs.php` with these `string` / `integer` / `text` columns nullable.

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd backend && php artisan test --filter=DeliverReportViaFtpJobTest
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Jobs/DeliverReportViaFtpJob.php backend/tests/Feature/DeliverReportViaFtpJobTest.php backend/database/migrations 2>/dev/null
git commit -m "feat(automation): add DeliverReportViaFtpJob with retry and logging"
```

---

### Task 8: `DeliverReportViaApiJob`

**Files:**
- Create: `backend/app/Jobs/DeliverReportViaApiJob.php`
- Test: `backend/tests/Feature/DeliverReportViaApiJobTest.php`

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature;

use App\Jobs\DeliverReportViaApiJob;
use App\Models\ReportNotification;
use App\Models\ReportNotificationLogs;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DeliverReportViaApiJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_posts_multipart_and_logs_success_on_2xx(): void
    {
        Http::fake(['https://api.example.com/reports' => Http::response('ok', 200)]);

        $rule = ReportNotification::create([
            'company_id' => 1, 'branch_id' => 7, 'type' => 'attendance',
            'subject' => 'x', 'frequency' => 'Daily', 'time' => '09:00',
            'mediums' => ['API'], 'formats' => ['PDF'],
            'api_config' => ['endpoint' => 'https://api.example.com/reports',
                'auth_type' => 'bearer', 'auth_value' => 'tok', 'auth_header_name' => null],
        ]);

        $path = storage_path('app/public/pdf/2026-05-15/1');
        @mkdir($path, 0777, true);
        file_put_contents("{$path}/daily_report_7.pdf", '%PDF-1.4 fake');

        (new DeliverReportViaApiJob($rule->id, 'daily', '2026-05-15', 'PDF'))->handle();

        $log = ReportNotificationLogs::where('notification_id', $rule->id)->first();
        $this->assertSame('API', $log->medium);
        $this->assertSame('success', $log->status);

        Http::assertSent(function ($req) {
            return $req->hasHeader('Authorization', 'Bearer tok');
        });
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && php artisan test --filter=DeliverReportViaApiJobTest
```

Expected: job class doesn't exist.

- [ ] **Step 3: Create the job**

`backend/app/Jobs/DeliverReportViaApiJob.php`:

```php
<?php

namespace App\Jobs;

use App\Http\Controllers\AutomationConnectionTestController;
use App\Models\ReportNotification;
use App\Models\ReportNotificationLogs;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class DeliverReportViaApiJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function backoff(): array { return [60, 300, 900]; }

    public function __construct(
        public int $notificationId,
        public string $fileSlug,
        public string $date,
        public string $format,
    ) {}

    public function handle(): void
    {
        $rule = ReportNotification::find($this->notificationId);
        if (!$rule || !$rule->api_config) {
            $this->log($rule?->id, 'missing_config', 'rule or api_config missing');
            return;
        }

        $ext = $this->format === 'Excel' ? 'xlsx' : 'pdf';
        $dir = $this->format === 'Excel' ? 'xlsx' : 'pdf';
        $relative = "{$dir}/{$this->date}/{$rule->company_id}/{$this->fileSlug}_report_{$rule->branch_id}.{$ext}";
        $absolute = storage_path("app/public/{$relative}");

        if (!file_exists($absolute)) {
            $this->log($rule->id, 'file_not_ready', $relative);
            return;
        }

        try {
            $headers = AutomationConnectionTestController::buildAuthHeaders($rule->api_config);
            $resp = Http::withHeaders($headers)
                ->timeout(30)
                ->attach('file', fopen($absolute, 'r'), basename($absolute))
                ->post($rule->api_config['endpoint'], [
                    ['name' => 'branch_id', 'contents' => (string) $rule->branch_id],
                    ['name' => 'date', 'contents' => $this->date],
                    ['name' => 'report_type', 'contents' => $this->fileSlug],
                    ['name' => 'company_id', 'contents' => (string) $rule->company_id],
                    ['name' => 'format', 'contents' => $this->format],
                ]);

            $status = $resp->successful() ? 'success' : 'failed';
            $this->log($rule->id, $status, "HTTP {$resp->status()}: " . substr($resp->body(), 0, 512));

            if (!$resp->successful()) throw new \RuntimeException("API HTTP {$resp->status()}");
        } catch (\Throwable $e) {
            $this->log($rule->id, 'failed', substr($e->getMessage(), 0, 500));
            throw $e;
        }
    }

    private function log(?int $id, string $status, string $detail): void
    {
        if (!$id) return;
        ReportNotificationLogs::create([
            'notification_id' => $id,
            'medium' => 'API',
            'status' => $status,
            'attempt' => $this->attempts(),
            'response_summary' => $detail,
        ]);
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd backend && php artisan test --filter=DeliverReportViaApiJobTest
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Jobs/DeliverReportViaApiJob.php backend/tests/Feature/DeliverReportViaApiJobTest.php
git commit -m "feat(automation): add DeliverReportViaApiJob with retry and logging"
```

---

### Task 9: Wire delivery jobs into `ReportNotificationCrons`; widen type filter

**Files:**
- Modify: `backend/app/Console/Commands/ReportNotificationCrons.php`

- [ ] **Step 1: Map type → file slug**

At top of `handle()` (after the existing variable setup), add:

```php
$typeToSlug = [
    'attendance' => 'daily',
    'absent' => 'absent',
    'access_control' => 'access_control',
    'device' => 'device',
    'document_expiry' => 'document_expiry',
];
```

- [ ] **Step 2: Widen the type filter**

Replace line 64:

```php
$modelsQuery = ReportNotification::where("type", "attendance")
```

with:

```php
$modelsQuery = ReportNotification::whereIn("type", array_keys($typeToSlug))
```

- [ ] **Step 3: Replace the per-manager loop block with new dispatch logic**

After the existing `foreach ($model->managers as $manager) { ... }` block closes, insert (still inside the outer `foreach ($models as $model)`):

```php
$fileSlug = $typeToSlug[$model->type] ?? 'daily';
$formats = is_array($model->formats) && !empty($model->formats) ? $model->formats : ['PDF'];

if (in_array('FTP', $model->mediums ?? [], true) && $model->ftp_config) {
    foreach ($formats as $fmt) {
        \App\Jobs\DeliverReportViaFtpJob::dispatch($model->id, $fileSlug, $yesterday, $fmt);
    }
}
if (in_array('API', $model->mediums ?? [], true) && $model->api_config) {
    foreach ($formats as $fmt) {
        \App\Jobs\DeliverReportViaApiJob::dispatch($model->id, $fileSlug, $yesterday, $fmt);
    }
}
```

- [ ] **Step 4: Manual smoke test against an existing attendance rule**

```bash
cd backend && php artisan task:report_notification_crons {company_id} {existing_attendance_rule_id}
```

Expected output: no errors, log shows FTP/API dispatch only if the rule's `mediums` includes those.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Console/Commands/ReportNotificationCrons.php
git commit -m "feat(automation): dispatch FTP/API delivery jobs; widen type filter"
```

---

## Phase 4 — Report generators for non-attendance types + Excel for Attendance

This phase adds new daily PDF and Excel generators for Absent, AccessControl, Device, DocumentExpiry, plus Excel parity for Attendance.

### Task 10: Absent report — Service, PDF job, Excel export

**Files:**
- Create: `backend/app/Jobs/GenerateAbsentReportPDF.php`
- Create: `backend/app/Jobs/GenerateAbsentReportExcel.php`
- Create: `backend/app/Exports/AbsentReportExport.php`
- (Service `AbsentReportService` is **already on this branch** per `git status` — reuse it.)

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/AbsentReportGenerationTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Jobs\GenerateAbsentReportExcel;
use App\Jobs\GenerateAbsentReportPDF;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AbsentReportGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_pdf_job_writes_file_at_expected_path(): void
    {
        $this->markTestIncomplete('Wire after PDF service available.');

        $companyId = 1; $branchId = 1; $date = '2026-05-15';
        (new GenerateAbsentReportPDF($companyId, $branchId, $date))->handle();

        $expected = storage_path("app/public/pdf/{$date}/{$companyId}/absent_report_{$branchId}.pdf");
        $this->assertFileExists($expected);
    }

    public function test_excel_job_writes_file_at_expected_path(): void
    {
        $this->markTestIncomplete('Wire after data seeding available.');
        // Same shape as PDF test but for .xlsx
    }
}
```

> The tests are marked `markTestIncomplete` because seeding employees + absences to produce realistic output is non-trivial. The two assertions above codify the file-path contract; you can revisit and complete them once seeders exist.

- [ ] **Step 2: Create the Excel export**

`backend/app/Exports/AbsentReportExport.php`:

```php
<?php

namespace App\Exports;

use App\Services\AbsentReportService;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AbsentReportExport implements FromArray, WithHeadings
{
    public function __construct(
        private int $companyId,
        private int $branchId,
        private string $date,
    ) {}

    public function array(): array
    {
        $rows = app(AbsentReportService::class)->buildRows($this->companyId, $this->branchId, $this->date);
        return array_map(fn ($r) => [
            $r['employee_id'] ?? '',
            $r['first_name'] ?? '',
            $r['last_name'] ?? '',
            $r['department'] ?? '',
            $r['branch'] ?? '',
            $r['date'] ?? $this->date,
        ], $rows);
    }

    public function headings(): array
    {
        return ['Emp ID', 'First Name', 'Last Name', 'Department', 'Branch', 'Date'];
    }
}
```

> If `AbsentReportService::buildRows()` doesn't exist with this signature, add it as a thin wrapper around whatever method is already there. Check the service first.

- [ ] **Step 3: Create the PDF job**

`backend/app/Jobs/GenerateAbsentReportPDF.php`:

```php
<?php

namespace App\Jobs;

use App\Http\Controllers\Reports\AbsentReportController;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateAbsentReportPDF implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(
        public int $companyId,
        public int $branchId,
        public string $date,
    ) {}

    public function handle(): void
    {
        // Delegates to the existing AbsentReportController PDF builder.
        // The controller method takes company_id, branch_id, date and writes the file to disk.
        app(AbsentReportController::class)->generatePdfToStorage(
            $this->companyId,
            $this->branchId,
            $this->date,
            storage_path("app/public/pdf/{$this->date}/{$this->companyId}/absent_report_{$this->branchId}.pdf"),
        );
    }
}
```

> Add `generatePdfToStorage(int $company, int $branch, string $date, string $absolutePath): void` to `AbsentReportController` if it doesn't yet have one — it should call into the same Puppeteer/HTML builder the existing controller uses and write the result to `$absolutePath`.

- [ ] **Step 4: Create the Excel job**

`backend/app/Jobs/GenerateAbsentReportExcel.php`:

```php
<?php

namespace App\Jobs;

use App\Exports\AbsentReportExport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Maatwebsite\Excel\Facades\Excel;

class GenerateAbsentReportExcel implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $companyId,
        public int $branchId,
        public string $date,
    ) {}

    public function handle(): void
    {
        $relative = "xlsx/{$this->date}/{$this->companyId}/absent_report_{$this->branchId}.xlsx";
        Excel::store(
            new AbsentReportExport($this->companyId, $this->branchId, $this->date),
            $relative,
            'public'
        );
    }
}
```

- [ ] **Step 5: Smoke test**

```bash
cd backend && php artisan tinker --execute="App\Jobs\GenerateAbsentReportExcel::dispatchSync(1, 1, '2026-05-15');"
ls backend/storage/app/public/xlsx/2026-05-15/1/
```

Expected: `absent_report_1.xlsx` exists (may be empty if no data, that's OK).

- [ ] **Step 6: Commit**

```bash
git add backend/app/Jobs/GenerateAbsentReportPDF.php backend/app/Jobs/GenerateAbsentReportExcel.php backend/app/Exports/AbsentReportExport.php backend/tests/Feature/AbsentReportGenerationTest.php
git commit -m "feat(automation): absent report PDF + Excel generators"
```

---

### Task 11: AccessControl report — Service, PDF job, Excel export

**Files:**
- Create: `backend/app/Services/AccessControlReportService.php`
- Create: `backend/app/Jobs/GenerateAccessControlReportPDF.php`
- Create: `backend/app/Jobs/GenerateAccessControlReportExcel.php`
- Create: `backend/app/Exports/AccessControlReportExport.php`

- [ ] **Step 1: Create the service**

`backend/app/Services/AccessControlReportService.php`:

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class AccessControlReportService
{
    public function buildRows(int $companyId, int $branchId, string $date, ?string $fromTime = null, ?string $toTime = null): array
    {
        $q = DB::table('access_control_logs as l')
            ->where('l.company_id', $companyId)
            ->whereDate('l.log_time', $date);

        if ($branchId) $q->where('l.branch_id', $branchId);
        if ($fromTime) $q->whereTime('l.log_time', '>=', $fromTime);
        if ($toTime)   $q->whereTime('l.log_time', '<=', $toTime);

        return $q->orderBy('l.log_time')->limit(10000)->get()->map(fn ($r) => (array) $r)->all();
    }
}
```

> Verify the table name and column names match this codebase (`access_control_logs`, `log_time`, `branch_id`, `company_id`). If they differ, adjust the query.

- [ ] **Step 2: Create the Excel export**

`backend/app/Exports/AccessControlReportExport.php`:

```php
<?php

namespace App\Exports;

use App\Services\AccessControlReportService;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AccessControlReportExport implements FromArray, WithHeadings
{
    public function __construct(
        private int $companyId,
        private int $branchId,
        private string $date,
        private ?string $fromTime = null,
        private ?string $toTime = null,
    ) {}

    public function array(): array
    {
        $rows = app(AccessControlReportService::class)
            ->buildRows($this->companyId, $this->branchId, $this->date, $this->fromTime, $this->toTime);

        return array_map(fn ($r) => [
            $r['log_time'] ?? '',
            $r['employee_name'] ?? ($r['employee_id'] ?? ''),
            $r['door_name'] ?? ($r['device_id'] ?? ''),
            $r['direction'] ?? '',
            $r['result'] ?? '',
        ], $rows);
    }

    public function headings(): array
    {
        return ['Time', 'Employee', 'Door', 'Direction', 'Result'];
    }
}
```

- [ ] **Step 3: Create the PDF job**

`backend/app/Jobs/GenerateAccessControlReportPDF.php`:

```php
<?php

namespace App\Jobs;

use App\Services\AccessControlReportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\View;

class GenerateAccessControlReportPDF implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(
        public int $companyId,
        public int $branchId,
        public string $date,
    ) {}

    public function handle(): void
    {
        $rows = app(AccessControlReportService::class)
            ->buildRows($this->companyId, $this->branchId, $this->date);

        $html = View::make('reports.access_control_daily', [
            'rows' => $rows,
            'company_id' => $this->companyId,
            'branch_id' => $this->branchId,
            'date' => $this->date,
        ])->render();

        $dir = storage_path("app/public/pdf/{$this->date}/{$this->companyId}");
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        $target = "{$dir}/access_control_report_{$this->branchId}.pdf";

        // Use the same Puppeteer-PDF pipeline as GenerateDailyReportPDF.
        // The existing pdf-service/index.js renders HTML to PDF over HTTP.
        $resp = \Illuminate\Support\Facades\Http::timeout(60)
            ->post(env('PDF_SERVICE_URL', 'http://localhost:3001/pdf'), [
                'html' => $html,
                'options' => ['format' => 'A4', 'landscape' => true],
            ]);

        if (!$resp->successful()) {
            throw new \RuntimeException("PDF service returned {$resp->status()}");
        }
        file_put_contents($target, $resp->body());
    }
}
```

> Create the Blade view at `backend/resources/views/reports/access_control_daily.blade.php`. Pattern: copy from the existing daily report's Blade and replace columns/headings. If unsure of the existing template's path, run `find backend/resources/views/reports -type f` first.

- [ ] **Step 4: Create the Excel job**

`backend/app/Jobs/GenerateAccessControlReportExcel.php`:

```php
<?php

namespace App\Jobs;

use App\Exports\AccessControlReportExport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Maatwebsite\Excel\Facades\Excel;

class GenerateAccessControlReportExcel implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $companyId,
        public int $branchId,
        public string $date,
    ) {}

    public function handle(): void
    {
        $relative = "xlsx/{$this->date}/{$this->companyId}/access_control_report_{$this->branchId}.xlsx";
        Excel::store(
            new AccessControlReportExport($this->companyId, $this->branchId, $this->date),
            $relative,
            'public'
        );
    }
}
```

- [ ] **Step 4: Smoke test**

```bash
cd backend && php artisan tinker --execute="App\Jobs\GenerateAccessControlReportExcel::dispatchSync(1, 1, '2026-05-15');"
ls backend/storage/app/public/xlsx/2026-05-15/1/
```

Expected: `access_control_report_1.xlsx` exists.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/AccessControlReportService.php backend/app/Jobs/GenerateAccessControlReport*.php backend/app/Exports/AccessControlReportExport.php
git commit -m "feat(automation): access control report PDF + Excel generators"
```

---

### Task 12: Device report — Service, PDF job, Excel export

**Files:**
- Create: `backend/app/Services/DeviceReportService.php`
- Create: `backend/app/Jobs/GenerateDeviceReportPDF.php`
- Create: `backend/app/Jobs/GenerateDeviceReportExcel.php`
- Create: `backend/app/Exports/DeviceReportExport.php`
- Create: `backend/resources/views/reports/device_daily.blade.php`

- [ ] **Step 1: Create the service**

`backend/app/Services/DeviceReportService.php`:

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class DeviceReportService
{
    public function buildRows(int $companyId, int $branchId, string $date): array
    {
        // Confirm the actual table name (likely `devices` plus an events/logs table).
        // The query below joins device master data with the latest-heartbeat per day.
        $q = DB::table('devices as d')
            ->leftJoin('device_logs as l', function ($j) use ($date) {
                $j->on('l.device_id', '=', 'd.id')->whereDate('l.created_at', $date);
            })
            ->where('d.company_id', $companyId)
            ->when($branchId, fn ($q2) => $q2->where('d.branch_id', $branchId))
            ->select(
                'd.id as device_id',
                'd.name as device_name',
                'd.branch_id',
                DB::raw('MAX(l.created_at) as last_seen'),
                DB::raw('COUNT(l.id) as events_today'),
            )
            ->groupBy('d.id', 'd.name', 'd.branch_id');

        return $q->get()->map(fn ($r) => (array) $r)->all();
    }
}
```

> Adjust `devices` / `device_logs` to whatever table names this codebase actually uses. Run `php artisan tinker --execute="print_r(Schema::getTableListing());"` to discover.

- [ ] **Step 2: Create the Excel export**

`backend/app/Exports/DeviceReportExport.php`:

```php
<?php

namespace App\Exports;

use App\Services\DeviceReportService;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class DeviceReportExport implements FromArray, WithHeadings
{
    public function __construct(
        private int $companyId,
        private int $branchId,
        private string $date,
    ) {}

    public function array(): array
    {
        $rows = app(DeviceReportService::class)->buildRows($this->companyId, $this->branchId, $this->date);
        return array_map(fn ($r) => [
            $r['device_id'] ?? '',
            $r['device_name'] ?? '',
            $r['branch_id'] ?? '',
            $r['last_seen'] ?? '',
            $r['events_today'] ?? 0,
        ], $rows);
    }

    public function headings(): array
    {
        return ['Device ID', 'Device Name', 'Branch', 'Last Seen', 'Events Today'];
    }
}
```

- [ ] **Step 3: Create the PDF job**

`backend/app/Jobs/GenerateDeviceReportPDF.php`:

```php
<?php

namespace App\Jobs;

use App\Services\DeviceReportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\View;

class GenerateDeviceReportPDF implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(
        public int $companyId,
        public int $branchId,
        public string $date,
    ) {}

    public function handle(): void
    {
        $rows = app(DeviceReportService::class)
            ->buildRows($this->companyId, $this->branchId, $this->date);

        $html = View::make('reports.device_daily', [
            'rows' => $rows,
            'company_id' => $this->companyId,
            'branch_id' => $this->branchId,
            'date' => $this->date,
        ])->render();

        $dir = storage_path("app/public/pdf/{$this->date}/{$this->companyId}");
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        $target = "{$dir}/device_report_{$this->branchId}.pdf";

        $resp = Http::timeout(60)->post(env('PDF_SERVICE_URL', 'http://localhost:3001/pdf'), [
            'html' => $html,
            'options' => ['format' => 'A4'],
        ]);
        if (!$resp->successful()) throw new \RuntimeException("PDF service returned {$resp->status()}");
        file_put_contents($target, $resp->body());
    }
}
```

- [ ] **Step 4: Create the Excel job**

`backend/app/Jobs/GenerateDeviceReportExcel.php` — identical shape to `GenerateAccessControlReportExcel` from Task 11 Step 4, swap `AccessControlReportExport` for `DeviceReportExport`, swap the filename slug `access_control_report` for `device_report`.

- [ ] **Step 5: Create the Blade view**

`backend/resources/views/reports/device_daily.blade.php` — copy from `reports/access_control_daily.blade.php` (created in Task 11) and replace column headers with `Device ID / Name / Branch / Last Seen / Events Today`.

- [ ] **Step 6: Smoke test**

```bash
cd backend && php artisan tinker --execute="App\Jobs\GenerateDeviceReportExcel::dispatchSync(1, 1, '2026-05-15');"
ls backend/storage/app/public/xlsx/2026-05-15/1/
```

Expected: `device_report_1.xlsx` exists.

- [ ] **Step 7: Commit**

```bash
git add backend/app/Services/DeviceReportService.php backend/app/Jobs/GenerateDeviceReport*.php backend/app/Exports/DeviceReportExport.php backend/resources/views/reports/device_daily.blade.php
git commit -m "feat(automation): device report PDF + Excel generators"
```

---

### Task 13: DocumentExpiry report — Service, PDF job, Excel export

**Files:**
- Create: `backend/app/Services/DocumentExpiryReportService.php`
- Create: `backend/app/Jobs/GenerateDocumentExpiryReportPDF.php`
- Create: `backend/app/Jobs/GenerateDocumentExpiryReportExcel.php`
- Create: `backend/app/Exports/DocumentExpiryReportExport.php`
- Create: `backend/resources/views/reports/document_expiry_daily.blade.php`

- [ ] **Step 1: Create the service**

`backend/app/Services/DocumentExpiryReportService.php`:

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class DocumentExpiryReportService
{
    public function buildRows(int $companyId, int $branchId, string $date, int $daysThreshold = 30): array
    {
        $cutoff = date('Y-m-d', strtotime("{$date} +{$daysThreshold} days"));

        return DB::table('employee_documents as ed')
            ->join('employees as e', 'e.id', '=', 'ed.employee_id')
            ->where('e.company_id', $companyId)
            ->when($branchId, fn ($q) => $q->where('e.branch_id', $branchId))
            ->whereNotNull('ed.expiry_date')
            ->whereBetween('ed.expiry_date', [$date, $cutoff])
            ->orderBy('ed.expiry_date')
            ->select(
                DB::raw("TRIM(CONCAT(e.first_name, ' ', e.last_name)) as employee_name"),
                'ed.document_type',
                'ed.document_number',
                'ed.issue_date',
                'ed.expiry_date',
                DB::raw("DATEDIFF(ed.expiry_date, '{$date}') as days_left"),
            )
            ->limit(5000)
            ->get()
            ->map(fn ($r) => (array) $r)
            ->all();
    }
}
```

> Adjust `employee_documents` table and column names to whatever exists. Check `Schema::getColumnListing('employee_documents')` first. For Postgres, replace `DATEDIFF(...)` with `(ed.expiry_date::date - '{$date}'::date)`.

- [ ] **Step 2: Create the Excel export**

`backend/app/Exports/DocumentExpiryReportExport.php`:

```php
<?php

namespace App\Exports;

use App\Services\DocumentExpiryReportService;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class DocumentExpiryReportExport implements FromArray, WithHeadings
{
    public function __construct(
        private int $companyId,
        private int $branchId,
        private string $date,
    ) {}

    public function array(): array
    {
        $rows = app(DocumentExpiryReportService::class)
            ->buildRows($this->companyId, $this->branchId, $this->date);

        return array_map(fn ($r) => [
            $r['employee_name'] ?? '',
            $r['document_type'] ?? '',
            $r['document_number'] ?? '',
            $r['issue_date'] ?? '',
            $r['expiry_date'] ?? '',
            $r['days_left'] ?? '',
        ], $rows);
    }

    public function headings(): array
    {
        return ['Employee', 'Document Type', 'Document #', 'Issue Date', 'Expiry Date', 'Days Left'];
    }
}
```

- [ ] **Step 3: Create the PDF job**

`backend/app/Jobs/GenerateDocumentExpiryReportPDF.php` — identical shape to `GenerateDeviceReportPDF` from Task 12 Step 3, with these substitutions:
- Service: `DocumentExpiryReportService` instead of `DeviceReportService`
- Blade view: `reports.document_expiry_daily` instead of `reports.device_daily`
- Target filename: `document_expiry_report_{$this->branchId}.pdf` instead of `device_report_...`

- [ ] **Step 4: Create the Excel job**

`backend/app/Jobs/GenerateDocumentExpiryReportExcel.php` — identical shape to `GenerateDeviceReportExcel` from Task 12 Step 4 with the same renaming substitutions.

- [ ] **Step 5: Create the Blade view**

`backend/resources/views/reports/document_expiry_daily.blade.php` — copy from `reports/device_daily.blade.php` and replace column headers with `Employee / Document Type / Document # / Issue Date / Expiry Date / Days Left`.

- [ ] **Step 6: Smoke test**

```bash
cd backend && php artisan tinker --execute="App\Jobs\GenerateDocumentExpiryReportExcel::dispatchSync(1, 1, '2026-05-15');"
ls backend/storage/app/public/xlsx/2026-05-15/1/
```

Expected: `document_expiry_report_1.xlsx` exists.

- [ ] **Step 7: Commit**

```bash
git add backend/app/Services/DocumentExpiryReportService.php backend/app/Jobs/GenerateDocumentExpiryReport*.php backend/app/Exports/DocumentExpiryReportExport.php backend/resources/views/reports/document_expiry_daily.blade.php
git commit -m "feat(automation): document expiry report PDF + Excel generators"
```

---

### Task 14: Attendance Excel parity — wrap existing exports in a job

**Files:**
- Create: `backend/app/Jobs/GenerateAttendanceReportExcel.php`

- [ ] **Step 1: Create the job**

```php
<?php

namespace App\Jobs;

use App\Exports\AttendanceExport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Maatwebsite\Excel\Facades\Excel;

class GenerateAttendanceReportExcel implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $companyId,
        public int $branchId,
        public string $date,
    ) {}

    public function handle(): void
    {
        $relative = "xlsx/{$this->date}/{$this->companyId}/daily_report_{$this->branchId}.xlsx";

        // Reuse the existing AttendanceExport; if its constructor takes different args,
        // adapt this line. Check backend/app/Exports/AttendanceExport.php for its signature first.
        Excel::store(
            new AttendanceExport($this->companyId, $this->branchId, $this->date, $this->date),
            $relative,
            'public'
        );
    }
}
```

- [ ] **Step 2: Smoke test**

```bash
cd backend && php artisan tinker --execute="App\Jobs\GenerateAttendanceReportExcel::dispatchSync(1, 1, '2026-05-15');"
ls backend/storage/app/public/xlsx/2026-05-15/1/
```

Expected: `daily_report_1.xlsx` exists.

- [ ] **Step 3: Commit**

```bash
git add backend/app/Jobs/GenerateAttendanceReportExcel.php
git commit -m "feat(automation): wrap AttendanceExport in queued job for daily Excel"
```

---

### Task 15: Extend `GeneralDailyReport` to dispatch all types and both formats

**Files:**
- Modify: `backend/app/Console/Commands/GeneralDailyReport.php`

- [ ] **Step 1: Widen the notification query and dispatch loop**

Replace the `whereHas('report_notifications', ...)` filter and the `processByCompanyIds` method body to iterate **all five types** and dispatch PDF + Excel jobs based on `notification.formats`:

```php
$typeToJobs = [
    'attendance' => [
        'pdf' => \App\Jobs\GenerateDailyReportPDF::class,
        'xlsx' => \App\Jobs\GenerateAttendanceReportExcel::class,
    ],
    'absent' => [
        'pdf' => \App\Jobs\GenerateAbsentReportPDF::class,
        'xlsx' => \App\Jobs\GenerateAbsentReportExcel::class,
    ],
    'access_control' => [
        'pdf' => \App\Jobs\GenerateAccessControlReportPDF::class,
        'xlsx' => \App\Jobs\GenerateAccessControlReportExcel::class,
    ],
    'device' => [
        'pdf' => \App\Jobs\GenerateDeviceReportPDF::class,
        'xlsx' => \App\Jobs\GenerateDeviceReportExcel::class,
    ],
    'document_expiry' => [
        'pdf' => \App\Jobs\GenerateDocumentExpiryReportPDF::class,
        'xlsx' => \App\Jobs\GenerateDocumentExpiryReportExcel::class,
    ],
];

$from_date = date('Y-m-d', strtotime('-1 day'));

$rules = ReportNotification::whereIn('type', array_keys($typeToJobs))
    ->where('company_id', $company_id)
    ->with('branch:id,branch_name')
    ->get();

foreach ($rules as $r) {
    $jobs = $typeToJobs[$r->type] ?? null;
    if (!$jobs) continue;

    $formats = is_array($r->formats) && !empty($r->formats) ? $r->formats : ['PDF'];
    $branchId = (int) ($r->branch_id ?? 0);

    if (in_array('PDF', $formats, true))   $jobs['pdf']::dispatch($company_id, $branchId, $from_date);
    if (in_array('Excel', $formats, true)) $jobs['xlsx']::dispatch($company_id, $branchId, $from_date);
}
```

> Keep the existing Weekly/Monthly Format-C dispatch as-is — it remains attendance-specific and handles its own date ranges. The block above handles the Daily case for all 5 types.

- [ ] **Step 2: Manual run**

```bash
cd backend && php artisan task:generate_daily_report {company_id}
```

Expected: log shows dispatches for all 5 types (only those with existing rules of that type).

- [ ] **Step 3: Commit**

```bash
git add backend/app/Console/Commands/GeneralDailyReport.php
git commit -m "feat(automation): dispatch PDF+Excel jobs for all 5 automation types"
```

---

## Phase 5 — Frontend

> Frontend tests: this codebase has no Jest/RTL setup. Verification is manual via the dev server (`cd frontend-new && npm run dev`).

### Task 16: Shared `FtpDestinationSection.jsx`

**Files:**
- Create: `frontend-new/src/components/Automation/_shared/FtpDestinationSection.jsx`

- [ ] **Step 1: Create the component**

```jsx
"use client";

import React from "react";
import { testFtpConnection } from "@/lib/endpoint/automation";
import { notify } from "@/lib/utils";

export default function FtpDestinationSection({ config, onChange }) {
    const [testing, setTesting] = React.useState(false);
    const cfg = config || { protocol: "ftp", host: "", port: 21, username: "", password: "", remote_path: "/" };

    const setField = (k, v) => onChange({ ...cfg, [k]: v });

    const onProtocolChange = (e) => {
        const proto = e.target.value;
        onChange({ ...cfg, protocol: proto, port: proto === "sftp" ? 22 : 21 });
    };

    const onTest = async () => {
        try {
            setTesting(true);
            const res = await testFtpConnection(cfg);
            if (res?.ok) notify?.("Success", "FTP connection OK", "success");
            else notify?.("Failed", res?.error || "FTP connection failed", "error");
        } finally {
            setTesting(false);
        }
    };

    return (
        <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-elevation-1 border border-gray-200 dark:border-white/5">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-gray-600 dark:text-white">FTP Destination</h2>
                <button type="button" onClick={onTest} disabled={testing}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-50">
                    {testing ? "Testing..." : "Test connection"}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Protocol">
                    <select value={cfg.protocol} onChange={onProtocolChange} className="theme-input">
                        <option value="ftp">FTP</option>
                        <option value="sftp">SFTP</option>
                    </select>
                </Field>
                <Field label="Port">
                    <input type="number" value={cfg.port ?? ""} onChange={(e) => setField("port", Number(e.target.value))} className="theme-input" />
                </Field>
                <Field label="Host">
                    <input type="text" value={cfg.host ?? ""} onChange={(e) => setField("host", e.target.value)} className="theme-input" />
                </Field>
                <Field label="Username">
                    <input type="text" value={cfg.username ?? ""} onChange={(e) => setField("username", e.target.value)} className="theme-input" />
                </Field>
                <Field label="Password">
                    <input type="password" value={cfg.password ?? ""} placeholder="Leave blank to keep existing"
                        onChange={(e) => setField("password", e.target.value)} className="theme-input" />
                </Field>
                <Field label="Remote Path">
                    <input type="text" value={cfg.remote_path ?? ""} onChange={(e) => setField("remote_path", e.target.value)} className="theme-input" />
                </Field>
            </div>
        </section>
    );
}

function Field({ label, children }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}
```

> The class `theme-input` is illustrative — replace with whatever input styling the codebase uses (often `w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm`).

- [ ] **Step 2: Commit**

```bash
git add frontend-new/src/components/Automation/_shared/FtpDestinationSection.jsx
git commit -m "feat(automation-ui): add shared FTP destination section component"
```

---

### Task 17: Shared `ApiDestinationSection.jsx`

**Files:**
- Create: `frontend-new/src/components/Automation/_shared/ApiDestinationSection.jsx`

- [ ] **Step 1: Create the component**

```jsx
"use client";

import React from "react";
import { testApiConnection } from "@/lib/endpoint/automation";
import { notify } from "@/lib/utils";

export default function ApiDestinationSection({ config, onChange }) {
    const [testing, setTesting] = React.useState(false);
    const cfg = config || { endpoint: "", auth_type: "none", auth_value: "", auth_header_name: "X-API-Key" };

    const setField = (k, v) => onChange({ ...cfg, [k]: v });

    const onTest = async () => {
        try {
            setTesting(true);
            const res = await testApiConnection(cfg);
            if (res?.ok) notify?.("Success", `API reachable (HTTP ${res.status_code})`, "success");
            else notify?.("Failed", res?.error || `API failed (HTTP ${res?.status_code ?? "?"})`, "error");
        } finally {
            setTesting(false);
        }
    };

    return (
        <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-elevation-1 border border-gray-200 dark:border-white/5">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-gray-600 dark:text-white">API Destination</h2>
                <button type="button" onClick={onTest} disabled={testing}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-50">
                    {testing ? "Testing..." : "Test connection"}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Endpoint URL" wide>
                    <input type="url" value={cfg.endpoint ?? ""} onChange={(e) => setField("endpoint", e.target.value)} placeholder="https://api.example.com/reports" className="theme-input col-span-2" />
                </Field>
                <Field label="Authentication">
                    <select value={cfg.auth_type} onChange={(e) => setField("auth_type", e.target.value)} className="theme-input">
                        <option value="none">None</option>
                        <option value="api_key">API Key (header)</option>
                        <option value="bearer">Bearer token</option>
                        <option value="basic">Basic auth</option>
                    </select>
                </Field>

                {cfg.auth_type === "api_key" && (
                    <>
                        <Field label="Header Name">
                            <input type="text" value={cfg.auth_header_name ?? ""} onChange={(e) => setField("auth_header_name", e.target.value)} className="theme-input" />
                        </Field>
                        <Field label="Key Value">
                            <input type="password" value={cfg.auth_value ?? ""} placeholder="Leave blank to keep existing"
                                onChange={(e) => setField("auth_value", e.target.value)} className="theme-input" />
                        </Field>
                    </>
                )}
                {cfg.auth_type === "bearer" && (
                    <Field label="Token">
                        <input type="password" value={cfg.auth_value ?? ""} placeholder="Leave blank to keep existing"
                            onChange={(e) => setField("auth_value", e.target.value)} className="theme-input" />
                    </Field>
                )}
                {cfg.auth_type === "basic" && (
                    <Field label="Username:Password (combined)">
                        <input type="password" value={cfg.auth_value ?? ""} placeholder="user:pass — leave blank to keep existing"
                            onChange={(e) => setField("auth_value", e.target.value)} className="theme-input" />
                    </Field>
                )}
            </div>
        </section>
    );
}

function Field({ label, children, wide }) {
    return (
        <div className={"space-y-1 " + (wide ? "col-span-2" : "")}>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend-new/src/components/Automation/_shared/ApiDestinationSection.jsx
git commit -m "feat(automation-ui): add shared API destination section component"
```

---

### Task 18: Endpoint helpers for test connections

**Files:**
- Modify: `frontend-new/src/lib/endpoint/automation.js`

- [ ] **Step 1: Add the two helpers**

Append to `automation.js`:

```js
export const testFtpConnection = async (cfg) => {
    const r = await fetch("/api/automation/test-ftp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
    });
    return r.json();
};

export const testApiConnection = async (cfg) => {
    const r = await fetch("/api/automation/test-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
    });
    return r.json();
};
```

> If the codebase uses a wrapped fetch (e.g. `apiFetch`/`http` helper), reuse it — grep for one of the existing helpers in this file. Plain `fetch` is shown for clarity.

- [ ] **Step 2: Commit**

```bash
git add frontend-new/src/lib/endpoint/automation.js
git commit -m "feat(automation-ui): add testFtpConnection / testApiConnection helpers"
```

---

### Task 19: Wire Format + Medium chips and sections into Attendance dialog

**Files:**
- Modify: `frontend-new/src/components/Automation/Attendance/Create.js`

- [ ] **Step 1: Update `defaultForm`**

In the `defaultForm` `useMemo`, add `formats`, `ftp_config`, `api_config`:

```js
const defaultForm = useMemo(
    () => ({
        branch_id: "",
        subject: "Your Subject here",
        time: "09:00",
        report_type: "Daily",
        days: ["1"],
        weekly_day: "Monday",
        monthly_date: "1",
        mediums: ["Email"],
        formats: ["PDF"],
        managers: [],
        email_body: "",
        ftp_config: null,
        api_config: null,
    }),
    []
);
```

- [ ] **Step 2: Update the edit-load effect**

In the `useEffect` that hydrates the form from `editItemPayload`, add:

```js
formats: editItemPayload?.formats || ["PDF"],
ftp_config: editItemPayload?.ftp_config || null,
api_config: editItemPayload?.api_config || null,
```

(adjacent to the existing `mediums:` line.)

- [ ] **Step 3: Add toggle handlers**

Below `toggleMedium`, add:

```js
const toggleFormat = (f) => {
    setForm((p) => ({
        ...p,
        formats: p.formats.includes(f) ? p.formats.filter((x) => x !== f) : [...p.formats, f],
    }));
};
```

- [ ] **Step 4: Add Format chip row in Rule Configuration**

Above the existing Medium chip row (`<label>...Medium</label>`), insert:

```jsx
<div className="space-y-1 col-span-2">
    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Format</label>
    <div className="flex flex-wrap gap-2 mt-1">
        <ChipToggle label="PDF" active={form.formats.includes("PDF")} onClick={() => toggleFormat("PDF")} />
        <ChipToggle label="Excel" active={form.formats.includes("Excel")} onClick={() => toggleFormat("Excel")} />
    </div>
</div>
```

- [ ] **Step 5: Add FTP and API chips to Medium row**

Inside the existing Medium chip row, add two more `ChipToggle`s:

```jsx
<ChipToggle label="Email" active={form.mediums.includes("Email")} onClick={() => toggleMedium("Email")} />
<ChipToggle label="FTP"   active={form.mediums.includes("FTP")}   onClick={() => toggleMedium("FTP")} />
<ChipToggle label="API"   active={form.mediums.includes("API")}   onClick={() => toggleMedium("API")} />
```

- [ ] **Step 6: Mount FTP and API destination sections**

After the Rule Configuration `<section>` closes (before the Managers section opens), insert:

```jsx
import FtpDestinationSection from "@/components/Automation/_shared/FtpDestinationSection";
import ApiDestinationSection from "@/components/Automation/_shared/ApiDestinationSection";

{form.mediums.includes("FTP") && (
    <FtpDestinationSection config={form.ftp_config} onChange={(c) => setField("ftp_config", c)} />
)}
{form.mediums.includes("API") && (
    <ApiDestinationSection config={form.api_config} onChange={(c) => setField("api_config", c)} />
)}
```

(Imports go at top of file; the JSX block goes inside the body, between the Rule and Managers `<section>` blocks.)

- [ ] **Step 7: Update `onSubmit` payload**

In the `payload = { ... }` object inside `onSubmit`, add:

```js
formats: form.formats,
ftp_config: form.ftp_config,
api_config: form.api_config,
```

- [ ] **Step 8: Manual verification**

Start the dev server, open the Attendance Automation dialog:

```bash
cd frontend-new && npm run dev
```

Expected:
- Format row shows `[PDF]` selected, `[Excel]` deselectable.
- Medium row shows three chips (`Email`, `FTP`, `API`).
- Clicking `FTP` reveals the FTP Destination section. Same for `API`.
- "Test connection" buttons work (or surface an error).
- Save produces a valid POST including `formats`, `ftp_config`, `api_config`.

- [ ] **Step 9: Commit**

```bash
git add frontend-new/src/components/Automation/Attendance/Create.js
git commit -m "feat(automation-ui): wire format chips, ftp/api mediums into attendance dialog"
```

---

### Task 20: Wire same changes into Absent dialog

**Files:**
- Modify: `frontend-new/src/components/Automation/Absent/Create.js`

- [ ] **Step 1: Apply identical changes to Task 19**

Steps 1–7 of Task 19 apply verbatim to this file. The dialog structure is the same shape; the only difference is the section heading text.

- [ ] **Step 2: Manual verification**

Open Absent Automation dialog in the browser. Same checks as Task 19 Step 8.

- [ ] **Step 3: Commit**

```bash
git add frontend-new/src/components/Automation/Absent/Create.js
git commit -m "feat(automation-ui): wire format chips, ftp/api mediums into absent dialog"
```

---

### Task 21: Wire same changes into AccessControl dialog

**Files:**
- Modify: `frontend-new/src/components/Automation/AccessControl/Create.js`

- [ ] **Step 1: Apply identical changes to Task 19** (note: AccessControl uses `from_time`/`to_time` instead of `time`; do not touch that — just add the format/medium chips and section mounts).

- [ ] **Step 2: Manual verification**

- [ ] **Step 3: Commit**

```bash
git add frontend-new/src/components/Automation/AccessControl/Create.js
git commit -m "feat(automation-ui): wire format chips, ftp/api mediums into access-control dialog"
```

---

### Task 22: Wire same changes into Device dialog

**Files:**
- Modify: `frontend-new/src/components/Automation/Device/Create.js`

- [ ] **Step 1: Apply identical changes to Task 19**

- [ ] **Step 2: Manual verification**

- [ ] **Step 3: Commit**

```bash
git add frontend-new/src/components/Automation/Device/Create.js
git commit -m "feat(automation-ui): wire format chips, ftp/api mediums into device dialog"
```

---

### Task 23: Wire same changes into DocumentExpiry dialog

**Files:**
- Modify: `frontend-new/src/components/Automation/DocumentExpiry/Create.js`

- [ ] **Step 1: Apply identical changes to Task 19**

- [ ] **Step 2: Manual verification**

- [ ] **Step 3: Commit**

```bash
git add frontend-new/src/components/Automation/DocumentExpiry/Create.js
git commit -m "feat(automation-ui): wire format chips, ftp/api mediums into document-expiry dialog"
```

---

## Phase 6 — End-to-end verification

### Task 24: Manual end-to-end test

- [ ] **Step 1: Create a rule with all options**

In the UI, create an Attendance Automation rule with:
- Branch: any
- Time: 1 minute from now (so the cron fires soon)
- Frequency: Daily
- Days: today
- Format: PDF + Excel
- Mediums: Email + FTP + API
- FTP config: pointed at a test SFTP server (Docker image `linuxserver/openssh-server` is easy)
- API config: pointed at a local `httpbin.org/post` or webhook.site URL with Bearer auth
- One manager with a real email

- [ ] **Step 2: Manually fire the generator**

```bash
cd backend && php artisan task:generate_daily_report {company_id}
```

Expected: PDF and Excel files appear under `backend/storage/app/public/{pdf|xlsx}/{yesterday}/{company_id}/daily_report_{branch_id}.{ext}`.

- [ ] **Step 3: Manually fire the delivery cron**

```bash
cd backend && php artisan task:report_notification_crons {company_id} {rule_id}
```

Expected:
- Email arrives with both PDF and Excel attachments.
- FTP server shows both files uploaded to `remote_path`.
- API endpoint shows two POSTs received (one per format) with correct multipart body and `Authorization: Bearer ...` header.

- [ ] **Step 4: Verify logs**

```bash
cd backend && php artisan tinker --execute="App\Models\ReportNotificationLogs::where('notification_id', {rule_id})->get(['medium', 'status', 'response_summary'])->each(fn(\$l) => print_r(\$l->toArray()));"
```

Expected: rows for `FTP` and `API` mediums, status `success`.

- [ ] **Step 5: Test failure paths**

- Edit the rule and change FTP password to something wrong. Re-run the cron. Verify `ReportNotificationLogs` has a `failed` row with the error message.
- Edit the rule and change API endpoint to a URL that returns 500. Verify three retry attempts then a final `failed` log.

- [ ] **Step 6: Final commit (smoke test notes only — no code change)**

No commit unless you've found something to fix.

---

## Notes for the implementer

- **Schema casts subtlety:** `encrypted:array` for `ftp_config` / `api_config` means the entire JSON object is encrypted as a single blob. If you ever need to query against a subfield (e.g. `where ftp_config->host = ?`), this won't work — you'd have to switch to `array` cast and encrypt individual fields manually. The current spec doesn't need that.
- **Test framework alignment:** The repo uses standard Laravel PHPUnit (`backend/tests/Feature/`, `backend/tests/Unit/`). All test snippets above assume `RefreshDatabase`. Confirm `phpunit.xml` testdox / database config matches before running.
- **No frontend test framework:** Verification for `frontend-new/` is manual via `npm run dev`. Adding Jest/RTL is out of scope here.
- **PDF builder reuse:** For the four new non-attendance PDF generators (Tasks 11–13), the easiest pattern is to follow `GenerateDailyReportPDF.php`. It uses the same Puppeteer / HTML-to-PDF approach across the codebase; you'll write a tiny Blade template per type and pass it through the same renderer.
- **Where the rate of work bites:** Tasks 11/12/13 are the biggest unknowns because they touch report SQL you haven't written. If data shape isn't obvious from the existing alert commands, dump 100 rows of the source table first and design columns from there.
- **Git policy reminder:** Per user instructions, commits in this plan are written but **not pushed**. The user handles push and PR themselves.
