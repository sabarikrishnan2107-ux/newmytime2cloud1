import axios from "axios";
import { svcUrl } from "@/lib/runtimeHost";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || svcUrl("http", 8000, "/api");


import { getUser } from "@/config/index";

export const buildQueryParams = async (params = {}) => {
    const user = await getUser();

    const queryParams = {
        ...params,
        company_id: user?.company_id ?? 0,
        company_ids: [user?.company_id ?? 0],
    };

    // Branch scope. Priority:
    //   1) an explicit selection passed by the caller (e.g. a branch dropdown),
    //   2) the user's assigned branches (user_branches pivot) — this is how a
    //      manager is scoped to the branch(es) they were assigned to manage,
    //   3) the legacy single branch_id column as a fallback.
    // The scalar users.branch_id can hold a manager's *personal* employee branch,
    // which may differ from the branch they were assigned to manage. Trusting it
    // made managers see no data — their assigned departments never intersected
    // the wrong branch (e.g. HYDERS PARK: branch_id=KODAI vs assigned=TANJORE).
    if (Array.isArray(params?.branch_ids) && params.branch_ids.length > 0) {
        queryParams.branch_ids = params.branch_ids;
    } else if (Array.isArray(user?.branches) && user.branches.length > 0) {
        queryParams.branch_ids = user.branches.map((b) => b.id);
    } else if (user?.branch_id && user.branch_id !== 0) {
        queryParams.branch_id = user.branch_id;
    }

    // Include department_ids only if valid and non-empty
    if (Array.isArray(user?.departments) && user.departments.length > 0) {
        queryParams.department_ids = user.departments.map(e => e.id);
    }
    else if (Array.isArray(params?.department_ids) && params.department_ids.length > 0) {
        queryParams.department_ids = params.department_ids;
    }

    return queryParams;
};

export const getStatuses = async () => {
    const { data } = await axios.get(`${API_BASE}/attendance-statuses`);
    return data;
};

export const getBranches = async () => {

    const { data } = await axios.get(`${API_BASE}/branch-list`, {
        params: await buildQueryParams(),
    });
    return data;
};

export const getVisitorHosts = async () => {
    const { data } = await axios.get(`${API_BASE}/visitor-management/hosts`, {
        params: await buildQueryParams(),
    });
    return (Array.isArray(data) ? data : []).map(h => {
        const emp = h.employee || {};
        const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
        return {
            id: h.id,
            name: empName || `Host ${h.id}`,
        };
    });
};

export const getRoles = async () => {

    const user = await getUser();

    const { data } = await axios.get(`${API_BASE}/role`, {
        params: {
            order_by: "name",
            per_page: 1000,
            company_id: user?.company_id || 0,
        },
    });
    return data;
};

// companyId will be passed dynamically
export const getDepartments = async (branch_id = null) => {
    let params = { branch_id };
    const { data } = await axios.get(`${API_BASE}/department-list`, { params: await buildQueryParams(params) });
    return data;
};


export const getDepartmentsByBranchIds = async (branch_ids = []) => {

    let params = { branch_ids };
    const { data } = await axios.get(`${API_BASE}/department-list`, { params: await buildQueryParams(params) });
    return data;
};

// companyId will be passed dynamically
export const getCompanyId = async () => {
    const user = await getUser();
    return user?.company_id || 0
};

export const getVisitorLink = async () => {
    let company_id = await getCompanyId();
    return `http://localhost:4444/register/visitor/walkin/${company_id}`;
};

// companyId will be passed dynamically
export const getScheduleEmployees = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/employees_with_schedule_count`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getScheduleStats = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/schedule_stats`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getSchedulesByEmployee = async (employeeId) => {
    const { data } = await axios.get(`${API_BASE}/get_shifts_by_employee/${employeeId}`, {
        params: await buildQueryParams({}),
    });
    return data;
};

export const getScheduleEmployeesV1 = async (params = {}) => {

    const { data } = await axios.get(`${API_BASE}/schedule_employees`, {
        params: await buildQueryParams(params),
    });

    return data;
};

export const removeEmployeeSchedule = async (id) => {

    const user = await getUser();
    let payload = {
        employee_id: id,
        company_id: user?.company_id || 0
    }
    const { data } = await axios.post(`${API_BASE}/schedule_employees_delete`, payload);
    if (data?.status === false) {
        throw new Error(data?.message || "Failed to delete employee schedule");
    }
    return true;
};

