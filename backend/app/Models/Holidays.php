<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Holidays extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $appends = ['last_sync_at'];

    protected $casts = [
        'created_at' => 'datetime:d-M-y',
        'updated_at' => 'datetime:d-M-y H:i',
    ];

    public function branch()
    {
        return $this->belongsTo(CompanyBranch::class, "branch_id");
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    protected function lastSyncAt(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->updated_at?->format('d-M-y H:i') ?? 'Never',
        );
    }
}
