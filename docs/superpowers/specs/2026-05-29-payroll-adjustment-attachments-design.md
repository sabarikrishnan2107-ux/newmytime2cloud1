# Payroll Adjustment Attachments — Design

**Date:** 2026-05-29
**Status:** Approved (design); implementation plan pending
**Owner:** mail@akilgroup.com

## Problem

The payroll Adjustments page lets users create monthly salary adjustments (bonus, incentive, arrears, reimbursement, fine, other_addition, other_deduction). For reimbursement / expense rows, there is currently no way to attach a receipt or proof file. The user wants to record an "expense" against an employee — amount + reason + a file attachment — and have that expense flow into that employee's salary for the chosen month.

## Decision

Reuse the existing Adjustments workflow rather than introduce a new "Expenses" concept. Add **optional attachment support** to every adjustment type. An "expense" is then just a Reimbursement adjustment (or any other type the user picks) with a file attached. Salary calculation already includes adjustments — no change to payroll math.

This was explicitly chosen by the user over (a) a brand-new Expense table + page and (b) a parallel Expense page that writes to `payroll_adjustments` under the hood.

## Scope

### In
- One new `attachment` column on `payroll_adjustments` (nullable VARCHAR).
- Backend store endpoint accepts a multipart file (any common type, max 5 MB), saves to disk, stores the relative path.
- Backend destroy endpoint removes the file from disk along with the row.
- Frontend modal gains a file input. The adjustments table gains an "Attachment" column with a paperclip link.

### Out
- No new endpoints, no new table, no separate Expense page.
- No edit flow (Adjustments today is create + delete only — preserved).
- No approval workflow.
- No file thumbnails / inline preview — link opens in a new tab.
- No bulk upload.

## Architecture

Four isolated units, each independently understandable:

### Unit 1 — Database schema

A migration adds one column. Nothing else changes in the table.

**File:** `backend/database/migrations/2026_05_29_000003_add_attachment_to_payroll_adjustments_table.php`

```sql
ALTER TABLE payroll_adjustments
  ADD COLUMN attachment VARCHAR(255) NULL AFTER remarks;
```

⚠️ **Production-DB note**: per project setup, the dev codebase shares the live production database. The migration MUST NOT run automatically. Deploy path:
1. User explicitly approves the migration.
2. Run `php artisan migrate` on prod after deploying the migration file, or apply the equivalent `ALTER TABLE` manually.
3. Reload php-fpm to clear OPcache (see [[deployment_live_backend]]).

### Unit 2 — Backend

**File: `backend/app/Models/PayrollAdjustment.php`**
- Add `attachment` to `$fillable`.
- (No accessor — the controller returns the URL explicitly when serializing.)

**File: `backend/app/Http/Controllers/PayrollManagementController.php`** — already serves the three routes:
- `GET  /payroll-management/adjustments` → `adjustments()`
- `POST /payroll-management/adjustments` → `storeAdjustment()`
- `DELETE /payroll-management/adjustments/{id}` → `deleteAdjustment()`

Changes:
- `storeAdjustment(Request $request)`:
  - Validate: `attachment` is `nullable|file|max:5120` (5 MB).
  - If file present: `Storage::disk('public')->putFile('payroll/adjustments', $file)` → returns the path.
  - Save the path on the model.
  - Wrap insert + file move in a DB transaction; if DB insert fails, delete the just-uploaded file.
- `adjustments()`:
  - For each adjustment, include `attachment_url` (full URL via `Storage::url($path)`) in the JSON response. Keep raw `attachment` (path) too.
- `deleteAdjustment($id)`:
  - Before deleting the row, if `attachment` is non-null, call `Storage::disk('public')->delete($path)`.
  - Ignore failures on delete (best-effort cleanup) but log them.

**Validation rules** (full set):
- `employee_id`: required, exists in employees
- `type`: required, in allowed types
- `amount`: required, decimal, >= 0
- `payroll_month`: required, format `YYYY-MM`
- `remarks`: nullable, max 1000 chars
- `attachment`: nullable, file, max 5120 KB

Any common type allowed — no mime restriction. Storage path: `storage/app/public/payroll/adjustments/{auto-generated-filename}`.

### Unit 3 — Frontend

**File: `frontend-new/src/components/payroll/Adjustments.jsx`**

Modal form changes:
- Add a single `<input type="file">` below the remarks field, labeled "Attachment (optional)".
- Store the selected `File` in form state (`adjForm.attachment`).
- When submitting:
  - If `adjForm.attachment` is set, build a `FormData` payload and POST that.
  - Otherwise POST JSON as today (so existing flows are unchanged for adjustments without attachments).
- Show a small filename + clear button next to the input once a file is picked.

Table changes:
- New "Attachment" column between Remarks and Created.
- Renders a paperclip Lucide icon link (`<a>` opening `attachment_url` in a new tab) when present.
- Renders `—` when absent.

No CSV export, no preview, no thumbnail. Click → opens or downloads in a new tab depending on browser handling of the file's MIME.

### Unit 4 — Payslip PDF marker

The payslip blade (`backend/resources/views/pdf/payslip-new.blade.php`) already shows non-zero adjustment rows like:

```blade
@if($record->reimbursement > 0)<tr><td>Reimbursement</td><td>{{ number_format($record->reimbursement, 2) }}</td></tr>@endif
```