export const getDeviceLogs = async (params = {}) => {

    let baseURL = API_BASE;
    // baseURL = "https://backend.mytime2cloud.com/api";

    const { data } = await axios.get(`${baseURL}/attendance_logs`, {
        params: await buildQueryParams(params),
    });
    return data;
};




export const getPaginatedRoles = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/role`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const storeRole = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/role`, { ...payload, company_id: user?.company_id || 0 });
};

export const updateRole = async (id, payload) => {
    const user = await getUser();
    // Existing apiResource update route on the (remote) backend. Laravel snake-cases
    // the {role} binding to the Role $Role param, so it resolves correctly.
    return await axios.put(`${API_BASE}/role/${id}`, { ...payload, company_id: user?.company_id || 0 });
};

export const removeRole = async (id = 0) => {
    await axios.delete(`${API_BASE}/delete-role/${id}`);
    return true;
};

export const getAccessControlReport = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/access_control_report`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getVisitorLogs = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/visitor-management/logs`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getVisitorPreRegistrations = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/visitor-management/pre-registrations`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getHosts = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/visitor-management/hosts`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getHostEmployees = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/visitor-management/host-employees`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getVisitorZones = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/visitor-management/zones`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const createHost = async (payload) => {
    const user = await getUser();
    const { data } = await axios.post(`${API_BASE}/visitor-management/hosts`, {
        ...payload,
        company_id: payload.company_id || user?.company_id || 0,
    });
    return data;
};

export const updateHost = async (id, payload) => {
    const { data } = await axios.put(`${API_BASE}/visitor-management/hosts/${id}`, payload);
    return data;
};

export const deleteHost = async (id) => {
    const { data } = await axios.delete(`${API_BASE}/visitor-management/hosts/${id}`);
    return data;
};

export const updateVisitorPreRegistration = async (id, body = {}) => {
    const { data } = await axios.put(`${API_BASE}/visitor-management/pre-registrations/${id}`, {
        ...(await buildQueryParams({})),
        ...body,
    });
    return data;
};


export const getEmployees = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/employeev1`, { params: await buildQueryParams(params) });
    return data;
};


export const getShifts = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/shift`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getShiftDropDownList = async (branch_id = null) => {
    const params = {};

    // Include branch_id if passed
    if (branch_id) {
        params.branch_id = branch_id;
    }
    const { data } = await axios.get(`${API_BASE}/shift_dropdownlist`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getDocuments = async (id) => {
    const { data } = await axios.get(`${API_BASE}/documentinfo/${id}`);
    return data;
};

export const deleteDocument = async (id) => {
    return await axios.delete(`${API_BASE}/documentinfo/${id}`);
};

export async function uploadEmployeeDocument(employeeId, payload) {

    // employee-update-document-new
    const user = await getUser();

    const fd = new FormData();
    fd.append("type", payload.type);
    fd.append("title", payload.title);
    fd.append("issue_date", payload.issue_date);
    fd.append("expiry_date", payload.expiry_date);
    fd.append("attachment", payload.file);
    fd.append("employee_id", employeeId);
    fd.append("company_id", user?.company_id || 0);

    return await axios.post(`${API_BASE}/employee-update-document-new/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
    });
}

// companyId will be passed dynamically
export const getLogs = async (page = 1, count = 10) => {
    const params = { page };
    const { data } = await axios.get(`${API_BASE}/device/getLastRecordsHistory/${count}`, {
        params: await buildQueryParams(params),
    });
    return data;
};

// companyId will be passed dynamically
export const getTodayLogsCount = async (branch_id = null, department_id = null) => {
    const params = { branch_id, department_id };
    const { data } = await axios.get(`${API_BASE}/get_logs_count`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getLogoOnly = async () => {
    const user = await getUser();
    const { data } = await axios.get(`${API_BASE}/get-logo-only/${user?.company_id || 0}`);
    return data;
};

export const updateLogoOnly = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/update-logo-only`, { ...payload, company_id: user?.company_id || 0 });
};

export const storeEmployee = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/employee-store-new`, { ...payload, company_id: user?.company_id || 0 });
};

export const updateContact = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/company/${user?.company_id}/update/contact`, payload);
};

export const updatePassword = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/company/${user?.company_id}/update/user`, payload);
};

export const updateLicense = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/company/${user?.company_id}/trade-license`, payload);
};

