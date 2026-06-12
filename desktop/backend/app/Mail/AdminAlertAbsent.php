<?php

namespace App\Mail;

use App\Models\Attendance;
use App\Models\Employee;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AdminAlertAbsent extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $date;
    public $absentEmployees;

    public function __construct($date, $absentEmployees)
    {
        $this->date = $date;
        $this->absentEmployees = $absentEmployees;
    }

    public function build()
    {
        $this->subject('MyTime2Cloud - Absent Employees Report | ' . $this->date);

        // Generate PDF
        try {
            $html = '<!DOCTYPE html><html><head><style>
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#333}
            .header{background:#c0392b;color:#fff;padding:25px 30px;text-align:center}
            .header h1{font-size:20px;font-weight:800;margin-bottom:4px}.header p{font-size:11px;opacity:0.85}
            .content{padding:20px 30px}
            table{width:100%;border-collapse:collapse;font-size:11px;margin-top:15px}
            th{background:#c0392b;color:#fff;padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase}
            td{padding:8px 6px;border-bottom:1px solid #eee}tr:nth-child(even){background:#f8f9fa}
            .footer{text-align:center;padding:15px;font-size:9px;color:#999;margin-top:20px}
            .summary{margin:15px 0;padding:12px;background:#fef2f2;border-radius:8px;border-left:4px solid #c0392b}
            </style></head><body>';

            $html .= '<div class="header"><h1>MyTime2Cloud - Absent Employees Report</h1>';
            $html .= '<p>' . $this->date . '</p></div>';
            $html .= '<div class="content">';

            $count = count($this->absentEmployees);
            $html .= '<div class="summary"><strong style="color:#c0392b">' . $count . ' employee(s)</strong> were absent today.</div>';

            if ($count > 0) {
                $html .= '<table><thead><tr><th>#</th><th>Employee Name</th><th>ID</th><th>Email</th><th>Phone</th></tr></thead><tbody>';
                $i = 1;
                foreach ($this->absentEmployees as $emp) {
                    $html .= '<tr>';
                    $html .= '<td>' . $i++ . '</td>';
                    $html .= '<td><strong>' . ($emp->first_name ?? '') . ' ' . ($emp->last_name ?? '') . '</strong></td>';
                    $html .= '<td>' . ($emp->system_user_id ?? '---') . '</td>';
                    $html .= '<td>' . ($emp->local_email ?? '---') . '</td>';
                    $html .= '<td>' . ($emp->whatsapp_number ?? '---') . '</td>';
                    $html .= '</tr>';
                }
                $html .= '</tbody></table>';
            } else {
                $html .= '<p style="text-align:center;color:#999;padding:20px">No absent employees found for today.</p>';
            }

            $html .= '<div class="footer">System-generated report from MyTime2Cloud</div>';
            $html .= '</div></body></html>';

            $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
            $pdfPath = storage_path('app/absent_report_' . date('Y-m-d') . '.pdf');
            $pdf->save($pdfPath);

            $this->attach($pdfPath, [
                'as' => 'Absent_Report_' . date('Y-m-d') . '.pdf',
                'mime' => 'application/pdf',
            ]);
        } catch (\Exception $e) {
            \Log::warning("Failed to generate absent PDF: " . $e->getMessage());
        }

        return $this->subject('MyTime2Cloud - Absent Employees Report | ' . $this->date)
            ->with(["absentEmployees" => $this->absentEmployees, "date" => $this->date])
            ->markdown('emails.admin_alert_absent');
    }
}
