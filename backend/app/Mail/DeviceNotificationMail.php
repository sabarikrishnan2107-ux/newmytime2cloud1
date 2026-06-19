<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;

class DeviceNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public $model;

    public function __construct($model)
    {
        $this->model = $model;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        $this->subject($this->model->subject);

        $company_id = $this->model->company_id;



        //return $this->view('emails.report')->with(["body" => $this->model->body]);
        return $this->view('emails.report')->with(["body" => "Hi, Attached reports for your reference. "]);
    }
}
