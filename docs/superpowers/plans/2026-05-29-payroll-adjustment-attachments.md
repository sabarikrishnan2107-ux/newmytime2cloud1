# Payroll Adjustment Attachments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional file-attachment support to payroll adjustments (single file, ≤ 5 MB) so reimbursements / expenses can carry a receipt, and surface a 📎 marker on the payslip PDF for affected rows.

**Architecture:** Reuse the existing `payroll_adjustments` table + Adjustments React page. Add one nullable `attachment` column. The Laravel `PayrollManagementController` learns to accept multipart uploads (store + return URL + cascade-delete the file). The React form switches to FormData when a file is picked. The payslip Blade gets six conditional 📎 markers (one per adjustment type) driven by per-type `*_has_attachment` booleans we already compute alongside the existing per-type sums.

**Tech Stack:** Laravel 10 (PHP 8.1) · pgsql · Vue-free React (Next.js 15 / static export) · `@/lib/api-client` axios wrapper · `Storage::disk('public')` for files served under `APP_URL/storage/...`.

---

## File Structure

**New**
- `backend/database/migrations/2026_05_29_000004_add_attachment_to_payroll_adjustments_table.php` — adds nullable VARCHAR column.

**Modified**
- `backend/app/Http/Controllers/PayrollManagementController.php`
  - `adjustments()` — include `attachment_url` in JSON.
  - `storeAdjustment()` — handle multipart upload, store under `payroll/adjustments/`, save path, cleanup on DB failure.
  - `deleteAdjustment()` — best-effort file removal.
  - Around the existing adjustment aggregation block (~line 518–528 and Payroll::create around line 643) — compute and persist six `*_has_attachment` booleans.
- `backend/resources/views/pdf/payslip-new.blade.php` — append 📎 to each adjustment row label when the matching `*_has_attachment` flag is true.
- `frontend-new/src/components/payroll/Adjustments.jsx`
  - Add file input to the modal.
  - Branch the Save handler to FormData when a file is attached.
  - Add an "Attach" column with a paperclip link.

**Untouched (called out so we don't drift)**
- Salary math (gross/deductions/net) is unchanged — adjustments already participate.
- `PayrollAdjustment` model — already uses `$guarded = []`, no fillable change needed.
- Other payslip templates (`payslip.blade.php`, `render-payslip.blade.php`, etc.) — only `payslip-new.blade.php` is the active one.

---

## Task 1: Database Migration

**Files:**
- Create: `backend/database/migrations/2026_05_29_000004_add_attachment_to_payroll_adjustments_table.php`

- [ ] **Step 1: Confirm the storage symlink is set up on prod**

Before any other step, on the prod box run this once if not done already:

```bash
cd /var/www/mytime2cloud/backend-v2
php artisan storage:link
```

Expected output: `The [public/storage] link has been connected to [storage/app/public].`
If you get `The [public/storage] link already exists.` you're good.

- [ ] **Step 2: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_adjustments', function (Blueprint $table) {
            $table->string('attachment', 255)->nullable()->after('remarks');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_adjustments', function (Blueprint $table) {
            $table->dropColumn('attachment');
        });
    }
};
```

- [ ] **Step 3: Confirm the column doesn't exist yet (sanity check)**

On the dev DB (which IS prod):

```bash
cd /var/www/mytime2cloud/backend-v2
php artisan tinker --execute="echo Schema::hasColumn('payroll_adjustments', 'attachment') ? 'EXISTS' : 'missing';"
```

Expected: `missing`

⚠️ **Do not run `php artisan migrate` yet.** It runs in Task 6 once all code is in place.

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_05_29_000004_add_attachment_to_payroll_adjustments_table.php
git commit -m "feat(payroll): migration to add attachment column to payroll_adjustments"
```

---

## Task 2: Backend — store / list / delete

**Files:**
- Modify: `backend/app/Http/Controllers/PayrollManagementController.php` (`adjustments()`, `storeAdjustment()`, `deleteAdjustment()` — currently lines ~160–185)

