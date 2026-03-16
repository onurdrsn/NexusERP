import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../components/ui/DataTable';
import { ActionToolbar } from '../components/ui/ActionToolbar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Check, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '../store/useToastStore';
import { customersApi, ordersApi, productsApi } from '../services/endpoints';

import type { Order, Customer, Product } from '@nexus/core';

interface OrderItemWithProduct {
    product_name?: string;
    product_id: string;
    quantity: number;
    unit_price: number;
}

type OrderDetail = Order & {
    items?: OrderItemWithProduct[];
};

export const Orders = () => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
    const [orderToApprove, setOrderToApprove] = useState<string | null>(null);
    const [isApproving, setIsApproving] = useState(false);

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
            const responseData = await ordersApi.list();
            setOrders(Array.isArray(responseData) ? responseData : []);
            if (!Array.isArray(responseData)) console.error('Invalid orders data:', responseData);
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
            const [customersData, productsData] = await Promise.all([
                customersApi.list(),
                productsApi.list()
            ]);
            setCustomers(customersData);
            setProducts(productsData);
            setShowModal(true);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ordersApi.create(newOrder);
            toast.success(t('salesOrders.orderCreatedSuccessfully'));
            setShowModal(false);
            setNewOrder({ customer_id: '', items: [{ product_id: '', quantity: 1, unit_price: 0 }] });
            fetchData();
        } catch (error: unknown) {
            console.error(error);
            toast.error(t('salesOrders.failedToCreateOrder'));
        }
    };

    const handleApprove = async (id: string) => {
        setOrderToApprove(id);
        setApproveConfirmOpen(true);
    };

    const handleConfirmApprove = async () => {
        if (!orderToApprove) return;

        setIsApproving(true);
        try {
            await ordersApi.approve(orderToApprove);
            toast.success(t('salesOrders.orderApproved'));
            fetchData();
            setApproveConfirmOpen(false);
            setOrderToApprove(null);
        } catch (error: unknown) {
            console.error(error);
            toast.error(t('salesOrders.failedToApproveOrder'));
        } finally {
            setIsApproving(false);
        }
    };

    const handleViewDetail = async (order: Order) => {
        setDetailLoading(true);
        setShowDetailModal(true);
        try {
            const data = await ordersApi.getById(order.id);
            setSelectedOrder(data);
        } catch {
            toast.error('Failed to load order details');
        } finally {
            setDetailLoading(false);
        }
    };

    const addItemRow = () => {
        setNewOrder({
            ...newOrder,
            items: [...newOrder.items, { product_id: '', quantity: 1, unit_price: 0 }]
        });
    };

    const updateItem = (index: number, field: string, value: string | number) => {
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
                    <button onClick={(e) => { e.stopPropagation(); handleViewDetail(order); }} className="text-slate-400 hover:text-slate-600">
                        <Eye size={18} />
                    </button>
                </div>
            )
        }
    ];

    const filtered = orders.filter(o =>
        o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('salesOrders.title')}
                onSearch={(term) => setSearchTerm(term)}
                onAdd={openNewOrderModal}
            />

            <DataTable
                data={filtered}
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

            {/* Order Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Order Details</h2>
                            <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        {detailLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                            </div>
                        ) : selectedOrder ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                                    <div><p className="text-xs text-slate-500">Order ID</p><p className="font-mono font-medium">#{selectedOrder.id.slice(0,8)}</p></div>
                                    <div><p className="text-xs text-slate-500">Customer</p><p className="font-medium">{selectedOrder.customer_name}</p></div>
                                    <div><p className="text-xs text-slate-500">Status</p>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(selectedOrder.status)}`}>{selectedOrder.status}</span>
                                    </div>
                                    <div><p className="text-xs text-slate-500">Total</p><p className="font-mono font-bold">${Number(selectedOrder.total_amount).toLocaleString()}</p></div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-700 mb-3">Items</h3>
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                                            <th className="pb-2">Product</th>
                                            <th className="pb-2 text-center">Qty</th>
                                            <th className="pb-2 text-right">Unit Price</th>
                                            <th className="pb-2 text-right">Subtotal</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(selectedOrder.items || []).map((item: OrderItemWithProduct, i: number) => (
                                                <tr key={i} className="py-2">
                                                    <td className="py-2">{item.product_name || item.product_id}</td>
                                                    <td className="py-2 text-center">{item.quantity}</td>
                                                    <td className="py-2 text-right font-mono">${Number(item.unit_price).toFixed(2)}</td>
                                                    <td className="py-2 text-right font-mono font-medium">${(item.quantity * item.unit_price).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={approveConfirmOpen}
                title={t('salesOrders.approve')}
                message="Approve this order? Stock will be deducted."
                confirmText={t('salesOrders.approve')}
                cancelText={t('common.cancel')}
                variant="warning"
                isLoading={isApproving}
                onConfirm={handleConfirmApprove}
                onCancel={() => {
                    setApproveConfirmOpen(false);
                    setOrderToApprove(null);
                }}
            />
        </div>
    );
};
