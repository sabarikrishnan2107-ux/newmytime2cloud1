<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'qty'  => 'float',
        'rate' => 'float',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
