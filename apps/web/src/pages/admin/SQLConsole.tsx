import { useState, useRef } from 'react';
import { ActionToolbar } from '../../components/ui/ActionToolbar';
import { toast } from '../../store/useToastStore';
import { Play, Database, Terminal } from 'lucide-react';
import { sqlApi } from '../../services/endpoints';

export const SQLConsole = () => {
    const [sql, setSql] = useState('');
    const [resultSets, setResultSets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleExecute = async () => {
        let sqlToExecute = sql;

        // Check if there is a selection
        const textarea = textareaRef.current;
        if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
            sqlToExecute = sql.substring(textarea.selectionStart, textarea.selectionEnd);
        }

        if (!sqlToExecute.trim()) return;

        setLoading(true);
        try {
            const responseData = await sqlApi.execute(sqlToExecute);
            setResultSets(Array.isArray(responseData) ? responseData : [responseData]);
            toast.success(textarea && textarea.selectionStart !== textarea.selectionEnd ? 'Selected query executed' : 'Query executed successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Execution failed');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleExecute();
        }
    };

    return (
        <div className="space-y-6">
            <ActionToolbar
                title="SQL Console"
                onSearch={() => { }}
            />

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <Terminal size={18} className="text-slate-500" />
                        <span>Query Editor</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">Ctrl + Enter to Run</span>
                        <button
                            onClick={handleExecute}
                            disabled={loading || !sql.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-all font-medium text-sm shadow-sm"
                        >
                            {loading ? <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" /> : <Play size={16} fill="currentColor" />}
                            Execute
                        </button>
                    </div>
                </div>
                <div className="p-0 relative">
                    <textarea
                        ref={textareaRef}
                        value={sql}
                        onChange={(e) => setSql(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="SELECT * FROM users LIMIT 10; SELECT * FROM products LIMIT 5;"
                        className="w-full h-64 p-4 font-mono text-sm bg-slate-900 text-indigo-300 focus:outline-none resize-none leading-relaxed"
                        spellCheck={false}
                    />
                    <div className="p-2 bg-slate-800 text-[10px] text-slate-500 font-mono border-t border-slate-700 flex justify-between">
                        <span>Tip: Select text to execute only that part</span>
                        <span>Multi-statement (;) supported</span>
                    </div>
                </div>
            </div>

            {resultSets.map((res, index) => {
                const columns = res.rows?.length > 0 ? Object.keys(res.rows[0]) : [];
                return (
                    <div key={index} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                                <Database size={14} />
                                <span className="font-bold text-indigo-600">{res.command}</span>
                                <span>Executed. Row count: {res.rowCount || 0}</span>
                            </div>
                            <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-500 uppercase">Result Set #{index + 1}</span>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto max-h-[400px]">
                                {res.rows?.length > 0 ? (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                                            <tr>
                                                {columns.map(col => (
                                                    <th key={col} className="px-4 py-3 border-b border-slate-200 bg-slate-50">{col}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {res.rows.map((row: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    {columns.map(col => (
                                                        <td key={col} className="px-4 py-3 text-slate-600 font-mono text-xs truncate max-w-xs">
                                                            {row[col] === null ? <span className="text-slate-300">null</span> :
                                                                typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-slate-400">
                                        <p className="text-xs">Command executed successfully with no data returned.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {resultSets.length === 0 && !loading && (
                <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <Database size={48} className="mx-auto mb-4 opacity-10" />
                    <p>Enter a query and press Execute to see results</p>
                </div>
            )}
        </div>
    );
};
