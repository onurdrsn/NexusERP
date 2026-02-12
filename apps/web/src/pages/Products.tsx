import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../components/ui/DataTable';
import { ActionToolbar } from '../components/ui/ActionToolbar';
import { Select } from '../components/ui/Select';
import { toast } from '../store/useToastStore';
import { Package, Trash2, Edit } from 'lucide-react';
import { productsApi } from '../services/endpoints';

import type { Product } from '@nexus/core';


export const Products = () => {
    const { t } = useTranslation();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        price: '0',
        initial_stock: '0',
        min_stock: '0',
        unit: 'pcs',
        is_active: true
    });

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const responseData = await productsApi.list();
            setProducts(Array.isArray(responseData) ? responseData : []);
            if (!Array.isArray(responseData)) console.error('Invalid products data:', responseData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm(t('common.deleteConfirm') || 'Are you sure you want to delete this product?')) {
            try {
                await productsApi.remove(id);
                fetchProducts();
                toast.success('Product deleted');
            } catch (error) {
                console.error(error);
                toast.error('Failed to delete product');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                price: Number(formData.price),
                initial_stock: Number(formData.initial_stock),
                min_stock: Number(formData.min_stock),
                is_active: formData.is_active
            };

            if (isEditing && selectedProduct) {
                await productsApi.update(selectedProduct.id, data);
            } else {
                await productsApi.create(data);
            }

            setShowModal(false);
            resetForm();
            fetchProducts();
            toast.success(isEditing ? 'Product updated' : 'Product created');
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Failed to save product');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', sku: '', price: '0', initial_stock: '0', min_stock: '0', unit: 'pcs', is_active: true });
        setIsEditing(false);
        setSelectedProduct(null);
    };

    const handleEditClick = (product: Product) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku,
            price: String(product.price),
            initial_stock: String(product.stock),
            min_stock: String(product.min_stock),
            unit: product.unit || 'pcs',
            is_active: product.is_active ?? true
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const columns = [
        {
            key: 'name',
            header: t('common.product') || 'Product',
            width: '40%',
            render: (p: Product) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                        <Package size={16} />
                    </div>
                    <div>
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.sku}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'price',
            header: t('common.price') || 'Price',
            align: 'right' as const,
            width: '20%',
            render: (p: Product) => <span className="font-mono font-medium">${Number(p.price || 0).toFixed(2)}</span>
        },
        {
            key: 'stock',
            header: t('common.stock') || 'Stock',
            align: 'center' as const,
            width: '20%',
            render: (p: Product) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                    ${(p.stock || 0) <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {p.stock || 0}
                </span>
            )
        },
        {
            key: 'actions',
            header: t('common.actions') || 'Actions',
            align: 'right' as const,
            width: '20%',
            render: (p: Product) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => handleEditClick(p)}
                        className="text-slate-400 hover:text-indigo-600 p-1"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="text-slate-400 hover:text-red-600 p-1"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.products')}
                onSearch={() => { }}
                onAdd={() => { resetForm(); setShowModal(true); }}
            />

            <DataTable
                data={products}
                columns={columns}
                isLoading={loading}
            />

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">
                            {isEditing ? t('common.editProduct') : t('common.addNew')}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.name')}</label>
                                <input
                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.sku')}</label>
                                    <input
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm"
                                        value={formData.sku}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.price')}</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.initialStock')}</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm"
                                        value={formData.initial_stock}
                                        onChange={e => setFormData({ ...formData, initial_stock: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.minStock')}</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm"
                                        value={formData.min_stock}
                                        onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <Select
                                label={t('common.status')}
                                options={[
                                    { value: 'true', label: t('common.active') },
                                    { value: 'false', label: t('common.inactive') }
                                ]}
                                value={formData.is_active ? 'true' : 'false'}
                                onChange={(val) => setFormData({ ...formData, is_active: val === 'true' })}
                            />

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
