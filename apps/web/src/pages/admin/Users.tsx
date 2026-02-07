import { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, XCircle, Edit2, Key, RefreshCw } from 'lucide-react';
import { PasswordUtils } from '../../utils/PasswordUtils';
import { Select } from '../../components/ui/Select';
import { toast } from '../../store/useToastStore';

import type { User } from '@nexus/core';


export const Users = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [roles, setRoles] = useState<{ id: string, name: string }[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'user',
        is_active: true
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                api.get('/users'),
                api.get('/roles')
            ]);

            if (Array.isArray(usersRes.data)) {
                setUsers(usersRes.data);
            }

            if (rolesRes.data && Array.isArray(rolesRes.data.roles)) {
                setRoles(rolesRes.data.roles);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Password Policy Validation (only if password provided)
        if (formData.password && !PasswordUtils.validate(formData.password)) {
            toast.error(t('users.passwordPolicy'));
            return;
        }

        try {
            if (isEditing && selectedUser) {
                await api.put(`/users/${selectedUser.id}`, formData);
            } else {
                await api.post('/users', formData);
            }
            setShowModal(false);
            resetForm();
            fetchData();
            if (isEditing) {
                toast.success(t('users.updateSuccess'));
            } else {
                toast.success(t('users.createSuccess'));
            }
        } catch (error) {
            toast.error(isEditing ? t('users.updateError') : t('users.createError'));
        }
    };

    const resetForm = () => {
        setFormData({ email: '', password: '', full_name: '', role: 'user', is_active: true });
        setIsEditing(false);
        setSelectedUser(null);
        setShowModal(false);
    };

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            password: '', // Don't show password, but keep field if they want to change it
            full_name: user.full_name,
            role: user.role,
            is_active: user.is_active
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleGeneratePassword = () => {
        const password = PasswordUtils.generateRandom();
        setFormData({ ...formData, password });
    };

    const columns = [
        {
            key: 'full_name',
            header: t('common.name') || 'Name',
            render: (user: User) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-500 font-bold text-xs">
                        {user.full_name.charAt(0)}
                    </div>
                    <span>{user.full_name}</span>
                </div>
            )
        },
        { key: 'email', header: t('users.email') },
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
            header: t('users.isActive'),
            render: (user: User) => (
                user.is_active ?
                    <span className="text-green-600 flex items-center gap-1 text-xs"><CheckCircle size={14} /> {t('common.active')}</span> :
                    <span className="text-red-500 flex items-center gap-1 text-xs"><XCircle size={14} /> {t('common.inactive')}</span>
            )
        },
        {
            key: 'actions',
            header: t('common.actions'),
            render: (user: User) => (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleEditClick(user)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                        title={t('common.edit')}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={async () => {
                            const temp = prompt(t('users.tempPassword'));
                            if (temp) {
                                try {
                                    await api.post(`/users/${user.id}/reset-password`, { temp_password: temp });
                                    toast.success(t('users.resetSuccess'));
                                } catch (err) {
                                    toast.error(t('users.resetError'));
                                }
                            }
                        }}
                        className="text-slate-400 hover:text-amber-600 transition-colors"
                        title={t('users.resetPassword')}
                    >
                        <Key size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('users.title')}
                onSearch={(term) => console.log(term)}
                onAdd={() => { resetForm(); setShowModal(true); }}
                onExport={() => toast.success('Exporting...')}
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

            {showModal && (
                <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">
                            {isEditing ? t('users.editUser') : t('users.addUser')}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-1.5">{t('users.fullName')}</label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-slate-700 rounded-lg py-2.5 px-4 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-1.5">{t('users.email')}</label>
                                <input
                                    type="email"
                                    className="w-full bg-white border border-slate-700 rounded-lg py-2.5 px-4 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    disabled={isEditing}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-1.5">
                                    {t('users.password')} {isEditing && <span className="text-xs text-slate-500 font-normal">({t('users.leaveBlank')})</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-slate-700 rounded-lg py-2.5 px-4 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-12"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!isEditing}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGeneratePassword}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-indigo-400 transition-colors"
                                        title={t('users.generatePassword')}
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label={t('users.role')}
                                    options={roles.map(r => ({ value: r.name, label: r.name }))}
                                    value={formData.role}
                                    onChange={(val) => setFormData({ ...formData, role: val })}
                                />
                                <Select
                                    label={t('users.isActive')}
                                    options={[
                                        { value: 'true', label: t('common.active') },
                                        { value: 'false', label: t('common.inactive') }
                                    ]}
                                    value={formData.is_active ? 'true' : 'false'}
                                    onChange={(val) => setFormData({ ...formData, is_active: val === 'true' })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-6 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all font-medium"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20 font-medium"
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
