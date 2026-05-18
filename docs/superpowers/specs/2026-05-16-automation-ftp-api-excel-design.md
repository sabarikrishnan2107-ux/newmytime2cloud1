# Automation Mediums (FTP, API) and Format (PDF, Excel)

**Date:** 2026-05-16
**Status:** Draft — awaiting user review

## Summary

Extend the five report-automation dialogs (Attendance, Absent, AccessControl, Device, DocumentExpiry) so a rule can deliver its generated report via **Email**, **FTP**, or **API**, in **PDF**, **Excel**, or both formats. Today only Email + PDF is supported on the Attendance dialog UI; the underlying backend cron already understands `Email` and `Whatsapp` mediums but no rule exposes Whatsapp through these five dialogs.

This spec covers the schema, UI, backend delivery pipeline, error handling, and security model for the new mediums and formats. Implementation of the actual cron schedulers, the existing PDF generators, and the existing five dialog scaffolds is **not** in scope — they remain as they are.

## Scope

**In scope:**
- New `Format` chip row (PDF / Excel multi-select) in all five automation dialogs.
- Two new medium chips (`FTP`, `API`) alongside the existing `Email` chip in all five dialogs.
- Conditional config sections for FTP and API destinations, appearing in the dialog only when their chip is selected.
- "Test connection" buttons for FTP and API config.
- Schema additions: `formats`, `ftp_config`, `api_config` JSON columns on `report_notifications`; `medium` column on `report_notification_logs`.
- Excel generation alongside PDF generation in the report-build pipeline.
- Two new queued jobs for FTP and API delivery.
- Validation, encrypted secrets at rest, and per-attempt logging **for FTP and API only** — Email and Whatsapp logging behavior is unchanged in this spec.
- **New daily report generators** for the four non-attendance automation types so they have a file to deliver via Email-attachment, FTP, or API:
  - **Absent** — daily summary of absent employees (date, employee, branch, department).
  - **AccessControl** — daily access-control event roll-up for the configured time window.
  - **Device** — daily device events / health summary.
  - **DocumentExpiry** — daily list of documents expiring within the configured threshold.
  - Each produces PDF and Excel via the same orchestrator pattern as Attendance. File naming mirrors `daily_report_{branchId}.pdf`/`xlsx` with a type-specific prefix (e.g. `absent_report_{branchId}.pdf`).

**Out of scope:**
- Whatsapp medium UI exposure (the backend supports it but no dialog adds it here).
- Alerting on final delivery failure (logged only; no notification).
- SSRF protections beyond URL scheme validation (admin-only feature; flagged as known limitation).
- A retroactive backfill of `formats` for in-flight history — existing rules simply default to `["PDF"]`.

## Architecture

### Data model

One migration adds three columns to `report_notifications`:

| Column | Type | Default | Notes |
|---|---|---|---|
| `formats` | JSON | `["PDF"]` | Array of strings; subset of `["PDF","Excel"]`. |
| `ftp_config` | JSON nullable | `null` | Populated only when `mediums` contains `"FTP"`. |
| `api_config` | JSON nullable | `null` | Populated only when `mediums` contains `"API"`. |

One migration adds one column to `report_notification_logs`:

| Column | Type | Default | Notes |
|---|---|---|---|
| `medium` | string(16) | `"Email"` | One of `Email`/`Whatsapp`/`FTP`/`API`. Existing rows keep the default value `"Email"`. Column added so future per-medium log filtering works; only `FTP`/`API` rows are written by this change. |

`ftp_config` JSON shape:
```json
{
  "protocol": "ftp",          // "ftp" | "sftp"
  "host": "ftp.example.com",
  "port": 21,                  // 21 default for ftp, 22 for sftp
  "username": "user",
  "password": "encrypted",     // encrypted at rest via Crypt
  "remote_path": "/reports/"
}
```

`api_config` JSON shape:
```json
{
  "endpoint": "https://api.example.com/reports",
  "auth_type": "api_key",      // "none" | "api_key" | "bearer" | "basic"
  "auth_value": "encrypted",   // encrypted; the key/token/password
  "auth_header_name": "X-API-Key"  // only used when auth_type === "api_key"
}
```

The `ReportNotification` model gains `'ftp_config' => 'encrypted:array'`, `'api_config' => 'encrypted:array'`, `'formats' => 'array'` casts. The `encrypted:array` cast encrypts the entire JSON object including secrets — simplest correct behavior given Laravel's cast options.

### UI changes

