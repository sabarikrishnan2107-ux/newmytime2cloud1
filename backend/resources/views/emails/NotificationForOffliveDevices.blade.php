@component('mail::message')
# Hello, {{ $manager->name }}
# Company: {{ $company->name }}
# Branch: {{ $branch_name }}
Total **({{ count($devices) }})** of your devices are currently offline.



<!-- @component('mail::table')
| # | Name | Location | Serial Number|
| ------------- |:-------------|:--------|:--------|
@foreach ($devices as $index=>$device)
| {{++$index}} | {{$device->name}} | {{$device->location}} |{{$device->device_id}} |
@endforeach
@endcomponent -->
@component('mail::table')


<table id="customers">
    <tr>
        <th>#</th>
        <th>Name</th>
        <th>Location</th>
        <th>Serial Number</th>
    </tr>
    @foreach ($devices as $index=>$device)
    <tr>
        <td>{{++$index}}</td>
        <td>{{$device->name}}</td>
        <td>{{$device->location}}</td>
        <td>{{$device->device_id}}</td>
    </tr>
    @endforeach
</table>

Please take a look and address the issue as needed to avoid any errors in reports.
If you have any questions or need assistance, feel free to reach out.

@endcomponent

@component('mail::button', ['url' => config("app.url").'/login'])
Visit Website
@endcomponent


Best regards,<br>
{{ config('app.name') }}
@endcomponent
<style>
    #customers {
        font-family: Arial, Helvetica, sans-serif;
        border-collapse: collapse;
        width: 100%;
    }

    #customers td,
    #customers th {
        border: 1px solid #ddd;
        padding: 8px;
    }

    #customers tr:nth-child(even) {
        background-color: #f2f2f2;
    }

    #customers tr:hover {
        background-color: #ddd;
    }

    #customers th {
        padding-top: 12px;
        padding-bottom: 12px;
        text-align: left;
        background-color: #04AA6D;
        color: white;
    }

    /* td,
    th {
        border: 1px solid #ddd;
        padding: 8px;
    }

    tr:nth-child(even) {
        background-color: #f2f2f2;
    }



    th {
        padding-top: 12px;
        padding-bottom: 12px;
        text-align: left;
        background-color: #04AA6D;
        color: white;
    } */
</style>