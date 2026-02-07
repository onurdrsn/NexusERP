import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../components/ui/DataTable';
import { ActionToolbar } from '../components/ui/ActionToolbar';
import { Package, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '../store/useToastStore';

import type { StockItem, StockMovement, Product } from '@nexus/core';


export const Stock = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'current' | 'movements'>('current');

    // Data
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Adjustment Form
    const [adjustment, setAdjustment] = useState({
        product_id: '',
        type: 'IN',
        quantity: 1,
        reason: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stockRes, moveRes] = await Promise.all([
                api.get('/stock'),
                api.get('/stock/movements')
            ]);
            // Map stock items to include id for DataTable
            setStockItems(stockRes.data.map((item: any) => ({ ...item, id: item.product_id })));
            setMovements(moveRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openAdjustmentModal = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data);
            setShowModal(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/stock/adjust', adjustment);
            toast.success('Stock adjusted successfully');
            setShowModal(false);
            setAdjustment({ product_id: '', type: 'IN', quantity: 1, reason: '' });
            fetchData();
        } catch (err) {
            toast.error('Failed to adjust stock');
        }
    };

    const currentStockColumns = [
        {
            key: 'product',
            header: t('common.product'),
            render: (item: StockItem) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Package size={16} />
                    </div>
                    <div>
                        <p className="font-medium text-slate-900">{item.product_name}</p>
                        <p className="text-xs text-slate-500">{item.sku}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'total_stock',
            header: t('stock.currentStock'),
            align: 'center' as const,
            render: (item: StockItem) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold
                    ${item.total_stock <= 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {item.total_stock}
                </span>
            )
        }
    ];

    const movementColumns = [
        {
            key: 'date',
            header: t('common.date'),
            render: (m: StockMovement) => <span className="text-slate-500 text-xs">{format(new Date(m.created_at), 'MMM d, HH:mm')}</span>
        },
        { key: 'product_name', header: t('common.product') },
        {
            key: 'movement_type',
            header: t('stock.type'),
            render: (m: any) => {
                const isPositive = ['IN', 'TRANSFER_IN', 'COUNT_DIFF'].includes(m.movement_type) && m.quantity > 0;
                return (
                    <span className={`flex items-center gap-1 text-xs font-bold
                        ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {m.movement_type}
                    </span>
                );
            }
        },
        {
            key: 'quantity',
            header: t('stock.quantity'),
            align: 'right' as const,
            render: (m: any) => <span className="font-mono font-medium">{m.quantity}</span>
        },
        { key: 'reference_type', header: t('stock.reason'), render: (m: any) => <span className="italic text-slate-500 uppercase text-[10px]">{m.reference_type}</span> },
        { key: 'user_name', header: 'User', render: (m: any) => <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{m.user_name || m.created_by}</span> }
    ];

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.stock')}
                onSearch={() => { }}
                onAdd={openAdjustmentModal}
                additionalActions={
                    <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
                        <button
                            onClick={() => setActiveTab('current')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all
                                ${activeTab === 'current' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('stock.currentStock')}
                        </button>
                        <button
                            onClick={() => setActiveTab('movements')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all
                                ${activeTab === 'movements' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('stock.movements')}
                        </button>
                    </div>
                }
            />

            {activeTab === 'current' ? (
                <DataTable
                    data={stockItems}
                    columns={currentStockColumns}
                    isLoading={loading}
                />
            ) : (
                <DataTable
                    data={movements}
                    columns={movementColumns}
                    isLoading={loading}
                />
            )}

            {/* Adjustment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{t('stock.adjustment')}</h2>
                        <form onSubmit={handleAdjustment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Product</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={adjustment.product_id}
                                    onChange={e => setAdjustment({ ...adjustment, product_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Product</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Type</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                        value={adjustment.type}
                                        onChange={e => setAdjustment({ ...adjustment, type: e.target.value as any })}
                                    >
                                        <option value="IN">Stock IN (+)</option>
                                        <option value="OUT">Stock OUT (-)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Quantity</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                        min="1"
                                        value={adjustment.quantity}
                                        onChange={e => setAdjustment({ ...adjustment, quantity: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Reason</label>
                                <input
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={adjustment.reason}
                                    onChange={e => setAdjustment({ ...adjustment, reason: e.target.value })}
                                    placeholder="e.g. Damaged, Correction, etc."
                                    required
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
