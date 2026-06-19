<?php


namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $data;

    public function __construct($data)
    {
        $this->data = $data;
    }

    public function build()
    {
        return $this->subject('New Lead: ' . $this->data['company'])
            ->html("
                        <h3>New Contact Form Submission</h3>
                        <p><strong>Name:</strong> {$this->data['name']}</p>
                        <p><strong>Company:</strong> {$this->data['company']}</p>
                        <p><strong>Email:</strong> {$this->data['email']}</p>
                        <p><strong>Phone:</strong> {$this->data['phone']}</p>
                        <p><strong>Message:</strong></p>
                        <p>{$this->data['message']}</p>
                    ");
    }
}