- [ ] **Step 1: Replace `adjustments()` to include `attachment_url`**

Locate the existing method (~line 160):

```php
public function adjustments(Request $request)
{
    return PayrollAdjustment::where('company_id', $request->company_id)
        ->with('employee:id,first_name,last_name,employee_id,department_id')
        ->with('employee.department:id,name')
        ->when($request->payroll_month, fn($q) => $q->where('payroll_month', $request->payroll_month))
        ->orderBy('id', 'desc')
        ->paginate($request->per_page ?? 20);
}
```

Replace with:

```php
public function adjustments(Request $request)
{
    $page = PayrollAdjustment::where('company_id', $request->company_id)
        ->with('employee:id,first_name,last_name,employee_id,department_id')
        ->with('employee.department:id,name')
        ->when($request->payroll_month, fn($q) => $q->where('payroll_month', $request->payroll_month))
        ->orderBy('id', 'desc')
        ->paginate($request->per_page ?? 20);

    $page->getCollection()->transform(function ($row) {
        $row->attachment_url = $row->attachment
            ? \Storage::disk('public')->url($row->attachment)
            : null;
        return $row;
    });

    return $page;
}
```

- [ ] **Step 2: Replace `storeAdjustment()` to handle the upload**

Locate the existing method (~line 173):

```php
public function storeAdjustment(Request $request)
{
    $data = $request->only([
        'company_id', 'employee_id', 'type', 'amount', 'payroll_month', 'remarks',
    ]);
    $data['branch_id'] = $request->branch_id ?? Employee::find($data['employee_id'])?->branch_id;
    $adj = PayrollAdjustment::create($data);
    return response()->json(['status' => true, 'data' => $adj]);
}
```

Replace with:

```php
public function storeAdjustment(Request $request)
{
    $request->validate([
        'company_id'    => 'required',
        'employee_id'   => 'required',
        'type'          => 'required|string',
        'amount'        => 'required|numeric|min:0',
        'payroll_month' => 'required|string',
        'remarks'       => 'nullable|string|max:1000',
        'attachment'    => 'nullable|file|max:5120', // 5 MB
    ]);

    $data = $request->only([
        'company_id', 'employee_id', 'type', 'amount', 'payroll_month', 'remarks',
    ]);
    $data['branch_id'] = $request->branch_id ?? Employee::find($data['employee_id'])?->branch_id;

    $storedPath = null;
    if ($request->hasFile('attachment')) {
        $storedPath = $request->file('attachment')->store('payroll/adjustments', 'public');
        $data['attachment'] = $storedPath;
    }

    try {
        $adj = PayrollAdjustment::create($data);
    } catch (\Throwable $e) {
        if ($storedPath) {
            \Storage::disk('public')->delete($storedPath);
        }
        throw $e;
    }

    $adj->attachment_url = $adj->attachment
        ? \Storage::disk('public')->url($adj->attachment)
        : null;

    return response()->json(['status' => true, 'data' => $adj]);
}
```

- [ ] **Step 3: Replace `deleteAdjustment()` to remove the file**

Locate the existing method (~line 183):

```php
public function deleteAdjustment(Request $request, $id)
{
    PayrollAdjustment::where('company_id', $request->company_id)->findOrFail($id)->delete();
    return response()->json(['status' => true, 'message' => 'Deleted']);
}
```

Replace with:

```php
public function deleteAdjustment(Request $request, $id)
{
    $adj = PayrollAdjustment::where('company_id', $request->company_id)->findOrFail($id);

    if ($adj->attachment) {
        try {
            \Storage::disk('public')->delete($adj->attachment);
        } catch (\Throwable $e) {
            \Log::warning('PayrollAdjustment file delete failed', [
                'id'         => $adj->id,
                'attachment' => $adj->attachment,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    $adj->delete();
    return response()->json(['status' => true, 'message' => 'Deleted']);
}
```

- [ ] **Step 4: Smoke test the controller via curl** (run from the prod box after deploy in Task 6 — keep this checklist item but skip until then)

For now, just verify the file compiles:

