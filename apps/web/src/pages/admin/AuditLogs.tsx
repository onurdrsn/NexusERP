import { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { toast } from '../../store/useToastStore';
import { User } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
    id: string;
    user_email: string;
    action: string;
    ip_address: string;
    details: any;
    created_at: string;
}

export const AuditLogs = () => {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/audit-logs');
            setLogs(res.data);
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (logs.length === 0) {
            toast.warning('Dışa aktarılacak veri bulunamadı');
            return;
        }

        const headers = ['Date', 'User', 'Action', 'Details'];
        const csvRows = logs.map(log => [
            format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
            log.user_email || 'System',
            log.action,
            JSON.stringify(log.details).replace(/"/g, '""')
        ]);

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(t('common.exportSuccess') || 'Veriler başarıyla dışa aktarıldı');
    };

    useEffect(() => {
        fetchData();
    }, []);

    const columns = [
        {
            key: 'created_at',
            header: 'Date',
            render: (log: AuditLog) => <span className="text-slate-500 text-xs">{format(new Date(log.created_at), 'MMM d, HH:mm:ss')}</span>,
            width: '180px'
        },
        {
            key: 'user_email',
            header: 'User',
            render: (log: AuditLog) => (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                    <User size={14} className="text-slate-400" />
                    {log.user_email || 'System'}
                </div>
            )
        },
        {
            key: 'action',
            header: 'Action',
            render: (log: AuditLog) => <span className="font-mono text-xs font-semibold text-indigo-600">{log.action}</span>
        },
        {
            key: 'ip_address',
            header: t('common.ipAddress') || 'IP Address',
            render: (log: AuditLog) => <span className="font-mono text-xs text-slate-500">{log.ip_address || '0.0.0.0'}</span>,
            width: '120px'
        },
        {
            key: 'details',
            header: 'Details',
            render: (log: AuditLog) => (
                <span className="text-xs text-slate-500 font-mono" title={JSON.stringify(log.details)}>
                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details).slice(0, 50) + (JSON.stringify(log.details).length > 50 ? '...' : '')}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <ActionToolbar
                title={t('common.auditLogs') || 'Audit Logs'}
                onSearch={(term) => console.log(term)}
                onExport={handleExport}
            />

            <DataTable
                data={logs}
                columns={columns}
                isLoading={loading}
            />
        </div>
    );
};
