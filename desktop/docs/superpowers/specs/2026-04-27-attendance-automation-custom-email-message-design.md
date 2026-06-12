# Attendance Automation — Custom Email Message

**Date:** 2026-04-27
**Status:** Approved (design)
**Owner:** sabarikrishnan2107-ux

## Problem

The Attendance Automation feature sends scheduled email reports (Daily / Weekly / Monthly) to a rule's managers. The email body is hard-coded in `app/Mail/ReportNotificationMail.php`:

```
Hi {manager},

Company: {company}
Date: {date}

Please find the attached Daily Attendance Report.

Regards,
MyTime2Cloud
```

Users want to override the *"Please find the attached … Report."* line with their own message per rule. Everything else (greeting, company, date, regards, attachment) stays the same.

## Scope

In:
- One optional free-form text field per `report_notifications` rule
- Frontend: Add/Edit Attendance Automation drawer (`Automation/Attendance/Create.js`)
- Backend: persist on `report_notifications`, render in outgoing email when set
- Apply to all three email-build paths (Daily PDF success, Weekly/Monthly Format C success, Format B fallback) for consistency

Out:
- No template placeholders (`{{company}}`, `{{manager}}`, etc.)
- No per-department / per-employee overrides
- No changes to other automation types (AccessControl, Absent, Device, DocumentExpiry, AITriggers) — this spec covers Attendance only
- No backfill or data migration of existing rows

## Multi-Tenant Isolation

The custom message lives on the `report_notifications` row, which is already keyed by `(company_id, branch_id)`. Each rule's text only goes out with that rule's emails. No cross-tenant changes needed; isolation is automatic.

## Storage

Add a new column to `report_notifications`:

```sql
ALTER TABLE report_notifications ADD COLUMN email_body TEXT NULL;
```

Rationale (vs. reusing the dormant `body` JSON column): `body` is cast to `array` in the model and would require either a JSON-wrap shape (`{"text": "..."}`) or a cast change. A dedicated `TEXT NULL` column is clearer, simpler, and additive.

The column is nullable. NULL or empty-string ⇒ "use the default line."

Length cap: validation enforces `max:5000` characters at the request layer; column itself is unconstrained `TEXT`.

## Frontend

**File:** `frontend-new/src/components/Automation/Attendance/Create.js`

1. Add `email_body: ""` to `defaultForm`.
2. In the edit-load `setForm` block, hydrate `email_body: editItemPayload?.email_body || ""`.
3. After the **Managers** section, render a new section:
   - Heading: **"Email Message"**
   - `<textarea>` bound to `form.email_body`
   - Placeholder: *"Optional — e.g. 'Daily attendance summary attached. Please review and reply if anything looks off.'"*
   - Helper text below the textarea: *"Leave blank to use the default message. This text replaces the 'Please find the attached…' line in the email."*
   - Match the visual style of the surrounding sections (`bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-elevation-1 ...`).
4. In the submit `payload`, include `email_body: form.email_body?.trim() || null`.

No other Automation pages or columns need changes.

## Backend

**1. Migration** — `backend/database/migrations/2026_04_27_000001_add_email_body_to_report_notifications_table.php`

```php
Schema::table('report_notifications', function (Blueprint $table) {
    $table->text('email_body')->nullable()->after('body');
});
```

Down: drop the column.

**2. Validation** — `backend/app/Http/Requests/ReportNotification/StoreRequest.php` and `UpdateRequest.php`

Add to the `$arr` rules:
```php
'email_body' => 'nullable|string|max:5000',
```

**3. Controller** — `backend/app/Http/Controllers/ReportNotificationController.php`

No change required. `store()` / `update()` already use `$request->except('managers')`, and `ReportNotification::$guarded = []` means `email_body` flows through automatically.

**4. Email body rendering** — `backend/app/Mail/ReportNotificationMail.php`

There are three places that build `$bodyContent`. In each, replace the literal "Please find the attached …" line with:

```php
$custom = trim($this->model->email_body ?? '');
$bodyContent .= ($custom !== '')
    ? nl2br(e($custom)) . "<br/><br/>"
    : "Please find the attached " . ucfirst($freq) . " Attendance Report.<br/><br/>";
```

(`e()` HTML-escapes user input; `nl2br` preserves line breaks. The variable name in each path is whatever's in scope — `$freq` exists in both the Daily and Weekly/Monthly blocks; the fallback path uses just "Attendance Report".)

The three insertion points (current line numbers as a guide — verify before editing):
- ~line 73: Daily-PDF-success block (replaces `"Please find the attached Daily Attendance Report.<br/><br/>"`)
- ~line 129: Weekly/Monthly-Format-C-success block (replaces `"Please find the attached " . ucfirst($freq) . " Attendance Report.<br/><br/>"`)
- ~line 178: Format B fallback block (replaces `"Please find the attached Attendance Report.<br/><br/>"`)

The fallback path doesn't have `$freq` distinction — its replacement keeps the generic "Attendance Report" phrasing.

## Verification

Manual checks after deploy:

1. Edit existing rule (e.g. `report_notifications.id = 143` for HYDERS PARK Daily Report), set custom message, save, confirm `email_body` persisted via DB query.
2. Create a new rule with empty `email_body`, save, confirm no validation error and `email_body IS NULL`.
3. Trigger `ReportNotificationCrons` (or call `/testmail`) for a rule with custom message → confirm received email shows the custom text in place of "Please find the attached…".
4. Trigger same for a rule with NULL `email_body` → confirm received email shows the original default line.
5. Set `email_body` containing HTML (e.g. `<script>alert(1)</script>`) → confirm it appears as literal escaped text in the email, not rendered.
6. Switch rule to a different `branch_id` (or create a second rule under a different company), confirm each rule's `email_body` is independent.

## Risks

- **Production DB migration** — additive nullable column, no data rewrite, safe to run online.
- **Email rendering regression** — three near-identical edits to the same file; risk of touching the wrong line. Mitigated by running through all three send paths in verification.
- **HTML injection** — mitigated by `e()` escaping. User cannot break out of the email layout or inject scripts.
