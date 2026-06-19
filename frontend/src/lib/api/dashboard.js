import { api, buildQueryParams } from "@/lib/api-client";

export const getAttendanceCount = async (branch_id = null) => {
    const params = await buildQueryParams(branch_id ? { branch_id } : {});
    const { data } = await api.get("/dashbaord_attendance_count", { params });
    return data;
};
