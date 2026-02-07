import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../components/ui/DataTable';
import { ActionToolbar } from '../components/ui/ActionToolbar';
import { Check, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '../store/useToastStore';

import type { Order, Customer, Product } from '@nexus/core';

// Ensure OrderStatus matches or cast if needed. 
// Core has OrderStatus type.


export const Orders = () => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Data for form
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // New Order Form State
    const [newOrder, setNewOrder] = useState({
        customer_id: '',
        items: [{ product_id: '', quantity: 1, unit_price: 0 }]
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/orders');
            setOrders(Array.isArray(res.data) ? res.data : []);
            if (!Array.isArray(res.data)) console.error('Invalid orders data:', res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openNewOrderModal = async () => {
        try {
            const [custRes, prodRes] = await Promise.all([
                api.get('/customers'),
                api.get('/products')
            ]);
            setCustomers(custRes.data);
            setProducts(prodRes.data);
            setShowModal(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/orders', newOrder);
            toast.success(t('salesOrders.orderCreatedSuccessfully'));
            setShowModal(false);
            setNewOrder({ customer_id: '', items: [{ product_id: '', quantity: 1, unit_price: 0 }] });
            fetchData();
        } catch (err) {
            toast.error(t('salesOrders.failedToCreateOrder'));
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Approve this order? Stock will be deducted.')) return;
        try {
            await api.post(`/orders/${id}/approve`);
            toast.success(t('salesOrders.orderApproved'));
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || t('salesOrders.failedToApproveOrder'));
        }
    };

    const addItemRow = () => {
        setNewOrder({
            ...newOrder,
            items: [...newOrder.items, { product_id: '', quantity: 1, unit_price: 0 }]
        });
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...newOrder.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-set price if product changes
        if (field === 'product_id') {
            const prod = products.find(p => p.id === value);
            if (prod) {
                newItems[index].unit_price = prod.price;
            }
        }
        setNewOrder({ ...newOrder, items: newItems });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-blue-100 text-blue-800';
            case 'SHIPPED': return 'bg-purple-100 text-purple-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-amber-100 text-amber-800';
        }
    };

    const columns = [
        {
            key: 'id',
            header: t('salesOrders.orderId'),
            render: (order: Order) => <span className="font-mono text-xs">#{order.id.slice(0, 8)}</span>
        },
        {
            key: 'customer',
            header: t('salesOrders.customer'),
            render: (order: Order) => <span className="font-medium text-slate-900">{order.customer_name}</span>
        },
        {
            key: 'date',
            header: t('salesOrders.date'),
            render: (order: Order) => <span className="text-slate-500 text-xs">{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
        },
        {
            key: 'total',
            header: t('salesOrders.total'),
            align: 'right' as const,
            render: (order: Order) => <span className="font-mono font-bold">${Number(order.total_amount).toLocaleString()}</span>
        },
        {
            key: 'status',
            header: t('salesOrders.status'),
            render: (order: Order) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                </span>
            )
        },
        {
            key: 'actions',
            header: t('common.actions'),
            align: 'right' as const,
            render: (order: Order) => (
                <div className="flex justify-end gap-3">
                    {order.status === 'DRAFT' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(order.id); }}
                            className="text-indigo-600 hover:text-indigo-900 mr-2"
                            title={t('salesOrders.approve')}
                        >
                            <Check size={18} />
                        </button>
                    )}
                    <button className="text-slate-400 hover:text-slate-600">
                        <Eye size={18} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('salesOrders.title')}
                onSearch={() => { }}
                onAdd={openNewOrderModal}
            />

            <DataTable
                data={orders}
                columns={columns}
                isLoading={loading}
            />

            {/* New Order Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{t('salesOrders.create')}</h2>
                        <form onSubmit={handleCreateOrder} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('salesOrders.customer')}</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    value={newOrder.customer_id}
                                    onChange={e => setNewOrder({ ...newOrder, customer_id: e.target.value })}
                                    required
                                >
                                    <option value="">{t('salesOrders.selectCustomer')}</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">{t('salesOrders.items')}</label>
                                {newOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <select
                                            className="flex-1 rounded-md border-slate-300 border p-2"
                                            value={item.product_id}
                                            onChange={e => updateItem(idx, 'product_id', e.target.value)}
                                            required
                                        >
                                            <option value="">{t('salesOrders.selectProduct')}</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
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
                                            className="w-24 rounded-md border-slate-300 border p-2 bg-slate-50"
                                            placeholder="Price"
                                            readOnly
                                            value={item.unit_price}
                                        />
                                    </div>
                                ))}
                                <button type="button" onClick={addItemRow} className="text-sm text-indigo-600 hover:text-indigo-800">
                                    + {t('salesOrders.addItem')}
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
