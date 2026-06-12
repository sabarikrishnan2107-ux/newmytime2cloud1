import { api } from "../api";
import { API_BASE, buildQueryParams } from "../api-client";


export const getPayslip = async (id, params = {}) => {
    let baseURL = API_BASE;
    // baseURL = `https://backend.mytime2cloud.com/api`;
    const { data } = await api.get(`${baseURL}/payslip/${id}`, { params: await buildQueryParams(params) });
    return data;
};

export const getCompany = async (id) => {
    let baseURL = API_BASE;
    // baseURL = `https://backend.mytime2cloud.com/api`;
    const { data } = await api.get(`${baseURL}/company/${id}`);
    return data;
};

export const renderPayslip = async (params) => {
    let baseURL = API_BASE;

    // 2. Construct the query string automatically
    const queryString = new URLSearchParams(params).toString();
    const finalUrl = `${baseURL}/render-payslip-by-employee?${queryString}`;
    window.open(finalUrl, '_blank');
};