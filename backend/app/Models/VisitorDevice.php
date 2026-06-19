<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VisitorDevice extends Model
{
    protected $guarded = [];

    protected $casts = [
        'valid_from' => 'datetime',
        'valid_to'   => 'datetime',
        'pushed_at'  => 'datetime',
        'removed_at' => 'datetime',
    ];

    public function visitor()
    {
        return $this->belongsTo(Visitor::class);
    }
}
