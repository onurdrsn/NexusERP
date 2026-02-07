import React, { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';

interface Permission {
    id: number;
    code: string;
    description: string;
}

interface Role {
    id: number;
    name: string;
    permissions: string[];
}

export const Roles = () => {
    const { t } = useTranslation();
    const [roles, setRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        permissions: [] as string[]
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/roles');
            setRoles(res.data.roles);
            setAllPermissions(res.data.allPermissions);
        } catch (error) {
            console.error('Failed to fetch roles', error);
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
            await api.post('/roles', formData);
            setShowModal(false);
            setFormData({ name: '', permissions: [] });
            fetchData();
        } catch (error) {
            alert('Failed to create role');
        }
    };

    const togglePermission = (code: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(code)
                ? prev.permissions.filter(p => p !== code)
                : [...prev.permissions, code]
        }));
    };

    const columns = [
        {
            key: 'name',
            header: t('common.role'),
            render: (role: Role) => (
                <div className="flex items-center gap-2 font-medium text-slate-800 capitalize">
                    <Shield size={16} className="text-indigo-600" />
                    {role.name}
                </div>
            )
        },
        {
            key: 'permissions',
            header: 'Permissions',
            render: (role: Role) => (
                <div className="flex flex-wrap gap-1">
                    {role.permissions.length > 0 ? role.permissions.map(p => (
                        <span key={p} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {p}
                        </span>
                    )) : <span className="text-slate-400 text-xs italic">No permissions</span>}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.roles') || 'Roles & Permissions'}
                onSearch={(term) => console.log(term)}
                onAdd={() => setShowModal(true)}
            />

            <DataTable
                data={roles}
                columns={columns}
                isLoading={loading}
            />

            {/* Create Role Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Create New Role</h2>
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Role Name</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g. Sales Manager"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {allPermissions.map(perm => (
                                        <div
                                            key={perm.id}
                                            onClick={() => togglePermission(perm.code)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-3
                                        ${formData.permissions.includes(perm.code)
                                                    ? 'bg-indigo-50 border-indigo-200'
                                                    : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center
                                          ${formData.permissions.includes(perm.code) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                {formData.permissions.includes(perm.code) && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">{perm.code}</p>
                                                <p className="text-[10px] text-slate-500">{perm.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
