<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    protected $guarded = [];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    public function senderEmployee()
    {
        return $this->hasOne(Employee::class, 'id', 'sender_id')
            ->select('id', 'first_name', 'last_name', 'profile_picture', 'branch_id', 'department_id');
    }
}
