import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
    LayoutDashboard, LogOut, User,
    Settings, ChevronDown, ChevronRight,
    Layers, Factory
} from 'lucide-react';
import clsx from 'clsx';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { ToastContainer } from './ui/Toast';

interface NavItemProps {
    icon: any;
    label: string;
    to?: string;
    children?: { label: string; to: string; icon?: any }[];
}

const NavItem = ({ icon: Icon, label, to, children }: NavItemProps) => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(true); // Default open for ERP
    const hasChildren = children && children.length > 0;
    const isActive = to ? location.pathname === to : false;
    const isChildActive = children?.some(child => location.pathname.startsWith(child.to));

    const handleClick = (e: React.MouseEvent) => {
        if (hasChildren) {
            e.preventDefault();
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className="mb-1">
            <Link
                to={to || '#'}
                onClick={handleClick}
                className={clsx(
                    'flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium',
                    isActive || isChildActive
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
            >
                <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span>{label}</span>
                </div>
                {hasChildren && (
                    isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                )}
            </Link>

            {hasChildren && isOpen && (
                <div className="ml-4 pl-4 border-l border-slate-700 mt-1 space-y-1">
                    {children.map((child) => (
                        <Link
                            key={child.to}
                            to={child.to}
                            className={clsx(
                                'block px-3 py-1.5 rounded-md text-sm transition-colors',
                                location.pathname === child.to
                                    ? 'text-indigo-400 font-medium'
                                    : 'text-slate-500 hover:text-slate-300'
                            )}
                        >
                            {child.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export const Layout = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            <ToastContainer />
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800">
                    <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <img src="/logo.png" alt="NexusERP Logo" className="w-8 h-8 rounded-lg" />
                        NexusERP
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 ml-10">Enterprise Edition</p>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
                    {/* Dashboard */}
                    <div>
                        <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">General</p>
                        <NavItem icon={LayoutDashboard} label={t('common.dashboard')} to="/dashboard" />
                    </div>

                    {/* Admin */}
                    <div>
                        <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{t('common.admin')}</p>
                        <NavItem
                            icon={Settings}
                            label={t('common.admin')}
                            children={[
                                { label: t('common.users'), to: '/admin/users' },
                                { label: t('common.roles'), to: '/admin/roles' },
                                { label: t('common.auditLogs'), to: '/admin/audit-logs' },
                                { label: t('common.sqlConsole'), to: '/admin/sql-console' },
                            ]}
                        />
                    </div>

                    {/* Master Data */}
                    <div>
                        <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{t('common.masterData')}</p>
                        <NavItem
                            icon={Layers}
                            label={t('common.masterData')}
                            children={[
                                { label: t('common.products'), to: '/master/products' },
                                { label: t('common.warehouses'), to: '/master/warehouses' },
                                { label: t('common.suppliers'), to: '/master/suppliers' },
                                { label: t('common.customers'), to: '/master/customers' },
                            ]}
                        />
                    </div>

                    {/* Operations */}
                    <div>
                        <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{t('common.operations')}</p>
                        <NavItem
                            icon={Factory}
                            label={t('common.operations')}
                            children={[
                                { label: t('common.purchaseOrders'), to: '/operations/purchase-orders' },
                                { label: t('common.stockMovements'), to: '/operations/stock-movements' },
                                { label: t('common.salesOrders'), to: '/operations/sales-orders' },
                            ]}
                        />
                    </div>
                </nav>

                {/* User Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-400 border border-indigo-700/50">
                            <User size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                            <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <LanguageSwitcher />
                        <button
                            onClick={handleLogout}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            title={t('common.logout')}
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-50 relative">
                {/* Top Bar (Optional if needed, but sidebar covers most) */}
                <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>NexusERP</span>
                        <ChevronRight size={14} />
                        <span className="font-medium text-slate-900">
                            {location.pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ')}
                        </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                        {new Date().toLocaleDateString()}
                    </div>
                </div>

                <div className="p-6 max-w-[1600px] mx-auto pb-20">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
