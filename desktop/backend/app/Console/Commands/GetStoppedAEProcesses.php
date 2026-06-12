<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\WhatsappClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Process\Process;

class GetStoppedAEProcesses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pm2:stopped-ae-processes';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Get stopped AE processes from PM2';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $accounts = WhatsappClient::pluck("accounts")->toArray();

        $clientIds = [];

        foreach ($accounts as $key => $value) {

            if (count($value) > 0) {
                $clientIds[] = $value[0]['clientId'];
            }
        }

        $ignoredProcesses = ['pm2-client-connector', 'unused-whatsapp-client'];

        // Run the PM2 command to get the process list in JSON format
        $process = new Process(['pm2', 'jlist']);
        $process->run();

        // Check if the process was successful
        if (!$process->isSuccessful()) {
            $this->error('Error: ' . $process->getErrorOutput());
            return 1;
        }

        try {
            // Decode the JSON output from PM2
            $output = $process->getOutput();
            $processes = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->error('Invalid JSON output from PM2');
                return 1;
            }




            // Filter the processes that are stopped and match AE condition
            $stoppedAEProcesses = collect($processes)
                ->filter(function ($proc) use ($ignoredProcesses) {
                    return $proc['pm2_env']['status'] === 'stopped' &&
                        str_starts_with($proc['name'], 'AE') &&
                        !in_array($proc['name'], $ignoredProcesses);
                })
                ->map(function ($proc) {
                    return explode('_', $proc['name'])[0];
                })
                ->map(function ($proc) {
                    return (int) explode('AE', $proc)[1];
                })
                ->unique()
                ->values()
                ->all();

            $companies = Company::with("contact:company_id,whatsapp")
                ->whereIn("company_code", $stoppedAEProcesses)
                ->get(["id", "company_code"]);

            if (count($companies) > 0) {
                foreach ($companies as $company) {

                    $code = $company->company_code; // AE00042

                    // Check if company code exists in the clientIds list
                    $matchedClientId = collect($clientIds)->first(function ($clientId) use ($code) {
                        return strpos($clientId, $code) !== false;
                    });

                    if ($matchedClientId) {
                        // If there's a match
                        $this->info("Found similar client ID: $matchedClientId");
                        $deleteProcess = new Process(['pm2', 'delete', $matchedClientId]);
                        $deleteProcess->run();

                        if ($deleteProcess->isSuccessful()) {
                            $this->info("🗑️ PM2 process '$matchedClientId' deleted successfully.");

                            $whatsapp =  $company->contact->whatsapp;

                            $whatsapp = env("ADMIN_WHATSAPP_NUMBER");

                            $payload = [
                                'clientId' => env("WHATSAPP_PROXY_CLIENT"),
                                'recipient' => $whatsapp,
                                'text' => $this->generateMessage(),
                            ];

                            $url = 'https://wa.mytime2cloud.com/send-message';

                            $response = Http::withoutVerifying()->post($url, $payload);

                            if ($response->successful()) {
                                $this->info("📣 Alert sent to $whatsapp");
                            } else {
                                echo ("\nMessage cannot $whatsapp.");
                            }
                        } else {
                            $this->error("⚠️ Failed to delete PM2 process '$matchedClientId': " . $deleteProcess->getErrorOutput());
                        }
                    } else {
                        $this->info("No matching client ID found for company code: $code");
                    }

                    sleep(3);
                }
            } else {
                $this->info('No stopped AE processes found.');
            }

            return 0; // Success
        } catch (\Exception $e) {
            $this->error('Exception: ' . $e->getMessage());
            return 1; // Error
        }
    }

    private function generateMessage()
    {
        return "🔔 Whatsapp Expiry Notification! !\n" .
            "\n" .
            "Dear Admin,\n\n" .
            "Your WhatsApp account for Mytime2Cloud has expired.\n\n" .
            "Please reconnect your WhatsApp as soon as possible to continue using the service..\n\n" .
            "Thank you!\n";
    }
}
