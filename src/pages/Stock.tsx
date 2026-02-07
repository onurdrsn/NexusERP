import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { Package, ArrowRightLeft, History } from 'lucide-react';

interface StockItem {
    product_id: string;
    product_name: string;
    sku: string;
    warehouse_id: number;
    quantity: number;
}

interface StockMovement {
    id: string;
    product_name: string;
    type: 'IN' | 'OUT' | 'TRANSFER';
    quantity: number;
    reference?: string;
    created_at: string;
}

interface Product {
    id: string;
    name: string;
}

export const Stock = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'current' | 'movements'>('current');
    const [stock, setStock] = useState<StockItem[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        product_id: '',
        warehouse_id: 1,
        type: 'IN',
        quantity: 1,
        reason: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stockRes, movementsRes, productsRes] = await Promise.all([
                api.get('/stock'),
                api.get('/stock/movements'),
                api.get('/products')
            ]);
            setStock(stockRes.data);
            setMovements(movementsRes.data);
            setProducts(productsRes.data);
        } catch (error) {
            console.error('Failed to fetch stock data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/stock', {
                ...formData,
                quantity: Number(formData.quantity)
            });
            setShowModal(false);
            fetchData(); // Refresh
        } catch (error) {
            console.error(error);
            alert('Failed to adjust stock');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">{t('stock.title')}</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <ArrowRightLeft size={18} />
                    {t('stock.adjustStock')}
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('current')}
                        className={`${activeTab === 'current' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Package size={18} />
                        {t('stock.currentStock')}
                    </button>
                    <button
                        onClick={() => setActiveTab('movements')}
                        className={`${activeTab === 'movements' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <History size={18} />
                        {t('stock.movements')}
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading...</div>
                ) : activeTab === 'current' ? (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('stock.product')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SKU</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('stock.warehouse')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('stock.quantity')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {stock.map((item, idx) => (
                                <tr key={`${item.product_id}-${item.warehouse_id}-${idx}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.product_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.sku}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">Warehouse {item.warehouse_id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">{item.quantity}</td>
                                </tr>
                            ))}
                            {stock.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">No stock found</td></tr>}
                        </tbody>
                    </table>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('stock.date')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('stock.product')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Change</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {movements.map((mov) => (
                                <tr key={mov.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(mov.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{mov.product_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${mov.type === 'IN' ? 'bg-green-100 text-green-800' :
                                                mov.type === 'OUT' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {mov.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                        {mov.type === 'OUT' ? '-' : '+'}{mov.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{mov.reference || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Adjustment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{t('stock.adjustStock')}</h2>
                        <form onSubmit={handleAdjust} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Product</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.product_id}
                                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Product...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Type</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="IN">IN (Receive)</option>
                                        <option value="OUT">OUT (Ship/Loss)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Reason / Reference</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
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
