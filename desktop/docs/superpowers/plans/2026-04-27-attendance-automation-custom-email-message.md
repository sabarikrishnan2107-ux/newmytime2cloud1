# Attendance Automation — Custom Email Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional per-rule custom email body that replaces the *"Please find the attached … Report."* line in Attendance Automation emails.

**Architecture:** New nullable `email_body TEXT` column on `report_notifications`. Frontend adds a textarea after the Managers section. Backend validates and persists the field; the mail builder swaps in the custom text (HTML-escaped, line breaks preserved) when present, otherwise renders the existing default line.

**Tech Stack:** Laravel 9 / PHP, PostgreSQL (shared production), Next.js + React (frontend-new), Tailwind.

**Note on git:** This project's owner handles all `git add` / `git commit` / `git push` themselves. The plan calls out logical commit points but does **not** include executable git commands. Stop at each "👤 USER COMMIT CHECKPOINT" so they can commit before moving on.

**Note on tests:** This codebase has no automated test suite for the mail / form flow. Verification is manual, per the spec's verification checklist. Steps below show exact manual verification commands and DB queries.

**Spec:** [`docs/superpowers/specs/2026-04-27-attendance-automation-custom-email-message-design.md`](../specs/2026-04-27-attendance-automation-custom-email-message-design.md)

---

## File Map

**Create:**
- `backend/database/migrations/2026_04_27_000001_add_email_body_to_report_notifications_table.php`

**Modify:**
- `backend/app/Http/Requests/ReportNotification/StoreRequest.php`
- `backend/app/Http/Requests/ReportNotification/UpdateRequest.php`
- `backend/app/Mail/ReportNotificationMail.php`
- `frontend-new/src/components/Automation/Attendance/Create.js`

**Untouched (verified during design):**
- `backend/app/Http/Controllers/ReportNotificationController.php` — `store()`/`update()` already use `$request->except('managers')` and `ReportNotification::$guarded = []`, so `email_body` flows through automatically.
- `backend/app/Models/ReportNotification.php` — `$guarded = []` covers the new column.
- `frontend-new/src/lib/endpoint/automation.js` — already passes the full payload through.

---

## Task 1: Database migration

**Files:**
- Create: `backend/database/migrations/2026_04_27_000001_add_email_body_to_report_notifications_table.php`

- [ ] **Step 1.1: Create the migration file**

