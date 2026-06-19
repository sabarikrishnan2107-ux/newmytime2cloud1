@component('mail::message')
# System Notification: Absent Employee

Hi {{$name}},

We noticed that you were absent today ({{ $date }}). If there's a valid reason for your absence, please let us know.

Thank you,<br>
Admin
@endcomponent