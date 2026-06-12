const PAYLOAD = {

    // extra fields  dont touch
    "branch_id": 0,
    "days": [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun"
    ],
    "weekend1": "Not Applicable",
    "weekend2": "Not Applicable",
    "monthly_flexi_holidays": 0,
    "company_id": 2,
    "from_date": "2025-10-14T15:54:18.428Z",
    "to_date": "2026-10-14T15:54:18.428Z",
    "halfday": "Not Applicable",
    "halfday_working_hours": "HH:MM",
    // extra fields  dont touch

    "shift_type_id": 1,
    "name": "test",
    "isAutoShift": false,


    "on_duty_time": "09:00",
    "off_duty_time": "18:00",
    "beginning_in": "06:00",
    "beginning_out": "13:00",
    "ending_in": "15:00",
    "ending_out": "21:00",

    // for Dual Shift Only
    "on_duty_time1": "09:00",
    "off_duty_time1": "18:00",
    "beginning_in1": "16:00",
    "beginning_out1": "18:00",
    "ending_in1": "20:00",
    "ending_out1": "23:59",

    "working_hours": "09:00",
    "is_auto_deduct": true, // new
    "break_duration": "01:00", // new
    "unlimited_for_multi": false, // new
    "minimum_session_duration": "00:30", // new

    // dual shift
    "first_session_name": "e.g. Morning", // new
    "second_session_name": "e.g. Afternoon", // new

    // Attendance Rules

    // weekoff
    "weekoff_rules": {
        "type": "Fixed",  // "Fixed" | "Flexible | Alternating"
        "days": ["S", "Su"],
        "cycle": "Weekly",  // "Weekly" | "Monthly"
        "count": 2,
        "even": [],
        "odd": [],
    },

    "halfday_rules": {
        enabled: false,
        day: "S",
        onDuty: "09:00",
        offDuty: "01:00",
        minHours: 4.0,
        beginStart: "08:30",
        beginEnd: "09:30",
        endStart: "12:30",
        endEnd: "02:00",
    },

    "overtime_type": "None",
    "weekend_allowed_ot": false, //new
    "holiday_allowed_ot": false, // new
    "overtime_interval": "01:00",
    "daily_ot_allowed_mins": "01:00", // new

    "late_time": "00:15",
    "attendanc_rule_late_coming": "Late Mark",
    "absent_min_in": "01:00",

    "significant_attendanc_rule_late_coming": "No Action",


    "early_time": "00:15",
    "attendanc_rule_early_going": "Early Mark",
    "absent_min_out": "01:00",

    "significant_attendanc_rule_early_going": "No Action",
}

export default PAYLOAD;