export const postAddPerson = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/SDK/AddPerson`, { ...payload, company_id: user?.company_id || 0 });
};

export const updateProfilePicture = async (payload) => {
    return await axios.post(`${API_BASE}/employee-update-profile-picture`, payload);
};

export const storeShift = async (payload) => {
    const user = await getUser();
    let { data } = await axios.post(`${API_BASE}/shift`, { ...payload, company_id: user?.company_id || 0 });
    return data;
};

export const updateShift = async (payload, id = 0) => {
    let { data } = await axios.put(`${API_BASE}/shift/${id}`, payload);
    return data;
};

export const shiftDetails = async (id = 0) => {
    return await axios.get(`${API_BASE}/shift/${id}`);
};

export const storeSchedule = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/schedule_employees`, { ...payload, company_id: user?.company_id || 0 });
};


export const regenerateReport = async (params = {}) => {
    let { data } = await axios.get(`${API_BASE}/render_logs`, { params: await buildQueryParams(params) });
    return data;
};

export const deleteSchedule = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/schedule_employees_delete`, { ...payload, company_id: user?.company_id || 0 });
};

export const getPayroll = async (employee_id) => {
    const user = await getUser();
    return await axios.get(`${API_BASE}/payroll/${employee_id}`, { company_id: user?.company_id || 0 });
};

export const storePayroll = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/payroll`, { ...payload, company_id: user?.company_id || 0 });
};

export const updateEmployee = async (payload, id = 0) => {
    return await axios.post(`${API_BASE}/employee-update-new/${id}`, payload);
};

export const removeEmployee = async (id = 0) => {
    await axios.delete(`${API_BASE}/employee/${id}`);
    return true;
};

export const removeShift = async (id = 0) => {
    await axios.delete(`${API_BASE}/shift/${id}`);
    return true;
};

export const updateEmergencyContact = async (payload, id = 0) => {
    return await axios.post(`${API_BASE}/employee-update-emergency-contact-new/${id}`, payload);
};

export const updateBank = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/employee-update-bank-new`, { ...payload, company_id: user?.company_id || 0 });
};

export const updateAccessSettings = async (payload, id) => {
    return await axios.post(`${API_BASE}/employee-update-access-settings-new/${id}`, payload);
};

export const updateLogin = async (payload, id) => {
    return await axios.post(`${API_BASE}/employee-update-login-new/${id}`, payload);
};

export const updateGeneralSettings = async (payload, id) => {
    return await axios.post(`${API_BASE}/employee-update-general-settings/${id}`, payload);
};

export const leaveGroupAndReportManagerUpdate = async (payload, id) => {
    return await axios.post(`${API_BASE}/leave-group-and-report-manager-update/${id}`, payload);
};

export const rfidAndPinUpdate = async (payload, id) => {
    return await axios.post(`${API_BASE}/rfid-and-pin-update/${id}`, payload);
};

export const getLeaveGroups = async () => {
    let params = { per_page: 100 };
    let { data } = await axios.get(`${API_BASE}/leave_groups`, { params: await buildQueryParams(params) });
    return data.data;
};

export const getLeaveManagers = async () => {
    let params = { per_page: 100 };
    let { data } = await axios.get(`${API_BASE}/employeesList`, { params: await buildQueryParams(params) });
    return data.data;
};

export const updateAddress = async (payload, id = 0) => {
    return await axios.post(`${API_BASE}/employee-update-address-new/${id}`, payload);
};

export const updateVisa = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/employee-update-visa-new`, { ...payload, company_id: user?.company_id || 0 });
};

export const updateEmirate = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/employee-update-emirate-new`, { ...payload, company_id: user?.company_id || 0 });
};

export const updatePassport = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/employee-update-passport-new`, { ...payload, company_id: user?.company_id || 0 });
};

