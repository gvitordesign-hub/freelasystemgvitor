
import React, { useMemo, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Clock, Search, Plus, ArrowUpRight, ArrowDownRight, PencilLine, ExternalLink, ChevronLeft, ChevronRight, Calendar, BarChart3, Download, Trash2, CheckCircle2, Undo2 } from 'lucide-react';
import { Transaction, Task, Client, Invoice } from '@/types';
import FinancialReportModal from '@/components/modals/FinancialReportModal';
import TransactionModal, { TransactionFormValues } from '@/components/modals/TransactionModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { isSameMonthAndYear, formatDateBR, getLocalDateString, getDateParts } from '@/utils/dateUtils';
import { buildFinanceIndex, clientIdOfTx, receivables, receivablesByMonth } from '@/lib/finance';

interface FinanceDashboardProps {
  transactions: Transaction[];
  tasks: Task[];
  clients: Client[];
  invoices: Invoice[];
  weeklyGoal: number;
  monthlyGoal: number;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, patch: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onViewClientNote: (client: Client) => void;
  onEditTask: (task: Task) => void;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
  transactions, tasks, clients, invoices, onAddTransaction, onUpdateTransaction, onDeleteTransaction, onViewClientNote, onEditTask
}) => {
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pago' | 'Pendente'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Entrada' | 'Saída'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const monthYearLabel = viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const fidx = useMemo(() => buildFinanceIndex(tasks, invoices, transactions), [tasks, invoices, transactions]);
  const openReceivables = useMemo(() => receivables(invoices, transactions, fidx), [invoices, transactions, fidx]);
  const receivablesMonth = useMemo(() => {
    const byMonth = receivablesByMonth(invoices, transactions, fidx);
    const key = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
    return byMonth.get(key) || 0;
  }, [invoices, transactions, fidx, viewDate]);

  const clientOfTx = (tx: Transaction): Client | null => {
    const clientId = clientIdOfTx(tx, fidx);
    return clientId ? clients.find(c => c.id === clientId) ?? null : null;
  };

  const filteredByMonth = useMemo(
    () => transactions.filter(t => isSameMonthAndYear(t.date, viewDate)),
    [transactions, viewDate]
  );

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return filteredByMonth
      .filter(t => statusFilter === 'all' || t.status === statusFilter)
      .filter(t => typeFilter === 'all' || t.type === typeFilter)
      .filter(t => clientFilter === 'all' || clientOfTx(t)?.id === clientFilter)
      .filter(t => !term || t.description.toLowerCase().includes(term) || (t.category || '').toLowerCase().includes(term))
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredByMonth, searchTerm, statusFilter, typeFilter, clientFilter, tasks, invoices, clients]);

  const sum = (list: Transaction[]) => list.reduce((acc, t) => acc + t.value, 0);

  const totalBalance = transactions
    .filter(t => t.status === 'Pago')
    .reduce((acc, curr) => curr.type === 'Entrada' ? acc + curr.value : acc - curr.value, 0);

  const realIncome = sum(filteredByMonth.filter(t => t.type === 'Entrada' && t.status === 'Pago'));
  const paidExpenses = sum(filteredByMonth.filter(t => t.type === 'Saída' && t.status === 'Pago'));
  const dueExpenses = sum(filteredByMonth.filter(t => t.type === 'Saída' && t.status === 'Pendente'));

  const filteredIn = sum(filteredTransactions.filter(t => t.type === 'Entrada'));
  const filteredOut = sum(filteredTransactions.filter(t => t.type === 'Saída'));
  const hasActiveFilter = statusFilter !== 'all' || typeFilter !== 'all' || clientFilter !== 'all' || searchTerm.trim() !== '';

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const handleCurrentMonth = () => setViewDate(new Date());

  const handleModalSubmit = (values: TransactionFormValues) => {
    if (editingTx) {
      const locked = !!editingTx.invoiceId && editingTx.type === 'Entrada';
      onUpdateTransaction(editingTx.id, {
        description: values.description,
        category: values.category,
        date: values.date,
        ...(values.clientId !== undefined ? { clientId: values.clientId } : {}),
        ...(locked ? {} : { value: values.value, status: values.status, type: values.type })
      });
    } else {
      onAddTransaction(values);
    }
  };

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['Data', 'Descrição', 'Cliente', 'Categoria', 'Tipo', 'Status', 'Forma de pagamento', 'Valor'];
    const rows = filteredTransactions.map(tx => [
      formatDateBR(tx.date),
      tx.description,
      clientOfTx(tx)?.name ?? '',
      tx.category ?? '',
      tx.type,
      tx.status,
      tx.method ?? '',
      (tx.type === 'Saída' ? -tx.value : tx.value).toFixed(2).replace('.', ',')
    ]);
    const csv = '﻿' + [header, ...rows].map(r => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const { year, month } = getDateParts(getLocalDateString(viewDate));
    a.href = url;
    a.download = `fluxo-de-caixa-${year}-${String(month + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectCls = 'bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer';

  return (
    <div className="p-4 md:p-8 animate-reveal max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Fluxo de Caixa</h1>
          <p className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-wide mt-1">Controle total sobre o seu capital</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={exportCsv}
            disabled={filteredTransactions.length === 0}
            className="flex-1 sm:flex-none bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40 text-slate-200 hover:text-white px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={17} />
            CSV
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex-1 sm:flex-none bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border border-slate-800 flex items-center justify-center gap-2 shadow-inner cursor-pointer"
          >
            <BarChart3 size={17} />
            Relatório
          </button>
          <button
            onClick={() => { setEditingTx(null); setShowTxModal(true); }}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_16px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus size={17} />
            Novo Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 md:p-6 rounded-3xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30">
              <Wallet className="text-purple-400" size={20} />
            </div>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Saldo Atual</p>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-1 tabular-nums">{brl(totalBalance)}</h2>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 md:p-6 rounded-3xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
              <TrendingUp className="text-emerald-400" size={20} />
            </div>
            <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg uppercase tracking-wider">Realizado</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Entradas do mês</p>
          <h2 className="text-2xl md:text-3xl font-black text-emerald-400 mt-1 tabular-nums">{brl(realIncome)}</h2>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 md:p-6 rounded-3xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30">
              <Clock className="text-amber-400" size={20} />
            </div>
            <span className="text-[11px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg uppercase tracking-wider">Previsto</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">A receber do mês</p>
          <h2 className="text-2xl md:text-3xl font-black text-amber-400 mt-1 tabular-nums">{brl(receivablesMonth)}</h2>
          <div className="mt-3 pt-3 border-t border-slate-800" title="Restante de todas as notas em aberto + previsões avulsas, somando todos os meses">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total pendente geral</p>
            <p className="text-base font-black text-amber-300 tabular-nums">{brl(openReceivables.total)}</p>
            <p className="text-[11px] text-slate-500 tabular-nums">
              {openReceivables.openInvoices} nota{openReceivables.openInvoices !== 1 ? 's' : ''} em aberto
              {openReceivables.standalone > 0 && ` · ${brl(openReceivables.standalone)} avulso`}
            </p>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 md:p-6 rounded-3xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-500/30">
              <TrendingDown className="text-rose-400" size={20} />
            </div>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Saídas pagas</p>
          <h2 className="text-2xl md:text-3xl font-black text-rose-400 mt-1 tabular-nums">{brl(paidExpenses)}</h2>
          {dueExpenses > 0 && (
            <p className="text-xs text-amber-400 mt-1 tabular-nums">A pagar: {brl(dueExpenses)}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-4 md:p-5 rounded-3xl shadow-lg">
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <button onClick={handlePrevMonth} aria-label="Mês anterior" className="p-2.5 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white cursor-pointer active:scale-95">
            <ChevronLeft size={20} />
          </button>
          <button onClick={handleCurrentMonth} title="Voltar ao mês atual" className="flex flex-col text-center sm:text-left cursor-pointer">
            <span className="text-[11px] font-bold text-[var(--primary-color)] leading-none mb-1">Período de análise</span>
            <span className="text-base sm:text-lg font-black text-white capitalize tracking-tight">{monthYearLabel}</span>
          </button>
          <button onClick={handleNextMonth} aria-label="Próximo mês" className="p-2.5 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white cursor-pointer active:scale-95">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[11px] font-bold text-slate-500">Balanço do mês</span>
            <span className={`text-sm sm:text-base font-black tabular-nums ${(realIncome - paidExpenses) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(realIncome - paidExpenses) >= 0 ? '+' : ''}{brl(realIncome - paidExpenses)}
            </span>
          </div>
          <div className="w-10 h-10 bg-slate-800/80 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-700/60 shrink-0">
            <Calendar size={18} />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/60">
          <h3 className="font-bold text-white">Histórico de transações</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 w-40"
              />
            </div>
            <select aria-label="Filtrar por status" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className={selectCls}>
              <option value="all">Todos os status</option>
              <option value="Pago">Pagos</option>
              <option value="Pendente">Pendentes</option>
            </select>
            <select aria-label="Filtrar por tipo" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className={selectCls}>
              <option value="all">Entradas e saídas</option>
              <option value="Entrada">Só entradas</option>
              <option value="Saída">Só saídas</option>
            </select>
            <select aria-label="Filtrar por cliente" value={clientFilter} onChange={e => setClientFilter(e.target.value)} className={`${selectCls} max-w-[11rem]`}>
              <option value="all">Todos os clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {hasActiveFilter && (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); setClientFilter('all'); }}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-2 cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-slate-500 font-semibold border-b border-slate-800">
                <th className="px-4 md:px-6 py-3">Data</th>
                <th className="px-4 md:px-6 py-3">Descrição</th>
                <th className="px-4 md:px-6 py-3 text-center">Cliente</th>
                <th className="px-4 md:px-6 py-3">Categoria</th>
                <th className="px-4 md:px-6 py-3 text-right">Valor</th>
                <th className="px-4 md:px-6 py-3 text-center">Status</th>
                <th className="px-4 md:px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTransactions.map(tx => {
                const linkedTask = tx.taskId ? tasks.find(t => t.id === tx.taskId) : null;
                const client = clientOfTx(tx);
                const isPaid = tx.status === 'Pago';
                const linkedToInvoice = !!tx.invoiceId;

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 md:px-6 py-3 text-sm text-slate-400 tabular-nums">
                      {formatDateBR(tx.date)}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-sm font-medium text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md shrink-0 ${tx.type === 'Entrada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {tx.type === 'Entrada' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate max-w-[18rem]">{tx.description}</div>
                          {tx.method && <div className="text-[11px] text-slate-500">{tx.method}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-xs text-center">
                      {client ? (
                        <div className="flex flex-col items-center">
                          <span className="text-slate-200 font-bold">{client.name}</span>
                          <span className="text-[11px] text-slate-500">{client.company}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Geral</span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-xs">
                      <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded">{tx.category}</span>
                    </td>
                    <td className={`px-4 md:px-6 py-3 text-sm font-bold text-right tabular-nums ${tx.type === 'Entrada' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'Entrada' ? '+' : '-'} {brl(tx.value)}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-center">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Marcar pago/pendente: lançamentos de nota são controlados pela nota */}
                        {linkedToInvoice && client ? (
                          <button
                            onClick={() => onViewClientNote(client)}
                            title={isPaid ? 'Controlado pela nota — abrir para reabrir' : 'Controlado pela nota — abrir para registrar recebimento'}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--primary-color)] rounded-lg transition-all cursor-pointer"
                          >
                            <ExternalLink size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpdateTransaction(tx.id, {
                              status: isPaid ? 'Pendente' : 'Pago',
                              ...(!isPaid ? { date: getLocalDateString() } : {})
                            })}
                            title={isPaid ? 'Marcar como pendente' : 'Marcar como pago (hoje)'}
                            className={`p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer ${isPaid ? 'text-slate-400 hover:text-amber-400' : 'text-emerald-400 hover:text-emerald-300'}`}
                          >
                            {isPaid ? <Undo2 size={14} /> : <CheckCircle2 size={14} />}
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingTx(tx); setShowTxModal(true); }}
                          title="Editar lançamento"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                        >
                          <PencilLine size={14} />
                        </button>
                        {linkedTask && (
                          <button
                            onClick={() => onEditTask(linkedTask)}
                            title="Abrir demanda"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingTx(tx)}
                          title="Excluir lançamento"
                          className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    {hasActiveFilter ? 'Nenhuma transação encontrada com esses filtros.' : 'Nenhuma transação registrada para este período.'}
                  </td>
                </tr>
              )}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-700 bg-slate-900/80 text-xs">
                  <td colSpan={4} className="px-4 md:px-6 py-3 text-slate-400 font-semibold">
                    {hasActiveFilter ? 'Total filtrado' : 'Total do mês (todos os status)'} · {filteredTransactions.length} lançamento(s)
                  </td>
                  <td colSpan={3} className="px-4 md:px-6 py-3 text-right tabular-nums font-bold">
                    <span className="text-emerald-400">+ {brl(filteredIn)}</span>
                    <span className="text-slate-600 mx-2">/</span>
                    <span className="text-rose-400">- {brl(filteredOut)}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showTxModal && (
        <TransactionModal
          initial={editingTx ?? undefined}
          clients={clients}
          onClose={() => { setShowTxModal(false); setEditingTx(null); }}
          onSubmit={handleModalSubmit}
        />
      )}

      {deletingTx && (
        <ConfirmModal
          title="Excluir lançamento?"
          message={
            deletingTx.invoiceId || deletingTx.taskId
              ? `"${deletingTx.description}" (${brl(deletingTx.value)}) está vinculado a uma demanda/nota. A nota continuará como está; use "Reabrir" na nota se o pagamento não ocorreu. Esta ação não pode ser desfeita.`
              : `"${deletingTx.description}" (${brl(deletingTx.value)}) será removido do caixa. Esta ação não pode ser desfeita.`
          }
          confirmLabel="Excluir"
          onConfirm={() => { onDeleteTransaction(deletingTx.id); setDeletingTx(null); }}
          onCancel={() => setDeletingTx(null)}
        />
      )}

      {showReportModal && (
        <FinancialReportModal
          transactions={transactions}
          clients={clients}
          tasks={tasks}
          invoices={invoices}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default FinanceDashboard;
