<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class PayrollBatch extends Model
{
    protected $guarded = [];
    
    public function records() { return $this->hasMany(PayrollRecord::class, 'batch_id'); }
    public function branch() { return $this->belongsTo(Branch::class); }
}
