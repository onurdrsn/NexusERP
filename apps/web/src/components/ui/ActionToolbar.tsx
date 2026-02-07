import React from 'react';
import { Search, Plus, Filter, Download } from 'lucide-react';

interface ActionToolbarProps {
    title: string;
    onSearch?: (term: string) => void;
    onAdd?: () => void;
    onFilter?: () => void;
    onExport?: () => void;
    additionalActions?: React.ReactNode;
}

export const ActionToolbar = ({
    title,
    onSearch,
    onAdd,
    onFilter,
    onExport,
    additionalActions
}: ActionToolbarProps) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {onSearch && (
                    <div className="relative flex-1 sm:flex-none sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            onChange={(e) => onSearch(e.target.value)}
                        />
                    </div>
                )}

                {onFilter && (
                    <button
                        onClick={onFilter}
                        className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md border border-slate-300 transition-colors"
                        title="Filter"
                    >
                        <Filter size={18} />
                    </button>
                )}

                {onExport && (
                    <button
                        onClick={onExport}
                        className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md border border-slate-300 transition-colors"
                        title="Export"
                    >
                        <Download size={18} />
                    </button>
                )}

                {additionalActions}

                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
                    >
                        <Plus size={16} />
                        <span>Add New</span>
                    </button>
                )}
            </div>
        </div>
    );
};
