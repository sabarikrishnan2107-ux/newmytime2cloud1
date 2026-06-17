import { api, API_BASE, buildQueryParams } from "@/lib/api-client";

export const getEmployeesByDepartmentIds = async (department_ids = []) => {
    let params = {
        department_ids: department_ids,
    };
    const { data } = await api.get(`${API_BASE}/get-employees-by-department-ids`, {
        params: await buildQueryParams(params),
    });
    return data;
};

export const getEmployeesByDepartmentId = async (department_id = null) => {
    let params = {
        department_id: department_id,
    };
    const { data } = await api.get(`${API_BASE}/employee-list`, {
        params: await buildQueryParams(params),
    });
    return data;
};