The Rule Configuration card in each of the five dialogs gains a new row above the existing Medium row:

```
FORMAT
[PDF] [Excel]

MEDIUM
[Email] [FTP] [API]
```

Both rows are multi-select chips, reusing the existing `ChipToggle` component pattern.

**Conditional sections** appear below the Rule Configuration card (and above the Managers card):

- **FTP Destination** — visible only when the FTP chip is active. Fields: Protocol (dropdown), Host, Port (auto-fills 21/22 on protocol change), Username, Password, Remote Path. A `Test connection` button calls a new endpoint.
- **API Destination** — visible only when the API chip is active. Fields: Endpoint URL, Authentication (dropdown: None / API Key / Bearer / Basic), conditional auth fields (Header Name + Key for API Key; Token for Bearer; Username + Password for Basic). A `Test connection` button calls a new endpoint.

These two sections are extracted into reusable components so all five dialogs share them:
- `frontend-new/src/components/Automation/_shared/FtpDestinationSection.jsx`
- `frontend-new/src/components/Automation/_shared/ApiDestinationSection.jsx`

The Managers section remains unchanged — managers are still the recipient list for Email (and the existing Whatsapp delivery path), not for FTP/API.

**Secret masking:** When editing an existing rule, the password / auth value field renders empty with a "leave blank to keep existing" placeholder. The backend `show` and `index` endpoints return the secret fields as `"********"` so the actual value never reaches the browser. On submit, if the user has not typed anything into the secret field, the frontend omits it from the payload and the backend preserves the stored value.

### Backend delivery pipeline

The existing cron command `ReportNotificationCrons.php` keeps its current per-manager loop for Email/Whatsapp. After that loop closes for a given `$model`, two new rule-level blocks fire:

```php
foreach ($model->managers as $manager) { /* existing Email + Whatsapp */ }

if (in_array("FTP", $model->mediums ?? []) && $model->ftp_config) {
    foreach ($model->formats as $format) {
        foreach ($filesForThisModel as $file) {
            DeliverReportViaFtpJob::dispatch($model->id, $file, $yesterday, $format);
        }
    }
}
if (in_array("API", $model->mediums ?? []) && $model->api_config) {
    foreach ($model->formats as $format) {
        foreach ($filesForThisModel as $file) {
            DeliverReportViaApiJob::dispatch($model->id, $file, $yesterday, $format);
        }
    }
}
```

Jobs receive the notification `id` (not the model instance) so the queue payload stays small and the latest config is re-read at execution time.

**`DeliverReportViaFtpJob`** (`backend/app/Jobs/DeliverReportViaFtpJob.php`):
- Resolves the file path based on `$format`: PDF at `pdf/{date}/{company_id}/...pdf`, Excel at `xlsx/{date}/{company_id}/...xlsx`.
- If the file does not yet exist, logs `file_not_ready` to `report_notification_logs` and releases for retry.
- Builds a Flysystem adapter at runtime from `$model->ftp_config`. FTP uses Laravel's built-in `League\Flysystem\Ftp\FtpAdapter`; SFTP uses `League\Flysystem\PhpseclibV3\SftpAdapter` (already shipped via Laravel 10+).
- Uploads to `{remote_path}/{type}_{branch_id}_{YYYY-MM-DD}.{ext}`.
- Writes one `report_notification_logs` row per attempt with `medium = "FTP"`, `status`, `attempt`, `response_summary`.
- `$tries = 3`, `backoff = [60, 300, 900]` seconds.

**`DeliverReportViaApiJob`** (`backend/app/Jobs/DeliverReportViaApiJob.php`):
- Same file resolution as the FTP job.
- Builds a Guzzle multipart POST: `file` part (the PDF or XLSX), plus form fields `branch_id`, `date`, `report_type`, `company_id`, `format`.
- Applies auth header based on `auth_type`:
  - `none` — no header
  - `api_key` — `{auth_header_name}: {auth_value}`
  - `bearer` — `Authorization: Bearer {auth_value}`
  - `basic` — `Authorization: Basic base64(user:pass)`. UI presents two fields (Username, Password); backend concatenates as `"{user}:{pass}"` before encrypting and stores in `auth_value`.
- 2xx is success. Logs status code and a snippet (first 512 bytes) of the response body either way.
- Same retry policy as FTP job.

### Report generation (PDF + Excel, all 5 types)

The existing Attendance PDF generation lives in jobs like `GenerateDailyReportPDF` and `GenerateFormatCReportPDF`, dispatched from `GeneralDailyReport` upstream of `ReportNotificationCrons`. The other four types (Absent, AccessControl, Device, DocumentExpiry) currently send text-only alert emails and have no file generator.

