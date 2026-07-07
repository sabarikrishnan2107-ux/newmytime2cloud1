# Employee create: block duplicate login email

**Date:** 2026-07-07
**Status:** Approved
**Area:** backend — `app/Http/Controllers/EmployeeControllerNew.php` (`storeNew`)

## Problem

The employee-create flow (`storeNew`) accepts an optional login `email` + `password`.
When the email already belonged to an existing user, the code **overwrote that
account** instead of rejecting:

```php
$existingUser = User::where('email', $email)->first();
if ($existingUser) {
    $existingUser->update([
        'password'    => $password,
        'employee_id' => $employee->id,
        'company_id'  => $employee->company_id,
        'user_type'   => 'employee',   // company/admin login flipped to employee
    ]);
}
```

### Real incident

Company **Petrotek (id 62)** is owned by user **645 = `marketing@petrotek.de`**
(`companies.user_id = 645`). Creating employee **2292 (Meenu Indira Sasi)** with that
same email hijacked the owner account: `user_type` became `employee`, `employee_id=2292`,
`branch_id=155`. Result — the Admin login could no longer find the account and threw
`Attempt to read property "company_id" on null` (AuthController line 310, master-password
branch dereferencing a null user). Login was restored manually by resetting user 645 back
to `user_type='company', employee_id=0, branch_id=0` and unlinking employee 2292.

## Requirement

In the employee **create** flow, if the login email is already used by **any** existing
`users` row, **reject the request** — do not create the employee and do not modify any
existing account.

Admin/company/master and employee accounts all live in the same `users` table
(distinguished by `user_type`), so a single uniqueness check over `users.email` covers
admin emails automatically.

## Design (validation-layer only)

`app/Http/Controllers/EmployeeControllerNew.php` → `storeNew`:

1. **Validation rule:** change `'email' => 'nullable|string'` to
   `'email' => 'nullable|email|unique:users,email'`, with a clear message
   (`email.unique` → "This email is already used by another account. Please use a
   different email."). The check runs before any `Employee`/`User` row is written, so a
   duplicate email creates nothing.
2. **Remove the overwrite branch:** delete the `if ($existingUser) { $existingUser->update(...) }`
   path. The user-creation block becomes a plain `User::create(...)` — safe because the
   rule guarantees the email is free.

`ConvertEmptyStringsToNull` middleware is enabled, so an absent login email arrives as
`null` and `nullable` skips the rule — creating an employee **without** a login is
unaffected.

## Out of scope

- Edit-login flow (`updateLogin`) — already protected by its own `unique` rule.
- Frontend — the create form already surfaces the backend 422 `message`; no UI change.
- Model-level / DB-level guards (a `users.email` unique index is not viable: the DB
  already holds legacy duplicate emails).

## Verification (live DB — no `RefreshDatabase`)

- Create an employee via the API using `marketing@petrotek.de` → expect **422**; confirm
  user 645 is still `user_type='company'` (write-safe: rejected before any insert).
- (Optional) create with a fresh unique email → succeeds; then clean up the created rows.

## Deployment

Backend code change only — no migration, no data change. Requires
`sudo systemctl restart php8.1-fpm` on prod to clear OPcache (per deploy runbook).
