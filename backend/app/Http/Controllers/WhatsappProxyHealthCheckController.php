<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class WhatsappProxyHealthCheckController extends Controller
{
    public function check(Request $request)
    {
        $minutes = $request->input('minutes', 60);
        $path = $request->input('path', '/root/wa');

        $escapedPath = escapeshellarg($path);
        $command = "find $escapedPath -type f -iname \"*.csv\" -mmin +$minutes";
        $output = shell_exec($command);

        $this->log("Running command: $command");

        $companies = Company::with('user')->get(['id', 'company_code', 'user_id']);
        if ($companies->isEmpty()) {
            $this->log("No company found.");
            return response()->json(['message' => 'No company found.'], 404);
        }

        $companyEmails = $companies->keyBy('company_code')->map(fn($company) => $company->user?->email)->toArray();

        $deletedFiles = [];
        $emailsSent = [];

        if ($output) {
            $lines = explode("\n", trim($output));
            foreach ($lines as $line) {
                if (preg_match('/\/([^\/]+)_logs\.csv$/', $line, $matches)) {
                    $id = explode("_", $matches[1])[0] ?? null;

                    if ($id && isset($companyEmails[$id])) {
                        $email = $companyEmails[$id];
                        $this->sendExpiredEmail($email);
                        $emailsSent[] = $email;

                        // if (file_exists($line)) {
                        //     unlink($line);
                        //     $deletedFiles[] = $line;
                        //     $this->log("Deleted file: $line");
                        // } else {
                        //     $this->log("File not found for deletion: $line");
                        // }
                    }
                }
            }

            return response()->json([
                'message' => "Processed files older than $minutes minutes.",
                'emails_sent' => $emailsSent,
                'deleted_files' => $deletedFiles
            ]);
        } else {
            $this->sendTestEmail($minutes);
            return response()->json([
                'message' => "No CSV files found older than $minutes minutes. Test email sent."
            ]);
        }
    }

    protected function sendExpiredEmail($to)
    {
        return;
        Mail::raw("Dear Admin,\n\nYour WhatsApp account has expired. Please update your account.\n\nBest regards,\nMyTime2Cloud", function ($message) use ($to) {
            $message->to($to)->bcc('francisgill1000@gmail.com')->subject("MyTime2Cloud: WhatsApp Account Expired");
        });

        $this->log("Email sent to $to with BCC to francisgill1000@gmail.com");
    }

    protected function sendTestEmail($minutes, $to = 'francisgill1000@gmail.com')
    {
        return;
        Mail::raw("Dear Admin,\nNo CSV files found older than $minutes minutes.\n\nBest regards,\nMyTime2Cloud", function ($message) use ($to) {
            $message->to($to)->subject("MyTime2Cloud: WhatsApp Account Expired");
        });

        $this->log("Test email sent to $to");
    }

    protected function log($message)
    {
        return;
        Log::channel('daily')->info("[WhatsappHealthCheck] " . $message);
    }
}