**New report generator jobs** in `backend/app/Jobs/` — each runs once per day per branch per rule and produces a PDF and (if needed) an Excel file:

| Automation type | New PDF job | New Excel export class | Notes |
|---|---|---|---|
| Absent | `GenerateAbsentReportPDF` | `AbsentReportExport` | Yesterday's absent list per branch. Reuses `app/Services/AbsentReportService.php` (already added on this branch). |
| AccessControl | `GenerateAccessControlReportPDF` | `AccessControlReportExport` | Yesterday's access-control events per branch in the configured time window. |
| Device | `GenerateDeviceReportPDF` | `DeviceReportExport` | Yesterday's device events / heartbeat status per branch. |
| DocumentExpiry | `GenerateDocumentExpiryReportPDF` | `DocumentExpiryReportExport` | Documents expiring within configured threshold from yesterday's reference date. |

The Attendance pipeline keeps `GenerateDailyReportPDF` and `GenerateFormatCReportPDF` as-is; an `AttendanceReportExcelExport` job (wrapping the existing `AttendanceExport` / `AttendanceExportGeneral`) is added so Attendance gets Excel parity.

**Orchestrator** — `GeneralDailyReport` is extended (or split into a new `GenerateAllReports` command) so it loops over notifications of **all five types**, not only `type = attendance`. The dispatcher decides PDF vs Excel based on `notification.formats`:

```php
foreach ($notification->formats as $fmt) {
    if ($fmt === 'PDF')   $pdfJob::dispatch($company_id, $branchId, $from_date);
    if ($fmt === 'Excel') $xlsxJob::dispatch($company_id, $branchId, $from_date);
}
```

**File paths** mirror the existing Attendance pattern with a type-specific prefix:
- PDF: `storage/app/public/pdf/{date}/{company_id}/{type}_report_{branchId}.pdf`
- Excel: `storage/app/public/xlsx/{date}/{company_id}/{type}_report_{branchId}.xlsx`

Where `{type}` ∈ `{daily, absent, access_control, device, document_expiry}`.

**Cron filter** — `ReportNotificationCrons` already filters on `type = "attendance"` at line 64. This filter is widened to include all five types so deliveries fire for the new reports.

### Validation

`StoreRequest` and `UpdateRequest` (`backend/app/Http/Requests/ReportNotification/`):

- `formats` — required, array, must contain at least one of `["PDF","Excel"]`.
- `mediums` — required, array, at least one of `["Email","Whatsapp","FTP","API"]`.
- When `"FTP"` in `mediums`: `ftp_config.protocol` in `["ftp","sftp"]`, `ftp_config.host` required, `ftp_config.username` required, `ftp_config.remote_path` required. `password` is required only on store; on update it may be omitted to preserve the existing value.
- When `"API"` in `mediums`: `api_config.endpoint` required and validated as a URL with `http` or `https` scheme, `api_config.auth_type` in `["none","api_key","bearer","basic"]`. Auth-value-required logic depends on `auth_type` (anything except `none`).

### Test-connection endpoints

Two new POST routes under `backend/routes/api.php` (or wherever the automation routes live):
- `POST /api/automation/test-ftp` — body is the same `ftp_config` shape. Backend opens a connection, lists the remote path, returns `{ok: true}` or `{ok: false, error: "..."}`.
- `POST /api/automation/test-api` — body is the same `api_config` shape. Backend sends a small ping (a `HEAD` if the URL allows it, otherwise an `OPTIONS`). Returns `{ok, status_code, error}`.

Both endpoints are admin-authenticated like the existing automation routes; no extra auth surface.

## Components and Files

