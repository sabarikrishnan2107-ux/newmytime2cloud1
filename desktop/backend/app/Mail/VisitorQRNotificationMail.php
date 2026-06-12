<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;

class VisitorQRNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public $model;
    public $manager;
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
        $this->subject($this->model["subject"]);


        $visitor = $this->model["visitor"];
        $company = $this->model["company"];


        if (file_exists($this->model["file"]))
            $this->attach($this->model["file"]);



        $body_content1  = "Hi " .  $visitor["first_name"] . ' ' . $visitor["last_name"] . ',<br/><br/>';
        $body_content1  =  $body_content1 . "Your Visit Details as fallows.<br/>";
        $body_content1  =  $body_content1 . "Visit Date and Time:  " . $visitor['visit_from'] . " - " . $visitor['time_in']  . "<br/>";
        $body_content1  =  $body_content1 . "Till Date and Time  :  " . $visitor['visit_to'] . " - " . $visitor['time_out']  . "<br/>";
        $body_content1  =  $body_content1 . "Use QR Code (attached with this mail) as access card.<br/>";
        $body_content1  =  $body_content1 . " <br/><br/>";
        $body_content1  =  $body_content1 . " <br/><br/>";
        $body_content1  =  $body_content1 . "Regards,<br/>";
        $body_content1  =  $body_content1 . "<b>" . $company["name"] . "</b>";






        return $this->view('emails.report')->with(["body" =>  $body_content1]);
    }
}