Write the file exactly:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasColumn('report_notifications', 'email_body')) {
            Schema::table('report_notifications', function (Blueprint $table) {
                $table->text('email_body')->nullable()->after('body');
            });
        }
    }

    public function down()
    {
        Schema::table('report_notifications', function (Blueprint $table) {
            $table->dropColumn('email_body');
        });
    }
};
```

- [ ] **Step 1.2: Run the migration against the shared production DB**

From `backend/`:

```bash
php artisan migrate --path=database/migrations/2026_04_27_000001_add_email_body_to_report_notifications_table.php
```

Expected output: `Migrated:  2026_04_27_000001_add_email_body_to_report_notifications_table`

- [ ] **Step 1.3: Verify the column exists**

Use the Node + `pg` script pattern that already works in this project (place a temporary file inside `loglistner_mqtt/` so it picks up the installed `pg` module):

```js
// loglistner_mqtt/verify_email_body_column.js
const { Client } = require('pg');
const c = new Client({ host: '139.59.69.241', port: 5432, database: 'mytime2cloud-v2', user: 'francis', password: 'test123' });
(async () => {
  await c.connect();
  const r = await c.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='report_notifications' AND column_name='email_body'`);
  console.log(r.rows);
  await c.end();
})();
```

Run: `node loglistner_mqtt/verify_email_body_column.js`
Expected output: one row showing `email_body | text | YES`. Delete the file after verifying.

- [ ] **Step 1.4: 👤 USER COMMIT CHECKPOINT**

Stop. Ask the user to commit the migration file before continuing.

---

## Task 2: Backend request validation

**Files:**
- Modify: `backend/app/Http/Requests/ReportNotification/StoreRequest.php`
- Modify: `backend/app/Http/Requests/ReportNotification/UpdateRequest.php`

- [ ] **Step 2.1: Add validation rule to StoreRequest**

In `backend/app/Http/Requests/ReportNotification/StoreRequest.php`, inside the `$arr` array in `rules()`, add `email_body` next to the commented-out `body` line. Replace:

```php
        $arr = [
            'automation' => 'nullable',
            'subject' => 'required',
            // 'body' => 'nullable',
            'day' => 'nullable',
```

with:

```php
        $arr = [
            'automation' => 'nullable',
            'subject' => 'required',
            // 'body' => 'nullable',
            'email_body' => 'nullable|string|max:5000',
            'day' => 'nullable',
```

- [ ] **Step 2.2: Add the same rule to UpdateRequest**

In `backend/app/Http/Requests/ReportNotification/UpdateRequest.php`, replace:

```php
        $arr = [
            'subject' => 'required',
            // 'body' => 'nullable',
            'day' => 'nullable',
```

with:

```php
        $arr = [
            'subject' => 'required',
            // 'body' => 'nullable',
            'email_body' => 'nullable|string|max:5000',
            'day' => 'nullable',
```

- [ ] **Step 2.3: Sanity-check the change compiles**

From `backend/`:

```bash
php -l app/Http/Requests/ReportNotification/StoreRequest.php
php -l app/Http/Requests/ReportNotification/UpdateRequest.php
```

Expected: `No syntax errors detected` for both files.

- [ ] **Step 2.4: 👤 USER COMMIT CHECKPOINT**

Stop. Ask the user to commit the two request files before continuing.

---

## Task 3: Backend email body rendering

**Files:**
- Modify: `backend/app/Mail/ReportNotificationMail.php` (three locations)

The file builds `$bodyContent` in three places. Each currently contains a hard-coded "Please find the attached … Report." line. Replace each with a conditional that uses the rule's `email_body` when set.

- [ ] **Step 3.1: Replace the Daily-PDF-success block**

Find this exact block (currently around line 70-75):

```php
                $managerName = optional($this->manager)->name ?? 'Manager';
                $bodyContent  = "Hi {$managerName},<br/><br/>";
                $bodyContent .= "<b>Company: {$companyName}</b><br/>";
                $bodyContent .= "Date: {$dateDisplay}<br/><br/>";
                $bodyContent .= "Please find the attached Daily Attendance Report.<br/><br/>";
                $bodyContent .= "Regards,<br/>MyTime2Cloud";
                return $this->view('emails.report')->with(['body' => $bodyContent]);
```

Replace with:

```php
                $managerName = optional($this->manager)->name ?? 'Manager';
                $bodyContent  = "Hi {$managerName},<br/><br/>";
                $bodyContent .= "<b>Company: {$companyName}</b><br/>";
                $bodyContent .= "Date: {$dateDisplay}<br/><br/>";
                $custom = trim($this->model->email_body ?? '');
                $bodyContent .= ($custom !== '')
                    ? nl2br(e($custom)) . "<br/><br/>"
                    : "Please find the attached Daily Attendance Report.<br/><br/>";
                $bodyContent .= "Regards,<br/>MyTime2Cloud";
                return $this->view('emails.report')->with(['body' => $bodyContent]);
```

- [ ] **Step 3.2: Replace the Weekly/Monthly Format-C-success block**

Find this exact block (currently around line 124-131):

```php
            if ($attachedAny) {
                $managerName = optional($this->manager)->name ?? 'Manager';
                $bodyContent  = "Hi {$managerName},<br/><br/>";
                $bodyContent .= "<b>Company: {$companyName}</b><br/>";
                $bodyContent .= "Period: {$dateDisplay}<br/><br/>";
                $bodyContent .= "Please find the attached " . ucfirst($freq) . " Attendance Report.<br/><br/>";
                $bodyContent .= "Regards,<br/>MyTime2Cloud";
                return $this->view('emails.report')->with(['body' => $bodyContent]);
            }
```

Replace with:

```php
            if ($attachedAny) {
                $managerName = optional($this->manager)->name ?? 'Manager';
                $bodyContent  = "Hi {$managerName},<br/><br/>";
                $bodyContent .= "<b>Company: {$companyName}</b><br/>";
                $bodyContent .= "Period: {$dateDisplay}<br/><br/>";
                $custom = trim($this->model->email_body ?? '');
                $bodyContent .= ($custom !== '')
                    ? nl2br(e($custom)) . "<br/><br/>"
                    : "Please find the attached " . ucfirst($freq) . " Attendance Report.<br/><br/>";
                $bodyContent .= "Regards,<br/>MyTime2Cloud";
                return $this->view('emails.report')->with(['body' => $bodyContent]);
            }
```

- [ ] **Step 3.3: Replace the Format-B fallback block**

Find this exact block (currently around line 172-183, the bottom of the `build()` method):

```php
        $managerName = optional($this->manager)->name ?? 'Manager';
        $companyName = optional($this->model->company)->name ?? 'N/A';

        $bodyContent = "Hi {$managerName},<br/><br/>";
        $bodyContent .= "<b>Company: {$companyName}</b><br/>";
        $bodyContent .= "Date: {$dateDisplay}<br/><br/>";
        $bodyContent .= "Please find the attached Attendance Report.<br/><br/>";
        $bodyContent .= "Regards,<br/>MyTime2Cloud";

        return $this->view('emails.report')->with([
            'body' => $bodyContent
        ]);
```

Replace with:

```php
        $managerName = optional($this->manager)->name ?? 'Manager';
        $companyName = optional($this->model->company)->name ?? 'N/A';

        $bodyContent = "Hi {$managerName},<br/><br/>";
        $bodyContent .= "<b>Company: {$companyName}</b><br/>";
        $bodyContent .= "Date: {$dateDisplay}<br/><br/>";
        $custom = trim($this->model->email_body ?? '');
        $bodyContent .= ($custom !== '')
            ? nl2br(e($custom)) . "<br/><br/>"
            : "Please find the attached Attendance Report.<br/><br/>";
        $bodyContent .= "Regards,<br/>MyTime2Cloud";

        return $this->view('emails.report')->with([
            'body' => $bodyContent
        ]);
```

- [ ] **Step 3.4: Sanity-check the file compiles**

From `backend/`:

```bash
php -l app/Mail/ReportNotificationMail.php
```

Expected: `No syntax errors detected`.

- [ ] **Step 3.5: 👤 USER COMMIT CHECKPOINT**

Stop. Ask the user to commit `ReportNotificationMail.php` before continuing.

---

## Task 4: Frontend — add textarea + form state

**Files:**
- Modify: `frontend-new/src/components/Automation/Attendance/Create.js`

- [ ] **Step 4.1: Add `email_body` to `defaultForm`**

Find (currently around line 74-87):

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
            managers: [],
        }),
        []
    );
