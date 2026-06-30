<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'date'     => 'date:Y-m-d',
        'due_date' => 'date:Y-m-d',
        'amount'   => 'float',
        'tax'      => 'float',
        'discount' => 'float',
        'total'    => 'float',
    ];

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
