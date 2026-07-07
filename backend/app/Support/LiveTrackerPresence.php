<?php

namespace App\Support;

use Carbon\Carbon;

class LiveTrackerPresence
{
    /**
     * Default freshness window in minutes. A live ping older than this is treated
     * as stale and the employee drops off the live map. Overridable per request
     * via ?fresh_minutes=N (the controller clamps it to 1..1440).
     */
    public const DEFAULT_FRESH_MINUTES = 15;

    /**
     * Decide whether an employee's latest ping should appear on the live map.
     *
     * Visible only when BOTH hold:
     *   - the employee has NOT clocked out for the day, and
     *   - the latest ping is fresh (within $freshMinutes of $now).
     *
     * @param  mixed              $datetime      Latest ping timestamp (string|Carbon|null)
     * @param  mixed              $userId        Employee system_user_id
     * @param  \Carbon\Carbon     $now           Reference "now"
     * @param  int                $freshMinutes  Freshness window in minutes
     * @param  array<int,string>  $clockedOut    system_user_ids that clocked out today
     */
    public static function isVisible($datetime, $userId, Carbon $now, int $freshMinutes, array $clockedOut): bool
    {
        // Clocked out for the day -> off the map.
        if (in_array((string) $userId, $clockedOut, true)) {
            return false;
        }

        if (empty($datetime)) {
            return false;
        }

        try {
            $pingedAt = $datetime instanceof Carbon ? $datetime->copy() : Carbon::parse((string) $datetime);
        } catch (\Throwable $e) {
            return false;
        }

        // Absolute gap so minor clock skew (or a slightly future-stamped row) never
        // hides a ping that just arrived.
        return abs($now->diffInMinutes($pingedAt)) <= $freshMinutes;
    }
}