```bash
cd /var/www/mytime2cloud/backend-v2
php -l app/Http/Controllers/PayrollManagementController.php
```

Expected: `No syntax errors detected in app/Http/Controllers/PayrollManagementController.php`

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Controllers/PayrollManagementController.php
git commit -m "feat(payroll): file upload support on adjustment store/list/delete"
```

---

## Task 3: Backend — payslip `*_has_attachment` flags

**Files:**
- Modify: `backend/app/Http/Controllers/PayrollManagementController.php` (around lines 518–528 and 643)

- [ ] **Step 1: After the existing per-type sums, compute per-type attachment flags**

Locate the block in the payroll generation method (~line 523):

```php
$bonus = $adjustments->where('type', 'bonus')->sum('amount');
$incentive = $adjustments->where('type', 'incentive')->sum('amount');
$arrears = $adjustments->where('type', 'arrears')->sum('amount');
$reimbursement = $adjustments->where('type', 'reimbursement')->sum('amount');
$fineAmount = $adjustments->where('type', 'fine')->sum('amount');
$otherDed = $adjustments->where('type', 'other_deduction')->sum('amount');
```

Add immediately after:

```php
$bonusHasAttachment         = $adjustments->where('type', 'bonus')        ->whereNotNull('attachment')->isNotEmpty();
$incentiveHasAttachment     = $adjustments->where('type', 'incentive')    ->whereNotNull('attachment')->isNotEmpty();
$arrearsHasAttachment       = $adjustments->where('type', 'arrears')      ->whereNotNull('attachment')->isNotEmpty();
$reimbursementHasAttachment = $adjustments->where('type', 'reimbursement')->whereNotNull('attachment')->isNotEmpty();
$fineHasAttachment          = $adjustments->where('type', 'fine')         ->whereNotNull('attachment')->isNotEmpty();
$otherDedHasAttachment      = $adjustments->where('type', 'other_deduction')->whereNotNull('attachment')->isNotEmpty();
```

- [ ] **Step 2: Persist the booleans on the Payroll record**

Locate the `Payroll::create([...])` block (~line 643):

```php
'bonus' => $bonus,
'incentive' => $incentive,
'arrears' => $arrears,
'reimbursement' => $reimbursement,
```

Right under those four lines (and similarly under `fine_amount` / `other_deduction` further down), append:

```php
'bonus' => $bonus,
'bonus_has_attachment' => $bonusHasAttachment,
'incentive' => $incentive,
'incentive_has_attachment' => $incentiveHasAttachment,
'arrears' => $arrears,
'arrears_has_attachment' => $arrearsHasAttachment,
'reimbursement' => $reimbursement,
'reimbursement_has_attachment' => $reimbursementHasAttachment,
```

And further down where `fine_amount` and `other_deduction` are written:

```php
'fine_amount' => $fineAmount,
'fine_has_attachment' => $fineHasAttachment,
'other_deduction' => $otherDed,
'other_deduction_has_attachment' => $otherDedHasAttachment,
```

⚠️ Six new keys go into the create payload but the `payrolls` table doesn't have those columns yet. **The `$guarded = []` pattern would silently fail or error.** Choose ONE of the two paths below — recommend Path B for minimal DB change:

**Path A (touches the DB again — not recommended):** add 6 boolean columns to the `payrolls` table via another migration.

**Path B (recommended — no extra DB columns):** skip persisting the flags. Instead, in `bulkPayslips()` (and any other places that load Payroll records for the PDF), do the same `whereNotNull('attachment')` lookup against `payroll_adjustments` at render time. Pass the booleans into the Blade via the existing payslip view-model.

This plan uses Path B. **Revert this step's `Payroll::create([...])` additions** — only keep the six `*HasAttachment` local variables for now. Move on to Step 3.

- [ ] **Step 3: Locate the payslip data loader (`bulkPayslips` and friends) and compute flags at render time**

Find `bulkPayslips()` (~line 749). It loads Payroll records and renders the Blade. After it fetches the records but before passing to the view, add:

```php
// Compute per-type attachment flags from the live payroll_adjustments table.
// We do not persist these on the payrolls row (no DB change), so we look them
// up here when rendering the payslip PDF.
$recordIds = $records->pluck('id');
$adjFlags = PayrollAdjustment::query()
    ->where('company_id', $companyId)
    ->whereIn('employee_id', $records->pluck('employee_id'))
    ->whereIn('payroll_month', $records->pluck('payroll_month')->unique())
    ->whereNotNull('attachment')
    ->get(['employee_id', 'payroll_month', 'type']);

