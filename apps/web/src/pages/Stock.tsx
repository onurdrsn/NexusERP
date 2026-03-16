import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../components/ui/DataTable';
import { ActionToolbar } from '../components/ui/ActionToolbar';
import { Package, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '../store/useToastStore';
import { productsApi, stockApi, warehousesApi } from '../services/endpoints';

import type { StockItem, StockMovement, Product } from '@nexus/core';


export const Stock = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'current' | 'movements'>('current');
    const [searchTerm, setSearchTerm] = useState('');

    // Data
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);

    // Adjustment Form
    const [adjustment, setAdjustment] = useState({
        product_id: '',
        warehouse_id: '',
        type: 'IN' as 'IN' | 'OUT' | 'COUNT_DIFF' | 'SCRAP',
        quantity: 1,
        reason: ''
    });

    // Transfer Form
    const [transfer, setTransfer] = useState({
        product_id: '',
        from_warehouse_id: '',
        to_warehouse_id: '',
        quantity: 1
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stockData, movementData] = await Promise.all([
                stockApi.listCurrent(),
                stockApi.listMovements()
            ]);
            // Map stock items to include id for DataTable
            setStockItems(stockData.map((item: any) => ({ ...item, id: item.product_id })));
            setMovements(movementData);
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
            const [productsData, warehousesData] = await Promise.all([
                productsApi.list(),
                warehousesApi.list()
            ]);
            setProducts(productsData);
            setWarehouses(warehousesData);
            setShowModal(true);
        } catch (err) {
            toast.error('Failed to load adjustment data');
        }
    };

    const handleAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await stockApi.adjust(adjustment);
            toast.success('Stock adjusted successfully');
            setShowModal(false);
            setAdjustment({ product_id: '', warehouse_id: '', type: 'IN', quantity: 1, reason: '' });
            fetchData();
        } catch (err) {
            toast.error('Failed to adjust stock');
        }
    };

    const openTransferModal = async () => {
        try {
            const [productsData, warehousesData] = await Promise.all([
                productsApi.list(),
                warehousesApi.list()
            ]);
            setProducts(productsData);
            setWarehouses(warehousesData);
            setShowTransferModal(true);
        } catch (err) {
            toast.error('Failed to load transfer data');
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await stockApi.transfer(transfer);
            toast.success('Stock transferred successfully');
            setShowTransferModal(false);
            setTransfer({ product_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: 1 });
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Transfer failed');
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

    const filteredStock = stockItems.filter(s =>
        s.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredMovements = movements.filter(m =>
        m.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.stock')}
                onSearch={(term) => setSearchTerm(term)}
                onAdd={openAdjustmentModal}
                additionalActions={
                    <div className="flex gap-2">
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
                        <button
                            onClick={openTransferModal}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md border border-slate-300 transition-all"
                        >
                            <ArrowLeftRight size={16} />
                            Transfer
                        </button>
                    </div>
                }
            />

            {activeTab === 'current' ? (
                <DataTable
                    data={filteredStock}
                    columns={currentStockColumns}
                    isLoading={loading}
                />
            ) : (
                <DataTable
                    data={filteredMovements}
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

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Warehouse</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={adjustment.warehouse_id}
                                    onChange={e => setAdjustment({ ...adjustment, warehouse_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Warehouse</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
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
                                        <option value="COUNT_DIFF">Count Difference</option>
                                        <option value="SCRAP">Scrap / Waste</option>
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

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Stock Transfer</h2>
                        <form onSubmit={handleTransfer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Product</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={transfer.product_id}
                                    onChange={e => setTransfer({ ...transfer, product_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Product</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">From Warehouse</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={transfer.from_warehouse_id}
                                    onChange={e => setTransfer({ ...transfer, from_warehouse_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Warehouse</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">To Warehouse</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={transfer.to_warehouse_id}
                                    onChange={e => setTransfer({ ...transfer, to_warehouse_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Warehouse</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id} disabled={w.id === transfer.from_warehouse_id}>
                                            {w.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Quantity</label>
                                <input
                                    type="number"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    min="1"
                                    value={transfer.quantity}
                                    onChange={e => setTransfer({ ...transfer, quantity: Number(e.target.value) })}
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowTransferModal(false)}
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
