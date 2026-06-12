<?php

namespace App\Http\Controllers;

use App\Http\Requests\Clocking\StoreRequest;
use App\Http\Requests\Clocking\UpdateRequest;
use App\Models\Clocking;
use Illuminate\Http\Request;

class ClockingController extends Controller
{
    public function index(Request $request)
    {
        $model = Clocking::query();
        $model->where("company_id", $request->company_id);
        $model->when($request->filled("branch_id"), fn ($q) => $q->where('branch_id', $request->branch_id));
        return $model->paginate($request->per_page ?? 100);
    }

    public function store(StoreRequest $request)
    {
        try {
            $data = $request->validated();
            if (isset($request->attachment) && $request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $ext = $file->getClientOriginalExtension();
                $fileName = time() . '.' . $ext;
                $request->file('attachment')->move(public_path('/clocking/attachments'), $fileName);
                $data['attachment'] = $fileName;
            }

            $record = Clocking::create($data);

            if ($record) {
                return $this->response('Clocking created.', $record, true);
            } else {
                return $this->response('Clocking cannot create.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function show(Clocking $Clocking)
    {
        return $Clocking;
    }

    public function updateClocking($id, UpdateRequest $request)
    {
        try {
            $data = $request->validated();

            if (isset($request->attachment) && $request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $ext = $file->getClientOriginalExtension();
                $fileName = time() . '.' . $ext;
                $request->file('attachment')->move(public_path('/clocking/attachments'), $fileName);
                $data['attachment'] = $fileName;
            }

            $record = Clocking::where("id",$id)->update($data);

            if ($record) {
                return $this->response('Clocking updated.', $record, true);
            } else {
                return $this->response('Clocking cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function destroy(Clocking $Clocking)
    {
        if ($Clocking->delete()) {
            return $this->response('Clocking successfully deleted.', null, true);
        } else {
            return $this->response('Clocking cannot delete.', null, false);
        }
    }
}
