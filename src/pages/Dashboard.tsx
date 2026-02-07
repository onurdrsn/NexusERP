import { useEffect, useState } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { DollarSign, ShoppingBag, AlertTriangle, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

interface DashboardStats {
    totalSales: number;
    activeOrders: number;
    lowStock: number;
}

interface RecentOrder {
    id: string;
    customer: string;
    status: string;
    created_at: string;
    total: number;
}

interface DashboardData {
    stats: DashboardStats;
    recentOrders: RecentOrder[];
    salesHistory: { name: string; sales: number }[];
}

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="text-white" size={24} />
            </div>
            <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <TrendingUp size={16} />
                {trend}
            </span>
        </div>
        <h3 className="text-slate-500 text-sm font-medium">{label}</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
);

export const Dashboard = () => {
    const { t } = useTranslation();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/dashboard');
                setData(res.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const stats = data?.stats || { totalSales: 0, activeOrders: 0, lowStock: 0 };
    const recentOrders = data?.recentOrders || [];
    const salesData = data?.salesHistory || [];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">{t('dashboard.title')}</h1>
                <div className="text-sm text-slate-500">
                    {new Date().toLocaleDateString()}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    icon={DollarSign}
                    label={t('dashboard.totalSales')}
                    value={`$${Number(stats.totalSales).toLocaleString()}`}
                    trend="+12.5%"
                    color="bg-indigo-500"
                />
                <StatCard
                    icon={ShoppingBag}
                    label={t('dashboard.activeOrders')}
                    value={stats.activeOrders}
                    trend="+5%"
                    color="bg-emerald-500"
                />
                <StatCard
                    icon={AlertTriangle}
                    label={t('dashboard.lowStock')}
                    value={stats.lowStock}
                    trend={t('dashboard.requiresAttention')}
                    color="bg-amber-500"
                />
            </div>

            {/* Charts & Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 mb-6">{t('dashboard.salesOverview')}</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                                />
                                <Line type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 mb-6">{t('dashboard.recentOrders')}</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-slate-100">
                                    <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="py-4 text-sm font-medium text-slate-900">#{order.id.slice(0, 8)}</td>
                                        <td className="py-4 text-sm text-slate-600">{order.customer}</td>
                                        <td className="py-4 text-sm font-medium text-slate-900">${Number(order.total).toLocaleString()}</td>
                                        <td className="py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'PENDING' || order.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-slate-100 text-slate-800'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {recentOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">
                                            No recent orders found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
