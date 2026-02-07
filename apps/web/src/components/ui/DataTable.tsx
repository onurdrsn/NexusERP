import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { t } from 'i18next';

interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => React.ReactNode;
    width?: string;
    align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    onRowClick?: (item: T) => void;
    pagination?: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void;
    };
}

export function DataTable<T extends { id: string | number }>({
    data = [],
    columns,
    isLoading,
    onRowClick,
    pagination
}: DataTableProps<T>) {
    if (isLoading) {
        return (
            <div className="w-full h-64 flex items-center justify-center bg-white border border-slate-200 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden text-sm">
            <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    scope="col"
                                    className={`px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider`}
                                    style={{
                                        textAlign: col.align || 'left',
                                        width: col.width || 'auto'
                                    }}
                                >
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900">
                                        {col.header}
                                        {/* Placeholder for sort icon, could be dynamic */}
                                        {/* <ArrowUpDown size={12} className="text-slate-400" /> */}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                                    {t('common.noRecordsFound')}
                                </td>
                            </tr>
                        ) : (
                            data.map((item, rowIdx) => (
                                <tr
                                    key={item.id}
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={`hover:bg-indigo-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                                >
                                    {columns.map((col, colIdx) => (
                                        <td
                                            key={colIdx}
                                            className="px-4 py-2.5 whitespace-nowrap text-slate-700 font-medium"
                                            style={{
                                                textAlign: col.align || 'left',
                                                width: col.width || 'auto'
                                            }}
                                        >
                                            {col.render ? col.render(item) : (item as any)[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {pagination && (
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                        Page <span className="font-semibold text-slate-900">{pagination.currentPage}</span> of <span className="font-semibold text-slate-900">{pagination.totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
                            disabled={pagination.currentPage === 1}
                            className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} className="text-slate-600" />
                        </button>
                        <button
                            onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                            disabled={pagination.currentPage === pagination.totalPages}
                            className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} className="text-slate-600" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