export const updateQualification = async (payload) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/employee-update-qualification-new`, { ...payload, company_id: user?.company_id || 0 });
};

export const uploadEmployee = async (payload) => {

    let { data } = await axios.post(`${API_BASE}/employee/import`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return data;
};

export const downloadEmployeeSampleTemplate = async () => {
    const response = await axios.get(`${API_BASE}/employee/sample-template`, {
        params: await buildQueryParams(),
        responseType: 'blob',
    });
    triggerBlobDownload(response.data, 'employees_sample.xlsx');
};

export const exportEmployeesExcel = async (filters = {}) => {
    const params = await buildQueryParams(filters);
    const response = await axios.get(`${API_BASE}/employee/export`, {
        params,
        responseType: 'blob',
    });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    triggerBlobDownload(response.data, `employees_${stamp}.xlsx`);
};

const triggerBlobDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const getCompanyDocuments = async () => {
    const { data } = await axios.get(`${API_BASE}/document`, {
        params: await buildQueryParams(),
    });
    return data;
};

// companyId will be passed dynamically
export const getEmployeeList = async (branch_id = 0, department_id = 0) => {
    let params = {
        branch_id: branch_id,
        department_id: department_id,
    };
    const { data } = await axios.get(`${API_BASE}/scheduled_employees_with_type_new`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getScheduledEmployeeList = async (department_ids = [], per_page = 1000) => {

    const params = {
        per_page: per_page,
        department_ids,
    };

    const { data } = await axios.get(`${API_BASE}/scheduled_employees_with_type_new`, {
        params: await buildQueryParams(params),
    });
    return data;
};

// companyId will be passed dynamically
export const getDeviceList = async (branch_id = null) => {

    const params = {
        branch_id,
    };

    const { data } = await axios.get(`${API_BASE}/device-list`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getDeviceListNew = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/device-list`, {
        params: await buildQueryParams(params),
    });
    return data;
};

// Missing logs: device list (excludes Manual/Mobile, prepends "Mobile Devices")
export const getMissingLogsDeviceList = async () => {
    const user = await getUser();
    const { data } = await axios.get(`${API_BASE}/device_list`, {
        params: { company_id: user?.company_id ?? 0 },
    });
    return data;
};

// Missing logs: fetch & re-pull missing attendance logs from a device for a date
export const getMissingAttendanceLogs = async ({ device_id, date }) => {
    const user = await getUser();
    const { data } = await axios.get(`${API_BASE}/attendance-logs-missing`, {
        params: {
            company_id: user?.company_id ?? 0,
            device_id,
            date,
        },
    });
    return data;
};

// Device
export const getDevices = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/device`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getDeviceJson = async (company_id) => {
    const { data } = await axios.get(`${API_BASE}/devices-json/${company_id}`);
    return data;
};

export const getEmployeesJson = async (company_id) => {
    const { data } = await axios.get(`${API_BASE}/employees-json/${company_id}`);
    return data;
};

export const getDevice = async (id) => {
    const { data } = await axios.get(`${API_BASE}/device/${id}`);
    return data;
};

export const createDevice = async (payload = {}) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/device`, { ...payload, company_id: user?.company_id || 0 });
};

export const testCameraConnection = async (payload = {}) => {
    const user = await getUser();
    const { data } = await axios.post(`${API_BASE}/camera/test-connection`, {
        ...payload,
        company_id: user?.company_id || 0,
    });
    return data;
};

export const updateDevice = async (id, payload = {}) => {
    const user = await getUser();
    return await axios.put(`${API_BASE}/device/${id}`, { ...payload, company_id: user?.company_id || 0 });
};

export const deleteDevice = async (id) => {
    await axios.delete(`${API_BASE}/device/${id}`);
    return true;
};

// Device End

// Group
export const getManagerLogins = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/manager-login`, {
        params: await buildQueryParams(params),
    });
    return data;
};
export const createManagerLogin = async (payload = {}) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/manager-login`, { ...payload, company_id: user?.company_id || 0 });
};
export const updateManagerLogin = async (id, payload = {}) => {
    const user = await getUser();
    return await axios.put(`${API_BASE}/manager-login/${id}`, { ...payload, company_id: user?.company_id || 0 });
};
export const deleteGroupLogin = async (id) => {
    await axios.delete(`${API_BASE}/manager-login/${id}`);
    return true;
};

// Group END

// PayrollFormula
export const getPayrollFormula = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/payroll_formula`, {
        params: await buildQueryParams(params),
    });
    return data;
};
export const PayrollFormulaCreate = async (payload = {}) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/payroll_formula`, { ...payload, company_id: user?.company_id || 0 });
};

export const updatePayrollFormula = async (id, payload = {}) => {
    const user = await getUser();
    return await axios.put(`${API_BASE}/payroll_formula/${id}`, { ...payload, company_id: user?.company_id || 0 });
};

export const deletePayrollFormula = async (id) => {
    await axios.delete(`${API_BASE}/payroll_formula/${id}`);
    return true;
};

// PayrollFormula END