We add a small **📎** marker next to the type label when any adjustment of that type for that employee+month has an attachment. The reviewer can then go back to the Adjustments page to see the file.

**Backend change** — in `PayrollManagementController` around line 523 (the adjustment aggregation block), also compute a per-type boolean:

```php
$bonusHasAttachment         = $adjustments->where('type', 'bonus')        ->whereNotNull('attachment')->isNotEmpty();
$incentiveHasAttachment     = $adjustments->where('type', 'incentive')    ->whereNotNull('attachment')->isNotEmpty();
$arrearsHasAttachment       = $adjustments->where('type', 'arrears')      ->whereNotNull('attachment')->isNotEmpty();
$reimbursementHasAttachment = $adjustments->where('type', 'reimbursement')->whereNotNull('attachment')->isNotEmpty();
$fineHasAttachment          = $adjustments->where('type', 'fine')         ->whereNotNull('attachment')->isNotEmpty();
$otherDedHasAttachment      = $adjustments->where('type', 'other_deduction')->whereNotNull('attachment')->isNotEmpty();
```

Add the corresponding `*_has_attachment` keys to the record array assembled around line 643.

**Blade change** — each existing row becomes:

```blade
@if($record->reimbursement > 0)
  <tr>
    <td>Reimbursement{{ $record->reimbursement_has_attachment ?? false ? ' 📎' : '' }}</td>
    <td>{{ number_format($record->reimbursement, 2) }}</td>
  </tr>
@endif
```

Same pattern for Bonus, Incentive, Arrears, Fine, Other Deduction. No new layout, no row count change. If no attachment exists for that type, the row renders exactly as it does today.

## Data Flow

```
User opens Adjustments modal
  → fills employee, type, amount, month, remarks
  → picks a file (optional)
  → clicks Save
  → React:
       - If file present → FormData POST /payroll-management/adjustments
       - Else            → JSON POST   /payroll-management/adjustments
  → Laravel:
       - Validate request
       - DB::transaction:
           - Move uploaded file to storage/app/public/payroll/adjustments/{uuid}.{ext}
           - Create payroll_adjustments row with attachment path
       - Return JSON { ...adjustment, attachment_url }
  → React:
       - Append the new row to the local adjustments list
       - Close modal
  → Existing salary calculation already picks up the adjustment for that month — no change.
```

## Error Handling

| Scenario | Backend response | Frontend behavior |
|---|---|---|
| File > 5 MB | 422 with field error | Inline error under file input |
| File upload write fails | 500 | Toast: "Couldn't save attachment. Try again." |
| DB insert fails after upload | 500 + file cleaned up in transaction rollback | Toast: "Couldn't save adjustment." |
| Delete row, file delete fails | Row still deleted, error logged | List refreshes silently |
| Open attachment link 404 | — | Browser shows 404; rare case where file was manually removed |

## Testing

- **Backend manual test**: POST with a 1 MB PDF → row created with path → GET list returns `attachment_url` → DELETE row → file is gone from disk.
- **Backend manual test**: POST with no attachment → existing behavior preserved.
- **Backend manual test**: POST with 6 MB file → 422.
- **Frontend manual test**: Create adjustment without file → table row shows `—` in Attachment column.
- **Frontend manual test**: Create adjustment with PNG → table row shows paperclip; click opens image in new tab.
- **Frontend manual test**: Delete row with attachment → row + paperclip gone.
- **End-to-end PDF test**: Create a reimbursement with attachment for current month → generate payroll → download payslip PDF → the Reimbursement row shows `📎` next to the label and the amount is summed correctly into Gross.
- **End-to-end PDF test**: Create a reimbursement without attachment → payslip Reimbursement row shows no `📎`.

No automated test suite exists for this area today — manual testing is sufficient for this change.

## Files Touched

**New**
- `backend/database/migrations/2026_05_29_000003_add_attachment_to_payroll_adjustments_table.php`

**Modified**
- `backend/app/Models/PayrollAdjustment.php` — add `attachment` to fillable
- `backend/app/Http/Controllers/PayrollManagementController.php` — `storeAdjustment`, `adjustments`, `deleteAdjustment`, plus per-type `*_has_attachment` booleans in the payroll generation block
- `backend/resources/views/pdf/payslip-new.blade.php` — append 📎 to type label when `*_has_attachment` is true
- `frontend-new/src/components/payroll/Adjustments.jsx` — file input, FormData submit, table column

**Untouched (called out so we don't accidentally drift)**
- Salary math itself (gross, deductions, net) — already includes adjustments, no formula change
- Existing types list — "Reimbursement" stays; we are not renaming it to "Expense"
- Other payslip / register templates (`payslip.blade.php`, `render-payslip.blade.php`, etc.) — only the active `payslip-new.blade.php` needs the 📎 marker
- Other payroll pages — Loans, Salary Structures, Reports, Settings unchanged

## Deployment Checklist

1. Deploy backend code (model + controller changes) via FileZilla / git pull
2. Deploy the migration file
3. Get explicit user approval, then run `php artisan migrate` on prod
4. `sudo systemctl restart php8.1-fpm` to clear OPcache
5. Rebuild frontend (`npm run build`) and redeploy `out/`
6. Smoke test: create an adjustment with a small PDF, verify the row, click the paperclip, delete the row, confirm the file is gone
