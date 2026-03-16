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
    getById: (id: string) => unwrap(api.get(`/orders/${id}`)),
    approve: (id: string) => unwrap(api.post(`/orders/${id}/approve`)),
    updateStatus: (id: string, status: string) => unwrap(api.put(`/orders/${id}`, { status })),
};

export const invoicesApi = {
    list: () => unwrap(api.get('/invoices')),
    create: (payload: unknown) => unwrap(api.post('/invoices', payload)),
    issue: (id: string) => unwrap(api.post(`/invoices/${id}/issue`)),
    pay: (id: string) => unwrap(api.post(`/invoices/${id}/pay`)),
};

export const stockApi = {
    listCurrent: () => unwrap(api.get('/stock')),
    listMovements: () => unwrap(api.get('/stock/movements')),
    adjust: (payload: unknown) => unwrap(api.post('/stock/adjust', payload)),
    transfer: (payload: unknown) => unwrap(api.post('/stock/transfer', payload)),
};

export const purchaseOrdersApi = {
    list: () => unwrap(api.get('/purchase-orders')),
    create: (payload: unknown) => unwrap(api.post('/purchase-orders', payload)),
    receive: (id: string) => unwrap(api.post(`/purchase-orders/${id}/receive`)),
};

export const customersApi = {
    list: () => unwrap(api.get('/customers')),
    create: (payload: unknown) => unwrap(api.post('/customers', payload)),
    update: (id: string, payload: unknown) => unwrap(api.put(`/customers/${id}`, payload)),
    remove: (id: string) => unwrap(api.post(`/customers/${id}/delete`)),
};

export const suppliersApi = {
    list: () => unwrap(api.get('/suppliers')),
    create: (payload: unknown) => unwrap(api.post('/suppliers', payload)),
    update: (id: string, payload: unknown) => unwrap(api.put(`/suppliers/${id}`, payload)),
    remove: (id: string) => unwrap(api.post(`/suppliers/${id}/delete`)),
};

export const warehousesApi = {
    list: () => unwrap(api.get('/warehouses')),
    create: (payload: unknown) => unwrap(api.post('/warehouses', payload)),
    update: (id: string, payload: unknown) => unwrap(api.put(`/warehouses/${id}`, payload)),
    remove: (id: string) => unwrap(api.post(`/warehouses/${id}/delete`)),
};

export const categoriesApi = {
    list: () => unwrap(api.get('/categories')),
    create: (payload: unknown) => unwrap(api.post('/categories', payload)),
    update: (id: number | string, payload: unknown) => unwrap(api.put(`/categories/${id}`, payload)),
    remove: (id: number | string) => unwrap(api.post(`/categories/${id}/delete`)),
};

export const rolesApi = {
    list: () => unwrap<RolesResponse>(api.get('/roles')),
    create: (payload: unknown) => unwrap(api.post('/roles', payload)),
    update: (id: string|number, payload: unknown) => unwrap(api.put(`/roles/${id}`, payload)),
    remove: (id: string|number) => unwrap(api.delete(`/roles/${id}`)),
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
