<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Minimum worked minutes to count as Present
    |--------------------------------------------------------------------------
    |
    | A day with a real IN and OUT but fewer worked minutes than this floor is
    | downgraded to Absent (e.g. a punch-in then immediate punch-out). A day
    | with an IN but no OUT is treated as Missing in the shift renderers.
    |
    | Override per environment with ATTENDANCE_MIN_PRESENT_MINUTES in .env.
    |
    */
    'min_present_minutes' => (int) env('ATTENDANCE_MIN_PRESENT_MINUTES', 60),
];
