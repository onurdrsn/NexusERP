import React, { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';

interface Customer {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
}

export const Customers = () => {
    const { t } = useTranslation();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            console.error('Failed to fetch customers', error);
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
            await api.post('/customers', formData);
            setShowModal(false);
            setFormData({ name: '', email: '', phone: '', address: '' });
            fetchData();
        } catch (error) {
            alert('Failed to create customer');
        }
    };

    const columns = [
        {
            key: 'name',
            header: t('master.customers.name'),
            render: (c: Customer) => (
                <div className="flex items-center gap-2 font-medium text-slate-900">
                    <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                        <Users size={16} />
                    </div>
                    {c.name}
                </div>
            )
        },
        { key: 'email', header: t('master.customers.email'), render: (c: Customer) => c.email || '-' },
        { key: 'phone', header: t('master.customers.phone'), render: (c: Customer) => c.phone || '-' },
        { key: 'address', header: t('master.customers.address'), render: (c: Customer) => <span className="truncate max-w-xs block" title={c.address}>{c.address || '-'}</span> },
    ];

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.customers') || 'Customers'}
                onSearch={(term) => console.log(term)}
                onAdd={() => setShowModal(true)}
            />

            <DataTable
                data={customers}
                columns={columns}
                isLoading={loading}
            />

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{t('master.customers.addNew')}</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('master.customers.name')}</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('master.customers.email')}</label>
                                <input
                                    type="email"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">{t('master.customers.phone')}</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('master.customers.address')}</label>
                                <textarea
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows={3}
                                />
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