$flagMap = [];
foreach ($adjFlags as $row) {
    $key = $row->employee_id . '|' . $row->payroll_month;
    $flagMap[$key][$row->type] = true;
}

foreach ($records as $r) {
    $key = $r->employee_id . '|' . $r->payroll_month;
    $r->bonus_has_attachment         = $flagMap[$key]['bonus']           ?? false;
    $r->incentive_has_attachment     = $flagMap[$key]['incentive']       ?? false;
    $r->arrears_has_attachment       = $flagMap[$key]['arrears']         ?? false;
    $r->reimbursement_has_attachment = $flagMap[$key]['reimbursement']   ?? false;
    $r->fine_has_attachment          = $flagMap[$key]['fine']            ?? false;
    $r->other_deduction_has_attachment = $flagMap[$key]['other_deduction'] ?? false;
}
```

Place this right after `$records = ...` is built and before the view is returned.

(If there is more than one method that renders payslip-new.blade.php — e.g. a single-payslip endpoint — repeat the same block there. Grep `payslip-new` to find all call sites: `grep -n "payslip-new" backend/app/Http/Controllers/PayrollManagementController.php`.)

- [ ] **Step 4: Compile check**

```bash
cd /var/www/mytime2cloud/backend-v2
php -l app/Http/Controllers/PayrollManagementController.php
```

Expected: `No syntax errors detected ...`

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Controllers/PayrollManagementController.php
git commit -m "feat(payroll): compute per-type attachment flags for payslip rendering"
```

---

## Task 4: Blade — 📎 marker in `payslip-new.blade.php`

**Files:**
- Modify: `backend/resources/views/pdf/payslip-new.blade.php` (lines 243–246 today, and the matching deduction rows)

- [ ] **Step 1: Replace the six adjustment rows with attachment-aware versions**

Find the existing rows (around lines 243–246) and the equivalent fine / other_deduction rows further down. Each row today looks like:

```blade
@if($record->bonus > 0)<tr><td>Bonus</td><td>{{ number_format($record->bonus, 2) }}</td></tr>@endif
```

Update to:

```blade
@if($record->bonus > 0)<tr><td>Bonus@if(!empty($record->bonus_has_attachment)) 📎 @endif</td><td>{{ number_format($record->bonus, 2) }}</td></tr>@endif
@if($record->incentive > 0)<tr><td>Incentive@if(!empty($record->incentive_has_attachment)) 📎 @endif</td><td>{{ number_format($record->incentive, 2) }}</td></tr>@endif
@if($record->arrears > 0)<tr><td>Arrears@if(!empty($record->arrears_has_attachment)) 📎 @endif</td><td>{{ number_format($record->arrears, 2) }}</td></tr>@endif
@if($record->reimbursement > 0)<tr><td>Reimbursement@if(!empty($record->reimbursement_has_attachment)) 📎 @endif</td><td>{{ number_format($record->reimbursement, 2) }}</td></tr>@endif
```

Find the deduction rows further down (search for `fine_amount` and `other_deduction`) and apply the same pattern:

```blade
@if($record->fine_amount > 0)<tr><td>Fine@if(!empty($record->fine_has_attachment)) 📎 @endif</td><td>{{ number_format($record->fine_amount, 2) }}</td></tr>@endif
@if($record->other_deduction > 0)<tr><td>Other Deduction@if(!empty($record->other_deduction_has_attachment)) 📎 @endif</td><td>{{ number_format($record->other_deduction, 2) }}</td></tr>@endif
```

