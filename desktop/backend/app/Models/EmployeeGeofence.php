<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class EmployeeGeofence extends Model
{
    protected $guarded = [];

    protected $casts = [
        'geo_fencing_enabled' => 'boolean',
    ];

    public function employee() { return $this->belongsTo(Employee::class); }
}
