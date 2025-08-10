import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
    validateStatus: s => (s >= 200 && s < 300) || s === 304,
});

apiClient.interceptors.response.use(
    resp => {
        if (resp.data && typeof resp.data === 'object' && 'success' in resp.data) {
            return { ...resp, data: resp.data };
        }
        return resp;
    },
    error => Promise.reject(error),
);

export default apiClient;
