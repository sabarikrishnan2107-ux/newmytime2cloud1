# Live Camera with ArcFace Face Recognition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RTSP camera fields to devices, create a Live Camera list page, a live stream page, and a Python microservice that uses ArcFace to identify employees in real-time.

**Architecture:** Camera RTSP credentials are stored on the devices table. A new Laravel controller serves camera-equipped devices. A Next.js Live Camera page lists them. Clicking one opens a full-page stream view. A separate FastAPI + OpenCV + InsightFace Python service connects to the RTSP camera, runs face recognition, and streams annotated frames via WebSocket to the frontend.

**Tech Stack:** Laravel 10, Next.js 14, Tailwind CSS, Python 3.10+, FastAPI, OpenCV, InsightFace (ArcFace), WebSocket

---

## Task 1: Database Migration — Add camera fields to devices table

**Files:**
- Create: `backend/database/migrations/2026_03_31_000001_add_camera_fields_to_devices_table.php`

- [ ] **Step 1: Create the migration file**

```bash
cd d:/newmytime2cloud/backend && php artisan make:migration add_camera_fields_to_devices_table --table=devices
```

- [ ] **Step 2: Write the migration**

Replace the generated migration content with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->string('camera_rtsp_ip', 255)->nullable()->after('port');
            $table->integer('camera_rtsp_port')->nullable()->default(554)->after('camera_rtsp_ip');
            $table->string('camera_username', 255)->nullable()->after('camera_rtsp_port');
            $table->string('camera_password', 255)->nullable()->after('camera_username');
        });
    }

    public function down()
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropColumn(['camera_rtsp_ip', 'camera_rtsp_port', 'camera_username', 'camera_password']);
        });
    }
};
```

- [ ] **Step 3: Run the migration**

```bash
cd d:/newmytime2cloud/backend && php artisan migrate
```

Expected: Migration runs successfully, 4 new columns added to devices table.

- [ ] **Step 4: Commit**

```bash
cd d:/newmytime2cloud/backend && git add database/migrations/*add_camera_fields_to_devices_table.php && git commit -m "feat: add camera RTSP fields to devices table"
```

---

## Task 2: Database Migration — Create employee_face_embeddings table

**Files:**
- Create: `backend/database/migrations/2026_03_31_000002_create_employee_face_embeddings_table.php`

- [ ] **Step 1: Create the migration file**

```bash
cd d:/newmytime2cloud/backend && php artisan make:migration create_employee_face_embeddings_table
```

- [ ] **Step 2: Write the migration**

Replace the generated migration content with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employee_face_embeddings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('company_id');
            $table->binary('embedding');
            $table->timestamps();

            $table->index(['company_id', 'employee_id']);
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('employee_face_embeddings');
    }
};
```

- [ ] **Step 3: Run the migration**

```bash
cd d:/newmytime2cloud/backend && php artisan migrate
```

Expected: Table `employee_face_embeddings` created.

- [ ] **Step 4: Commit**

```bash
cd d:/newmytime2cloud/backend && git add database/migrations/*create_employee_face_embeddings_table.php && git commit -m "feat: create employee_face_embeddings table"
```

---

## Task 3: Laravel Model — EmployeeFaceEmbedding

**Files:**
- Create: `backend/app/Models/EmployeeFaceEmbedding.php`

- [ ] **Step 1: Create the model**

Create file `backend/app/Models/EmployeeFaceEmbedding.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeFaceEmbedding extends Model
{
    protected $fillable = ['employee_id', 'company_id', 'embedding'];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd d:/newmytime2cloud/backend && git add app/Models/EmployeeFaceEmbedding.php && git commit -m "feat: add EmployeeFaceEmbedding model"
```

---

## Task 4: Laravel — Update Device validation to accept camera fields

**Files:**
- Modify: `backend/app/Http/Requests/Device/StoreRequest.php`
- Modify: `backend/app/Http/Requests/Device/UpdateRequest.php`

- [ ] **Step 1: Update StoreRequest validation rules**

In `backend/app/Http/Requests/Device/StoreRequest.php`, add 4 camera rules at the end of the `rules()` return array (before the closing `];` on line ~54):

```php
            'camera_rtsp_ip' => ['nullable', 'ip'],
            'camera_rtsp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'camera_username' => ['nullable', 'string', 'max:255'],
            'camera_password' => ['nullable', 'string', 'max:255'],
```

- [ ] **Step 2: Update UpdateRequest validation rules**

In `backend/app/Http/Requests/Device/UpdateRequest.php`, add the same 4 camera rules at the end of the `rules()` return array (before the closing `];`):

```php
            'camera_rtsp_ip' => ['nullable', 'ip'],
            'camera_rtsp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'camera_username' => ['nullable', 'string', 'max:255'],
            'camera_password' => ['nullable', 'string', 'max:255'],
```

- [ ] **Step 3: Commit**

```bash
cd d:/newmytime2cloud/backend && git add app/Http/Requests/Device/StoreRequest.php app/Http/Requests/Device/UpdateRequest.php && git commit -m "feat: add camera field validation to device requests"
```

---

## Task 5: Laravel — CameraStreamController + Routes

**Files:**
- Create: `backend/app/Http/Controllers/CameraStreamController.php`
- Create: `backend/routes/camera-stream.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create CameraStreamController**

Create file `backend/app/Http/Controllers/CameraStreamController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Device;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

class CameraStreamController extends Controller
{
    public function index(Request $request)
    {
        $model = Device::query();

        $model->with(['branch', 'status']);
        $model->whereNotNull('camera_rtsp_ip');
        $model->where('camera_rtsp_ip', '!=', '');
        $model->where('company_id', $request->company_id);

        $model->when($request->filled('branch_ids'), function ($q) use ($request) {
            $branchIds = is_array($request->branch_ids) ? $request->branch_ids : [$request->branch_ids];
            $q->whereIn('branch_id', $branchIds);
        });

        $model->when($request->filled('search'), function ($q) use ($request) {
            $q->where(function ($qq) use ($request) {
                $qq->where('name', 'like', "%{$request->search}%");
                $qq->orWhere('camera_rtsp_ip', 'like', "%{$request->search}%");
                $qq->orWhere('location', 'like', "%{$request->search}%");
            });
        });

        $model->orderBy('name', 'asc');

        return $model->paginate($request->per_page ?? 10);
    }

    public function status($deviceId)
    {
        $device = Device::where('id', $deviceId)
            ->whereNotNull('camera_rtsp_ip')
            ->first();

        if (!$device) {
            return response()->json(['status' => false, 'message' => 'Camera not found'], 404);
        }

        return response()->json([
            'status' => true,
            'data' => [
                'id' => $device->id,
                'name' => $device->name,
                'camera_rtsp_ip' => $device->camera_rtsp_ip,
                'camera_rtsp_port' => $device->camera_rtsp_port,
                'is_configured' => true,
            ]
        ]);
    }

    public function credentials($deviceId)
    {
        $device = Device::where('id', $deviceId)
            ->whereNotNull('camera_rtsp_ip')
            ->first();

        if (!$device) {
            return response()->json(['status' => false, 'message' => 'Camera not found'], 404);
        }

        $password = $device->camera_password;
        try {
            $password = Crypt::decryptString($device->camera_password);
        } catch (\Exception $e) {
            // Password may not be encrypted (legacy data), use as-is
        }

        return response()->json([
            'status' => true,
            'data' => [
                'rtsp_url' => "rtsp://{$device->camera_username}:{$password}@{$device->camera_rtsp_ip}:{$device->camera_rtsp_port}/stream1",
                'camera_rtsp_ip' => $device->camera_rtsp_ip,
                'camera_rtsp_port' => $device->camera_rtsp_port,
                'camera_username' => $device->camera_username,
                'camera_password' => $password,
                'device_name' => $device->name,
                'branch_id' => $device->branch_id,
            ]
        ]);
    }
}
```

- [ ] **Step 2: Create routes file**

Create file `backend/routes/camera-stream.php`:

```php
<?php

use App\Http\Controllers\CameraStreamController;
use Illuminate\Support\Facades\Route;

Route::get('cameras', [CameraStreamController::class, 'index']);
Route::get('camera/{deviceId}/status', [CameraStreamController::class, 'status']);
Route::get('camera/{deviceId}/credentials', [CameraStreamController::class, 'credentials']);
```

- [ ] **Step 3: Register routes in api.php**

In `backend/routes/api.php`, add this line after `include('devices.php');` (line 33):

```php
include('camera-stream.php');
```

- [ ] **Step 4: Commit**

```bash
cd d:/newmytime2cloud/backend && git add app/Http/Controllers/CameraStreamController.php routes/camera-stream.php routes/api.php && git commit -m "feat: add CameraStreamController with camera listing and credentials endpoints"
```

---

## Task 6: Laravel — Encrypt camera password on save

**Files:**
- Modify: `backend/app/Http/Controllers/DeviceController.php`

- [ ] **Step 1: Add encryption to store method**

In `backend/app/Http/Controllers/DeviceController.php`, in the `store()` method (around line 394, after `$data = $request->validated();`), add:

```php
            if (!empty($data['camera_password'])) {
                $data['camera_password'] = \Illuminate\Support\Facades\Crypt::encryptString($data['camera_password']);
            }
```

- [ ] **Step 2: Add encryption to update method**

In `backend/app/Http/Controllers/DeviceController.php`, in the `update()` method (around line 893, after `$record = $Device->update($request->validated());`), replace that line with:

```php
            $data = $request->validated();
            if (!empty($data['camera_password'])) {
                $data['camera_password'] = \Illuminate\Support\Facades\Crypt::encryptString($data['camera_password']);
            }
            $record = $Device->update($data);
```

- [ ] **Step 3: Commit**

```bash
cd d:/newmytime2cloud/backend && git add app/Http/Controllers/DeviceController.php && git commit -m "feat: encrypt camera password on device store and update"
```

---

## Task 7: Frontend — Add camera fields to Device Create side panel

**Files:**
- Modify: `frontend-new/src/components/Device/Create.js`

- [ ] **Step 1: Update defaultPayload**

In `frontend-new/src/components/Device/Create.js`, update the `defaultPayload` object (line 14-26) to add camera fields:

```javascript
let defaultPayload = {
  branch_id: "",
  name: "test",
  short_name: "test",
  location: "test",
  model_number: "MYTIME1",
  device_id: "",
  utc_time_zone: "Asia/Dubai",
  function: "auto",
  device_type: "all",
  status_id: 1,
  ip: "0.0.0.0",
  camera_rtsp_ip: "",
  camera_rtsp_port: "554",
  camera_username: "",
  camera_password: "",
};
```

- [ ] **Step 2: Add camera form fields**

In `frontend-new/src/components/Device/Create.js`, add the following JSX after the Device Type / Status grid (after the closing `</div>` of the last `grid grid-cols-1 md:grid-cols-2` block, before the closing `</div>` of the form content area):

```jsx
                {/* Camera Settings */}
                <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Camera Settings (Optional)</h4>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-400">
                          Camera IP Address
                        </label>
                        <Input
                          placeholder="e.g. 192.168.1.100"
                          value={form.camera_rtsp_ip}
                          onChange={(e) => handleChange("camera_rtsp_ip", e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-400">
                          Camera Port
                        </label>
                        <Input
                          placeholder="554"
                          value={form.camera_rtsp_port}
                          onChange={(e) => handleChange("camera_rtsp_port", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-400">
                          Camera Username
                        </label>
                        <Input
                          placeholder="admin"
                          value={form.camera_username}
                          onChange={(e) => handleChange("camera_username", e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-400">
                          Camera Password
                        </label>
                        <Input
                          type="password"
                          placeholder="********"
                          value={form.camera_password}
                          onChange={(e) => handleChange("camera_password", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
```

- [ ] **Step 3: Commit**

```bash
cd d:/newmytime2cloud && git add frontend-new/src/components/Device/Create.js && git commit -m "feat: add camera RTSP fields to Device Create side panel"
```

---

## Task 8: Frontend — Add camera fields to Device Edit side panel

**Files:**
- Modify: `frontend-new/src/components/Device/Edit.js`

- [ ] **Step 1: Add camera form fields**

In `frontend-new/src/components/Device/Edit.js`, add the same camera fields JSX from Task 7 Step 2, after the Device Type / Status grid block (after the closing `</div>` of the last `grid grid-cols-1 md:grid-cols-2` block, before the closing `</div>` of the form content area). Use the same markup but with `form.camera_rtsp_ip`, `form.camera_rtsp_port`, `form.camera_username`, `form.camera_password`:

```jsx
                    {/* Camera Settings */}
                    <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Camera Settings (Optional)</h4>
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-400">
                              Camera IP Address
                            </label>
                            <Input
                              placeholder="e.g. 192.168.1.100"
                              value={form.camera_rtsp_ip}
                              onChange={(e) => handleChange("camera_rtsp_ip", e.target.value)}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-400">
                              Camera Port
                            </label>
                            <Input
                              placeholder="554"
                              value={form.camera_rtsp_port}
                              onChange={(e) => handleChange("camera_rtsp_port", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-400">
                              Camera Username
                            </label>
                            <Input
                              placeholder="admin"
                              value={form.camera_username}
                              onChange={(e) => handleChange("camera_username", e.target.value)}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-400">
                              Camera Password
                            </label>
                            <Input
                              type="password"
                              placeholder="********"
                              value={form.camera_password}
                              onChange={(e) => handleChange("camera_password", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
```

- [ ] **Step 2: Commit**

```bash
cd d:/newmytime2cloud && git add frontend-new/src/components/Device/Edit.js && git commit -m "feat: add camera RTSP fields to Device Edit side panel"
```

---

## Task 9: Frontend — API endpoint file for Live Camera

**Files:**
- Create: `frontend-new/src/lib/endpoint/live-camera.js`

- [ ] **Step 1: Create the endpoint file**

Create file `frontend-new/src/lib/endpoint/live-camera.js`:

```javascript
import { api, buildQueryParams } from "@/lib/api-client";

export const getCameras = async (params = {}) => {
    const { data } = await api.get(`/cameras`, { params: await buildQueryParams(params) });
    return data;
};

export const getCameraStatus = async (deviceId) => {
    const { data } = await api.get(`/camera/${deviceId}/status`);
    return data;
};

export const getCameraCredentials = async (deviceId) => {
    const { data } = await api.get(`/camera/${deviceId}/credentials`);
    return data;
};
```

- [ ] **Step 2: Commit**

```bash
cd d:/newmytime2cloud && git add frontend-new/src/lib/endpoint/live-camera.js && git commit -m "feat: add live camera API endpoint functions"
```

---

## Task 10: Frontend — Add Live Camera to sidebar menu

**Files:**
- Modify: `frontend-new/src/lib/menuData.js`

- [ ] **Step 1: Add Video icon import**

In `frontend-new/src/lib/menuData.js`, add `Video` to the lucide-react import at the top of the file (line 1-33 area). Find the existing import line and add `Video` to it.

- [ ] **Step 2: Add Live Camera menu item**

In the `companyMenu` array, add this entry after the Device item (line ~66):

```javascript
  { href: "/live-camera", icon: Video, label: "Live Camera" },
```

- [ ] **Step 3: Add route mapping**

In the `leftNavLinks` object, add:

```javascript
  "/live-camera": companyMenu,
```

- [ ] **Step 4: Commit**

```bash
cd d:/newmytime2cloud && git add frontend-new/src/lib/menuData.js && git commit -m "feat: add Live Camera to sidebar navigation"
```

---

## Task 11: Frontend — Live Camera list page

**Files:**
- Create: `frontend-new/src/app/live-camera/page.js`
- Create: `frontend-new/src/components/LiveCamera/Page.js`
- Create: `frontend-new/src/components/LiveCamera/columns.js`

- [ ] **Step 1: Create page wrapper**

Create file `frontend-new/src/app/live-camera/page.js`:

```javascript
"use client";

import LiveCamera from "@/components/LiveCamera/Page";

const LiveCameraPage = () => {
  return (
    <div className="p-10">
      <LiveCamera />
    </div>
  );
};

export default LiveCameraPage;
```

- [ ] **Step 2: Create columns definition**

Create file `frontend-new/src/components/LiveCamera/columns.js`:

```javascript
"use client";

const Columns = (onView) => [
  {
    key: "branch",
    label: "BRANCH",
    sortable: true,
    render: (item) => (
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {item.branch?.name || "—"}
      </span>
    ),
  },
  {
    key: "name",
    label: "DEVICE NAME",
    sortable: true,
    render: (item) => (
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
        {item.name}
      </span>
    ),
  },
  {
    key: "camera_rtsp_ip",
    label: "CAMERA IP",
    sortable: false,
    render: (item) => (
      <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
        {item.camera_rtsp_ip}:{item.camera_rtsp_port || 554}
      </span>
    ),
  },
  {
    key: "location",
    label: "LOCATION",
    sortable: false,
    render: (item) => (
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {item.location || "—"}
      </span>
    ),
  },
  {
    key: "status",
    label: "STATUS",
    sortable: false,
    render: (item) => (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          item.status_id === 1
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            item.status_id === 1 ? "bg-green-500" : "bg-red-500"
          }`}
        ></span>
        {item.status_id === 1 ? "Online" : "Offline"}
      </span>
    ),
  },
  {
    key: "actions",
    label: "ACTIONS",
    sortable: false,
    render: (item) => (
      <button
        onClick={() => onView(item.id)}
        className="bg-primary hover:bg-blue-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all"
      >
        <span className="material-symbols-outlined text-[16px]">videocam</span>
        View
      </button>
    ),
  },
];

export default Columns;
```

- [ ] **Step 3: Create main page component**

Create file `frontend-new/src/components/LiveCamera/Page.js`:

```javascript
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBranches } from "@/lib/api";
import { getCameras } from "@/lib/endpoint/live-camera";
import { notify, parseApiError } from "@/lib/utils";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/lib/Pagination";
import MultiDropDown from "@/components/ui/MultiDropDown";
import Columns from "./columns";

export default function LiveCameraPage() {
  const router = useRouter();

  const [branches, setBranches] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedBranchIds, setSelectedBranchIds] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranches(await getBranches());
      } catch (error) {
        setError(parseApiError(error));
      }
    };
    fetchBranches();
  }, []);

  const fetchRecords = useCallback(async (page, perPage) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: page,
        per_page: perPage,
        branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : [],
      };
      const result = await getCameras(params);

      if (result && Array.isArray(result.data)) {
        setCameras(result.data);
        setCurrentPage(result.current_page || 1);
        setTotal(result.total || 0);
      } else {
        throw new Error("Invalid data structure received from API.");
      }
    } catch (error) {
      setError(parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [perPage, selectedBranchIds]);

  useEffect(() => {
    fetchRecords(currentPage, perPage);
  }, [currentPage, perPage, fetchRecords]);

  const handleView = (deviceId) => {
    router.push(`/live-camera/${deviceId}`);
  };

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-100px)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:space-y-0">
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
          Live Camera
        </h1>
        <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
          <div className="relative">
            <MultiDropDown
              placeholder={"Select Branch"}
              items={branches}
              value={selectedBranchIds}
              onChange={setSelectedBranchIds}
              badgesCount={1}
              width="w-[220px]"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={Columns(handleView)}
        data={cameras}
        isLoading={isLoading}
        error={error}
        onRowClick={(item) => handleView(item.id)}
        pagination={
          <Pagination
            page={currentPage}
            perPage={perPage}
            total={total}
            onPageChange={setCurrentPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        }
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd d:/newmytime2cloud && git add frontend-new/src/app/live-camera/page.js frontend-new/src/components/LiveCamera/Page.js frontend-new/src/components/LiveCamera/columns.js && git commit -m "feat: add Live Camera list page with branch filter and data table"
```

---

## Task 12: Frontend — Live Stream page

**Files:**
- Create: `frontend-new/src/app/live-camera/[id]/page.js`
- Create: `frontend-new/src/components/LiveCamera/Stream.js`

- [ ] **Step 1: Create page wrapper**

Create directory and file `frontend-new/src/app/live-camera/[id]/page.js`:

```javascript
"use client";

import Stream from "@/components/LiveCamera/Stream";

const StreamPage = ({ params }) => {
  return (
    <div className="p-10">
      <Stream deviceId={params.id} />
    </div>
  );
};

export default StreamPage;
```

- [ ] **Step 2: Create Stream component**

Create file `frontend-new/src/components/LiveCamera/Stream.js`:

```javascript
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCameraStatus } from "@/lib/endpoint/live-camera";
import { notify, parseApiError } from "@/lib/utils";

const PYTHON_SERVICE_URL = process.env.NEXT_PUBLIC_CAMERA_SERVICE_URL || "ws://localhost:8500";

export default function Stream({ deviceId }) {
  const router = useRouter();
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  const [cameraInfo, setCameraInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [detections, setDetections] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const result = await getCameraStatus(deviceId);
        if (result?.status) {
          setCameraInfo(result.data);
        }
      } catch (err) {
        setError(parseApiError(err));
      }
    };
    fetchInfo();
  }, [deviceId]);

  useEffect(() => {
    if (!cameraInfo) return;

    const ws = new WebSocket(`${PYTHON_SERVICE_URL}/stream/${deviceId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Draw frame on canvas
        if (data.frame) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          const img = new Image();
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Draw bounding boxes and names
            if (data.detections && data.detections.length > 0) {
              data.detections.forEach((det) => {
                const [x, y, w, h] = det.bbox;
                ctx.strokeStyle = "#22c55e";
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);

                ctx.fillStyle = "#22c55e";
                ctx.fillRect(x, y - 24, ctx.measureText(det.name).width + 16, 24);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 14px sans-serif";
                ctx.fillText(det.name, x + 8, y - 7);
              });
              setDetections(data.detections);
            }
          };
          img.src = `data:image/jpeg;base64,${data.frame}`;
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    };

    ws.onerror = () => {
      setError("Connection to camera service failed");
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [cameraInfo, deviceId]);

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/live-camera")}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300">
            {cameraInfo?.name || "Live Camera"}
          </h1>
          <p className="text-sm text-slate-400">
            {cameraInfo?.camera_rtsp_ip || "Loading..."}
          </p>
        </div>
        <span
          className={`ml-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isConnected
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          ></span>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Video Stream */}
        <div className="lg:col-span-3">
          <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            {isConnected ? (
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            ) : (
              <div className="text-slate-400 text-center">
                <span className="material-symbols-outlined text-6xl mb-2 block">videocam_off</span>
                <p>Waiting for camera connection...</p>
              </div>
            )}
          </div>
        </div>

        {/* Detection Log */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 p-4">
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">
              Recent Detections
            </h3>
            {detections.length === 0 ? (
              <p className="text-xs text-slate-400">No faces detected yet</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {detections.map((det, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      person
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {det.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(det.confidence * 100).toFixed(1)}% match
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd d:/newmytime2cloud && git add frontend-new/src/app/live-camera/[id]/page.js frontend-new/src/components/LiveCamera/Stream.js && git commit -m "feat: add Live Stream page with WebSocket video and ArcFace detection overlay"
```

---

## Task 13: Python Microservice — Project setup

**Files:**
- Create: `camera-service/requirements.txt`
- Create: `camera-service/config.py`
- Create: `camera-service/.env.example`

- [ ] **Step 1: Create requirements.txt**

Create file `camera-service/requirements.txt`:

```
fastapi==0.110.0
uvicorn==0.29.0
websockets==12.0
opencv-python-headless==4.9.0.80
insightface==0.7.3
onnxruntime==1.17.1
numpy==1.26.4
httpx==0.27.0
python-dotenv==1.0.1
```

- [ ] **Step 2: Create config.py**

Create file `camera-service/config.py`:

```python
import os
from dotenv import load_dotenv

load_dotenv()

LARAVEL_API_URL = os.getenv("LARAVEL_API_URL", "http://localhost:8000/api")
LARAVEL_API_TOKEN = os.getenv("LARAVEL_API_TOKEN", "")
FACE_CONFIDENCE_THRESHOLD = float(os.getenv("FACE_CONFIDENCE_THRESHOLD", "0.6"))
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8500"))
```

- [ ] **Step 3: Create .env.example**

Create file `camera-service/.env.example`:

```
LARAVEL_API_URL=http://localhost:8000/api
LARAVEL_API_TOKEN=your-api-token-here
FACE_CONFIDENCE_THRESHOLD=0.6
HOST=0.0.0.0
PORT=8500
```

- [ ] **Step 4: Commit**

```bash
cd d:/newmytime2cloud && git add camera-service/requirements.txt camera-service/config.py camera-service/.env.example && git commit -m "feat: add Python camera service project setup"
```

---

## Task 14: Python Microservice — Face recognizer service

**Files:**
- Create: `camera-service/services/face_recognizer.py`

- [ ] **Step 1: Create face_recognizer.py**

Create file `camera-service/services/face_recognizer.py`:

```python
import numpy as np
import insightface
from insightface.app import FaceAnalysis
from config import FACE_CONFIDENCE_THRESHOLD


class FaceRecognizer:
    def __init__(self):
        self.app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        self.app.prepare(ctx_id=0, det_size=(640, 640))
        self.embeddings = {}  # {employee_id: {"name": str, "embedding": np.array}}

    def load_embeddings(self, employees: list):
        """Load employee embeddings from Laravel API response.

        Args:
            employees: List of dicts with keys: employee_id, name, embedding (bytes)
        """
        self.embeddings = {}
        for emp in employees:
            embedding = np.frombuffer(emp["embedding"], dtype=np.float32)
            self.embeddings[emp["employee_id"]] = {
                "name": emp["name"],
                "embedding": embedding,
            }

    def detect_and_recognize(self, frame: np.ndarray) -> list:
        """Detect faces in frame and match against known embeddings.

        Args:
            frame: BGR image as numpy array from OpenCV

        Returns:
            List of dicts: [{"name": str, "confidence": float, "bbox": [x,y,w,h]}]
        """
        faces = self.app.get(frame)
        results = []

        for face in faces:
            bbox = face.bbox.astype(int).tolist()
            x1, y1, x2, y2 = bbox
            w = x2 - x1
            h = y2 - y1

            best_match = "Unknown"
            best_score = 0.0

            face_embedding = face.embedding

            for emp_id, emp_data in self.embeddings.items():
                score = self._cosine_similarity(face_embedding, emp_data["embedding"])
                if score > best_score:
                    best_score = score
                    best_match = emp_data["name"]

            if best_score < FACE_CONFIDENCE_THRESHOLD:
                best_match = "Unknown"

            results.append({
                "name": best_match,
                "confidence": round(float(best_score), 3),
                "bbox": [x1, y1, w, h],
            })

        return results

    def generate_embedding(self, frame: np.ndarray) -> bytes | None:
        """Generate face embedding from a frame with a single face.

        Returns:
            Face embedding as bytes, or None if no face detected.
        """
        faces = self.app.get(frame)
        if len(faces) == 0:
            return None
        return faces[0].embedding.astype(np.float32).tobytes()

    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        dot = np.dot(a, b)
        norm = np.linalg.norm(a) * np.linalg.norm(b)
        if norm == 0:
            return 0.0
        return float(dot / norm)
```

- [ ] **Step 2: Create `__init__.py`**

Create empty file `camera-service/services/__init__.py`:

```python
```

- [ ] **Step 3: Commit**

```bash
cd d:/newmytime2cloud && git add camera-service/services/ && git commit -m "feat: add ArcFace face recognizer service"
```

---

## Task 15: Python Microservice — Stream manager service

**Files:**
- Create: `camera-service/services/stream_manager.py`

- [ ] **Step 1: Create stream_manager.py**

Create file `camera-service/services/stream_manager.py`:

```python
import cv2
import base64
import asyncio
import numpy as np
from typing import AsyncGenerator


class StreamManager:
    def __init__(self):
        self.active_streams = {}  # {device_id: cv2.VideoCapture}

    def connect(self, device_id: str, rtsp_url: str) -> bool:
        """Open RTSP connection for a device.

        Returns:
            True if connection successful, False otherwise.
        """
        if device_id in self.active_streams:
            self.disconnect(device_id)

        cap = cv2.VideoCapture(rtsp_url)
        if not cap.isOpened():
            return False

        self.active_streams[device_id] = cap
        return True

    def disconnect(self, device_id: str):
        """Close RTSP connection for a device."""
        if device_id in self.active_streams:
            self.active_streams[device_id].release()
            del self.active_streams[device_id]

    def read_frame(self, device_id: str) -> np.ndarray | None:
        """Read a single frame from the RTSP stream.

        Returns:
            BGR frame as numpy array, or None if read failed.
        """
        cap = self.active_streams.get(device_id)
        if cap is None:
            return None

        ret, frame = cap.read()
        if not ret:
            return None

        return frame

    @staticmethod
    def frame_to_base64(frame: np.ndarray, quality: int = 70) -> str:
        """Encode a frame as base64 JPEG string.

        Args:
            frame: BGR image as numpy array
            quality: JPEG quality (0-100)

        Returns:
            Base64 encoded JPEG string
        """
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
        _, buffer = cv2.imencode(".jpg", frame, encode_params)
        return base64.b64encode(buffer).decode("utf-8")

    async def generate_frames(self, device_id: str, fps: int = 10) -> AsyncGenerator[np.ndarray, None]:
        """Async generator that yields frames at a target FPS.

        Args:
            device_id: Device identifier
            fps: Target frames per second

        Yields:
            BGR frames as numpy arrays
        """
        interval = 1.0 / fps
        while device_id in self.active_streams:
            frame = self.read_frame(device_id)
            if frame is None:
                break
            yield frame
            await asyncio.sleep(interval)
```

- [ ] **Step 2: Commit**

```bash
cd d:/newmytime2cloud && git add camera-service/services/stream_manager.py && git commit -m "feat: add RTSP stream manager service"
```

---

## Task 16: Python Microservice — Main FastAPI application

**Files:**
- Create: `camera-service/main.py`

- [ ] **Step 1: Create main.py**

Create file `camera-service/main.py`:

```python
import json
import httpx
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import LARAVEL_API_URL, LARAVEL_API_TOKEN, HOST, PORT
from services.face_recognizer import FaceRecognizer
from services.stream_manager import StreamManager

app = FastAPI(title="MyTime2Cloud Camera Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

face_recognizer = FaceRecognizer()
stream_manager = StreamManager()


async def get_camera_credentials(device_id: str) -> dict | None:
    """Fetch RTSP credentials from Laravel backend."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LARAVEL_API_URL}/camera/{device_id}/credentials",
                headers={"Authorization": f"Bearer {LARAVEL_API_TOKEN}"},
            )
            data = response.json()
            if data.get("status"):
                return data["data"]
    except Exception as e:
        print(f"Error fetching credentials for device {device_id}: {e}")
    return None


async def get_employee_embeddings(branch_id: int) -> list:
    """Fetch employee face embeddings for a branch from Laravel backend."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LARAVEL_API_URL}/employee-face-embeddings",
                headers={"Authorization": f"Bearer {LARAVEL_API_TOKEN}"},
                params={"branch_id": branch_id},
            )
            data = response.json()
            if isinstance(data, list):
                return data
    except Exception as e:
        print(f"Error fetching embeddings for branch {branch_id}: {e}")
    return []


@app.websocket("/stream/{device_id}")
async def stream(websocket: WebSocket, device_id: str):
    await websocket.accept()

    # Get camera credentials from Laravel
    creds = await get_camera_credentials(device_id)
    if not creds:
        await websocket.send_json({"error": "Camera not found or not configured"})
        await websocket.close()
        return

    rtsp_url = creds["rtsp_url"]

    # Connect to RTSP stream
    connected = stream_manager.connect(device_id, rtsp_url)
    if not connected:
        await websocket.send_json({"error": "Failed to connect to RTSP stream"})
        await websocket.close()
        return

    # Load employee embeddings for the branch
    embeddings = await get_employee_embeddings(creds["branch_id"])
    if embeddings:
        face_recognizer.load_embeddings(embeddings)

    try:
        async for frame in stream_manager.generate_frames(device_id, fps=10):
            # Run face detection every 3rd frame to reduce CPU load
            detections = []
            detections = face_recognizer.detect_and_recognize(frame)

            # Encode frame to base64
            frame_b64 = stream_manager.frame_to_base64(frame)

            # Send to frontend
            await websocket.send_json({
                "frame": frame_b64,
                "detections": detections,
            })
    except WebSocketDisconnect:
        pass
    finally:
        stream_manager.disconnect(device_id)


@app.post("/embeddings/sync")
async def sync_embeddings(data: dict):
    """Receive employee face embeddings from Laravel."""
    face_recognizer.load_embeddings(data.get("employees", []))
    return {"status": True, "message": "Embeddings synced"}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "active_streams": len(stream_manager.active_streams),
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
```

- [ ] **Step 2: Commit**

```bash
cd d:/newmytime2cloud && git add camera-service/main.py && git commit -m "feat: add FastAPI main application with WebSocket streaming and face recognition"
```

---

## Task 17: Environment variable for camera service URL

**Files:**
- Modify: `frontend-new/.env.local` (or `.env`)

- [ ] **Step 1: Add camera service URL to frontend env**

Add this line to the frontend environment file:

```
NEXT_PUBLIC_CAMERA_SERVICE_URL=ws://localhost:8500
```

- [ ] **Step 2: Commit**

```bash
cd d:/newmytime2cloud && git add frontend-new/.env* && git commit -m "feat: add camera service WebSocket URL to frontend env"
```

---

## Task 18: Verify end-to-end — Manual testing checklist

- [ ] **Step 1: Run Laravel migration**

```bash
cd d:/newmytime2cloud/backend && php artisan migrate
```

Expected: Both migrations run, `devices` table has 4 new columns, `employee_face_embeddings` table created.

- [ ] **Step 2: Test Device Create — camera fields visible**

Open `localhost:3001/device`, click "Add Device". Verify the Camera Settings section appears below Status with IP, Port, Username, Password fields.

- [ ] **Step 3: Test Device Edit — camera fields visible and populated**

Edit an existing device, add camera IP/credentials, save. Re-open edit — verify values are saved and loaded.

- [ ] **Step 4: Test Live Camera page**

Navigate to `localhost:3001/live-camera`. Verify:
- Page loads with "Live Camera" heading
- Branch filter works
- Devices with camera_rtsp_ip show in table
- Click "View" navigates to `/live-camera/{id}`

- [ ] **Step 5: Install Python service**

```bash
cd d:/newmytime2cloud/camera-service && pip install -r requirements.txt
```

- [ ] **Step 6: Start Python service**

```bash
cd d:/newmytime2cloud/camera-service && python main.py
```

Expected: FastAPI starts on port 8500. Health check at `http://localhost:8500/health` returns `{"status": "ok"}`.

- [ ] **Step 7: Test live stream page**

Navigate to `localhost:3001/live-camera/{device_id}` for a device with camera configured. Verify WebSocket connection attempt and video rendering when camera is reachable.
