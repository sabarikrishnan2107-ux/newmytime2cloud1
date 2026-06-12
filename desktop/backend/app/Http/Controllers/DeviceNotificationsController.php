<?php

namespace App\Http\Controllers;

use App\Http\Requests\DeviceNotifications\StoreRequest;
use App\Http\Requests\DeviceNotifications\UpdateRequest;
use App\Mail\DeviceNotificationMail;

use App\Models\DeviceNotification;
use App\Models\DeviceNotificationsManagers;
use App\Notifications\CompanyCreationNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class DeviceNotificationsController extends Controller
{
    public function index(DeviceNotification $model, Request $request)
    {


        $model = $model->with(["managers", "logs"])->where('company_id', $request->company_id)

            ->with("managers", function ($query) use ($request) {
                $query->where("company_id", $request->company_id);
            })
            ->with("logs", function ($query) use ($request) {
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

                $q->whereHas("managers", fn ($q) => $q->where("name", env('WILD_CARD') ?? 'ILIKE', $request->manager1 . '%')->orWhere("email", env('WILD_CARD') ?? 'ILIKE', $request->manager1 . '%')->orWhere("whatsapp_number", env('WILD_CARD') ?? 'ILIKE', $request->manager1 . '%'));
            })
            ->when($request->filled('manager2'), function ($q) use ($request) {

                $q->whereHas("managers", fn ($q) => $q->where("name", env('WILD_CARD') ?? 'ILIKE', $request->manager2 . '%')->orWhere("email", env('WILD_CARD') ?? 'ILIKE', $request->manager2 . '%')->orWhere("whatsapp_number", env('WILD_CARD') ?? 'ILIKE', $request->manager2 . '%'));
            })
            ->when($request->filled('manager3'), function ($q) use ($request) {

                $q->whereHas("managers", fn ($q) => $q->where("name", env('WILD_CARD') ?? 'ILIKE', $request->manager3 . '%')->orWhere("email", env('WILD_CARD') ?? 'ILIKE', $request->manager3 . '%')->orWhere("whatsapp_number", env('WILD_CARD') ?? 'ILIKE', $request->manager3 . '%'));
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
            });

        if (!$request->filled('sortBy')) {
            $model = $model->orderBy('updated_at', 'desc');
        }
        return $model->with("branch")
            ->paginate($request->per_page);
    }
    public function testmail()
    {
        $model = DeviceNotification::with(["managers"])->where("id", 35)->first();

        // $test = Mail::to("akildevs1004@gmail.com")
        //     ->queue(new DeviceNotificationsMail($model));

        $test2 = Mail::to('akildevs1004@gmail.com')->send(new DeviceNotificationMail($model));

        // $test3 = NotificationsController::toSend(["email" => "akildevs1004@gmail.com"], new CompanyCreationNotification, $model);

        return ['111111',   $test2];
    }
    public function store(StoreRequest $request)
    {
        if (!$request->validated())
            return false;



        try {
            $record = DeviceNotification::create($request->except('managers'));

            if ($record) {
                $notification_id = $record->id;

                $managers = $request->only('managers');
                foreach ($managers['managers'] as $manager) {
                    $manager['notification_id'] = $notification_id;


                    DeviceNotificationsManagers::create($manager);
                }



                return $this->response('Report Notification created.', $record, true);
            } else {
                return $this->response('Report Notification cannot create.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function show(DeviceNotification $DeviceNotifications)
    {
        return $DeviceNotifications->load("branch");
    }

    public function update(UpdateRequest $request, $id)
    {
        try {

            if (!$request->validated())
                return false;


            $record = DeviceNotification::where("id", $id)->update($request->except('managers'));



            if ($record) {


                $notification_id = $id;

                DeviceNotificationsManagers::where("notification_id", $notification_id)->delete();

                $managers = $request->only('managers');
                foreach ($managers['managers'] as $manager) {
                    $manager['notification_id'] = $notification_id;


                    DeviceNotificationsManagers::create($manager);
                }


                return $this->response('Device Notification updated.', $record, true);
            } else {
                return $this->response('Device Notification not updated.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function destroy($id)
    {


        $record = DeviceNotification::where("id", $id)->delete();

        if ($record) {
            return $this->response('Report Notification deleted.', $record, true);
        } else {
            return $this->response('Report Notification cannot delete.', null, false);
        }
    }
}