// Activity
export const getActivity = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/activity`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getActivityTypes = async () => {
    const { data } = await axios.get(`${API_BASE}/activity/types`, {
        params: await buildQueryParams(),
    });
    return data;
};

export const getActivityActions = async () => {
    const { data } = await axios.get(`${API_BASE}/activity/actions`, {
        params: await buildQueryParams(),
    });
    return data;
};

export const getActivityPdf = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/activity/pdf`, {
        params: await buildQueryParams(params),
        responseType: "blob",
    });
    return data;
};

// Activity END

// GenerationDate
export const getPayrollGenerationDate = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/payroll_generate_date`, {
        params: await buildQueryParams(params),
    });
    return data;
};
export const createPayrollGenerationDate = async (payload = {}) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/payroll_generate_date`, { ...payload, company_id: user?.company_id || 0 });
};

export const updatePayrollGenerationDate = async (id, payload = {}) => {
    const user = await getUser();
    return await axios.put(`${API_BASE}/payroll_generate_date/${id}`, { ...payload, company_id: user?.company_id || 0 });
};

export const deletePayrollGenerationDate = async (id) => {
    await axios.delete(`${API_BASE}/payroll_generate_date/${id}`);
    return true;
};

// GenerationDate END

// ADMINS
export const getAdmins = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/admin`, {
        params: await buildQueryParams(params),
    });
    return data;
};
export const createAdmin = async (payload = {}) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/admin`, { ...payload, company_id: user?.company_id || 0 });
};
export const updateAdmin = async (id, payload = {}) => {
    const user = await getUser();
    return await axios.put(`${API_BASE}/admin/${id}`, { ...payload, company_id: user?.company_id || 0 });
};
export const deleteAdmin = async (id) => {
    await axios.delete(`${API_BASE}/admin/${id}`);
    return true;
};

// ADMINS END

// DEPARTMENT

export const getDepartmentsForTable = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/departments`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const createDepartment = async (payload = {}) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/departments`, { ...payload, company_id: user?.company_id || 0 });
};

export const updateDepartment = async (id, payload = {}) => {
    const user = await getUser();
    return await axios.put(`${API_BASE}/departments/${id}`, { ...payload, company_id: user?.company_id || 0 });
};
export const deleteDepartment = async (id) => {
    await axios.delete(`${API_BASE}/departments/${id}`);
    return true;
};

// DEPARTMENT END

// SUB DEPARTMENT
export const getSubDepartments = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/sub-departments`, {
        params: await buildQueryParams(params),
    });
    return data;
};
export const createSubDepartments = async (payload = {}) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/sub-departments`, { ...payload, company_id: user?.company_id || 0 });
};
export const updateSubDepartments = async (id, payload = {}) => {
    const user = await getUser();
    return await axios.put(`${API_BASE}/sub-departments/${id}`, { ...payload, company_id: user?.company_id || 0 });
};
export const deleteSubDepartments = async (id) => {
    await axios.delete(`${API_BASE}/sub-departments/${id}`);
    return true;
};
// SUB DEPARTMENT END

// DESIGNATION
export const getDesignations = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/designation`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const createDesignations = async (payload = {}) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/designation`, { ...payload, company_id: user?.company_id || 0 });
};
export const updateDesignations = async (id, payload = {}) => {
    const user = await getUser();
    return await axios.put(`${API_BASE}/designation/${id}`, { ...payload, company_id: user?.company_id || 0 });
};
export const deleteDesignations = async (id) => {
    await axios.delete(`${API_BASE}/designation/${id}`);
    return true;
};

// DESIGNATION END


