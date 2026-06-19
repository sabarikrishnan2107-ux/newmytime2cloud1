import ProfilePicture from "@/components/ProfilePicture";
import { getBgColor, setStatusLabel } from "@/lib/utils";

const SHIFT_TYPE_MAP = { 1: 'FILO', 2: 'Multi', 3: 'Auto', 4: 'Night', 5: 'Split', 6: 'Single' };

const isManualEntry = (log) => {
    const s = JSON.stringify(log?.device_id_in) + JSON.stringify(log?.device_id_out)
        + JSON.stringify(log?.device_in?.name) + JSON.stringify(log?.device_out?.name);
    return s.toLowerCase().includes('manual');
};

const getDeviceLabel = (device, deviceId) => {
    if (typeof device === 'object' && device?.name && device.name !== '---') return device.name;
    if (typeof device === 'string' && device !== '---') return device;
    if (deviceId && deviceId !== '---' && deviceId.length < 15) return deviceId;
    return '';
};

const CellText = ({ children, className = '' }) => (
    <p className={`text-sm text-center text-slate-500 dark:text-slate-400 ${className}`}>{children}</p>
);

const TimeCell = ({ time, device, deviceId }) => {
    const dev = getDeviceLabel(device, deviceId);
    const isManual = dev.toLowerCase().includes('manual');
    return (
        <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{time || '---'}</p>
            {dev && time && time !== '---' && (
                <p className={`text-[10px] ${isManual ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                    {dev}
                </p>
            )}
        </div>
    );
};

export default (shiftTypeId) => {
    const columns = [
        {
            key: "name",
            header: "Name",
            align: "left",
            render: ({ employee }) => (
                <div className="flex items-center space-x-3">
                    <ProfilePicture src={employee?.profile_picture} />
                    <div>
                        <p className="font-medium text-sm text-slate-600 dark:text-slate-300">
                            {employee?.first_name} ({employee?.employee_id})
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {employee?.department?.name || '---'}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: "branch",
            header: "Branch",
            render: (log) => <CellText>{log?.employee?.branch?.branch_name || log?.branch?.branch_name || '---'}</CellText>,
        },
        {
            key: "date", header: "Date",
            render: (log) => (
                <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-300">{log.date}</p>
                </div>
            ),
        },
        {
            key: "shift", header: "Shift",
            render: (log) => (
                <div className="text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{log.shift?.name || log.shift_name || '---'}</p>
                    {log.shift_type_id && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase">{SHIFT_TYPE_MAP[log.shift_type_id] || ''}</p>
                    )}
                </div>
            ),
        },
    ];

    // Multi-shift in/out columns
    const inOutColumns = [];
    const totalShifts = 7;
    for (let i = 1; i <= totalShifts; i++) {
        inOutColumns.push({
            key: `in${i}`, header: `In${i}`,
            render: (log) => <CellText>{log[`in${i}`] || '---'}</CellText>,
        });
        inOutColumns.push({
            key: `out${i}`, header: `Out${i}`,
            render: (log) => <CellText>{log[`out${i}`] || '---'}</CellText>,
        });
    }

    const otherColumns = [
        {
            key: "late_coming", header: "Late In",
            render: (log) => {
                const val = log?.late_coming;
                const hasLate = val && val !== '---' && val !== '00:00';
                return <CellText>{hasLate ? <span className="text-red-500 font-semibold">{val}</span> : '---'}</CellText>;
            },
        },
        {
            key: "early_going", header: "Early Out",
            render: (log) => {
                const val = log?.early_going;
                const hasEarly = val && val !== '---' && val !== '00:00';
                return <CellText>{hasEarly ? <span className="text-amber-500 font-medium">{val}</span> : '---'}</CellText>;
            },
        },
        {
            key: "ot", header: "OT",
            render: (log) => {
                const val = log?.ot;
                const hasOt = val && val !== '---' && val !== '00:00';
                return <CellText>{hasOt ? val : '---'}</CellText>;
            },
        },
        {
            key: "total_hrs", header: "Total Hrs",
            render: (log) => {
                const val = log?.total_hrs;
                const hasHrs = val && val !== '---' && val !== '00:00';
                return <CellText>{hasHrs ? <span className="font-semibold text-slate-600 dark:text-slate-300">{val}</span> : '---'}</CellText>;
            },
        },
        {
            key: "status",
            header: "Status",
            render: (log) => {
                const manual = isManualEntry(log);
                return (
                    <div className="text-center">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getBgColor(log?.status)}`}>
                            {setStatusLabel(log?.status)}
                        </span>
                        {manual && <div className="text-[10px] font-bold text-red-500 mt-1">Manual</div>}
                    </div>
                );
            },
        },
    ];

    // Single shift layout
    const singleColumns = [
        {
            key: "in", header: "In",
            render: (log) => <TimeCell time={log?.in} device={log?.device_in} deviceId={log?.device_id_in} />,
        },
        {
            key: "out", header: "Out",
            render: (log) => <TimeCell time={log?.out} device={log?.device_out} deviceId={log?.device_id_out} />,
        },
    ];

    if (shiftTypeId == '2') {
        return [...columns, ...inOutColumns, ...otherColumns];
    }

    return [...columns, ...singleColumns, ...otherColumns];
};