(If the existing fine/other_deduction rows differ slightly in label text, preserve that label and only insert the `@if($record->..._has_attachment) 📎 @endif` snippet.)

- [ ] **Step 2: Verify Blade syntax**

```bash
cd /var/www/mytime2cloud/backend-v2
php artisan view:clear
php -r "require 'vendor/autoload.php'; \$app = require 'bootstrap/app.php'; \$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo view('pdf.payslip-new', ['records' => collect([])])->render() ? 'OK' : 'FAIL', PHP_EOL;"
```

Expected: prints `OK` (or quietly succeeds — the empty collection skips most rendering).

If `view:clear` errored because the view cache directory doesn't exist, run `php artisan view:cache` once first.

- [ ] **Step 3: Commit**

```bash
git add backend/resources/views/pdf/payslip-new.blade.php
git commit -m "feat(payroll): show 📎 next to adjustment rows with attached file"
```

---

## Task 5: Frontend — file input + table column

**Files:**
- Modify: `frontend-new/src/components/payroll/Adjustments.jsx`

- [ ] **Step 1: Add `attachment` to `emptyAdjForm`**

Locate (~line 18):

```js
const emptyAdjForm = { employee_id: "", type: "bonus", amount: "", payroll_month: "", remarks: "" };
```

Replace with:

```js
const emptyAdjForm = { employee_id: "", type: "bonus", amount: "", payroll_month: "", remarks: "", attachment: null };
```

- [ ] **Step 2: Add `Paperclip` to the lucide import**

Locate (~line 5):

```js
import { Search, Plus, Trash2, X } from "lucide-react";
```

Replace with:

```js
import { Search, Plus, Trash2, X, Paperclip } from "lucide-react";
```

- [ ] **Step 3: Map `attachment_url` into the item shape in `fetchAdjustments`**

Locate `fetchAdjustments` (~line 36) inside the `.map` block, after `amount: parseFloat(a.amount) || 0,`, add:

```js
amount: parseFloat(a.amount) || 0,
attachmentUrl: a.attachment_url || null,
```

- [ ] **Step 4: Add the table column header**

Locate the existing `<thead>` (~line 114). Add a new `<th>` for "Attach" between "Remarks" and "Created By":

```jsx
<thead>
  <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
    <th className="px-4 py-3">Employee</th>
    <th className="px-3 py-3">Month</th>
    <th className="px-3 py-3">Type</th>
    <th className="px-3 py-3">Amount</th>
    <th className="px-3 py-3">Remarks</th>
    <th className="px-3 py-3">Attach</th>
    <th className="px-3 py-3">Created By</th>
    <th className="px-3 py-3">Date</th>
    <th className="px-3 py-3">Actions</th>
  </tr>
</thead>
```

- [ ] **Step 5: Render the paperclip link in each row**

Locate the row body (~line 140 — the `<td>` showing remarks). Right after the remarks cell, insert the attachment cell:

```jsx
<td className="px-3 py-3 max-w-[200px] truncate text-gray-500">{a.remarks}</td>
<td className="px-3 py-3">
  {a.attachmentUrl ? (
    <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center text-primary hover:text-blue-600">
      <Paperclip className="h-3.5 w-3.5" />
    </a>
  ) : (
    <span className="text-gray-400">—</span>
  )}
</td>
```

- [ ] **Step 6: Bump the empty-state colspan from 8 to 9**

Locate (~line 151):

```jsx
<tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400 text-xs">No adjustments found</td></tr>
```

Replace with:

```jsx
<tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400 text-xs">No adjustments found</td></tr>
```

- [ ] **Step 7: Add the file input to the modal**

Locate the Remarks field (~line 233):

```jsx
<div className="space-y-1.5">
  <label className="text-xs font-medium text-gray-500">Remarks</label>
  <textarea placeholder="Reason..." rows={3} value={adjForm.remarks} onChange={e => setAdjForm({ ...adjForm, remarks: e.target.value })}
    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 resize-none"></textarea>
</div>
```

