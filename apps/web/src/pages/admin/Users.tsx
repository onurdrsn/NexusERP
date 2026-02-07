import React, { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Shield, CheckCircle, XCircle } from 'lucide-react';

import type { User } from '@nexus/core';


export const Users = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'user'
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/users', formData);
            setShowModal(false);
            setFormData({ email: '', password: '', full_name: '', role: 'user' });
            fetchData();
        } catch (error) {
            alert('Failed to create user');
        }
    };

    const columns = [
        {
            key: 'full_name',
            header: t('common.name') || 'Name',
            render: (user: User) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                        {user.full_name.charAt(0)}
                    </div>
                    <span>{user.full_name}</span>
                </div>
            )
        },
        { key: 'email', header: 'Email' },
        {
            key: 'role',
            header: t('common.role') || 'Role',
            render: (user: User) => (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
                    <Shield size={12} />
                    {user.role}
                </span>
            )
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (user: User) => (
                user.is_active ?
                    <span className="text-green-600 flex items-center gap-1 text-xs"><CheckCircle size={14} /> Active</span> :
                    <span className="text-red-500 flex items-center gap-1 text-xs"><XCircle size={14} /> Inactive</span>
            )
        },
        {
            key: 'created_at',
            header: 'Joined',
            render: (user: User) => <span className="text-slate-500 text-xs">{format(new Date(user.created_at), 'MMM d, yyyy')}</span>
        }
    ];

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.users') || 'Users'}
                onSearch={(term) => console.log(term)}
                onAdd={() => setShowModal(true)}
                onExport={() => alert('Exporting...')}
            />

            <DataTable
                data={users}
                columns={columns}
                isLoading={loading}
                pagination={{
                    currentPage: 1,
                    totalPages: 1,
                    onPageChange: () => { }
                }}
            />

            {/* Create User Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Create New User</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email</label>
                                <input
                                    type="email"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Password</label>
                                <input
                                    type="password"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Role</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    {t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
