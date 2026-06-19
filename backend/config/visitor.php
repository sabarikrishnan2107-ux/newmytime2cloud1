<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Push walk-in visitors to access-control devices
    |--------------------------------------------------------------------------
    |
    | When false (DB-first), the walk-in flow stores the visitor, the temporary
    | system_user_id, and the visitor_devices rows, but does NOT make the live
    | SDK call to the physical devices. Flip VISITOR_SDK_PUSH=true once the
    | stored data has been verified to enable real device upload + expiry removal.
    |
    */
    'sdk_push' => env('VISITOR_SDK_PUSH', false),
];
