# Face Clock In/Out Tablet Kiosk — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native Android tablet kiosk where an employee taps their name/photo, confirms their face (existing 1:1 endpoint), taps Clock In/Out, and the punch is written via the existing `generate_log` endpoint — with a live "Today's Logs" panel.

**Architecture:** Standalone Expo (React Native + TypeScript) app in `D:\tab mytime2cloud`. No backend changes and no on-device ML. It calls existing endpoints: `POST /api/login` (token), `GET /api/employeesList` (people), `GET /api/attendance_logs` (today's logs), `GET /api/get-encoded-profile-picture/{url}` (reference photo), `POST verify-face-fast-file` (1:1 face check), `POST /api/generate_log` (punch).

**Tech Stack:** Expo SDK (latest), TypeScript, expo-camera (mirrors the company's existing mobile app), expo-file-system (temp jpg for multipart upload), expo-speech (Tamil female-voice greeting), @react-native-async-storage/async-storage (session), axios (HTTP), React Navigation (native-stack). Jest + ts-jest for unit tests.

**Tamil voice:** On the result popup, speak the greeting with `expo-speech` in `ta-IN`, preferring a female voice: clock-in `"வரவேற்கிறோம், <name>"`, clock-out `"நன்றி, <name>"`. The tablet must have a Tamil TTS voice installed (Google Text-to-Speech).

## Global Constraints

- Project root: `D:\tab mytime2cloud` (all paths below are relative to it).
- Target: Android tablet only, always online. No iOS, no offline queue.
- Scale: < 50 employees per tablet; pick-by-tap grid is acceptable.
- v2 backend base URL: `https://v2backend.mytime2cloud.com/api`.
- Face validator URL: `https://face-validator.mytime2cloud.com` (no auth header; only `Accept: application/json`).
- All v2backend calls except `/login` send `Authorization: Bearer <token>`.
- Punch via `POST /api/generate_log` with body keys exactly: `UserID`, `LogTime` (format `YYYY-MM-DD HH:mm`, seconds appended server-side), `log_type` (`"in"`|`"out"`), `DeviceID` (`KIOSK-<branch_id>`), `company_id`.
- Face verify body is `multipart/form-data` with fields exactly `captured_image` and `existing_image` (both jpg files). Decisive field in response is `match` (boolean).
- Cool-down: ignore a repeat punch for the same `system_user_id` within 60 seconds.
- Capture settings mirror the mobile app: jpeg quality 0.75.
- Never commit secrets. The two base URLs are public endpoints, safe to hardcode in `src/config.ts`.
- Commit after every task with the messages shown.

---

## File Structure

```
D:\tab mytime2cloud\
  app.json                      # Expo config (name, android package, camera permission)
  package.json
  tsconfig.json
  babel.config.js
  jest.config.js
  index.ts                      # Expo entry (registerRootComponent)
  App.tsx                       # Navigation container + stack
  src\
    config.ts                   # base URLs, constants (cooldown, quality, deviceId helper)
    types.ts                    # Employee, KioskLog, VerifyResult, Session types
    api\
      client.ts                 # axios instance + token injection
      auth.ts                   # login(email,password) -> {token, companies/branches}
      employees.ts              # getEmployees(companyId) -> Employee[]
      logs.ts                   # getTodayLogs(companyId, branchId) -> KioskLog[]
      face.ts                   # verifyFaceFast(capturedUri, existingUri) -> VerifyResult
      punch.ts                  # generateLog(params) -> {status, message}
      profilePhoto.ts           # fetchProfilePhotoToFile(url) -> local jpg uri
    session\
      sessionStore.ts           # AsyncStorage get/set/clear of Session
    logic\
      cooldown.ts               # canPunch(userId, now) pure logic + record
      logFormat.ts              # buildLogTime(date) -> "YYYY-MM-DD HH:mm"; deviceId(branchId)
    screens\
      SetupScreen.tsx           # admin login + branch pick
      KioskScreen.tsx           # grid + search (left) + Today's Logs (right)
      CaptureModal.tsx          # camera auto-capture + verify + In/Out + result popup
    components\
      EmployeeGrid.tsx          # searchable grid of employees
      TodayLogsPanel.tsx        # list + search + counter
      ResultPopup.tsx           # Welcome / Thank you overlay
  __tests__\
    logFormat.test.ts
    cooldown.test.ts
    face.test.ts
    punch.test.ts
    employees.test.ts
```

---

### Task 1: Scaffold the Expo TypeScript app

**Files:**
- Create: whole project under `D:\tab mytime2cloud`
- Modify: `app.json`, `package.json`, `tsconfig.json`
- Create: `jest.config.js`

**Interfaces:**
- Produces: a runnable Expo app and a working `npm test` harness used by all later tasks.

- [ ] **Step 1: Scaffold Expo app into the existing folder**

The folder already exists (empty). From `D:\`:

```bash
cd /d
npx create-expo-app@latest "tab mytime2cloud" --template blank-typescript
```

If the tool refuses because the directory exists, scaffold in a temp name and move:

```bash
cd /d
npx create-expo-app@latest tab-kiosk-tmp --template blank-typescript
cp -r tab-kiosk-tmp/. "tab mytime2cloud"/
rm -rf tab-kiosk-tmp
```

- [ ] **Step 2: Install dependencies**

```bash
cd "/d/tab mytime2cloud"
npx expo install expo-camera expo-file-system @react-native-async-storage/async-storage
npm install axios @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
npm install -D jest ts-jest @types/jest
```

- [ ] **Step 3: Add camera permission + android package to `app.json`**

In `app.json`, inside `"expo"`, set the android package and camera permission:

```json
{
  "expo": {
    "name": "MyTime2Cloud Kiosk",
    "slug": "tab-mytime2cloud",
    "orientation": "landscape",
    "android": {
      "package": "com.mytime2cloud.kiosk",
      "permissions": ["CAMERA"]
    },
    "plugins": [
      ["expo-camera", { "cameraPermission": "Allow the kiosk to use the camera for face check." }]
    ]
  }
}
```

- [ ] **Step 4: Add Jest config**

Create `jest.config.js`:

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

Add to `package.json` scripts: `"test": "jest"`.

- [ ] **Step 5: Verify the harness runs**

Run: `cd "/d/tab mytime2cloud" && npm test`
Expected: Jest runs and reports "No tests found" (exit 0 or 1 with that message) — the harness works.

- [ ] **Step 6: Commit**

```bash
cd "/d/tab mytime2cloud"
git init
git add -A
git commit -m "chore: scaffold Expo TS kiosk app with camera, navigation, jest"
```

---

### Task 2: Config and shared types

**Files:**
- Create: `src/config.ts`, `src/types.ts`

**Interfaces:**
- Produces:
  - `config.V2_API` = `"https://v2backend.mytime2cloud.com/api"`, `config.FACE_API` = `"https://face-validator.mytime2cloud.com"`, `config.COOLDOWN_MS = 60000`, `config.CAPTURE_QUALITY = 0.75`, `config.LOGS_LIMIT = 20`.
  - `type Employee = { system_user_id: string; employee_id: string; first_name: string; last_name: string; profile_picture: string | null; branch_id: number | null }`
  - `type KioskLog = { id?: string; name: string; employee_id: string; logType: 'in' | 'out'; time: string; photo: string | null }`
  - `type VerifyResult = { match: boolean; score?: number; message?: string }`
  - `type Session = { token: string; companyId: number; branchId: number; branchName: string }`

- [ ] **Step 1: Create `src/config.ts`**

```ts
export const config = {
  V2_API: 'https://v2backend.mytime2cloud.com/api',
  FACE_API: 'https://face-validator.mytime2cloud.com',
  COOLDOWN_MS: 60_000,
  CAPTURE_QUALITY: 0.75,
  LOGS_LIMIT: 20,
};
```

- [ ] **Step 2: Create `src/types.ts`**

```ts
export type Employee = {
  system_user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
  branch_id: number | null;
};

export type KioskLog = {
  id?: string;
  name: string;
  employee_id: string;
  logType: 'in' | 'out';
  time: string;          // display time "HH:mm:ss"
  photo: string | null;
};

export type VerifyResult = { match: boolean; score?: number; message?: string };

export type Session = { token: string; companyId: number; branchId: number; branchName: string };
```

- [ ] **Step 3: Commit**

```bash
git add src/config.ts src/types.ts
git commit -m "feat: add config and shared types"
```

---

### Task 3: Pure logic — log time + device id (TDD)

**Files:**
- Create: `src/logic/logFormat.ts`, `__tests__/logFormat.test.ts`

**Interfaces:**
- Produces:
  - `buildLogTime(d: Date): string` → `"YYYY-MM-DD HH:mm"` (local time, zero-padded).
  - `deviceId(branchId: number): string` → `"KIOSK-<branchId>"`.

- [ ] **Step 1: Write the failing test**

`__tests__/logFormat.test.ts`:

```ts
import { buildLogTime, deviceId } from '../src/logic/logFormat';

test('buildLogTime formats local time to minute precision', () => {
  const d = new Date(2026, 5, 18, 9, 1, 23); // 2026-06-18 09:01:23 local
  expect(buildLogTime(d)).toBe('2026-06-18 09:01');
});

test('deviceId uses KIOSK-<branch>', () => {
  expect(deviceId(7)).toBe('KIOSK-7');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- logFormat`
Expected: FAIL with "Cannot find module '../src/logic/logFormat'".

- [ ] **Step 3: Implement**

`src/logic/logFormat.ts`:

```ts
const p = (n: number) => String(n).padStart(2, '0');

export function buildLogTime(d: Date): string {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function deviceId(branchId: number): string {
  return `KIOSK-${branchId}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- logFormat`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/logic/logFormat.ts __tests__/logFormat.test.ts
git commit -m "feat: add log time + device id formatters with tests"
```

---

### Task 4: Pure logic — punch cool-down (TDD)

**Files:**
- Create: `src/logic/cooldown.ts`, `__tests__/cooldown.test.ts`

**Interfaces:**
- Produces:
  - `createCooldown(windowMs: number)` → `{ canPunch(userId: string, nowMs: number): boolean; record(userId: string, nowMs: number): void }`
  - `canPunch` returns false if the same user punched within `windowMs`.

- [ ] **Step 1: Write the failing test**

`__tests__/cooldown.test.ts`:

```ts
import { createCooldown } from '../src/logic/cooldown';

test('blocks repeat punch within window, allows after', () => {
  const cd = createCooldown(60_000);
  expect(cd.canPunch('u1', 1_000)).toBe(true);
  cd.record('u1', 1_000);
  expect(cd.canPunch('u1', 30_000)).toBe(false);   // within 60s
  expect(cd.canPunch('u1', 61_001)).toBe(true);     // after 60s
  expect(cd.canPunch('u2', 30_000)).toBe(true);      // different user
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cooldown`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

`src/logic/cooldown.ts`:

```ts
export function createCooldown(windowMs: number) {
  const last: Record<string, number> = {};
  return {
    canPunch(userId: string, nowMs: number): boolean {
      const t = last[userId];
      return t === undefined || nowMs - t >= windowMs;
    },
    record(userId: string, nowMs: number): void {
      last[userId] = nowMs;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cooldown`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/cooldown.ts __tests__/cooldown.test.ts
git commit -m "feat: add punch cool-down logic with tests"
```

---

### Task 5: HTTP client + token injection

**Files:**
- Create: `src/api/client.ts`

**Interfaces:**
- Consumes: `config.V2_API`.
- Produces:
  - `setToken(token: string | null): void`
  - `v2` — an axios instance with `baseURL = config.V2_API` that adds `Authorization: Bearer <token>` when a token is set, and `Accept: application/json`.

- [ ] **Step 1: Implement**

`src/api/client.ts`:

```ts
import axios from 'axios';
import { config } from '../config';

let token: string | null = null;
export function setToken(t: string | null) { token = t; }

export const v2 = axios.create({
  baseURL: config.V2_API,
  headers: { Accept: 'application/json' },
});

v2.interceptors.request.use((cfg) => {
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
```

- [ ] **Step 2: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: add axios v2 client with bearer token injection"
```

---

### Task 6: Punch API (TDD with mocked client)

**Files:**
- Create: `src/api/punch.ts`, `__tests__/punch.test.ts`

**Interfaces:**
- Consumes: `v2` from `src/api/client.ts`; `buildLogTime`, `deviceId` from `src/logic/logFormat.ts`.
- Produces:
  - `generateLog(p: { systemUserId: string; logType: 'in'|'out'; companyId: number; branchId: number; when: Date }): Promise<{ status: boolean; message: string }>`
  - Posts to `/generate_log` with body `{ UserID, LogTime, log_type, DeviceID, company_id }`.

- [ ] **Step 1: Write the failing test**

`__tests__/punch.test.ts`:

```ts
jest.mock('../src/api/client', () => ({ v2: { post: jest.fn() } }));
import { v2 } from '../src/api/client';
import { generateLog } from '../src/api/punch';

test('generateLog posts the exact body shape', async () => {
  (v2.post as jest.Mock).mockResolvedValue({ data: { status: true, message: 'Log Successfully Created' } });
  const res = await generateLog({
    systemUserId: '1042', logType: 'in', companyId: 20, branchId: 7,
    when: new Date(2026, 5, 18, 9, 1, 23),
  });
  expect(v2.post).toHaveBeenCalledWith('/generate_log', {
    UserID: '1042',
    LogTime: '2026-06-18 09:01',
    log_type: 'in',
    DeviceID: 'KIOSK-7',
    company_id: 20,
  });
  expect(res.status).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- punch`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

`src/api/punch.ts`:

```ts
import { v2 } from './client';
import { buildLogTime, deviceId } from '../logic/logFormat';

export async function generateLog(p: {
  systemUserId: string; logType: 'in' | 'out'; companyId: number; branchId: number; when: Date;
}): Promise<{ status: boolean; message: string }> {
  const { data } = await v2.post('/generate_log', {
    UserID: p.systemUserId,
    LogTime: buildLogTime(p.when),
    log_type: p.logType,
    DeviceID: deviceId(p.branchId),
    company_id: p.companyId,
  });
  return { status: !!data?.status, message: data?.message ?? '' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- punch`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/punch.ts __tests__/punch.test.ts
git commit -m "feat: add generate_log punch API with test"
```

---

### Task 7: Employees API (TDD with mocked client)

**Files:**
- Create: `src/api/employees.ts`, `__tests__/employees.test.ts`

**Interfaces:**
- Consumes: `v2`; `Employee` type.
- Produces:
  - `getEmployees(companyId: number, branchId: number): Promise<Employee[]>` — calls `GET /employeesList` with params `{ company_id, columns: ['first_name','last_name','profile_picture','system_user_id','employee_id','branch_id'] }`, unwraps the paginator `.data.data`, and filters to `branch_id === branchId`.

- [ ] **Step 1: Write the failing test**

`__tests__/employees.test.ts`:

```ts
jest.mock('../src/api/client', () => ({ v2: { get: jest.fn() } }));
import { v2 } from '../src/api/client';
import { getEmployees } from '../src/api/employees';

test('getEmployees unwraps paginator and filters by branch', async () => {
  (v2.get as jest.Mock).mockResolvedValue({ data: { data: [
    { system_user_id: '1', employee_id: 'E1', first_name: 'A', last_name: 'B', profile_picture: 'a.jpg', branch_id: 7 },
    { system_user_id: '2', employee_id: 'E2', first_name: 'C', last_name: 'D', profile_picture: null, branch_id: 9 },
  ] } });
  const list = await getEmployees(20, 7);
  expect(list).toHaveLength(1);
  expect(list[0].system_user_id).toBe('1');
  expect(v2.get).toHaveBeenCalledWith('/employeesList', expect.objectContaining({
    params: expect.objectContaining({ company_id: 20 }),
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- employees`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

`src/api/employees.ts`:

```ts
import { v2 } from './client';
import { Employee } from '../types';

export async function getEmployees(companyId: number, branchId: number): Promise<Employee[]> {
  const { data } = await v2.get('/employeesList', {
    params: {
      company_id: companyId,
      columns: ['first_name', 'last_name', 'profile_picture', 'system_user_id', 'employee_id', 'branch_id'],
    },
  });
  const rows: Employee[] = data?.data ?? [];
  return rows.filter((e) => e.branch_id === branchId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- employees`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/employees.ts __tests__/employees.test.ts
git commit -m "feat: add employees API (branch-filtered) with test"
```

---

### Task 8: Face verify API (TDD with mocked axios)

**Files:**
- Create: `src/api/face.ts`, `__tests__/face.test.ts`

**Interfaces:**
- Consumes: `config.FACE_API`; `VerifyResult` type.
- Produces:
  - `verifyFaceFast(capturedUri: string, existingUri: string): Promise<VerifyResult>` — POSTs multipart to `${FACE_API}/verify-face-fast-file` with file fields `captured_image` and `existing_image`; returns `{ match, score, message }`. On HTTP error, returns `{ match: false, message }`.

- [ ] **Step 1: Write the failing test**

`__tests__/face.test.ts`:

```ts
jest.mock('axios');
import axios from 'axios';
import { verifyFaceFast } from '../src/api/face';

test('verifyFaceFast returns match from response', async () => {
  (axios.post as jest.Mock).mockResolvedValue({ data: { match: true, score: 0.91, message: 'Face matched' } });
  const r = await verifyFaceFast('file:///selfie.jpg', 'file:///profile.jpg');
  expect(r.match).toBe(true);
  expect(r.score).toBe(0.91);
  const [url, body] = (axios.post as jest.Mock).mock.calls[0];
  expect(url).toContain('/verify-face-fast-file');
  expect(body).toBeDefined(); // FormData
});

test('verifyFaceFast maps error to match:false', async () => {
  (axios.post as jest.Mock).mockRejectedValue({ response: { data: { error: 'No face detected' } } });
  const r = await verifyFaceFast('a', 'b');
  expect(r.match).toBe(false);
  expect(r.message).toContain('No face');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- face`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

`src/api/face.ts`:

```ts
import axios from 'axios';
import { config } from '../config';
import { VerifyResult } from '../types';

function filePart(uri: string, name: string) {
  // React Native FormData file shape
  return { uri, name, type: 'image/jpeg' } as any;
}

export async function verifyFaceFast(capturedUri: string, existingUri: string): Promise<VerifyResult> {
  const form = new FormData();
  form.append('captured_image', filePart(capturedUri, 'captured.jpg'));
  form.append('existing_image', filePart(existingUri, 'existing.jpg'));
  try {
    const { data } = await axios.post(`${config.FACE_API}/verify-face-fast-file`, form, {
      headers: { Accept: 'application/json', 'Content-Type': 'multipart/form-data' },
    });
    return { match: !!data?.match, score: data?.score, message: data?.message };
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Face check failed';
    return { match: false, message: msg };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- face`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/api/face.ts __tests__/face.test.ts
git commit -m "feat: add 1:1 face verify API with tests"
```

---

### Task 9: Profile photo fetch-to-file + auth + today's logs APIs

**Files:**
- Create: `src/api/profilePhoto.ts`, `src/api/auth.ts`, `src/api/logs.ts`

**Interfaces:**
- Consumes: `v2`, `config`, `setToken`, `Employee`, `KioskLog`, `Session`.
- Produces:
  - `fetchProfilePhotoToFile(profileUrl: string): Promise<string>` — downloads the employee photo to a local jpg and returns its `file://` uri. Uses `GET /get-encoded-profile-picture/{url}` when `profileUrl` is not already absolute.
  - `login(email: string, password: string): Promise<{ token: string; companies: any[] }>` — `POST /login`; calls `setToken`.
  - `getTodayLogs(companyId: number, branchId: number): Promise<KioskLog[]>` — `GET /attendance_logs` for today; maps to `KioskLog[]`.

- [ ] **Step 1: Implement `src/api/profilePhoto.ts`**

```ts
import * as FileSystem from 'expo-file-system';
import { config } from '../config';

export async function fetchProfilePhotoToFile(profileUrl: string): Promise<string> {
  const src = profileUrl.startsWith('http')
    ? profileUrl
    : `${config.V2_API}/get-encoded-profile-picture/${encodeURIComponent(profileUrl)}`;
  const dest = `${FileSystem.cacheDirectory}existing_${Date.now()}.jpg`;
  const { uri } = await FileSystem.downloadAsync(src, dest);
  return uri;
}
```

> NOTE for executor: confirm at runtime whether `get-encoded-profile-picture` returns a raw image or base64. If base64, switch to `FileSystem.writeAsStringAsync(dest, base64, { encoding: Base64 })` after a `v2.get`. Verify against one real employee before wiring Task 12.

- [ ] **Step 2: Implement `src/api/auth.ts`**

```ts
import { v2, setToken } from './client';

export async function login(email: string, password: string): Promise<{ token: string; companies: any[] }> {
  const { data } = await v2.post('/login', { email, password });
  const token = data?.token ?? data?.access_token ?? data?.data?.token;
  setToken(token);
  return { token, companies: data?.companies ?? data?.data?.companies ?? [] };
}
```

> NOTE for executor: confirm the real `/login` response keys (token + how company/branch is represented) against AuthController@login and adjust `SetupScreen` branch options accordingly.

- [ ] **Step 3: Implement `src/api/logs.ts`**

```ts
import { v2 } from './client';
import { KioskLog } from '../types';

const today = () => new Date().toISOString().slice(0, 10);
const hhmmss = (s: string) => new Date(s.replace(' ', 'T')).toLocaleTimeString();

export async function getTodayLogs(companyId: number, branchId: number): Promise<KioskLog[]> {
  const { data } = await v2.get('/attendance_logs', {
    params: { company_id: companyId, branch_id: branchId, from_date: today(), to_date: today(), per_page: 50 },
  });
  const rows: any[] = data?.data ?? data ?? [];
  return rows.map((r) => ({
    id: String(r.id),
    name: `${r.employee?.first_name ?? ''} ${r.employee?.last_name ?? ''}`.trim() || r.UserID,
    employee_id: r.employee?.employee_id ?? r.UserID,
    logType: String(r.log_type).toLowerCase() === 'in' ? 'in' : 'out',
    time: hhmmss(r.LogTime),
    photo: r.employee?.profile_picture ?? null,
  }));
}
```

- [ ] **Step 4: Smoke-compile the three modules with the test runner**

Run: `npx tsc --noEmit`
Expected: no type errors in `src/api/*`.

- [ ] **Step 5: Commit**

```bash
git add src/api/profilePhoto.ts src/api/auth.ts src/api/logs.ts
git commit -m "feat: add profile-photo download, login, and today-logs APIs"
```

---

### Task 10: Session store

**Files:**
- Create: `src/session/sessionStore.ts`

**Interfaces:**
- Consumes: `@react-native-async-storage/async-storage`, `Session`, `setToken`.
- Produces:
  - `saveSession(s: Session): Promise<void>`
  - `loadSession(): Promise<Session | null>` — also calls `setToken(s.token)` when present.
  - `clearSession(): Promise<void>` — clears storage and `setToken(null)`.

- [ ] **Step 1: Implement**

`src/session/sessionStore.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '../types';
import { setToken } from '../api/client';

const KEY = 'kiosk_session_v1';

export async function saveSession(s: Session): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
  setToken(s.token);
}

export async function loadSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  const s = JSON.parse(raw) as Session;
  if (s.token) setToken(s.token);
  return s;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
  setToken(null);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/session/sessionStore.ts
git commit -m "feat: add persistent kiosk session store"
```

---

### Task 11: Setup screen (admin login + branch pick)

**Files:**
- Create: `src/screens/SetupScreen.tsx`

**Interfaces:**
- Consumes: `login` (auth.ts), `saveSession`, `Session`.
- Produces: `SetupScreen` — on success persists a `Session` and navigates to `Kiosk` (route name `"Kiosk"`).

- [ ] **Step 1: Implement**

`src/screens/SetupScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { login } from '../api/auth';
import { saveSession } from '../session/sessionStore';

export default function SetupScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function doLogin() {
    setBusy(true); setErr('');
    try {
      const res = await login(email.trim(), password);
      if (!res.token) throw new Error('Login failed');
      setToken(res.token);
      setCompanies(res.companies);
    } catch (e: any) { setErr(e?.message ?? 'Login failed'); }
    finally { setBusy(false); }
  }

  async function pickBranch(companyId: number, branchId: number, branchName: string) {
    await saveSession({ token, companyId, branchId, branchName });
    navigation.replace('Kiosk');
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 32, gap: 14 }}>
      <Text style={{ fontSize: 26, fontWeight: '700' }}>Kiosk Setup</Text>
      {!token ? (
        <>
          <TextInput placeholder="Admin email" autoCapitalize="none" value={email} onChangeText={setEmail}
            style={{ borderWidth: 1, borderRadius: 10, padding: 14 }} />
          <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword}
            style={{ borderWidth: 1, borderRadius: 10, padding: 14 }} />
          {err ? <Text style={{ color: 'red' }}>{err}</Text> : null}
          <TouchableOpacity onPress={doLogin} disabled={busy}
            style={{ backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center' }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Login</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 18 }}>Choose this tablet's branch:</Text>
          {companies.flatMap((c: any) =>
            (c.branches ?? [{ id: c.branch_id, name: c.branch_name }]).map((b: any) => (
              <TouchableOpacity key={`${c.id}-${b.id}`} onPress={() => pickBranch(c.id ?? c.company_id, b.id, b.name)}
                style={{ borderWidth: 1, borderRadius: 10, padding: 16 }}>
                <Text style={{ fontSize: 16 }}>{c.name ?? c.company_name} — {b.name}</Text>
              </TouchableOpacity>
            )))}
        </>
      )}
    </ScrollView>
  );
}
```

> NOTE for executor: adjust the company/branch shape to the real `/login` payload (see Task 9 note). The goal: produce `companyId`, `branchId`, `branchName`.

- [ ] **Step 2: Commit**

```bash
git add src/screens/SetupScreen.tsx
git commit -m "feat: add kiosk setup screen (admin login + branch pick)"
```

---

### Task 12: Capture modal (camera → verify → In/Out → punch → popup)

**Files:**
- Create: `src/logic/speech.ts`, `src/screens/CaptureModal.tsx`, `src/components/ResultPopup.tsx`

**Interfaces:**
- Consumes: `expo-camera` (`CameraView`, `useCameraPermissions`), `expo-speech`, `verifyFaceFast`, `fetchProfilePhotoToFile`, `generateLog`, `createCooldown`, `config`, `Employee`.
- Produces: `speakGreeting(kind: 'in'|'out', name: string): void` in `src/logic/speech.ts` — speaks Tamil female-voice greeting.
- Produces:
  - `ResultPopup({ kind, name, onDone })` where `kind: 'in' | 'out'`.
  - `CaptureModal({ employee, session, onPunched, onClose })` — auto-captures, verifies, shows In/Out, punches, then shows popup and calls `onPunched(log)` after 3s.

- [ ] **Step 0: Implement `src/logic/speech.ts` (Tamil female voice)**

```ts
import * as Speech from 'expo-speech';

let femaleTamilVoice: string | undefined;
// Resolve a Tamil voice once; prefer one whose name/identifier hints female.
Speech.getAvailableVoicesAsync().then((voices) => {
  const tamil = voices.filter((v) => (v.language || '').toLowerCase().startsWith('ta'));
  const female = tamil.find((v) => /female|f\b|#female/i.test(`${v.name} ${v.identifier}`));
  femaleTamilVoice = (female ?? tamil[0])?.identifier;
}).catch(() => {});

export function speakGreeting(kind: 'in' | 'out', name: string): void {
  const phrase = kind === 'in' ? `வரவேற்கிறோம், ${name}` : `நன்றி, ${name}`;
  Speech.speak(phrase, { language: 'ta-IN', voice: femaleTamilVoice, pitch: 1.15, rate: 0.95 });
}
```

> NOTE for executor: female Tamil voices vary by device. We pick the first Tamil voice and prefer any flagged female; raising `pitch` to ~1.15 makes a neutral voice sound more female. Confirm on the real tablet and adjust.

- [ ] **Step 1: Implement `src/components/ResultPopup.tsx`**

```tsx
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { speakGreeting } from '../logic/speech';

export default function ResultPopup({ kind, name, onDone }: { kind: 'in' | 'out'; name: string; onDone: () => void }) {
  useEffect(() => { speakGreeting(kind, name); }, [kind, name]);
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const bg = kind === 'in' ? '#15803d' : '#1d4ed8';
  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 64 }}>{kind === 'in' ? '✓' : '👋'}</Text>
      <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800' }}>
        {kind === 'in' ? `Welcome, ${name}!` : `Thank you, ${name}!`}
      </Text>
      <Text style={{ color: '#dbeafe', fontSize: 20 }}>
        {kind === 'in' ? 'You are clocked in' : 'You are clocked out'}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Implement `src/screens/CaptureModal.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { verifyFaceFast } from '../api/face';
import { fetchProfilePhotoToFile } from '../api/profilePhoto';
import { generateLog } from '../api/punch';
import { config } from '../config';
import { Employee, Session, KioskLog } from '../types';

type Stage = 'verifying' | 'choose' | 'punching' | 'done' | 'failed';

export default function CaptureModal({ employee, session, onPunched, onClose }:
  { employee: Employee; session: Session; onPunched: (log: KioskLog) => void; onClose: () => void; }) {
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [stage, setStage] = useState<Stage>('verifying');
  const [msg, setMsg] = useState('Look at the camera…');
  const [kind, setKind] = useState<'in' | 'out'>('in');

  useEffect(() => { if (!perm?.granted) requestPerm(); }, [perm]);

  useEffect(() => {
    if (!perm?.granted) return;
    const t = setTimeout(runVerify, 2300); // mirror mobile app auto-capture timing
    return () => clearTimeout(t);
  }, [perm?.granted]);

  async function runVerify() {
    try {
      const shot = await cam.current?.takePictureAsync({ quality: config.CAPTURE_QUALITY });
      if (!shot?.uri) throw new Error('Camera error');
      if (!employee.profile_picture) throw new Error('No profile photo on file');
      const existing = await fetchProfilePhotoToFile(employee.profile_picture);
      const res = await verifyFaceFast(shot.uri, existing);
      if (res.match) setStage('choose');
      else { setMsg(res.message ?? 'Face does not match'); setStage('failed'); }
    } catch (e: any) { setMsg(e?.message ?? 'Face check failed'); setStage('failed'); }
  }

  async function punch(logType: 'in' | 'out') {
    setKind(logType); setStage('punching');
    const when = new Date();
    const res = await generateLog({
      systemUserId: employee.system_user_id, logType,
      companyId: session.companyId, branchId: session.branchId, when,
    });
    if (!res.status) { setMsg(res.message || 'Could not save. Try again.'); setStage('failed'); return; }
    setStage('done');
    setTimeout(() => onPunched({
      name: `${employee.first_name} ${employee.last_name}`.trim(),
      employee_id: employee.employee_id, logType,
      time: when.toLocaleTimeString(), photo: employee.profile_picture,
    }), 3000);
  }

  if (!perm) return <View />;
  if (!perm.granted) return <Center><Text>Camera permission needed.</Text></Center>;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cam} style={{ flex: 1 }} facing="front" />
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40 }}>
        {stage === 'verifying' && <Badge>{msg}</Badge>}
        {stage === 'choose' && (
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Big color="#16a34a" onPress={() => punch('in')}>Clock In</Big>
            <Big color="#2563eb" onPress={() => punch('out')}>Clock Out</Big>
          </View>
        )}
        {stage === 'punching' && <ActivityIndicator size="large" color="#fff" />}
        {stage === 'failed' && (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Badge>{msg}</Badge>
            <Big color="#374151" onPress={onClose}>Back</Big>
          </View>
        )}
      </View>
      {stage === 'done' && <ResultPopupInline kind={kind} name={employee.first_name} />}
    </View>
  );
}

import ResultPopup from '../components/ResultPopup';
function ResultPopupInline({ kind, name }: { kind: 'in' | 'out'; name: string }) {
  return <ResultPopup kind={kind} name={name} onDone={() => {}} />;
}
function Center({ children }: any) { return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>; }
function Badge({ children }: any) { return <Text style={{ color: '#fff', fontSize: 22, backgroundColor: 'rgba(0,0,0,.5)', padding: 12, borderRadius: 10 }}>{children}</Text>; }
function Big({ color, onPress, children }: any) {
  return <TouchableOpacity onPress={onPress} style={{ backgroundColor: color, paddingVertical: 24, paddingHorizontal: 36, borderRadius: 18 }}>
    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>{children}</Text></TouchableOpacity>;
}
```

- [ ] **Step 3: Manual test on device (camera)**

Build/run per Task 15 once it exists, or temporarily render `CaptureModal` from `KioskScreen` (Task 13). Verify: camera opens, auto-captures after ~2.3s, shows In/Out on match, popup appears on punch.

- [ ] **Step 4: Commit**

```bash
git add src/screens/CaptureModal.tsx src/components/ResultPopup.tsx
git commit -m "feat: add capture modal (verify -> In/Out -> punch -> popup)"
```

---

### Task 13: Kiosk screen — employee grid + Today's Logs panel

**Files:**
- Create: `src/screens/KioskScreen.tsx`, `src/components/EmployeeGrid.tsx`, `src/components/TodayLogsPanel.tsx`

**Interfaces:**
- Consumes: `getEmployees`, `getTodayLogs`, `loadSession`, `createCooldown`, `config`, `CaptureModal`, `Employee`, `KioskLog`, `Session`.
- Produces: `KioskScreen` — two columns (grid + search left, logs right); tapping a person opens `CaptureModal`; on punch, prepends to the logs panel and enforces cool-down.

- [ ] **Step 1: Implement `src/components/EmployeeGrid.tsx`**

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import { Employee } from '../types';

export default function EmployeeGrid({ employees, onPick }:
  { employees: Employee[]; onPick: (e: Employee) => void }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return employees;
    return employees.filter((e) =>
      `${e.first_name} ${e.last_name} ${e.employee_id}`.toLowerCase().includes(k));
  }, [q, employees]);

  return (
    <View style={{ flex: 1 }}>
      <TextInput placeholder="🔍 Search name or ID…" value={q} onChangeText={setQ}
        style={{ borderWidth: 1, borderRadius: 12, padding: 14, margin: 12 }} />
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.system_user_id}
        numColumns={3}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onPick(item)}
            style={{ flex: 1 / 3, alignItems: 'center', padding: 12 }}>
            <Image source={{ uri: item.profile_picture ?? undefined }}
              style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#e5e7eb' }} />
            <Text numberOfLines={1} style={{ marginTop: 6, fontWeight: '600' }}>{item.first_name}</Text>
            <Text numberOfLines={1} style={{ color: '#6b7280', fontSize: 12 }}>{item.employee_id}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

- [ ] **Step 2: Implement `src/components/TodayLogsPanel.tsx`**

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Image } from 'react-native';
import { KioskLog } from '../types';

export default function TodayLogsPanel({ logs }: { logs: KioskLog[] }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? logs.filter((l) => `${l.name} ${l.employee_id}`.toLowerCase().includes(k)) : logs;
  }, [q, logs]);

  return (
    <View style={{ width: 380, borderLeftWidth: 1, borderColor: '#e5e7eb' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>Today's Logs</Text>
        <Text style={{ color: '#2563eb', fontWeight: '700' }}>{logs.length} punches</Text>
      </View>
      <TextInput placeholder="🔍 Search…" value={q} onChangeText={setQ}
        style={{ borderWidth: 1, borderRadius: 10, padding: 10, marginHorizontal: 12 }} />
      <FlatList
        data={filtered}
        keyExtractor={(l, i) => l.id ?? String(i)}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
            <Image source={{ uri: item.photo ?? undefined }}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#e5e7eb' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>{item.name} · {item.employee_id}</Text>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>{item.time}</Text>
            </View>
            <Text style={{ fontWeight: '700', color: item.logType === 'in' ? '#16a34a' : '#2563eb' }}>
              {item.logType === 'in' ? 'Clock In' : 'Clock Out'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
```

- [ ] **Step 3: Implement `src/screens/KioskScreen.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { View, Modal, Alert } from 'react-native';
import EmployeeGrid from '../components/EmployeeGrid';
import TodayLogsPanel from '../components/TodayLogsPanel';
import CaptureModal from './CaptureModal';
import { getEmployees } from '../api/employees';
import { getTodayLogs } from '../api/logs';
import { loadSession } from '../session/sessionStore';
import { createCooldown } from '../logic/cooldown';
import { config } from '../config';
import { Employee, KioskLog, Session } from '../types';

const cooldown = createCooldown(config.COOLDOWN_MS);

export default function KioskScreen({ navigation }: any) {
  const [session, setSession] = useState<Session | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<KioskLog[]>([]);
  const [picked, setPicked] = useState<Employee | null>(null);

  useEffect(() => { (async () => {
    const s = await loadSession();
    if (!s) { navigation.replace('Setup'); return; }
    setSession(s);
    setEmployees(await getEmployees(s.companyId, s.branchId));
    setLogs((await getTodayLogs(s.companyId, s.branchId)).slice(0, config.LOGS_LIMIT));
  })(); }, []);

  function onPick(e: Employee) {
    if (!cooldown.canPunch(e.system_user_id, Date.now())) {
      Alert.alert('Please wait', 'You just punched. Try again in a moment.');
      return;
    }
    setPicked(e);
  }

  function onPunched(log: KioskLog) {
    cooldown.record(picked!.system_user_id, Date.now());
    setLogs((prev) => [log, ...prev].slice(0, config.LOGS_LIMIT));
    setPicked(null);
  }

  if (!session) return <View />;
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <EmployeeGrid employees={employees} onPick={onPick} />
      <TodayLogsPanel logs={logs} />
      <Modal visible={!!picked} animationType="slide" onRequestClose={() => setPicked(null)}>
        {picked && session && (
          <CaptureModal employee={picked} session={session}
            onPunched={onPunched} onClose={() => setPicked(null)} />
        )}
      </Modal>
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/KioskScreen.tsx src/components/EmployeeGrid.tsx src/components/TodayLogsPanel.tsx
git commit -m "feat: add kiosk screen with employee grid + today logs panel"
```

---

### Task 14: Navigation wiring

**Files:**
- Modify: `App.tsx`; Create/Modify: `index.ts`

**Interfaces:**
- Consumes: `SetupScreen`, `KioskScreen`, `loadSession`.
- Produces: a native-stack with routes `"Setup"` and `"Kiosk"`; initial route chosen by whether a session exists.

- [ ] **Step 1: Implement `App.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import SetupScreen from './src/screens/SetupScreen';
import KioskScreen from './src/screens/KioskScreen';
import { loadSession } from './src/session/sessionStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initial, setInitial] = useState<string | null>(null);
  useEffect(() => { (async () => setInitial((await loadSession()) ? 'Kiosk' : 'Setup'))(); }, []);
  if (!initial) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initial} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Setup" component={SetupScreen} />
        <Stack.Screen name="Kiosk" component={KioskScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 2: Run unit tests + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all unit tests PASS; no type errors.

- [ ] **Step 3: Commit**

```bash
git add App.tsx index.ts
git commit -m "feat: wire navigation (Setup -> Kiosk) with session-based initial route"
```

---

### Task 15: Run on the tablet, then build the APK

**Files:**
- Modify: `app.json` (versioning), add `eas.json` only if using EAS.

**Interfaces:**
- Produces: an installed, working kiosk on a real Android tablet, then a release APK.

- [ ] **Step 1: Point Gradle at Android Studio's JDK**

Java is not on PATH. Set `JAVA_HOME` to Android Studio's bundled JBR (typical path):

```bash
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
"$JAVA_HOME/bin/java" -version   # expect openjdk 17+
```

- [ ] **Step 2: Prebuild native android project**

```bash
cd "/d/tab mytime2cloud"
npx expo prebuild --platform android
```

- [ ] **Step 3: Run on a connected tablet (USB debugging on)**

```bash
adb devices            # confirm the tablet is listed
npx expo run:android
```

Expected: app installs and launches; Setup screen appears.

- [ ] **Step 4: End-to-end manual test (record results)**

Verify in order, against a KNOWN test employee with a clear profile photo:
1. Setup: admin login succeeds; pick branch → Kiosk opens.
2. Grid shows that branch's employees; search filters.
3. Tap a person → camera opens → auto-capture → `match=true` → In/Out shows.
4. Tap Clock In → "Welcome" popup → returns to grid; row appears in Today's Logs.
5. Open the main MyTime2Cloud software → confirm the punch is visible in logs and counts in the report.
6. Tap same person again within 60s → "Please wait" cool-down.
7. Tap a person whose face does NOT match → "Face does not match", Back.

- [ ] **Step 5: Build the release APK**

```bash
cd "/d/tab mytime2cloud/android"
./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk
```

(For a signed release, generate a keystore and set `android/gradle.properties` signing config; for first deployment a debug APK from `assembleDebug` is acceptable for internal install.)

- [ ] **Step 6: Lock the tablet to kiosk mode**

Enable Android **screen pinning** (Settings → Security → Screen pinning) and pin the app, OR install a kiosk launcher. Document the chosen method in the project README.

- [ ] **Step 7: Commit**

```bash
cd "/d/tab mytime2cloud"
git add -A
git commit -m "chore: android prebuild config + build/run instructions"
```

---

## Self-Review

**1. Spec coverage:**
- App type RN Android ✔ (Task 1, 15). Identify by tap ✔ (Task 13). 1:1 face verify ✔ (Task 8, 12). Punch via generate_log ✔ (Task 6, 12). Profile photos as reference ✔ (Task 9, 12). In/Out buttons ✔ (Task 12). Today's Logs with search/counter/last-20 ✔ (Task 13). Cool-down ✔ (Task 4, 13). Setup/branch ✔ (Task 11). Reports unchanged — no backend work ✔. Edge cases (no match, no face, camera denied, network error) ✔ (Task 12). Build/JDK notes ✔ (Task 15).
- Open items from the spec are carried as explicit executor NOTES (login payload shape, encoded-photo format, exact employee/today-logs params), to be confirmed at runtime against the live API before finalizing the dependent task. These are verification steps, not placeholders.

**2. Placeholder scan:** No "TBD/TODO/handle edge cases" left as work items; every code step contains real code. Runtime-confirmation NOTES name the exact file/endpoint to check.

**3. Type consistency:** `Employee`, `KioskLog`, `VerifyResult`, `Session` are defined in Task 2 and used unchanged. `generateLog`, `verifyFaceFast`, `getEmployees`, `getTodayLogs`, `login`, `fetchProfilePhotoToFile`, `createCooldown`, `buildLogTime`, `deviceId`, `saveSession/loadSession/clearSession`, `setToken` signatures match across producer/consumer tasks.

## Notes carried for the executor (confirm against live API)
- `/login` response keys (token + company/branch structure) → adjust `auth.ts` + `SetupScreen`.
- `get-encoded-profile-picture` returns raw image vs base64 → adjust `profilePhoto.ts`.
- `attendance_logs` index param names/shape for today's logs → adjust `logs.ts`.
- Confirm `verify-face-fast-file` needs no auth (mobile app sent none).
- Confirm an unregistered `KIOSK-<branch>` DeviceID is accepted by shift/report calc (model default = Mobile-style); if a labelled device is wanted, register a `devices` row.
