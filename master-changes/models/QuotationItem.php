<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuotationItem extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'qty'  => 'float',
        'rate' => 'float',
    ];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }
}
