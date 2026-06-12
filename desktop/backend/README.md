Commands to genrate pdf in background
php artisan pdf:generate 22
php artisan task:generate_daily_report 65
php artisan pdf:access-control-report-generate 22 2025-07-16 (shoulde be yesterday date)


## Queries

SELECT \* FROM attendance_logs where date("LogTime") = '2023-09-28' LIMIT 100

SELECT \* FROM attendance_logs where date("LogTime")
BETWEEN '2023-10-01' and '2023-10-05' and "UserID" = '53' and company_id = '8' ORDER BY "LogTime" desc LIMIT 100

// run this command to seed the data => php artisan db:seed --class=StatusSeeder

php artisan serve --host 192.168.2.17

sqlite3 extension for ubunut

-   sudo apt-get install php-sqlite3

function getDatesInRange(startDate, endDate) {
const date = new Date(startDate.getTime());

    const dates = [];

    // ✅ Exclude end date
    while (date < endDate) {
            let today = new Date(date);
            let [y,m,d] = [today.getDate(),today.getMonth() + 1,today.getFullYear()]

      dates.push(`${y}-${m}-${d}`);
      date.setDate(date.getDate() + 1);
    }

    return dates;

}

const d1 = new Date('2022-01-18');
const d2 = new Date('2022-01-24');

console.log(getDatesInRange(d1, d2));

Payslip references

https://www.youtube.com/watch?v=AY3EEGGHV3Y

//SDK photo upload process
php artisan queue:restart
php artisan queue:work

nohup php artisan queue:work

// node socket
nohup node leaveNotifications  
 nohup node employeeLeaveNotifications

//view nohup services node
pgrep -a node
kill 155555

/etc/nginx/sites-available to allow iframes edit configuration
sudo systemctl restart nginx

$ sudo systemctl restart nginx

SDK Live IP : 139.59.69.241
               PORT 7001
SDK Live port : 9001
SDK Live port : 9001

laravel Commands
php artisan task:attendance_seeder --company_id=8 --employee_id=5656 --day_count=10

php artisan serve --host=192.168.2.216

php artisan schedule:work



------------------------------------------
Snippet to add action to notitfication
------------------------------------------

use App\Models\Notification;

Notification::create([
"data" => "New visitor has been registered",
"action" => "Registration",
"model" => "Visitor",
"user_id" => $host->employee->user_id ?? 0,
"company_id" => $request->company_id,
"redirect_url" => "visitor_requests"
]);

------------------------------------------
END Snippet to add action to notitfication 
------------------------------------------

pm2 start java --  -jar  SxDeviceManager.jar

composer require webklex/laravel-pdfmerger
composer require simplesoftwareio/simple-qrcode
composer require simplesoftwareio/simple-qrcode:4.2 --with-all-dependencies
sudo apt-get install imagemagick



{
    "clientId": 2,
    "type": "map",
    "message": "real-time map update",
    "timestamp": "2026-02-27 23:50:46",
    "data": {
        "user_id": 678,
        "name": "Francis Gill",
        "avatar": "https://lh3.googleusercontent.com/aida-public/AB6AXuAgOmBDUE9YRPKrUELhubdiGKupJPt-_S1cAy0MCwnS4XLJ0F8HKYFSrehE-s5euFiPpgEgHiFZD1C4_azu015NF6eEUjCMMmf5ddSOmpi7ops0nKsPkh-1dy7Q1O1Pp1zJHGd2YLtIXjenPSPEq1tcWmZihbIU5Lihw_hliby7B7g5OIIOw7sSOcnp6QZ9Kaqnr238I7B2rX5VS7ZLN459F5CuA34Ygdr8rggzQtDdziWsB7Dzre13RYIJcDIEu1yRzWs-3KnWTG0_",
       "lat": 25.2545229,
        "lon": 55.303495,
        "timestamp": "2026-02-27 23:50:46"
    }
}

{
    "clientId": 2,
    "type": "map",
    "message": "real-time map update",
    "timestamp": "2026-02-27 23:50:46",
    "data": {
        "user_id": 678,
        "name": "Sarah Smith",
        "avatar": "https://lh3.googleusercontent.com/aida-public/AB6AXuAhS-rjJPilpVNSIf4S1vqyLYBjOahtdAeaKqmOsavmsWsy6lZeuR7sD6MN8XD63HAjqlt1EtHUfLHcYo0TWgH0b7dnytzUFy7dWzbY72R4_ecQrVPgFxq9qJcT6Gy85R9MatxIeAb0Z_McRlVUY6mFVEmtM_--OoDAfNfASkikA1iw4Cgit1p0Xhhm8Y-Qqs9T9s3RQYlbU0Oj1ZI8ocJe97z9Bd37VM-l0bqfk9Iylqr7tBHsRhImTlfKvKbk9bMZ-C8IQZvEOxPb",
        "lat": 25.2455128,
        "lon": 55.2941351,
        "timestamp": "2026-02-27 23:50:46"
    }
}

{
    "clientId": 2,
    "type": "map",
    "message": "real-time map update",
    "timestamp": "2026-02-27 23:50:46",
    "data": {
        "user_id": 679,
        "name": "Jhon Doe",
        "avatar": "https://lh3.googleusercontent.com/aida-public/AB6AXuAhS-rjJPilpVNSIf4S1vqyLYBjOahtdAeaKqmOsavmsWsy6lZeuR7sD6MN8XD63HAjqlt1EtHUfLHcYo0TWgH0b7dnytzUFy7dWzbY72R4_ecQrVPgFxq9qJcT6Gy85R9MatxIeAb0Z_McRlVUY6mFVEmtM_--OoDAfNfASkikA1iw4Cgit1p0Xhhm8Y-Qqs9T9s3RQYlbU0Oj1ZI8ocJe97z9Bd37VM-l0bqfk9Iylqr7tBHsRhImTlfKvKbk9bMZ-C8IQZvEOxPb",
        "lat": 25.3452326,
        "lon": 55.4128809,
        "timestamp": "2026-02-27 23:50:46"
    }
}