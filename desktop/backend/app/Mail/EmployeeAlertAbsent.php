<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmployeeAlertAbsent extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @return void
     */

    public $date;
    public $name;

    public function __construct($date, $name)
    {
        $this->date = $date;
        $this->name = $name;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->subject('System Notification: Absent Employee')
            ->with(["name" => $this->name, "date" => $this->date])
            ->markdown('emails.employee_alert_absent');
    }
}
