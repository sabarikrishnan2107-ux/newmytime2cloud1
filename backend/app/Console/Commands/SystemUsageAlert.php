<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SystemUsageAlert extends Command
{
    protected $signature = 'monitor:system';
    protected $description = 'Send email alert if disk, CPU, or RAM usage exceeds defined thresholds';

    public function handle()
    {
        $diskThreshold = (int) env('DISK_USAGE_THRESHOLD', 80);
        $cpuThreshold = (int) env('CPU_USAGE_THRESHOLD', 80);
        $ramThreshold = (int) env('RAM_USAGE_THRESHOLD', 80);

        $diskUsage = $this->getDiskUsage();
        $cpuUsage = $this->getCpuUsage();
        $ramUsage = $this->getRamUsage();

        $from = env('MAIL_FROM_ADDRESS', 'noreply@example.com');
        $to = explode(',', env('ADMIN_MAIL_RECEIVERS', 'francisgill1000@gmail.com'));

        $this->info("📤 Sender: {$from}");
        $this->info("📥 Receivers: " . implode(', ', $to));
        $this->info("📊 Disk: {$diskUsage}%, CPU: {$cpuUsage}%, RAM: {$ramUsage}%");

        $subject = "System Usage Alert";
        $emailMessage = $this->buildMessage($diskUsage, $diskThreshold, $cpuUsage, $cpuThreshold, $ramUsage, $ramThreshold);

        Mail::raw($emailMessage, function ($message) use ($to, $subject, $from) {
            $message->to($to)->from($from)->subject($subject);
        });

        $this->info("✅ Email sent successfully.");
        return 0;
    }

    protected function getDiskUsage(): int
    {
        $output = shell_exec("df / | grep / | awk '{ print $5 }'");
        return (int) trim(str_replace('%', '', $output));
    }

    protected function getCpuUsage(): int
    {
        $load = sys_getloadavg()[0]; // 1-minute load average
        $cpuCores = (int) shell_exec("nproc");
        $usagePercent = min(100, round(($load / $cpuCores) * 100));
        return $usagePercent;
    }

    protected function getRamUsage(): int
    {
        $free = shell_exec('free');
        preg_match('/Mem:\s+(\d+)\s+(\d+)/', $free, $matches);
        if (count($matches) < 3) return 0;

        $total = (float) $matches[1];
        $used = (float) $matches[2];
        return (int) round(($used / $total) * 100);
    }

    protected function buildMessage(int $disk, int $diskLimit, int $cpu, int $cpuLimit, int $ram, int $ramLimit): string
    {
        $lines = [];

        $lines[] = "🖥️ System Usage Report";
        $lines[] = "Disk Usage: {$disk}% " . ($disk > $diskLimit ? "🚨" : "✅") . " (Limit: {$diskLimit}%)";
        $lines[] = "CPU Usage: {$cpu}% " . ($cpu > $cpuLimit ? "🚨" : "✅") . " (Limit: {$cpuLimit}%)";
        $lines[] = "RAM Usage: {$ram}% " . ($ram > $ramLimit ? "🚨" : "✅") . " (Limit: {$ramLimit}%)";
        $lines[] = "\n🔧 Tips:";
        $lines[] = "- Disk: `sudo du -ahx / | sort -rh | head -n 20`";
        $lines[] = "- CPU: `top -o %CPU`";
        $lines[] = "- RAM: `top -o %MEM`";

        return implode("\n", $lines);
    }
}
