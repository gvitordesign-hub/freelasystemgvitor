
import React, { useState, useMemo } from 'react';
import {
    X,
    Download,
    Printer,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    TrendingUp,
    TrendingDown,
    BarChart3,
    FileText,
    Search
} from 'lucide-react';
import { Transaction, Client, Task } from '../../types';

interface FinancialReportModalProps {
    transactions: Transaction[];
    clients: Client[];
    tasks: Task[];
    onClose: () => void;
}

const FinancialReportModal: React.FC<FinancialReportModalProps> = ({
    transactions,
    clients,
    tasks,
    onClose
}) => {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0]; // Jan 1st of current year
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0]; // Today
    });

    const filteredTransactions = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return transactions.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, startDate, endDate]);

    const stats = useMemo(() => {
        const income = filteredTransactions
            .filter(t => t.type === 'Entrada' && t.status === 'Pago')
            .reduce((acc, curr) => acc + curr.value, 0);

        const pendingIncome = filteredTransactions
            .filter(t => t.type === 'Entrada' && t.status === 'Pendente')
            .reduce((acc, curr) => acc + curr.value, 0);

        const expenses = filteredTransactions
            .filter(t => t.type === 'Saída')
            .reduce((acc, curr) => acc + curr.value, 0);

        return {
            income,
            pendingIncome,
            expenses,
            balance: income - expenses
        };
    }, [filteredTransactions]);

    const categoryBreakdown = useMemo(() => {
        const categories: Record<string, { income: number; expense: number }> = {};

        filteredTransactions.forEach(t => {
            if (!categories[t.category]) {
                categories[t.category] = { income: 0, expense: 0 };
            }
            if (t.type === 'Entrada' && t.status === 'Pago') {
                categories[t.category].income += t.value;
            } else if (t.type === 'Saída') {
                categories[t.category].expense += t.value;
            }
        });

        return Object.entries(categories)
            .map(([name, values]) => ({ name, ...values }))
            .sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
    }, [filteredTransactions]);

    const handlePrint = () => {
        window.print();
    };

    const getClientName = (taskId?: string) => {
        if (!taskId) return 'Geral';
        const task = tasks.find(t => t.id === taskId);
        if (!task) return 'Geral';
        const client = clients.find(c => c.id === task.clientId);
        return client ? client.name : 'Cliente Externo';
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 print:p-0 print:bg-white print:backdrop-blur-none">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 print:h-auto print:rounded-none print:border-none print:shadow-none print:bg-white print:max-w-none print:static">

                {/* Header */}
                <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 sticky top-0 z-10 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--primary-color)]/20 rounded-2xl">
                            <BarChart3 className="text-[var(--primary-color)]" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold cyber-font text-white uppercase tracking-tight">Relatório Financeiro</h2>
                            <p className="text-slate-400 text-xs uppercase tracking-widest font-black">Performance e Prestação de Contas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-700"
                        >
                            <Printer size={16} />
                            Imprimir / PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-700"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8 space-y-8 custom-scrollbar print:overflow-visible print:px-0 print:py-4">

                    {/* Print Only Header */}
                    <div className="hidden print:block mb-8 border-b-2 border-slate-200 pb-4">
                        <h1 className="text-3xl font-bold text-slate-900 mb-1">RELATÓRIO FINANCEIRO FRELLA SYSTEM</h1>
                        <p className="text-slate-500 text-sm">Período: {new Date(startDate).toLocaleDateString()} até {new Date(endDate).toLocaleDateString()}</p>
                    </div>

                    {/* Filters - Hidden on Print */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data Inicial</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-slate-200 focus:outline-none focus:border-[var(--primary-color)] transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data Final</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-slate-200 focus:outline-none focus:border-[var(--primary-color)] transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-2">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl print:border-slate-200 print:bg-white print:text-slate-900">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Recebido</p>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-emerald-400 print:text-emerald-700">R$ {stats.income.toLocaleString()}</span>
                                <TrendingUp size={16} className="text-emerald-500" />
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl print:border-slate-200 print:bg-white print:text-slate-900">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Despesas</p>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-rose-400 print:text-rose-700">R$ {stats.expenses.toLocaleString()}</span>
                                <TrendingDown size={16} className="text-rose-500" />
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl print:border-slate-200 print:bg-white print:text-slate-900">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Previsão Pendente</p>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-amber-400 print:text-amber-700">R$ {stats.pendingIncome.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-[var(--primary-color)]/30 p-6 rounded-3xl print:border-slate-200 print:bg-white print:text-slate-900">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Balanço Líquido</p>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-black ${stats.balance >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'}`}>
                                    R$ {stats.balance.toLocaleString()}
                                </span>
                                <div className={`p-1 rounded-full ${stats.balance >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {stats.balance >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
                        {/* Category Breakdown */}
                        <div className="lg:col-span-5 space-y-6 print:mb-8">
                            <div className="flex items-center gap-3">
                                <Filter className="text-[var(--primary-color)]" size={18} />
                                <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest print:text-slate-900">Por Categoria</h3>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden print:border-slate-200">
                                <div className="p-2 space-y-1">
                                    {categoryBreakdown.map((cat, idx) => (
                                        <div key={idx} className="p-4 hover:bg-slate-800/50 rounded-2xl transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-bold text-slate-200 group-hover:text-white print:text-slate-800">{cat.name}</span>
                                                <div className="text-right">
                                                    <span className="text-xs font-bold block text-slate-400 print:text-slate-600">Total: R$ {(cat.income + cat.expense).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex print:bg-slate-100">
                                                <div
                                                    className="h-full bg-emerald-500"
                                                    style={{ width: `${(cat.income / (cat.income + cat.expense || 1)) * 100}%` }}
                                                />
                                                <div
                                                    className="h-full bg-rose-500"
                                                    style={{ width: `${(cat.expense / (cat.income + cat.expense || 1)) * 100}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1 text-[9px] font-black uppercase tracking-tighter">
                                                <span className="text-emerald-500">Entrada: R$ {cat.income.toLocaleString()}</span>
                                                <span className="text-rose-500">Saída: R$ {cat.expense.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {categoryBreakdown.length === 0 && (
                                        <div className="p-8 text-center text-slate-500 italic text-xs">Sem dados para este período.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Transaction List */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="flex items-center gap-3">
                                <FileText className="text-[var(--primary-color)]" size={18} />
                                <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest print:text-slate-900">Detalhamento</h3>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden print:border-slate-200">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[9px] text-slate-500 uppercase tracking-widest font-black border-b border-slate-800 print:border-slate-200">
                                                <th className="px-6 py-4">Data</th>
                                                <th className="px-6 py-4">Descrição / Cliente</th>
                                                <th className="px-6 py-4 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50 print:divide-slate-200">
                                            {filteredTransactions.map((tx) => (
                                                <tr key={tx.id} className="text-xs hover:bg-slate-800/30 print:text-slate-900">
                                                    <td className="px-6 py-4 font-mono text-slate-400 print:text-slate-600">
                                                        {new Date(tx.date).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-200 print:text-slate-900">{tx.description}</span>
                                                            <span className="text-[9px] text-slate-500 uppercase tracking-tighter font-black">
                                                                {getClientName(tx.taskId)} • {tx.category}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-black ${tx.type === 'Entrada' ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'}`}>
                                                        {tx.type === 'Entrada' ? '+' : '-'} R$ {tx.value.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredTransactions.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="p-12 text-center text-slate-500 italic text-xs">
                                                        Nenhuma transação no período selecionado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Notes Only on Print */}
                    <div className="hidden print:block pt-12 border-t border-slate-200 text-[10px] text-slate-400 italic">
                        Documento gerado automaticamente pelo sistema FRELLA SYSTEM em {new Date().toLocaleString()}.
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FinancialReportModal;
