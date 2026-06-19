<?php
namespace App\Console\Commands;

use App\Models\Company;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class WhatsappProxyHealthCheck extends Command
{
    protected $signature   = 'whatsapp:proxy-health-check {minutes=60} {path=/root/wa}';
    protected $description = 'Check recently updated WhatsApp proxy CSV files (last 2 hours) using shell';

    public function handle()
    {
        $this->logCommandOutput("WhatsappProxyHealthCheck command ran at: " . now());

        $path    = $this->argument('path');
        $minutes = $this->argument('minutes');

        // $this->info($minutes);

        $escapedPath = escapeshellarg($path);

        $command = "find $escapedPath -type f -iname \"*.csv\" -mmin +$minutes";

        $this->logCommandOutput("Checking for recently updated CSV files in $path");
        $this->logCommandOutput("Running command: $command");

        $output = shell_exec($command);

        $companies = Company::with('user')->get(['id', 'company_code', 'user_id']);

        if ($companies->isEmpty()) {
            $this->logCommandOutput("No company found.");
            return;
        }

        // Key by company_code for easy access
        $companyEmails = $companies->keyBy('company_code')->map(function ($company) {
            return $company->user?->email; // use null safe operator
        })->toArray();

        // $this->info(showJson($companyEmails));

        if (! count($companies)) {
            $this->logCommandOutput("No company found.");
            return;
        }

        if ($output) {
            $this->logCommandOutput("CSV files modified in the last $minutes minutes:");
            $this->line($output);

            $lines = explode("\n", trim($output));

            $notFound = [];

            foreach ($lines as $line) {
                if (preg_match('/\/([^\/]+)_logs\.csv$/', $line, $matches)) {
                    $id = explode("_", $matches[1])[0] ?? null; // e.g. AE00042

                    if ($id && isset($companyEmails[$id])) {
                        $companyEmail = $companyEmails[$id];

                        $this->sendEmailsForCsvIds($companyEmail);
                        // $this->sendEmailsForCsvIds();

                        $this->logCommandOutput("Email sent for $id to $companyEmail (bcc to Francis)");

                        // ✅ DELETE the file after sending
                        if (file_exists($line)) {
                            unlink($line);
                            $this->info("Deleted file: $line");
                            $this->logCommandOutput("Deleted file: $line");
                        } else {
                            $this->warn("File not found for deletion: $line");
                            $this->logCommandOutput("File not found for deletion: $line");
                        }
                    } else {
                        $notFound[] = $matches[1];
                    }

                    $this->logCommandOutput("Following Ids not found");
                    $this->logCommandOutput(json_encode($notFound));
                }
            }
        } else {
            $this->logCommandOutput("No CSV files found older than $minutes minutes.");
            $this->sendEmailsForTest($minutes);
        }

        return Command::SUCCESS;
    }

    protected function sendEmailsForCsvIds($to = 'francisgill1000@gmail.com')
    {
        if ($to) {
            Mail::raw("Dear Admin,\n\nYour WhatsApp account has expired. Please update your account.\n\nBest regards,\nMyTime2Cloud", function ($message) use ($to) {
                $message->to($to)
                    ->bcc('francisgill1000@gmail.com')
                    ->subject("MyTime2Cloud: WhatsApp Account Expired");
            });
            $this->logCommandOutput("Email sent to $to with BCC to akildevs1000@gmail.com");
        }
    }

    protected function sendEmailsForTest($minutes, $to = 'francisgill1000@gmail.com')
    {
        if ($to) {
            Mail::raw("Dear Admin,\nNo CSV files found older than $minutes minutes.\n\nBest regards,\nMyTime2Cloud", function ($message) use ($to) {
                $message->to($to)->subject("MyTime2Cloud: WhatsApp Account Expired");
            });
            $this->logCommandOutput("Email sent to $to");
        }
    }

    protected function logCommandOutput(string $message)
    {
        $this->info($message);
        Log::channel('whatsapp-health')->info($message);
    }
}
