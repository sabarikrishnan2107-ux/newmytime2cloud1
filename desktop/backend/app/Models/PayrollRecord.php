<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class PayrollRecord extends Model
{
    protected $guarded = [];
    
    public function employee() { return $this->belongsTo(Employee::class); }
    public function batch() { return $this->belongsTo(PayrollBatch::class, 'batch_id'); }
}
