
import React, { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Clock, Search, Plus, ArrowUpRight, ArrowDownRight, PencilLine, ExternalLink, ChevronLeft, ChevronRight, Calendar, BarChart3 } from 'lucide-react';
import { Transaction, Task, TransactionType, Client, Invoice } from '../types';
import FinancialReportModal from './Modals/FinancialReportModal';

interface FinanceDashboardProps {
  transactions: Transaction[];
  tasks: Task[];
  clients: Client[];
  invoices: Invoice[];
  weeklyGoal: number;
  monthlyGoal: number;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onViewClientNote: (client: Client) => void;
  onEditTask: (task: Task) => void;
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ transactions, tasks, clients, invoices, weeklyGoal, monthlyGoal, onAddTransaction, onViewClientNote, onEditTask }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    type: 'Saída' as TransactionType,
    category: 'Geral'
  });

  const monthYearLabel = viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();

  const filteredByMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
  });

  const filteredTransactions = filteredByMonth.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBalance = transactions
    .filter(t => t.status === 'Pago')
    .reduce((acc, curr) => curr.type === 'Entrada' ? acc + curr.value : acc - curr.value, 0);

  const realIncome = filteredByMonth
    .filter(t => t.type === 'Entrada' && t.status === 'Pago')
    .reduce((acc, curr) => acc + curr.value, 0);

  const pendingIncome = filteredByMonth
    .filter(t => t.type === 'Entrada' && t.status === 'Pendente')
    .reduce((acc, curr) => acc + curr.value, 0);

  const totalExpenses = filteredByMonth
    .filter(t => t.type === 'Saída')
    .reduce((acc, curr) => acc + curr.value, 0);

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const handleCurrentMonth = () => setViewDate(new Date());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTransaction({
      description: formData.description,
      value: parseFloat(formData.value),
      type: formData.type,
      date: new Date().toISOString(),
      status: 'Pago',
      category: formData.category
    });
    setFormData({ description: '', value: '', type: 'Saída', category: 'Geral' });
    setShowAddForm(false);
  };

  return (
    <div className="p-6 animate-reveal">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold cyber-font text-white uppercase tracking-tighter">Fluxo de Caixa</h1>
          <p className="text-slate-400">Controle total sobre o seu capital</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all border border-slate-700 flex items-center gap-2"
          >
            <BarChart3 size={20} />
            Gerar Relatório
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <Plus size={20} />
            {showAddForm ? 'Cancelar' : 'Novo Lançamento'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Wallet className="text-purple-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium">Saldo Atual</p>
          <h2 className="text-3xl font-bold mt-1">R$ {totalBalance.toLocaleString()}</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <TrendingUp className="text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">REALIZADO</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">Entradas</p>
          <h2 className="text-3xl font-bold mt-1 neon-text-green">R$ {realIncome.toLocaleString()}</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Clock className="text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">PREVISTO</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">Previsão</p>
          <h2 className="text-3xl font-bold mt-1 text-amber-400">R$ {pendingIncome.toLocaleString()}</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-rose-500/20 rounded-xl">
              <TrendingDown className="text-rose-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium">Saídas Mensais</p>
          <h2 className="text-3xl font-bold mt-1 neon-text-red">R$ {totalExpenses.toLocaleString()}</h2>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-8 bg-slate-900/50 border border-slate-800 p-4 rounded-3xl">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[var(--primary-color)] uppercase tracking-widest leading-none mb-1">Período de Análise</span>
            <span className="text-lg font-black text-white cyber-font tracking-tighter">{monthYearLabel}</span>
          </div>
          <button onClick={handleNextMonth} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
          <div className="flex items-center gap-4 order-2 sm:order-1">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Balanço do Mês</span>
              <span className={`text-sm font-black ${(realIncome - totalExpenses) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(realIncome - totalExpenses) >= 0 ? '+' : ''} R$ {(realIncome - totalExpenses).toLocaleString()}
              </span>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
              <Calendar size={18} />
            </div>
          </div>
          <div className="flex flex-col items-center min-w-[140px] w-full sm:w-auto order-1 sm:order-2">
            <div className="w-full flex justify-between text-[8px] font-black text-slate-500 uppercase mb-1">
              <span>Progresso Meta</span>
              <span>{Math.round(Math.min((realIncome / (monthlyGoal || 1)) * 100, 100))}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className="h-full bg-[var(--primary-color)] transition-all duration-1000"
                style={{ width: `${Math.min((realIncome / (monthlyGoal || 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-5 gap-4 items-end animate-in fade-in duration-300">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Descrição</label>
            <input
              required
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Aluguel, Internet..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Valor (R$)</label>
            <input
              required
              type="number"
              value={formData.value}
              onChange={e => setFormData({ ...formData, value: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Tipo</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as TransactionType })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="Saída">Saída</option>
              <option value="Entrada">Entrada</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition-all">
            Salvar
          </button>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
          <h3 className="font-bold cyber-font">Histórico de Transações</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-full pl-10 pr-4 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-widest font-bold border-b border-slate-800">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4 text-center">Cliente</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
                const linkedTask = tx.taskId ? tasks.find(t => t.id === tx.taskId) : null;
                const client = linkedTask ? clients.find(c => c.id === linkedTask.clientId) : null;

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${tx.type === 'Entrada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {tx.type === 'Entrada' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        </div>
                        {tx.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-center">
                      {client ? (
                        <div className="flex flex-col items-center">
                          <span className="text-slate-200 font-bold">{client.name}</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-tighter">{client.company}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Geral</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded">{tx.category}</span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${tx.type === 'Entrada' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'Entrada' ? '+' : '-'} R$ {tx.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${tx.status === 'Pago' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {linkedTask && (
                          <>
                            <button
                              onClick={() => onEditTask(linkedTask)}
                              title="Editar Demanda"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                            >
                              <PencilLine size={14} />
                            </button>
                            {client && (
                              <button
                                onClick={() => onViewClientNote(client)}
                                title="Ver Nota do Cliente"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--primary-color)] hover:brightness-125 rounded-lg transition-all"
                              >
                                <ExternalLink size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma transação registrada para este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showReportModal && (
        <FinancialReportModal
          transactions={transactions}
          clients={clients}
          tasks={tasks}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default FinanceDashboard;
