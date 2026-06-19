<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;

class TestMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public $model;

    public function __construct() {}

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {

        $this->subject("Test Subject " . date("Y-m-d H:i:s"));
        return $this->view('emails.report')->with(["body" => "Test Mail" . date("Y-m-d H:i:s")]);
    }
}