**New files**
- `backend/database/migrations/2026_05_16_*_add_formats_ftp_api_to_report_notifications.php`
- `backend/database/migrations/2026_05_16_*_add_medium_to_report_notification_logs.php`
- `backend/app/Jobs/DeliverReportViaFtpJob.php`
- `backend/app/Jobs/DeliverReportViaApiJob.php`
- `backend/app/Jobs/GenerateAbsentReportPDF.php`
- `backend/app/Jobs/GenerateAccessControlReportPDF.php`
- `backend/app/Jobs/GenerateDeviceReportPDF.php`
- `backend/app/Jobs/GenerateDocumentExpiryReportPDF.php`
- `backend/app/Jobs/GenerateAttendanceReportExcel.php`
- `backend/app/Jobs/GenerateAbsentReportExcel.php`
- `backend/app/Jobs/GenerateAccessControlReportExcel.php`
- `backend/app/Jobs/GenerateDeviceReportExcel.php`
- `backend/app/Jobs/GenerateDocumentExpiryReportExcel.php`
- `backend/app/Exports/AbsentReportExport.php`
- `backend/app/Exports/AccessControlReportExport.php`
- `backend/app/Exports/DeviceReportExport.php`
- `backend/app/Exports/DocumentExpiryReportExport.php`
- `backend/app/Services/AccessControlReportService.php`
- `backend/app/Services/DeviceReportService.php`
- `backend/app/Services/DocumentExpiryReportService.php`
- `frontend-new/src/components/Automation/_shared/FtpDestinationSection.jsx`
- `frontend-new/src/components/Automation/_shared/ApiDestinationSection.jsx`

**Modified files**
- `backend/app/Models/ReportNotification.php` — new casts.
- `backend/app/Console/Commands/ReportNotificationCrons.php` — new FTP/API dispatch blocks; widen `where("type", "attendance")` filter to include all five types.
- `backend/app/Console/Commands/GeneralDailyReport.php` — extend to dispatch all five types' PDF and Excel jobs based on `notification.formats`.
- `backend/app/Http/Requests/ReportNotification/StoreRequest.php` and `UpdateRequest.php` — new validation rules.
- `backend/app/Http/Controllers/ReportNotificationController.php` — mask secrets in `show`/`index` responses.
- `backend/routes/api.php` — add `POST /api/automation/test-ftp` and `POST /api/automation/test-api` routes.
- Five dialog files in `frontend-new/src/components/Automation/{Attendance,Absent,AccessControl,Device,DocumentExpiry}/Create.js` — add Format chips, FTP and API chips, mount the two shared destination components.
- `frontend-new/src/lib/endpoint/automation.js` — add `testFtpConnection` and `testApiConnection` helpers.

## Error Handling

| Failure | Behavior |
|---|---|
| File not yet generated when job runs | Log `file_not_ready` to `report_notification_logs`, release for retry. Next attempt re-checks. |
| FTP/API auth failure | Log error message, do not retry beyond 3 attempts. |
| Receiving API returns 5xx | Counted as failure, retried per backoff. |
| Receiving API returns 4xx | Counted as failure, retried per backoff (since this could be transient infra). After 3 attempts, gives up with logged status. |
| Invalid encrypted secret in DB (decryption fails) | Job logs `invalid_config`, does not retry. |
| Both `mediums` contains FTP/API but corresponding `_config` is null | Should not happen due to validation, but defensive: skip with `missing_config` log. |

## Security

- Secrets stored via Laravel `Crypt` (`encrypted:array` cast).
- Secrets masked as `"********"` in API responses.
- Secret field empty on update = preserve existing value; the frontend never sends back the mask string.
- API endpoint URLs validated against `http`/`https` schemes; `https` recommended via UI hint.
- No SSRF allow/deny list — admin-only feature, flagged as known limitation.

## Testing

**Backend**
- Migration creates columns and existing rows are updated correctly (`formats` defaults to `["PDF"]`, `medium` defaults to `"Email"`).
- `StoreRequest` / `UpdateRequest` rule combinations: missing FTP host when FTP medium selected → 422; missing format → 422; happy path → 200.
- `DeliverReportViaFtpJob` integration test with a local FTP server (e.g. Docker `fauria/vsftpd`) — uploads file, logs success.
- `DeliverReportViaApiJob` test with a mock HTTP server (e.g. Guzzle `MockHandler`) — verifies multipart shape, headers per auth type.
- Show/Index responses mask `ftp_config.password` and `api_config.auth_value`.

**Frontend**
- Format chips toggle correctly and at least one must remain selected (UI shows validation message).
- FTP section appears only when FTP chip active; same for API.
- "Test connection" buttons surface success/failure inline.
- Editing an existing rule: secret fields render empty with placeholder; omitting secret on save preserves the stored value.

**End-to-end (manual)**
- Create rule with `formats: [PDF, Excel]` and `mediums: [Email, FTP, API]`. Wait for cron fire (or trigger manually with `php artisan task:report_notification_crons {company_id} {rule_id}`).
- Verify email arrives with both attachments.
- Verify FTP server receives both files at `remote_path`.
- Verify API receives two POSTs (one per format) with correct multipart body and auth header.

## Open Questions

None — all scope questions resolved during brainstorming.
