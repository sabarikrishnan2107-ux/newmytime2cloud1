@component('mail::message')
    # System Notification: Absent Employees Update

    Dear Admin,

    This is an automated message to inform you that ({{ count($absentEmployees) }}) employees were absent today
    ({{ $date }}).

    Employee List:
    @foreach ($absentEmployees as $key => $employee)
        {{ $key + 1 }}. {{ $employee->first_name . ' ' . $employee->last_name . ' ' . " (". $employee->system_user_id.")" }}
    @endforeach

    Thank you,<br>
    {{ config('app.name') }}
@endcomponent
