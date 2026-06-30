<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'price'          => 'float',
        'features'       => 'array',
        'limits'         => 'array',
        'feature_limits' => 'array',
    ];
}
