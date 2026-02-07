import { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
    id: string;
    user_email: string;
    action: string;
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
                onExport={() => alert('Exporting...')}
            />

            <DataTable
                data={logs}
                columns={columns}
                isLoading={loading}
            />
        </div>
    );
};