// DESIGNATION
export const getBranchesForTable = async (params = {}) => {
    const { data } = await axios.get(`${API_BASE}/branch`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const createBranch = async (payload = {}) => {
    const user = await getUser();
    return await axios.post(`${API_BASE}/branch`, { ...payload, company_id: user?.company_id || 0 });
};
export const updateBranch = async (id, payload = {}) => {
    const user = await getUser();
    return await axios.put(`${API_BASE}/branch/${id}`, { ...payload, company_id: user?.company_id || 0 });
};
export const updateGeoFencing = async (id, payload = {}) => {
    return await axios.put(`${API_BASE}/branch-update-geofencing/${id}`, payload);
};
export const deleteBranch = async (id) => {
    await axios.delete(`${API_BASE}/branch/${id}`);
    return true;
};

export const branchListGeoFencing = async () => {
    const user = await getUser();
    const { data } = await axios.get(`${API_BASE}/branch-list-for-geofencing/${user?.company_id || 0}`);
    return data;
};

// DESIGNATION END


// companyId will be passed dynamically
export const openDoor = async (params = {}) => {
    let baseURL = API_BASE;
    const { data } = await axios.get(`${baseURL}/open_door`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const closeDoor = async (params = {}) => {
    let baseURL = API_BASE;
    const { data } = await axios.get(`${baseURL}/close_door`, {
        params: await buildQueryParams(params),
    });
    return data;
};

// companyId will be passed dynamically
export const checkPin = async (params = {}) => {

    let baseURL = API_BASE;
    const { data } = await axios.get(`${baseURL}/check-pin`, {
        params: await buildQueryParams(params),
    });

    return data;
};

export const getDeviceSettginsFromSDK = async (params = {}) => {

    let baseURL = API_BASE;
    const { data } = await axios.get(`${baseURL}/get-device-settings-from-sdk`, {
        params: await buildQueryParams(params),
    });

    return data;
};

export const addPerson = async (payload) => {
    let baseURL = API_BASE;
    const { data } = await axios.post(`${baseURL}/SDK/AddPerson`, payload);
    return data;
};




export const updateDeviceSettings = async (payload) => {

    let baseURL = API_BASE;
    const { data } = await axios.post(`${baseURL}/update-device-sdk-settings`, payload);
    return data;
};

export const getDeviceCamviiSettingsFromSDK = async (params = {}) => {

    let baseURL = API_BASE;
    const { data } = await axios.get(`${baseURL}/get-device-camvii-settings-from-sdk`, {
        params: await buildQueryParams(params),
    });

    return data;
};

export const updateDeviceCamviiSettings = async (payload) => {

    let baseURL = API_BASE;
    const { data } = await axios.post(`${baseURL}/update-device-camvii-sdk-settings`, payload);
    return data;
};

export const checkDeviceHealth = async (company_id) => {
    const { data } = await axios.get(`${API_BASE}/check_device_health`, {
        params: { company_id },
    });
    return data;
};

export const syncDeviceDateTime = async (device_id, company_id) => {
    const dt = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const sync_able_date_time = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
    const { data } = await axios.get(`${API_BASE}/sync_device_date_time/${device_id}/${company_id}`, {
        params: { sync_able_date_time },
    });
    return data;
};





// companyId will be passed dynamically
export const getLastTenLogs = async (UserID = "0") => {
    let params = {
        UserID: UserID,
    };
    const { data } = await axios.get(`${API_BASE}/get_last_ten_attendance_logs`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getAttendanceReports = async (payload = {}) => {
    const body = await buildQueryParams(payload); // prepares company_id, branch_id, department_ids
    const { data } = await axios.post(`${API_BASE}/attendance-report-new`, body);
    return data;
};

export const getCompanyInfo = async () => {
    const user = await getUser();
    return await axios.get(`${API_BASE}/company/${user?.company_id || 0}`);
};

// ===== Fire Alarm =====
// Mirrors the old Nuxt admin panel's alarm popup polling.
// getAlarmNotification returns devices where alarm_status = 1 for this company.
export const getAlarmNotifications = async () => {
    const user = await getUser();
    if (!user?.company_id) return [];
    const { data } = await axios.get(`${API_BASE}/get_notifications_alarm`, {
        params: { company_id: user.company_id },
    });
    return Array.isArray(data) ? data : [];
};

// Turns off a device's alarm (status = 0). Backend closes the SDK alarm and
// updates devices.alarm_status, which clears the popup on the next poll.
export const turnOffDeviceAlarm = async (serial_number) => {
    const user = await getUser();
    const { data } = await axios.post(`${API_BASE}/update-device-alarm-status`, {
        company_id: user?.company_id || 0,
        serial_number,
        status: 0,
    });
    return data;
};

// Alarm sound served by the backend at <root>/alarm_sounds/alarm-sound1.mp3
export const getAlarmSoundUrl = () => `${API_BASE.replace(/\/api\/?$/, "")}/alarm_sounds/alarm-sound1.mp3`;
// ===== Fire Alarm END =====


export const api = axios.create({
    baseURL: API_BASE,
    headers: {
        "Content-Type": "application/json",
    },
})

// Attach token automatically (if available)
api.interceptors.request.use((config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})
