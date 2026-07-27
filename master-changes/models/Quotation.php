<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'date'        => 'date:Y-m-d',
        'valid_until' => 'date:Y-m-d',
        'modules'     => 'integer',
        'users'       => 'integer',
        'devices'     => 'integer',
        'branches'    => 'integer',
        'amount'      => 'float',
        'tax'         => 'float',
        'total'       => 'float',
    ];

    public function items()
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
