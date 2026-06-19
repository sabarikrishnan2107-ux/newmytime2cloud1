<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsappClient extends Model
{
    use HasFactory;

    protected $fillable = ['company_id', 'accounts'];

    protected $casts = [
        'accounts' => 'array', // Automatically cast JSON to array
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }


    public function contact()
    {
        return $this->belongsTo(CompanyContact::class, "company_id", "company_id");
    }
}
