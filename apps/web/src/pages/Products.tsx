import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../components/ui/DataTable';
import { ActionToolbar } from '../components/ui/ActionToolbar';
import { Package, Trash2, Edit } from 'lucide-react';

import type { Product } from '@nexus/core';


export const Products = () => {
    const { t } = useTranslation();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        price: '0',
        initial_stock: '0',
        min_stock: '0',
        unit: 'pcs'
    });

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/products');
            setProducts(res.data);
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
        if (!confirm(t('common.deleteConfirm') || 'Are you sure?')) return;
        try {
            await api.delete(`/products/${id}`);
            fetchProducts();
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/products', {
                ...formData,
                price: Number(formData.price),
                initial_stock: Number(formData.initial_stock),
                min_stock: Number(formData.min_stock)
            });
            setShowModal(false);
            setFormData({ name: '', sku: '', price: '0', initial_stock: '0', min_stock: '0', unit: 'pcs' });
            fetchProducts();
        } catch (error) {
            console.error(error);
            alert('Failed to create product');
        }
    };

    const columns = [
        {
            key: 'name',
            header: t('common.product') || 'Product',
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
            render: (p: Product) => <span className="font-mono font-medium">${Number(p.price).toFixed(2)}</span>
        },
        {
            key: 'stock',
            header: t('common.stock') || 'Stock',
            align: 'center' as const,
            render: (p: Product) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                    ${p.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {p.stock}
                </span>
            )
        },
        {
            key: 'actions',
            header: t('common.actions') || 'Actions',
            align: 'right' as const,
            render: (p: Product) => (
                <div className="flex justify-end gap-2">
                    <button className="text-slate-400 hover:text-indigo-600">
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="text-slate-400 hover:text-red-600"
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
                onAdd={() => setShowModal(true)}
            />

            <DataTable
                data={products}
                columns={columns}
                isLoading={loading}
            />

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{t('products.addNew')}</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Name</label>
                                <input
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">SKU</label>
                                    <input
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                        value={formData.sku}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Price</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Initial Stock</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                        value={formData.initial_stock}
                                        onChange={e => setFormData({ ...formData, initial_stock: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Min Stock</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                        value={formData.min_stock}
                                        onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                                        required
                                    />
                                </div>
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
