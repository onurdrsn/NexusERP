import React, { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { Factory } from 'lucide-react';

interface Warehouse {
    id: string;
    name: string;
    location?: string;
    capacity?: number;
}

export const Warehouses = () => {
    const { t } = useTranslation();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        location: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/warehouses');
            setWarehouses(res.data);
        } catch (error) {
            console.error('Failed to fetch warehouses', error);
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
            await api.post('/warehouses', formData);
            setShowModal(false);
            setFormData({ name: '', location: '' });
            fetchData();
        } catch (error) {
            alert('Failed to create warehouse');
        }
    };

    const columns = [
        {
            key: 'name',
            header: t('master.warehouses.name'),
            render: (w: Warehouse) => (
                <div className="flex items-center gap-2 font-medium text-slate-900">
                    <div className="w-8 h-8 rounded bg-teal-50 flex items-center justify-center text-teal-600">
                        <Factory size={16} />
                    </div>
                    {w.name}
                </div>
            )
        },
        { key: 'location', header: t('master.warehouses.location'), render: (w: Warehouse) => w.location || '-' },
    ];

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.warehouses') || 'Warehouses'}
                onSearch={(term) => console.log(term)}
                onAdd={() => setShowModal(true)}
            />

            <DataTable
                data={warehouses}
                columns={columns}
                isLoading={loading}
            />

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{t('master.warehouses.addNew')}</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('master.warehouses.name')}</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('master.warehouses.location')}</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
