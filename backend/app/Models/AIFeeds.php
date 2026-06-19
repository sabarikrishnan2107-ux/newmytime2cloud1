<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AIFeeds extends Model
{
    use HasFactory;

    protected $table = 'ai_feeds';

    protected $fillable = [
        'company_id',
        'employee_id',
        'type',
        'description',
        'data',
    ];

    protected $casts = [
        'data' => 'array',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
