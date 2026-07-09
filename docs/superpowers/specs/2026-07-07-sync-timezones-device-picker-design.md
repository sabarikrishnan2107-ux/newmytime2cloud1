# Sync Timezones — device picker

**Date:** 2026-07-07
**Area:** frontend-new · Access Control · Timezones

## Problem

The "Sync timezones to all devices" button on the Timezones List page pushes the
`WriteTimeGroup` definitions to **every** device at once (`syncTimezonesAllDevices` in
`src/lib/api.js`). The user wants to choose **which** device(s) to sync instead of blasting
all of them.

## Goal

Clicking Sync opens a device-picker modal. The user ticks one or more devices (or "Select
all online"), then syncs only the ticked devices. Offline devices are shown but not
selectable (a device can only receive `WriteTimeGroup` while online).

## Design

### Component: `SyncTimezonesModal.jsx`
Location: `frontend-new/src/components/AccessControl/Timezone/SyncTimezonesModal.jsx`.
Mirrors the existing `AssignTimezoneModal` (same dark modal shell, same device-fetch).

- **Props:** `open`, `onClose`, `onSynced?`.
- **On open:** fetch devices via `getDevices({ per_page: 500 })`, fall back to
  `getDeviceListNew({})` if empty (identical to `AssignTimezoneModal`). This keeps manager
  branch scoping correct.
- **Online rule:** `status_id == 1` = online (matches the existing frontend convention in
  `syncTimezonesAllDevices`). Anything else = offline.
- **Rows:** checkbox + device name + serial (`device_id`) + status dot. Online rows are
  checkable; offline rows are greyed out with a disabled checkbox and an "Offline" tag.
- **Select all online:** a header checkbox that selects/deselects only online devices, with
  a `N online · M offline` summary.
- **Footer:** Cancel + primary button labelled `Sync N device(s)`; disabled when zero
  selected or while syncing.
- **On Sync:** call `syncTimezonesToDevices(selectedSerials)`, then show the same
  per-device result toast the page shows today (`X of N updated`, plus failed count).
  Close on completion and call `onSynced?.()`.

### API helper: `syncTimezonesToDevices(serials)` (new, in `src/lib/api.js`)
Extracts the per-device loop so both the modal and the legacy caller share one path.

```
syncTimezonesToDevices(serials) →
  POST /{serial}/WriteTimeGroup { company_id }   // for each serial, 60s timeout
  returns { data: [{ device_id, ok, error? }] }
```

`syncTimezonesAllDevices` stays exported for backward-compat (unused by the button after
this change); no behavior change to it.

### Wiring: `TimezoneList.jsx`
- The Sync button's `onClick` opens the modal (`setSyncModalOpen(true)`) instead of calling
  `onSync` directly. Button label → "Sync timezones to devices".
- Render `<SyncTimezonesModal open={syncModalOpen} onClose={…} />`.
- The result toast logic moves into the modal, so `onSync`/`syncing` are removed from the
  page.

## Out of scope
- No backend change (reuses existing `POST /{device_id}/WriteTimeGroup`).
- i18n: the Timezones List page currently uses hardcoded English (no `useTranslation`); the
  modal matches that. Translation can follow later under the access-control namespace.

## Verification
- `next lint` / build parses the new component.
- Manual: open modal → offline device not selectable → select all picks only online →
  Sync N pushes to only the ticked devices → toast reports per-device result.
