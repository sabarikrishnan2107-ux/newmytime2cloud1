<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class LoanDeduction extends Model
{
    protected $guarded = [];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'deducted_at' => 'datetime',
    ];

    public function loan() { return $this->belongsTo(EmployeeLoan::class, 'loan_id'); }
    public function employee() { return $this->belongsTo(Employee::class); }
}
