import { getUser } from "@/config";
import { api } from "../api-client";

const getCompanyId = () => {
    const user = getUser();
    return user?.company_id || 0;
};

export const getCompanyProfile = async () => {
    const id = getCompanyId();
    const { data } = await api.get(`/company/${id}`);
    return data?.record ?? data;
};

export const updateCompanyProfile = async (payload = {}) => {
    const id = getCompanyId();
    const { data } = await api.post(`/company/${id}/update`, payload);
    return data;
};

export const updateCompanyProfileContact = async (payload = {}) => {
    const id = getCompanyId();
    const { data } = await api.post(`/company/${id}/update/contact`, payload);
    return data;
};

export const getCompanyLogo = async () => {
    const id = getCompanyId();
    const { data } = await api.get(`/get-logo-only/${id}`);
    return data;
};

export const updateCompanyLogo = async (logoBase64) => {
    const company_id = getCompanyId();
    const { data } = await api.post(`/update-logo-only`, {
        company_id,
        logo_base_64: logoBase64,
    });
    return data;
};

export const updateCompanyPin = async (pin) => {
    const company_id = getCompanyId();
    const { data } = await api.post(`/set-pin`, {
        company_id,
        pin,
    });
    return data;
};

export const updateCompanyPassword = async (payload = {}) => {
    const id = getCompanyId();
    const { data } = await api.post(`/company/${id}/update/user`, payload);
    return data;
};
