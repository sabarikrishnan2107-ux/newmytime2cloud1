<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActiveLicense extends Model
{
    use HasFactory;

    protected $table = 'active_license';

    protected $guarded = [];

    protected $casts = [
        'allowed_devices' => 'array',
        'issued_at' => 'date:Y-m-d',
        'expiry' => 'date:Y-m-d',
        'activated_at' => 'datetime',
    ];
}
