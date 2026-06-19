<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReportNotification\StoreRequest;
use App\Http\Requests\ReportNotification\UpdateRequest;
use App\Mail\ReportNotificationMail;
use App\Models\ReportNotification;
use App\Models\ReportNotificationManagers;
use App\Notifications\CompanyCreationNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ReportNotificationController extends Controller
{
    public function index(ReportNotification $model, Request $request)
    {


        $model = $model->with(["managers", "logs"])
            ->where('company_id', $request->company_id)

            ->when($request->filled('type'), function ($q) use ($request) {
                $q->where('type', request("type") ?? "automation");
            })

            ->when($request->filled('types') && count(request("types")) > 0, function ($q) use ($request) {
                $q->whereIn('type', request("types") ?? ["automation"]);
            })

            ->when($request->filled('branch_ids') && count(request("branch_ids")) > 0, function ($q) use ($request) {
                $q->whereIn('branch_id', request("branch_ids") ?? []);
            })

            ->with("managers", function ($query) use ($request) {
                $query->where("company_id", $request->company_id);
            })
            ->when($request->filled('subject'), function ($q) use ($request) {
                $q->where('subject', env('WILD_CARD') ?? 'ILIKE', "$request->subject%");
            })
            ->when($request->filled('branch_id'), function ($q) use ($request) {
                $q->where('branch_id', $request->branch_id);
            })
            ->when($request->filled('frequency'), function ($q) use ($request) {
                $q->where('frequency', env('WILD_CARD') ?? 'ILIKE', "$request->frequency%");
            })


            ->when($request->filled('manager1'), function ($q) use ($request) {

                $q->whereHas("managers", fn($q) => $q->where("name", env('WILD_CARD') ?? 'ILIKE', $request->manager1 . '%')->orWhere("email", env('WILD_CARD') ?? 'ILIKE', $request->manager1 . '%')->orWhere("whatsapp_number", env('WILD_CARD') ?? 'ILIKE', $request->manager1 . '%'));
            })
            ->when($request->filled('manager2'), function ($q) use ($request) {

                $q->whereHas("managers", fn($q) => $q->where("name", env('WILD_CARD') ?? 'ILIKE', $request->manager2 . '%')->orWhere("email", env('WILD_CARD') ?? 'ILIKE', $request->manager2 . '%')->orWhere("whatsapp_number", env('WILD_CARD') ?? 'ILIKE', $request->manager2 . '%'));
            })
            ->when($request->filled('manager3'), function ($q) use ($request) {

                $q->whereHas("managers", fn($q) => $q->where("name", env('WILD_CARD') ?? 'ILIKE', $request->manager3 . '%')->orWhere("email", env('WILD_CARD') ?? 'ILIKE', $request->manager3 . '%')->orWhere("whatsapp_number", env('WILD_CARD') ?? 'ILIKE', $request->manager3 . '%'));
            })
            ->when($request->filled('time'), function ($q) use ($request) {
                $q->where('time', env('WILD_CARD') ?? 'ILIKE', "$request->time%");
            })
            ->when($request->filled('medium'), function ($q) use ($request) {
                $q->where('mediums', env('WILD_CARD') ?? 'ILIKE', "%$request->medium%");
            })

            ->when($request->filled('serach_medium'), function ($q) use ($request) {
                $key = strtolower($request->serach_medium);
                //$q->where(DB::raw("json_contains('mediums', '$key')"));
                //$q->WhereJsonContains('mediums', $key);
                $q->WhereJsonContains(DB::raw('lower("mediums"::text)'), $key);
            })
            ->when($request->filled('serach_email_recipients'), function ($q) use ($request) {
                $key = strtolower($request->serach_email_recipients);
                $q->WhereJsonContains(DB::raw('lower("tos"::text)'), $key);
            })

            ->when($request->filled('sortBy'), function ($q) use ($request) {
                $sortDesc = $request->input('sortDesc');
                if (strpos($request->sortBy, '.')) {
                    // if ($request->sortBy == 'department.name.id') {
                    //     $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');

                    // }

                } else {
                    $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                    }
                }
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                $key = trim(strtolower($request->search));

                $q->whereHas("managers", function ($mq) use ($key) {
                    $like = env('WILD_CARD') ?? 'ILIKE';

                    $mq->whereRaw('LOWER(name) LIKE ?', [$key . '%'])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$key . '%'])
                        ->orWhereRaw('LOWER(whatsapp_number) LIKE ?', [$key . '%']);
                });
            });

        if (!$request->filled('sortBy')) {
            $model = $model->orderBy('updated_at', 'desc');
        }
        $page = $model->with("branch")->paginate($request->per_page);
        $page->getCollection()->transform(fn($n) => $this->maskSecrets($n));
        return $page;
    }

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
    public function testmail()
    {
        $model = ReportNotification::with(["managers"])->where("id", 35)->first();

        // $test = Mail::to("akildevs1004@gmail.com")
        //     ->queue(new ReportNotificationMail($model));

        $test2 = Mail::to('akildevs1004@gmail.com')->send(new ReportNotificationMail($model));

        // $test3 = NotificationsController::toSend(["email" => "akildevs1004@gmail.com"], new CompanyCreationNotification, $model);

        return ['111111',   $test2];
    }
    public function store(StoreRequest $request)
    {
        if (!$request->validated())
            return false;

        try {
            $data = $request->except('managers');
            // Back-compat: if caller didn't send formats, default to PDF.
            if (empty($data['formats'])) {
                $data['formats'] = ['PDF'];
            }
            $record = ReportNotification::create($data);

            if ($record) {
                $notification_id = $record->id;

                $managers = $request->only('managers');
                foreach ($managers['managers'] as $manager) {
                    $manager['notification_id'] = $notification_id;


                    ReportNotificationManagers::create($manager);
                }



                return $this->response('Report Notification created.', $record, true);
            } else {
                return $this->response('Report Notification cannot created.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function show(ReportNotification $ReportNotification)
    {
        return $this->maskSecrets($ReportNotification->load("branch"));
    }

    public function update(UpdateRequest $request, ReportNotification $ReportNotification)
    {
        try {
            \Log::info('ReportNotification update', ['id' => $ReportNotification->id, 'data' => $request->all()]);

            if (!$request->validated())
                return false;

            $data = $request->except('managers');

            // Preserve secrets on update when frontend omits them (user didn't retype).
            if (array_key_exists('ftp_config', $data) && is_array($data['ftp_config'])
                && (!array_key_exists('password', $data['ftp_config']) || $data['ftp_config']['password'] === null || $data['ftp_config']['password'] === '')
                && is_array($ReportNotification->ftp_config)) {
                $data['ftp_config']['password'] = $ReportNotification->ftp_config['password'] ?? null;
            }
            if (array_key_exists('api_config', $data) && is_array($data['api_config'])
                && (!array_key_exists('auth_value', $data['api_config']) || $data['api_config']['auth_value'] === null || $data['api_config']['auth_value'] === '')
                && is_array($ReportNotification->api_config)) {
                $data['api_config']['auth_value'] = $ReportNotification->api_config['auth_value'] ?? null;
            }

            $record = $ReportNotification->update($data);

            if ($record) {


                $notification_id = $ReportNotification->id;

                ReportNotificationManagers::where("notification_id", $notification_id)->delete();

                $managers = $request->only('managers');
                foreach ($managers['managers'] as $manager) {
                    $manager['notification_id'] = $notification_id;


                    ReportNotificationManagers::create($manager);
                }


                return $this->response('Report Notification updated.', $record, true);
            } else {
                return $this->response('Report Notification not updated.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function destroy(ReportNotification $ReportNotification)
    {
        $record = $ReportNotification->delete();

        if ($record) {
            return $this->response('Report Notification deleted.', $record, true);
        } else {
            return $this->response('Report Notification cannot delete.', null, false);
        }
    }
}
