<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class AdvanceDeduction extends Model
{
    protected $guarded = [];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'deducted_at' => 'datetime',
    ];

    public function advance() { return $this->belongsTo(EmployeeAdvance::class, 'advance_id'); }
    public function employee() { return $this->belongsTo(Employee::class); }
}