Right after that closing `</div>`, add a new field:

```jsx
<div className="space-y-1.5">
  <label className="text-xs font-medium text-gray-500">Attachment (optional, ≤ 5 MB)</label>
  <div className="flex items-center gap-2">
    <input
      type="file"
      onChange={(e) => {
        const f = e.target.files?.[0] || null;
        if (f && f.size > 5 * 1024 * 1024) {
          alert("File too large. Maximum 5 MB.");
          e.target.value = "";
          return;
        }
        setAdjForm({ ...adjForm, attachment: f });
      }}
      className="flex-1 text-xs text-gray-700 dark:text-gray-300 file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-blue-600"
    />
    {adjForm.attachment && (
      <button type="button" onClick={() => setAdjForm({ ...adjForm, attachment: null })}
        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400" aria-label="Clear file">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
</div>
```

- [ ] **Step 8: Branch the Save handler to send FormData when a file is attached**

Locate the Save handler (~line 245):

```jsx
<button disabled={saving} onClick={async () => {
  if (!adjForm.employee_id || !adjForm.amount || !adjForm.payroll_month) { alert("Employee, Amount, and Payroll Month are required"); return; }
  setSaving(true);
  try {
    const params = await buildQueryParams({});
    await api.post("/payroll-management/adjustments", { ...params, ...adjForm });
    setDialogOpen(false);
    setAdjForm(emptyAdjForm);
    fetchAdjustments();
  } catch (e) { alert(e?.response?.data?.message || "Save failed"); }
  finally { setSaving(false); }
}}
```

Replace with:

```jsx
<button disabled={saving} onClick={async () => {
  if (!adjForm.employee_id || !adjForm.amount || !adjForm.payroll_month) { alert("Employee, Amount, and Payroll Month are required"); return; }
  setSaving(true);
  try {
    const params = await buildQueryParams({});
    const { attachment, ...rest } = adjForm;
    if (attachment) {
      const fd = new FormData();
      Object.entries({ ...params, ...rest }).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") fd.append(k, v);
      });
      fd.append("attachment", attachment);
      await api.post("/payroll-management/adjustments", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } else {
      await api.post("/payroll-management/adjustments", { ...params, ...rest });
    }
    setDialogOpen(false);
    setAdjForm(emptyAdjForm);
    fetchAdjustments();
  } catch (e) { alert(e?.response?.data?.message || "Save failed"); }
  finally { setSaving(false); }
}}
```

- [ ] **Step 9: Build the frontend**

```bash
cd /d/newmytime2cloud/frontend-new
npm run build 2>&1 | tail -n 8
```

Expected: ends with `○ (Static) prerendered as static content` and no errors. The `payslips/adjustments` route should still appear in the route table.

- [ ] **Step 10: Commit**

```bash
git add frontend-new/src/components/payroll/Adjustments.jsx
git commit -m "feat(payroll): attachment upload + paperclip column on Adjustments page"
```

---

## Task 6: Deploy + run the migration on prod

**Files:** none changed in this task — pure deploy steps.

⚠️ **This is the only task that touches the shared production database.** Get explicit user go-ahead before running `php artisan migrate`.

- [ ] **Step 1: Upload backend files via FileZilla to prod**

Files to upload (overwrite if present):

```
backend/database/migrations/2026_05_29_000004_add_attachment_to_payroll_adjustments_table.php
backend/app/Http/Controllers/PayrollManagementController.php
backend/resources/views/pdf/payslip-new.blade.php
```

Targets on prod (mirror of repo layout):

```
/var/www/mytime2cloud/backend-v2/database/migrations/2026_05_29_000004_add_attachment_to_payroll_adjustments_table.php
/var/www/mytime2cloud/backend-v2/app/Http/Controllers/PayrollManagementController.php
/var/www/mytime2cloud/backend-v2/resources/views/pdf/payslip-new.blade.php
```

- [ ] **Step 2: Run the migration on prod** (requires explicit user approval)

```bash
cd /var/www/mytime2cloud/backend-v2
php artisan migrate
```

