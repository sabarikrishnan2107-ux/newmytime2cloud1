<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TimezoneEmployees extends Model
{
    use HasFactory;
    protected $guarded = [];


    public function device()
    {
        return $this->belongsTo(Device::class, "device_table_id", "id");
    }
    public function timezone()
    {
        return $this->belongsTo(Timezone::class, "timezone_table_id", "id");
    }
    public function employee()
    {
        return $this->belongsTo(Employee::class, "employee_table_id", "id");
    }
}
