<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class DocumentInfo extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $appends = ['issue_date_display', 'expiry_date_display', 'access_url'];

    protected $casts = [
        'created_at' => 'datetime:d-M-y',
    ];

    public function getAccessUrlAttribute()
    {
        if (!$this->attachment) {
            return null;
        }

        return asset("documents/{$this->employee_id}/{$this->attachment}");
    }

    public function getIssueDateDisplayAttribute()
    {
        return date("d M y", strtotime($this->issue_date));
    }

    public function getExpiryDateDisplayAttribute()
    {
        if (!$this->expiry_date) {
            return null;
        }
        return date("d M y", strtotime($this->expiry_date));
    }

    protected static function boot()
    {
        parent::boot();

        // Order by name ASC
        static::addGlobalScope('order', function (Builder $builder) {
            $builder->orderBy('id', 'desc');
        });
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
