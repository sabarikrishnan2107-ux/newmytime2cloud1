import axios from "axios";
import { getUser } from "@/config/index";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Reusable Axios Instance
 */
export const api = axios.create({
    baseURL: API_BASE,
    headers: {
        "Content-Type": "application/json",
    },
});

// Automatically attach Bearer Token to every request
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

/**
 * Global Query Builder
 * Use this in any service file to automatically inject user/company context
 */
export const buildQueryParams = async (params = {}) => {
    const user = await getUser();

    const queryParams = {
        company_id: user?.company_id ?? 0,
        ...params, // Overwrites defaults if specific params are passed
    };

    // Branch scope. Priority:
    //   1) an explicit selection passed by the caller (e.g. the dashboard branch picker),
    //   2) the user's assigned branches (user_branches pivot) — how a manager is
    //      scoped to the branch(es) they were assigned to manage,
    //   3) the legacy single branch_id column as a fallback.
    // The scalar users.branch_id can hold a manager's *personal* employee branch,
    // which may differ from (or be 0 vs.) the branch they manage. Trusting it made
    // managers see zero data on the dashboard (e.g. HYDERS PARK KODAI manager has
    // branch_id=0 but is assigned branch KODAI). Scope by the assignment instead.
    if (Array.isArray(params?.branch_ids) && params.branch_ids.length > 0) {
        queryParams.branch_ids = params.branch_ids;
    } else if (Array.isArray(user?.branches) && user.branches.length > 0) {
        queryParams.branch_ids = user.branches.map((b) => b.id);
    } else if (user?.branch_id && user.branch_id !== 0) {
        queryParams.branch_id = user.branch_id;
    }

    // Handle Department Logic: User-restricted departments take priority
    const userDepts = user?.departments?.map(d => d.id);
    if (userDepts?.length > 0) {
        queryParams.department_ids = userDepts;
    }

    return queryParams;
};