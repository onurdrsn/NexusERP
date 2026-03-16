import React, { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import { Truck, Edit, Trash2 } from 'lucide-react';
import { toast } from '../../store/useToastStore';
import { suppliersApi } from '../../services/endpoints';

interface Supplier {
    id: string;
    name: string;
    email?: string;
    phone?: string;
}

export const Suppliers = () => {
    const { t } = useTranslation();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const responseData = await suppliersApi.list();
            setSuppliers(responseData);
        } catch (error) {
            console.error('Failed to fetch suppliers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setFormData({
            name: supplier.name,
            email: supplier.email || '',
            phone: supplier.phone || ''
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        setSupplierToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!supplierToDelete) return;

        setIsDeleting(true);
        try {
            await suppliersApi.remove(supplierToDelete);
            toast.success('Supplier deleted');
            fetchData();
            setDeleteConfirmOpen(false);
            setSupplierToDelete(null);
        } catch {
            toast.error('Failed to delete supplier');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && selectedSupplier) {
                await suppliersApi.update(selectedSupplier.id, formData);
                toast.success('Supplier updated');
            } else {
                await suppliersApi.create(formData);
                toast.success('Supplier created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch {
            toast.error(isEditing ? 'Failed to update supplier' : 'Failed to create supplier');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', phone: '' });
        setIsEditing(false);
        setSelectedSupplier(null);
    };

    const columns = [
        {
            key: 'name',
            header: t('master.suppliers.name'),
            render: (item: Supplier) => (
                <div className="flex items-center gap-2 font-medium text-slate-900">
                    <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center text-orange-600">
                        <Truck size={16} />
                    </div>
                    {item.name}
                </div>
            )
        },
        { key: 'email', header: t('master.suppliers.email'), render: (s: Supplier) => s.email || '-' },
        { key: 'phone', header: t('master.suppliers.phone'), render: (s: Supplier) => s.phone || '-' },
        {
            key: 'actions',
            header: t('common.actions'),
            align: 'right' as const,
            render: (s: Supplier) => (
                <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(s)} className="text-slate-400 hover:text-indigo-600 p-1">
                        <Edit size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="text-slate-400 hover:text-red-600 p-1">
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.suppliers') || 'Suppliers'}
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
                        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Supplier' : t('master.suppliers.addNew')}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('master.suppliers.name')}</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('master.suppliers.email')}</label>
                                <input
                                    type="email"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('master.suppliers.phone')}</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                    setSupplierToDelete(null);
                }}
            />
        </div>
    );
};
