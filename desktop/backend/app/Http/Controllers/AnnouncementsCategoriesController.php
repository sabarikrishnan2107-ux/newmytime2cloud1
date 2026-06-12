<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnnouncementsCategories\StoreRequest;
use App\Http\Requests\AnnouncementsCategories\UpdateRequest;
use App\Models\AnnouncementsCategories;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnnouncementsCategoriesController extends Controller
{
    public function getDefaultModelSettings($request)
    {
        $model = AnnouncementsCategories::query();
        $model->where('company_id', $request->company_id);
        $model->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id',  $request->branch_id));
        $model->when($request->filled('serach_name'), fn ($q) => $q->where('name', env('WILD_CARD') ?? 'ILIKE', "{$request->serach_name}%"));
        $model->when($request->filled('search_description'), fn ($q) => $q->where('description', env('WILD_CARD') ?? 'ILIKE', "{$request->search_description}%"));
        $model->with("branch");
        $model->orderByDesc("id");
        return $model;
    }

    public function index(Request $request)
    {
        return $this->getDefaultModelSettings($request)->paginate($request->per_page ?? 100);
    }

    function list(Request $request)
    {
        return $this->getDefaultModelSettings($request)->paginate($request->per_page ?? 100);
    }

    public function store(StoreRequest $request)
    {
        DB::beginTransaction();

        try {

            $isExist = AnnouncementsCategories::where('company_id', '=', $request->company_id)->where('name', '=', $request->name)->first();
            if ($isExist == null) {

                $record = AnnouncementsCategories::create($request->all());
                DB::commit();

                if ($record) {

                    return $this->response('Category  Successfully created.', $record, true);
                } else {
                    return $this->response('Category  cannot be created.', null, false);
                }
            } else {
                return $this->response('Category "' . $request->name . '" already exist', null, false);
            }
        } catch (\Throwable $th) {
            DB::rollback();
            throw $th;
        }
    }
    public function update(UpdateRequest $request, $id)
    {

        try {
            $isExist = AnnouncementsCategories::where('company_id', '=', $request->company_id)
                ->where('id', '!=', $id)
                ->where('name', '=', $request->name)->first();
            if ($isExist == null) {

                $record = AnnouncementsCategories::find($id)->update($request->all());

                if ($record) {

                    return $this->response('Category  successfully updated.', $record, true);
                } else {
                    return $this->response('Category  cannot update.', null, false);
                }
            } else {
                return $this->response('Category "' . $request->name . '" already exist', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
    public function destroy($id)
    {

        if (AnnouncementsCategories::find($id)->delete()) {

            return $this->response('Announcements Categories successfully deleted.', null, true);
        } else {
            return $this->response('Announcements Categories cannot delete.', null, false);
        }
    }
    public function search(Request $request, $key)
    {
        return $this->getDefaultModelSettings($request)->where('title', 'LIKE', "%$key%")->paginate($request->per_page ?? 100);
    }
    public function deleteSelected(Request $request)
    {
        $record = AnnouncementsCategories::whereIn('id', $request->ids)->delete();
        if ($record) {

            return $this->response('Announcements Categories Successfully delete.', $record, true);
        } else {
            return $this->response('Announcements Categories cannot delete.', null, false);
        }
    }
}
