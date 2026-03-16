import React, { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import { Factory, Edit, Trash2 } from 'lucide-react';
import { toast } from '../../store/useToastStore';
import { warehousesApi } from '../../services/endpoints';

interface Warehouse {
    id: string;
    name: string;
    location?: string;
    capacity?: number;
}

export const Warehouses = () => {
    const { t } = useTranslation();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        location: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const responseData = await warehousesApi.list();
            setWarehouses(responseData);
        } catch (error) {
            console.error('Failed to fetch warehouses', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (warehouse: Warehouse) => {
        setSelectedWarehouse(warehouse);
        setFormData({
            name: warehouse.name,
            location: warehouse.location || ''
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        setWarehouseToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!warehouseToDelete) return;

        setIsDeleting(true);
        try {
            await warehousesApi.remove(warehouseToDelete);
            toast.success(t('common.delete'));
            fetchData();
            setDeleteConfirmOpen(false);
            setWarehouseToDelete(null);
        } catch {
            toast.error('Failed to delete warehouse');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && selectedWarehouse) {
                await warehousesApi.update(selectedWarehouse.id, formData);
                toast.success('Warehouse updated');
            } else {
                await warehousesApi.create(formData);
                toast.success('Warehouse created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch {
            toast.error(isEditing ? 'Failed to update warehouse' : 'Failed to create warehouse');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', location: '' });
        setIsEditing(false);
        setSelectedWarehouse(null);
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
        {
            key: 'actions',
            header: t('common.actions'),
            align: 'right' as const,
            render: (w: Warehouse) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(w)} className="text-slate-400 hover:text-indigo-600 p-1">
                        <Edit size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }} className="text-slate-400 hover:text-red-600 p-1">
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];
    const filtered = warehouses.filter(w =>
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.location || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.warehouses') || 'Warehouses'}
                onSearch={(term) => setSearchTerm(term)}
                onAdd={() => { resetForm(); setShowModal(true); }}
            />

            <DataTable
                data={filtered}
                columns={columns}
                isLoading={loading}
            />

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Warehouse' : t('master.warehouses.addNew')}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                    onClick={() => { setShowModal(false); resetForm(); }}
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

            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                title={t('common.delete')}
                message={t('common.deleteConfirm') || 'Are you sure?'}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setDeleteConfirmOpen(false);
                    setWarehouseToDelete(null);
                }}
            />
        </div>
    );
};
