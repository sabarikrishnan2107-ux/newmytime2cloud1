<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class VisitorPreRegistration extends Model
{
    protected $guarded = [];

    public function hostEmployee() { return $this->belongsTo(Employee::class, 'host_employee_id'); }
    public function visitor() { return $this->belongsTo(Visitor::class); }
}