Expected output ends with: `Migrating: 2026_05_29_000004_add_attachment_to_payroll_adjustments_table` followed by `Migrated: 2026_05_29_000004_add_attachment_to_payroll_adjustments_table (X.XXms)`.

- [ ] **Step 3: Restart php-fpm and clear caches**

```bash
sudo systemctl restart php8.1-fpm
cd /var/www/mytime2cloud/backend-v2
php artisan view:clear
php artisan config:clear
```

- [ ] **Step 4: Verify the column exists**

```bash
cd /var/www/mytime2cloud/backend-v2
php artisan tinker --execute="echo Schema::hasColumn('payroll_adjustments', 'attachment') ? 'EXISTS' : 'missing';"
```

Expected: `EXISTS`.

- [ ] **Step 5: Deploy the frontend `out/` folder**

Upload the freshly-built `frontend-new/out/` to wherever the frontend is served from. The `out/payslips/adjustments/index.html` must be updated.

---

## Task 7: End-to-end smoke test

**Files:** none — verification only.

- [ ] **Step 1: List existing adjustments (regression check)**

Open the Adjustments page in the browser. The existing rows should still render, with `—` in the new "Attach" column.

- [ ] **Step 2: Create an adjustment WITHOUT an attachment**

Click "Add Adjustment", fill in any test employee, type `bonus`, amount `100`, payroll month `2026-05`, remarks `regression no-file`. Click Save.

Expected: row appears, no JS errors in console. Attach column shows `—`.

- [ ] **Step 3: Create an adjustment WITH a small PDF**

Click "Add Adjustment", same employee, type `reimbursement`, amount `500`, payroll month `2026-05`, remarks `e2e with file`. Pick a small PDF (< 1 MB). Click Save.

Expected: row appears with a paperclip icon in the Attach column. Click the icon → PDF opens in a new tab.

- [ ] **Step 4: Reject an oversized file**

Click "Add Adjustment", pick a file > 5 MB.

Expected: alert "File too large. Maximum 5 MB." The file input clears. The form does not submit.

- [ ] **Step 5: Verify the file is on disk**

```bash
ls -la /var/www/mytime2cloud/backend-v2/storage/app/public/payroll/adjustments/
```

Expected: at least one file present, with a long hashed name.

- [ ] **Step 6: Generate payroll for the test month and download payslip PDF**

Go to Payroll Register → pick the month (`2026-05`) → Generate (if not already) → Download PDF for the test employee.

Expected:
- The Reimbursement row reads `Reimbursement 📎` with the amount `500.00`
- The Bonus row reads `Bonus` (no paperclip — that adjustment had no file)
- Net salary increased by `100 + 500 = 600` compared to a baseline without these adjustments

- [ ] **Step 7: Delete the adjustment with the attachment**

Back on the Adjustments page, click the trash icon on the `reimbursement / 500 / e2e with file` row.

Expected: row disappears.

- [ ] **Step 8: Verify the file was cleaned up**

```bash
ls -la /var/www/mytime2cloud/backend-v2/storage/app/public/payroll/adjustments/
```

Expected: the hashed file from Step 5 is gone.

---

## Self-Review Notes

- **Spec coverage:** All four units from the spec (DB column, backend, frontend, payslip 📎) map to Tasks 1–4. Task 5 covers frontend in full. Task 6 is the deploy that the spec's deployment checklist calls out. Task 7 covers each smoke-test item from the spec's "Testing" section.
- **Placeholders:** None — every code block is concrete.
- **Path B decision:** Persisting `*_has_attachment` on the `payrolls` row would require six more DB columns, which violates the spec's "no salary calc / no extra schema change" boundary. Task 3 Step 3 documents that we compute the flags at render time instead. This is the only deviation from the literal Blade snippet in the spec — and it matches the spec's intent (no payroll math change).
- **Type consistency:** `attachment_url` is the only new field returned by the API. Used identically in `adjustments()`, `storeAdjustment()`, and the React `attachmentUrl` mapping.