```

Replace with:

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
            managers: [],
            email_body: "",
        }),
        []
    );
```

- [ ] **Step 4.2: Hydrate `email_body` on edit**

Find the `setForm({...})` call inside the `useEffect` (currently around line 117-131):

```js
            setForm({
                ...defaultForm,
                branch_id: editItemPayload?.branch_id || "",
                subject: editItemPayload?.subject || "Your Subject here",
                time: editItemPayload?.time || "09:00",
                report_type: editItemPayload?.frequency || "Daily",
                days: editItemPayload?.days || ["1"],
                weekly_day: editItemPayload?.day || "Monday",
                monthly_date: editItemPayload?.date || "1",
                mediums: editItemPayload?.mediums || ["Email"],
                managers: (editItemPayload?.managers || []).map(m => ({
                    name: m.name || "",
                    email: m.email || "",
                })),
            });
```

Replace with:

```js
            setForm({
                ...defaultForm,
                branch_id: editItemPayload?.branch_id || "",
                subject: editItemPayload?.subject || "Your Subject here",
                time: editItemPayload?.time || "09:00",
                report_type: editItemPayload?.frequency || "Daily",
                days: editItemPayload?.days || ["1"],
                weekly_day: editItemPayload?.day || "Monday",
                monthly_date: editItemPayload?.date || "1",
                mediums: editItemPayload?.mediums || ["Email"],
                managers: (editItemPayload?.managers || []).map(m => ({
                    name: m.name || "",
                    email: m.email || "",
                })),
                email_body: editItemPayload?.email_body || "",
            });
```

