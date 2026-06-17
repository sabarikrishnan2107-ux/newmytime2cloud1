import { getUser } from "@/config/index";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const PDF_SERVICE_BASE = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || 'http://localhost:3002';

/**
 * Download PDF report from backend DOMPDF endpoint
 */
export const downloadPDF = async (endpoint, params = {}, fileName = "Report.pdf", onProgress = null) => {
    let progressTimer = null;
    let currentProgress = 0;

    // Simulate smooth progress during server-side PDF generation
    const startProgressSimulation = () => {
        if (!onProgress) return;
        currentProgress = 2;
        onProgress(currentProgress);

        progressTimer = setInterval(() => {
            // Slow down as it approaches 80% (never reaches it during generation)
            if (currentProgress < 30) {
                currentProgress += 2;
            } else if (currentProgress < 50) {
                currentProgress += 1.5;
            } else if (currentProgress < 70) {
                currentProgress += 0.8;
            } else if (currentProgress < 80) {
                currentProgress += 0.3;
            }
            currentProgress = Math.min(currentProgress, 80);
            onProgress(Math.round(currentProgress));
        }, 500);
    };

    const stopProgressSimulation = () => {
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }
    };

    try {
        const user = await getUser();
        const queryParams = new URLSearchParams({
            ...params,
            company_id: user?.company_id || 0,
            action: 'download',
        });

        const url = `${API_BASE}/${endpoint}?${queryParams.toString()}`;

        // Start smooth progress during server wait
        startProgressSimulation();

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/pdf',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        // Server responded — stop simulation, jump to 80%
        stopProgressSimulation();
        if (onProgress) onProgress(80);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        if (total && response.body) {
            const reader = response.body.getReader();
            const chunks = [];
            let received = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                if (onProgress) onProgress(80 + Math.round((received / total) * 15));
            }

            const blob = new Blob(chunks, { type: 'application/pdf' });
            if (onProgress) onProgress(97);

            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
        } else {
            if (onProgress) onProgress(88);
            const blob = await response.blob();
            if (onProgress) onProgress(95);

            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
        }

        if (onProgress) onProgress(100);
    } catch (err) {
        stopProgressSimulation();
        console.error("PDF Download Error:", err);
        throw err;
    }
};

/**
 * Download Daily Attendance PDF
 */
export const downloadDailyPDF = async ({ date, branch_ids, department_ids, employee_ids, onProgress } = {}) => {
    const params = { date: date || new Date().toISOString().split('T')[0] };
    if (branch_ids?.length) params.branch_ids = branch_ids.join(',');
    if (department_ids?.length) params.department_ids = department_ids.join(',');
    if (employee_ids?.length) params.employee_ids = employee_ids.join(',');

    await downloadPDF('report/daily_pdf', params, `Daily_Attendance_${params.date}.pdf`, onProgress);
};

/**
 * Download Monthly Detail PDF (per employee).
 * Pass report_mode='daily' to render as a daily report (all employees flow on
 * the same page using the same Format C styling).
 */
export const downloadMonthlyDetailPDF = async ({ from_date, to_date, branch_ids, department_ids, employee_ids, shift_type_id, report_mode, report_format, onProgress } = {}) => {
    const params = { from_date, to_date };
    if (branch_ids?.length) params.branch_ids = branch_ids.join(',');
    if (department_ids?.length) params.department_ids = department_ids.join(',');
    if (employee_ids?.length) params.employee_ids = employee_ids.join(',');
    if (shift_type_id !== undefined) params.shift_type_id = shift_type_id;
    if (report_mode) params.report_mode = report_mode;
    if (report_format) params.report_format = report_format;

    const isDaily = report_mode === 'daily';
    const fileName = isDaily
        ? `Daily_Attendance_${from_date}.pdf`
        : `Monthly_Attendance_Detail_${from_date}_to_${to_date}${report_format === 'v2' ? '_FormatB' : ''}.pdf`;

    await downloadPDF('report/monthly_detail_pdf', params, fileName, onProgress);
};

/**
 * Download Monthly Grid PDF (matrix view)
 */
export const downloadMonthlyGridPDF = async ({ from_date, to_date, branch_ids, department_ids, employee_ids, onProgress } = {}) => {
    const params = { from_date, to_date };
    if (branch_ids?.length) params.branch_ids = branch_ids.join(',');
    if (department_ids?.length) params.department_ids = department_ids.join(',');
    if (employee_ids?.length) params.employee_ids = employee_ids.join(',');

    await downloadPDF('report/monthly_grid_pdf', params, `Monthly_Attendance_Grid_${from_date}_to_${to_date}.pdf`, onProgress);
};

/**
 * Download Summary PDF (DOMPDF)
 */
export const downloadSummaryPDF = async ({ from_date, to_date, branch_ids, department_ids, shift_type_id, report_type, onProgress } = {}) => {
    const user = await getUser();
    const params = new URLSearchParams({
        api_base: API_BASE,
        company_id: String(user?.company_id || 0),
        from_date,
        to_date,
    });

    if (branch_ids?.length) params.set('branch_ids', branch_ids.join(','));
    if (department_ids?.length) params.set('department_ids', department_ids.join(','));
    if (shift_type_id !== undefined) params.set('shift_type_id', String(shift_type_id));

    const templateName = report_type === 'daily' ? 'daily' : 'monthly';
    const SUMMARY_BASE = process.env.NEXT_PUBLIC_SUMMARY_REPORT_URL || `${PDF_SERVICE_BASE}/templates`;
    const reportUrl = `${SUMMARY_BASE}/${templateName}/?${params.toString()}`;

    const fileName = report_type === 'daily'
        ? `Daily_Summary_Report_${from_date}.pdf`
        : `Monthly_Summary_Report_${from_date}_to_${to_date}.pdf`;

    await downloadReport(reportUrl, fileName, onProgress);
};

export const downloadReport = async (reportUrl, fileName = "Daily-Summary-Report.pdf", onProgress = null) => {
    let objectUrl = null;
    let progressTimer = null;
    let currentProgress = 0;

    const startProgressSimulation = () => {
        if (!onProgress) return;
        currentProgress = 2;
        onProgress(currentProgress);

        progressTimer = setInterval(() => {
            if (currentProgress < 30) {
                currentProgress += 2;
            } else if (currentProgress < 50) {
                currentProgress += 1.5;
            } else if (currentProgress < 70) {
                currentProgress += 0.8;
            } else if (currentProgress < 85) {
                currentProgress += 0.3;
            }
            currentProgress = Math.min(currentProgress, 85);
            onProgress(Math.round(currentProgress));
        }, 500);
    };

    const stopProgressSimulation = () => {
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }
    };

    try {
        startProgressSimulation();

        const response = await fetch(`${PDF_SERVICE_BASE}/pdf`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: reportUrl })
        });

        stopProgressSimulation();
        if (onProgress) onProgress(88);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText || 'Failed to generate PDF'}`);
        }

        const blob = await response.blob();

        if (onProgress) onProgress(95);

        objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (onProgress) onProgress(100);
    } catch (err) {
        stopProgressSimulation();
        console.error("Report Download Error:", err);
        throw err;
    } finally {
        if (objectUrl) {
            setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
        }
    }
};
