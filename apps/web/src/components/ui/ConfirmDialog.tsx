import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const variantStyles = {
  danger: {
    button: 'bg-red-600 hover:bg-red-700',
    icon: 'text-red-600',
    border: 'border-red-100'
  },
  warning: {
    button: 'bg-amber-600 hover:bg-amber-700',
    icon: 'text-amber-600',
    border: 'border-amber-100'
  },
  info: {
    button: 'bg-blue-600 hover:bg-blue-700',
    icon: 'text-blue-600',
    border: 'border-blue-100'
  }
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-xl shadow-xl max-w-md w-full p-6 border-2 ${style.border}`}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className={`shrink-0 mt-0.5 ${style.icon}`} size={24} />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">
              {title || 'Confirm Action'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Message */}
        <p className="text-slate-600 mb-6">{message}</p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 ${style.button} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
