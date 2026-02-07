import React, { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { format } from 'date-fns';

interface PurchaseOrder {
    id: string;
    supplier_name: string;
    status: string;
    created_at: string;
    item_count: number;
    total_amount: number;
}

interface Supplier {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
}

export const PurchaseOrders = () => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Data for form
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // New PO Form
    const [newOrder, setNewOrder] = useState({
        supplier_id: '',
        items: [{ product_id: '', quantity: 1, price: 0 }]
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/purchase-orders');
            setOrders(res.data);
        } catch (error) {
            console.error('Failed to fetch purchase orders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openNewOrderModal = async () => {
        try {
            const [supRes, prodRes] = await Promise.all([
                api.get('/suppliers'),
                api.get('/products')
            ]);
            setSuppliers(supRes.data);
            setProducts(prodRes.data);
            setShowModal(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/purchase-orders', newOrder);
            setShowModal(false);
            setNewOrder({ supplier_id: '', items: [{ product_id: '', quantity: 1, price: 0 }] });
            fetchData();
        } catch (err) {
            alert('Failed to create purchase order');
        }
    };

    const handleReceive = async (po: PurchaseOrder) => {
        if (!confirm('Receive this order? This will increase stock levels.')) return;
        try {
            await api.post(`/purchase-orders/${po.id}/receive`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to receive order');
        }
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...newOrder.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setNewOrder({ ...newOrder, items: newItems });
    };

    const addItemRow = () => {
        setNewOrder({
            ...newOrder,
            items: [...newOrder.items, { product_id: '', quantity: 1, price: 0 }]
        });
    };

    const columns = [
        {
            key: 'id',
            header: 'PO Number',
            render: (po: PurchaseOrder) => <span className="font-mono text-xs">#{po.id.slice(0, 8)}</span>
        },
        { key: 'supplier_name', header: 'Supplier', render: (po: PurchaseOrder) => <span className="font-medium text-slate-800">{po.supplier_name}</span> },
        {
            key: 'status',
            header: 'Status',
            render: (po: PurchaseOrder) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold
                ${po.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {po.status}
                </span>
            )
        },
        { key: 'item_count', header: 'Items', align: 'center' as const },
        {
            key: 'total_amount',
            header: 'Total',
            align: 'right' as const,
            render: (po: PurchaseOrder) => <span className="font-mono">${Number(po.total_amount || 0).toLocaleString()}</span>
        },
        {
            key: 'created_at',
            header: 'Date',
            render: (po: PurchaseOrder) => <span className="text-slate-500 text-xs">{format(new Date(po.created_at), 'MMM d, yyyy')}</span>
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right' as const,
            render: (po: PurchaseOrder) => (
                <div className="flex justify-end gap-2">
                    {po.status === 'DRAFT' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleReceive(po); }}
                            className="text-indigo-600 hover:text-indigo-900 text-xs font-medium flex items-center gap-1"
                        >
                            <Package size={14} /> Receive
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.purchaseOrders') || 'Purchase Orders'}
                onSearch={(term) => console.log(term)}
                onAdd={openNewOrderModal}
            />

            <DataTable
                data={orders}
                columns={columns}
                isLoading={loading}
            />

            {/* New PO Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Create Purchase Order</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Supplier</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={newOrder.supplier_id}
                                    onChange={e => setNewOrder({ ...newOrder, supplier_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Items</label>
                                {newOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <select
                                            className="flex-1 rounded-md border-slate-300 border p-2"
                                            value={item.product_id}
                                            onChange={e => updateItem(idx, 'product_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Product</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            className="w-20 rounded-md border-slate-300 border p-2"
                                            placeholder="Qty"
                                            min="1"
                                            value={item.quantity}
                                            onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                            required
                                        />
                                        <input
                                            type="number"
                                            className="w-24 rounded-md border-slate-300 border p-2"
                                            placeholder="Cost"
                                            min="0"
                                            step="0.01"
                                            value={item.price}
                                            onChange={e => updateItem(idx, 'price', Number(e.target.value))}
                                            required
                                        />
                                    </div>
                                ))}
                                <button type="button" onClick={addItemRow} className="text-sm text-indigo-600 hover:text-indigo-800">
                                    + Add Item
                                </button>
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
