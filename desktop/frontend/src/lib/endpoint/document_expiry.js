import { api, buildQueryParams } from "@/lib/api-client";

export const getDocumentExpiry = async (params = {}) => {
    const { data } = await api.get(`/document-upcoming-expiry`, { params: await buildQueryParams(params) });
    return data;
};
