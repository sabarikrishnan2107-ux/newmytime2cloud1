<?php

namespace App\Services\Attendance;

use App\Models\Attendance;

class AttendanceSessionNormalizer
{
    /**
     * Normalize any shift type into a standard 5-slot sessions array.
     *
     * Each slot is either null (unused) or:
     * [
     *   'in_time'    => '08:05' | null,
     *   'out_time'   => '12:05' | null,
     *   'device_in'  => 'Front Door' | null,
     *   'device_out' => 'Staff Exit' | null,
     *   'duration'   => '04:00' | null,
     * ]
     */
    public function normalize(Attendance $attendance): array
    {
        $shiftTypeId = (int) $attendance->getRawOriginal('shift_type_id');

        return match ($shiftTypeId) {
            2       => $this->normalizeMulti($attendance),
            5       => $this->normalizeSplit($attendance),
            default => $this->normalizeSingle($attendance), // 1,3,4,6,0
        };
    }

    private function normalizeSingle(Attendance $attendance): array
    {
        $inTime  = $attendance->in_time  ?: null;
        $outTime = $attendance->out_time ?: null;

        if ($inTime === null && $outTime === null) {
            return [null, null, null, null, null];
        }

        return [
            [
                'in_time'    => $inTime,
                'out_time'   => $outTime,
                'device_in'  => optional($attendance->device_in)->name  ?: null,
                'device_out' => optional($attendance->device_out)->name ?: null,
                'duration'   => $this->computeDuration($inTime, $outTime),
            ],
            null, null, null, null,
        ];
    }

    private function normalizeMulti(Attendance $attendance): array
    {
        $logs     = $attendance->logs ?? [];
        $sessions = [];

        foreach (array_slice($logs, 0, 5) as $log) {
            $inTime  = ($log['in_time']  ?? null) ?: null;
            $outTime = ($log['out_time'] ?? null) ?: null;

            if ($inTime === null && $outTime === null) {
                $sessions[] = null;
                continue;
            }

            $sessions[] = [
                'in_time'    => $inTime,
                'out_time'   => $outTime,
                'device_in'  => ($log['device_in']  ?? null) ?: null,
                'device_out' => ($log['device_out'] ?? null) ?: null,
                'duration'   => $this->computeDuration($inTime, $outTime),
            ];
        }

        while (count($sessions) < 5) {
            $sessions[] = null;
        }

        return $sessions;
    }

    private function normalizeSplit(Attendance $attendance): array
    {
        $logs     = $attendance->logs ?? [];
        $sessions = [];

        foreach (array_slice($logs, 0, 2) as $log) {
            $inTime  = ($log['in_time']  ?? null) ?: null;
            $outTime = ($log['out_time'] ?? null) ?: null;

            if ($inTime === null && $outTime === null) {
                $sessions[] = null;
                continue;
            }

            $sessions[] = [
                'in_time'    => $inTime,
                'out_time'   => $outTime,
                'device_in'  => ($log['device_in']  ?? null) ?: null,
                'device_out' => ($log['device_out'] ?? null) ?: null,
                'duration'   => $this->computeDuration($inTime, $outTime),
            ];
        }

        while (count($sessions) < 5) {
            $sessions[] = null;
        }

        return $sessions;
    }

    private function computeDuration(?string $inTime, ?string $outTime): ?string
    {
        if (! $inTime || ! $outTime) {
            return null;
        }

        $diff = strtotime($outTime) - strtotime($inTime);

        if ($diff <= 0) {
            return null;
        }

        return gmdate('H:i', $diff);
    }
}