- [ ] **Step 4.3: Include `email_body` in submit payload**

Find the `payload` object inside `onSubmit` (currently around line 169-181):

```js
            const payload = {
                company_id: user.company_id,
                type: "attendance",
                branch_id: form.branch_id || null,
                subject: form.subject,
                time: form.time,
                days: form.days,
                mediums: form.mediums,
                managers: form.managers.map(e => ({ ...e, company_id: user.company_id, branch_id: form.branch_id })).filter((m) => m.name || m.email || m.whatsapp_number),
                frequency: form.report_type,
                day: form.report_type === "Weekly" ? form.weekly_day : null,
                date: form.report_type === "Monthly" ? form.monthly_date : null,
            };
```

Replace with:

```js
            const payload = {
                company_id: user.company_id,
                type: "attendance",
                branch_id: form.branch_id || null,
                subject: form.subject,
                time: form.time,
                days: form.days,
                mediums: form.mediums,
                managers: form.managers.map(e => ({ ...e, company_id: user.company_id, branch_id: form.branch_id })).filter((m) => m.name || m.email || m.whatsapp_number),
                frequency: form.report_type,
                day: form.report_type === "Weekly" ? form.weekly_day : null,
                date: form.report_type === "Monthly" ? form.monthly_date : null,
                email_body: form.email_body?.trim() || null,
            };
```

- [ ] **Step 4.4: Add the textarea section after Managers**

Find the closing `</section>` of the Managers section, followed by `</div>` closing the body wrapper (currently around line 411-413):

```jsx
                                </section>
                            </div>
                        </div>
```

Replace with:

```jsx
                                </section>

                                <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-elevation-1 border border-gray-200 dark:border-white/5">
                                    <h2 className="text-sm font-bold text-gray-600 dark:text-white mb-2">
                                        Email Message
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        Optional. Leave blank to use the default message. This text replaces the &quot;Please find the attached…&quot; line in the email.
                                    </p>
                                    <textarea
                                        value={form.email_body}
                                        onChange={(e) => setField("email_body", e.target.value)}
                                        placeholder="e.g. Daily attendance summary attached. Please review and reply if anything looks off."
                                        rows={5}
                                        maxLength={5000}
                                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                                    />
                                </section>
                            </div>
                        </div>
```

- [ ] **Step 4.5: Smoke-test the build**

From `frontend-new/`:

```bash
npm run build
```

Expected: build succeeds. If it fails on this file, the JSX structure didn't close correctly — re-check Step 4.4.

(If the user prefers to skip the full build and just run the dev server, `npm run dev` and loading the Automation page is sufficient.)

- [ ] **Step 4.6: 👤 USER COMMIT CHECKPOINT**

Stop. Ask the user to commit `Create.js` before continuing.

---

## Task 5: Manual end-to-end verification

**Files:** none (verification only)

Per the spec's verification checklist. Run these on the live system after all code is committed and the frontend is restarted.

- [ ] **Step 5.1: Edit an existing rule, set custom message, save**

Open the Attendance Automation page, edit one of the Tanjore rows (e.g. notification id 143 — Daily Report). Type a custom message, e.g.:

```
Hi team,

Today's attendance is attached. Please flag any anomalies before EOD.

Thanks,
Operations
```

Click **Update**. Expect a success toast.

