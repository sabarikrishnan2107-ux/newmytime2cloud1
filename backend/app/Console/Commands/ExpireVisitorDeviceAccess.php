<?php

namespace App\Console\Commands;

use App\Http\Controllers\Visitor\VisitorAttendanceRenderController;
use App\Models\Visitor;
use App\Models\VisitorDevice;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ExpireVisitorDeviceAccess extends Command
{
    protected $signature = 'visitors:expire-device-access';

    protected $description = 'Remove walk-in visitors from access-control devices once their allowed window has passed';

    public function handle()
    {
        // Rows whose access window has ended but that are still active on the device.
        $rows = VisitorDevice::whereNull('removed_at')
            ->whereIn('status', ['pushed', 'pending'])
            ->whereNotNull('valid_to')
            ->where('valid_to', '<=', now())
            ->get();

        if ($rows->isEmpty()) {
            echo "No visitor device access to expire.\n";
            return 0;
        }

        $sdkPush = config('visitor.sdk_push');
        $remover = new VisitorAttendanceRenderController();
        $expiredVisitorIds = [];

        foreach ($rows as $row) {
            try {
                // Only call the device when the row was actually pushed and the flag is on.
                if ($sdkPush && $row->status === 'pushed') {
                    $remover->deleteVisitorDetailsfromDevice($row->system_user_id, $row->device_id);
                }

                $row->update([
                    'status'     => 'expired',
                    'removed_at' => now(),
                ]);
                $expiredVisitorIds[$row->visitor_id] = true;
            } catch (\Throwable $th) {
                Log::error('ExpireVisitorDeviceAccess failed for visitor_device ' . $row->id . ': ' . $th->getMessage());
            }
        }

        // Mark a visitor removed-from-device only once all of its device rows are expired.
        foreach (array_keys($expiredVisitorIds) as $visitorId) {
            $stillActive = VisitorDevice::where('visitor_id', $visitorId)
                ->whereNull('removed_at')
                ->exists();
            if (!$stillActive) {
                Visitor::where('id', $visitorId)->update([
                    'sdk_deleted_visitor_date_time' => now(),
                    'status_id'                     => 5, // updated_device / removed
                ]);
            }
        }

        echo "Expired " . $rows->count() . " visitor device record(s).\n";
        return 0;
    }
}
