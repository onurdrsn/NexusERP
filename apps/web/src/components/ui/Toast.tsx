import React from 'react';
import { useToastStore, type ToastType } from '../../store/useToastStore';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';

const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="text-green-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    warning: <AlertTriangle className="text-amber-500" size={20} />,
};

const styles: Record<ToastType, string> = {
    success: 'border-green-100 bg-white shadow-green-100/50',
    error: 'border-red-100 bg-white shadow-red-100/50',
    info: 'border-blue-100 bg-white shadow-blue-100/50',
    warning: 'border-amber-100 bg-white shadow-amber-100/50',
};

export const ToastContainer = () => {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={clsx(
                        "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border-2 shadow-xl min-w-[320px] max-w-md transition-all animate-in slide-in-from-right-full duration-300",
                        styles[t.type]
                    )}
                >
                    <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{t.message}</p>
                    </div>
                    <button
                        onClick={() => removeToast(t.id)}
                        className="shrink-0 p-1 hover:bg-slate-50 rounded-md transition-colors text-slate-400"
                    >
                        <X size={16} />
                    </button>
                    <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full overflow-hidden rounded-b-xl">
                        <div
                            className={clsx(
                                "h-full animate-toast-progress",
                                t.type === 'success' && 'bg-green-500',
                                t.type === 'error' && 'bg-red-500',
                                t.type === 'info' && 'bg-blue-500',
                                t.type === 'warning' && 'bg-amber-500'
                            )}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};
