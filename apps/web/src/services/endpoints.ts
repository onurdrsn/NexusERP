import type { AxiosResponse } from 'axios';
import api from './api';

interface LoginUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    requires_password_change: boolean;
}

interface LoginResponse {
    token: string;
    user: LoginUser;
}

interface RoleSummary {
    id: string | number;
    name: string;
    permissions: string[];
}

interface PermissionSummary {
    id: string | number;
    code: string;
    description: string;
}

interface RolesResponse {
    roles: RoleSummary[];
    allPermissions: PermissionSummary[];
}

const unwrap = async <T>(request: Promise<AxiosResponse<T>>): Promise<T> => {
    const response = await request;
    return response.data;
};

export const authApi = {
    login: (email: string, password: string) =>
        unwrap<LoginResponse>(api.post('/auth/login', { email, password })),
    changePassword: (newPassword: string) =>
        unwrap(api.post('/auth/change-password', { new_password: newPassword })),
};

export const dashboardApi = {
    get: () => unwrap(api.get('/dashboard')),
};

export const productsApi = {
    list: () => unwrap(api.get('/products')),
    create: (payload: unknown) => unwrap(api.post('/products', payload)),
    update: (id: string, payload: unknown) => unwrap(api.put(`/products/${id}`, payload)),
    remove: (id: string) => unwrap(api.post(`/products/${id}/delete`)),
};

export const ordersApi = {
    list: () => unwrap(api.get('/orders')),
    create: (payload: unknown) => unwrap(api.post('/orders', payload)),
    approve: (id: string) => unwrap(api.post(`/orders/${id}/approve`)),
};

export const stockApi = {
    listCurrent: () => unwrap(api.get('/stock')),
    listMovements: () => unwrap(api.get('/stock/movements')),
    adjust: (payload: unknown) => unwrap(api.post('/stock/adjust', payload)),
};

export const purchaseOrdersApi = {
    list: () => unwrap(api.get('/purchase-orders')),
    create: (payload: unknown) => unwrap(api.post('/purchase-orders', payload)),
    receive: (id: string) => unwrap(api.post(`/purchase-orders/${id}/receive`)),
};

export const customersApi = {
    list: () => unwrap(api.get('/customers')),
    create: (payload: unknown) => unwrap(api.post('/customers', payload)),
};

export const suppliersApi = {
    list: () => unwrap(api.get('/suppliers')),
    create: (payload: unknown) => unwrap(api.post('/suppliers', payload)),
};

export const warehousesApi = {
    list: () => unwrap(api.get('/warehouses')),
    create: (payload: unknown) => unwrap(api.post('/warehouses', payload)),
};

export const rolesApi = {
    list: () => unwrap<RolesResponse>(api.get('/roles')),
    create: (payload: unknown) => unwrap(api.post('/roles', payload)),
};

export const usersApi = {
    list: () => unwrap(api.get('/users')),
    create: (payload: unknown) => unwrap(api.post('/users', payload)),
    update: (id: string, payload: unknown) => unwrap(api.put(`/users/${id}`, payload)),
    resetPassword: (id: string, tempPassword: string) =>
        unwrap(api.post(`/users/${id}/reset-password`, { temp_password: tempPassword })),
};

export const auditLogsApi = {
    list: () => unwrap(api.get('/audit-logs')),
};

export const sqlApi = {
    execute: (sql: string) => unwrap(api.post('/sql', { sql })),
};