- [ ] **Step 5.2: Verify persistence via DB query**

Use the same Node + `pg` script pattern (place inside `loglistner_mqtt/`):

```js
// loglistner_mqtt/verify_email_body_persisted.js
const { Client } = require('pg');
const c = new Client({ host: '139.59.69.241', port: 5432, database: 'mytime2cloud-v2', user: 'francis', password: 'test123' });
(async () => {
  await c.connect();
  const r = await c.query(`SELECT id, subject, email_body FROM report_notifications WHERE id IN (142,143,144) ORDER BY id`);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})();
```

Run: `node loglistner_mqtt/verify_email_body_persisted.js`
Expected: row 143 shows the custom text in `email_body`; rows 142 and 144 still show `null`. Delete the file after verifying.

- [ ] **Step 5.3: Create a fresh rule with empty Email Message**

Click **Add**, fill required fields, leave the Email Message textarea blank, click **Save**. Confirm no validation error and a row is created. Re-run the query from Step 5.2 (extending the IN clause to include the new id) and confirm `email_body IS NULL`.

- [ ] **Step 5.4: Trigger an actual email send for the rule with a custom message**

Use the existing `testmail` route in `ReportNotificationController.php` as the reference pattern. The simplest path is to temporarily change the hard-coded `id` (currently `35`) to the id of the rule you just edited (e.g. `143`) and the recipient to your own inbox, then hit:

```
GET {APP_URL}/api/testmail   (whatever the route is wired to — check routes/api.php)
```

Or wait for the next scheduled `ReportNotificationCrons` run that picks up rule 143.

Confirm the received email shows your custom text in place of *"Please find the attached Daily Attendance Report."* — the greeting (`Hi sabari,`), `Company: HYDERS PARK`, the date line, the PDF attachment, and `Regards, MyTime2Cloud` should all be unchanged.

- [ ] **Step 5.5: Trigger a send for a rule that left email_body NULL**

Repeat Step 5.4 against rule 142 (or the new blank one from Step 5.3). Expected: email shows the original *"Please find the attached … Report."* line — proving the fallback still works.

- [ ] **Step 5.6: HTML-injection check**

Edit any rule and set the Email Message to:

```
<script>alert('xss')</script>
<b>not bold</b>
```

Save, trigger a send (Step 5.4 pattern). Confirm the received email shows the literal text including the `<script>` and `<b>` tags as plain text — not rendered, not bolded, no script execution. This proves the `e()` escape works.

- [ ] **Step 5.7: Multi-tenant isolation check**

If you have access to a second company's automation rule, edit one there with a distinct custom message and confirm rule 143's email is unaffected (its `email_body` remains its own value). If only one company is available, this is implicitly covered by Step 5.2 showing per-row independence.

- [ ] **Step 5.8: 👤 FINAL USER SIGN-OFF**

Verification complete. Confirm with the user that the feature works as expected.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Storage (new `email_body TEXT NULL`) → Task 1
- ✅ Frontend defaultForm + edit hydration + payload + textarea → Task 4 (steps 4.1–4.4)
- ✅ StoreRequest + UpdateRequest validation → Task 2
- ✅ Three mail rendering edits (Daily / Weekly+Monthly / Format B fallback) → Task 3 (steps 3.1–3.3)
- ✅ Multi-tenant isolation (no extra work, automatic) → noted in spec, covered by verification Step 5.7
- ✅ All six manual verification items from the spec → Task 5 (steps 5.1–5.6)

**Type / name consistency:**
- Column name `email_body` used identically in: migration, validation rules, controller (implicit via `$guarded=[]`), mail file, frontend `defaultForm`, edit hydration, and submit payload. ✓
- `$this->model->email_body` correct on `ReportNotificationMail` (its `model` is a `ReportNotification` instance). ✓
- `e()` and `nl2br()` are Laravel/PHP global helpers, available without import. ✓

**Placeholder scan:** No TBDs, no "implement later", every code step has the actual code. ✓
