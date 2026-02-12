import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.nexuserp.onurdrsn.com.tr';

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export default api;
