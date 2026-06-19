<?php

namespace App\Mail;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DeviceOfflineAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $messageBody;

    public function __construct(string $messageBody)
    {
        $this->messageBody = $messageBody;
    }

    public function build()
    {
        // Generate PDF report of offline devices
        try {
            $html = '<!DOCTYPE html><html><head><style>
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#333}
            .header{background:#e67e22;color:#fff;padding:25px 30px;text-align:center}
            .header h1{font-size:20px;font-weight:800;margin-bottom:4px}.header p{font-size:11px;opacity:0.85}
            .content{padding:20px 30px}
            .alert-box{background:#fef3e2;border-left:4px solid #e67e22;padding:15px;border-radius:8px;margin:15px 0}
            .footer{text-align:center;padding:15px;font-size:9px;color:#999;margin-top:20px}
            </style></head><body>';

            $html .= '<div class="header"><h1>MyTime2Cloud - Device Offline Alert</h1>';
            $html .= '<p>' . date('D, F j, Y H:i') . '</p></div>';
            $html .= '<div class="content">';
            $html .= '<div class="alert-box">' . nl2br($this->messageBody) . '</div>';
            $html .= '<div class="footer">System-generated alert from MyTime2Cloud</div>';
            $html .= '</div></body></html>';

            $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
            $pdfPath = storage_path('app/device_alert_' . date('Y-m-d_His') . '.pdf');
            $pdf->save($pdfPath);

            $this->attach($pdfPath, [
                'as' => 'Device_Offline_Alert_' . date('Y-m-d') . '.pdf',
                'mime' => 'application/pdf',
            ]);
        } catch (\Exception $e) {
            \Log::warning("Failed to generate device alert PDF: " . $e->getMessage());
        }

        return $this
            ->subject('MyTime2Cloud - Device Offline Alert | ' . date('D, F j, Y'))
            ->html('<p>' . $this->messageBody . '</p><br><p><small>PDF report attached.</small></p>');
    }
}
