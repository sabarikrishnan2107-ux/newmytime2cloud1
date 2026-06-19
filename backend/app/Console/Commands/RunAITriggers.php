<?php

use Illuminate\Console\Command;
use App\Models\AITrigger;
use Illuminate\Support\Facades\DB;

class RunAITriggers extends Command
{
    // $schedule->command('ai:run-triggers')->everyMinute();

    protected $signature = 'ai:run-triggers';

    protected $description = 'Run AI Attendance Triggers';

    public function handle()
    {
        $now = now();

        $time = $now->format('H:i');
        $day = $now->format('D');
        $monthDay = $now->day;

        $triggers = AITrigger::where('run_time',$time)->get();

        foreach($triggers as $rule){

            if($rule->frequency == "weekly"){
                if(!str_contains($rule->weekdays,$day)){
                    continue;
                }
            }

            if($rule->frequency == "monthly"){
                if($rule->month_day != $monthDay){
                    continue;
                }
            }

            $results = DB::select("
                SELECT 
                CONCAT(
                    'Employee ',
                    employees.first_name,
                    ' (ID: ',
                    employees.id,
                    ') has ',
                    COUNT(*),
                    '+ consecutive {$rule->type}'
                ) as message
                FROM attendances
                JOIN employees ON employees.id = attendances.employee_id
                WHERE attendances.status = ?
                AND attendances.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY employees.id
                HAVING COUNT(*) >= ?
            ",[$rule->type,$rule->days,$rule->days]);

            foreach($results as $row){

                $this->info($row->message);

                DB::table('notifications')->insert([
                    "message"=>$row->message,
                    "created_at"=>now()
                ]);
            }
        }
    }
}