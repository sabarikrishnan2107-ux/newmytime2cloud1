<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ShiftType extends Model
{
    use HasFactory;

    const FILO = 1;
    const MULTI = 2;
    const AUTO = 3;
    const NIGHT = 4;
    const SPLIT = 5;
    const SINGLE = 6;

    // "1","FILO",
    // "2","Multi In/Out Shift,
    // "3","Auto Shift",
    // "4","Night Shift",
    // "5","Split Shift",
    // "6","Single Shift",

    protected $guarded = [];

    public function setNameAttribute($value)
    {
        $this->attributes['name'] = $value;
        $this->attributes['slug'] = Str::of($value)->slug('_');
    }

    /**
     * Get the user that owns the ShiftType
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function shift()
    {
        return $this->hasOne(Shift::class);
    }

    protected $casts = [
        'created_at' => 'datetime:d-M-y',
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];
}
