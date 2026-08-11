
import React, { useState, useMemo } from 'react';
import {
  Award,
  TrendingUp,
  Target,
  BarChart3,
  Clock,
  ChevronRight,
  Plus,
  TrendingDown
} from 'lucide-react';
import { UserStats, Task, Transaction, Client, Invoice, Reminder } from '@/types';
import { XP_PER_LEVEL } from '@/constants';
import FocusWidget from '@/features/dashboard/FocusWidget';
import OverdueAlert from '@/features/dashboard/OverdueAlert';
import { DashboardTab } from './types';

interface CommandCenterProps {
  stats: UserStats;
  tasks: Task[];
  transactions: Transaction[];
  clients: Client[];
  invoices: Invoice[];
  reminders: Reminder[];
  onNavigate: (tab: DashboardTab) => void;
  onOpenTaskModal: () => void;
  onOpenTransactionModal: () => void;
  onAddReminder: (text: string, date?: string, time?: string, alertBefore?: number) => void;
  onUpdateReminder: (id: string, text: string, date?: string, time?: string, alertBefore?: number) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

type ChartView = 'Semanal' | 'Mensal' | 'Anual';

const CommandCenter: React.FC<CommandCenterProps> = ({
  stats,
  tasks,
  transactions,
  clients,
  invoices,
  reminders,
  onNavigate,
  onOpenTaskModal,
  onOpenTransactionModal,
  onAddReminder,
  onUpdateReminder,
  onToggleReminder,
  onDeleteReminder
}) => {
  const [chartView, setChartView] = useState<ChartView>('Mensal');

  const monthlyIncome = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'Entrada' && t.status === 'Pago' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, curr) => acc + curr.value, 0);
  }, [transactions]);

  const annualIncome = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'Entrada' && t.status === 'Pago' && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, curr) => acc + curr.value, 0);
  }, [transactions]);

  const chartData = useMemo(() => {
    const now = new Date();
    const data: { label: string; realized: number; pending: number }[] = [];

    if (chartView === 'Semanal') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
        const periodTransactions = transactions.filter(t => {
          const td = new Date(t.date);
          return t.type === 'Entrada' &&
            td.getDate() === d.getDate() &&
            td.getMonth() === d.getMonth() &&
            td.getFullYear() === d.getFullYear();
        });

        const realized = periodTransactions.filter(t => t.status === 'Pago').reduce((acc, curr) => acc + curr.value, 0);
        const pending = periodTransactions.filter(t => t.status === 'Pendente').reduce((acc, curr) => acc + curr.value, 0);

        data.push({ label, realized, pending });
      }
    } else if (chartView === 'Mensal') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
        const periodTransactions = transactions.filter(t => {
          const td = new Date(t.date);
          return t.type === 'Entrada' &&
            td.getMonth() === d.getMonth() &&
            td.getFullYear() === d.getFullYear();
        });

        const realized = periodTransactions.filter(t => t.status === 'Pago').reduce((acc, curr) => acc + curr.value, 0);
        const pending = periodTransactions.filter(t => t.status === 'Pendente').reduce((acc, curr) => acc + curr.value, 0);

        data.push({ label, realized, pending });
      }
    } else {
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      for (let i = 0; i < 12; i++) {
        const periodTransactions = transactions.filter(t => {
          const td = new Date(t.date);
          return t.type === 'Entrada' &&
            td.getFullYear() === now.getFullYear() &&
            td.getMonth() === i;
        });

        const realized = periodTransactions.filter(t => t.status === 'Pago').reduce((acc, curr) => acc + curr.value, 0);
        const pending = periodTransactions.filter(t => t.status === 'Pendente').reduce((acc, curr) => acc + curr.value, 0);

        data.push({ label: months[i], realized, pending });
      }
    }
    return data;
  }, [transactions, chartView]);

  const maxChartValue = useMemo(() => {
    const values = chartData.map(d => d.realized + d.pending);
    const goal = chartView === 'Semanal' ? stats.weeklyGoal :
      chartView === 'Mensal' ? stats.monthlyGoal :
        stats.annualGoal;
    return Math.max(...values, goal || 1000);
  }, [chartData, chartView, stats]);

  const criticalTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'Concluído')
      .slice(0, 5);
  }, [tasks]);

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || 'Cliente Externo';

  const monthlyProgress = Math.min((monthlyIncome / (stats.monthlyGoal || 1)) * 100, 100);
  const annualProgress = Math.min((annualIncome / (stats.annualGoal || 1)) * 100, 100);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Overdue Client Alert */}
      <OverdueAlert
        clients={clients}
        invoices={invoices}
        overdueAlertDays={stats.overdueAlertDays ?? 30}
        onNavigateToClient={() => onNavigate('clients')}
      />
      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-reveal">
        {/* Quick Demand Addition Card */}
        <div className="bg-slate-900 border border-slate-800/60 p-6 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-[var(--primary-color)]/20 transition-all border-dashed">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--primary-color)]/10 rounded-xl flex items-center justify-center text-[var(--primary-color)] neon-shadow-primary/20">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Protocolo Rápido</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Nova demanda para sua agenda</p>
            </div>
          </div>
          <button
            onClick={onOpenTaskModal}
            className="w-full sm:w-auto bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 text-[var(--primary-color)] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all border border-[var(--primary-color)]/20"
          >
            Lançar Demanda
          </button>
        </div>

        {/* Quick Expense Addition Card */}
        <div className="bg-slate-900 border border-slate-800/60 p-6 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-rose-500/20 transition-all border-dashed">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 neon-shadow-rose/20">
              <TrendingDown size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Despesa Rápida</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Lançar saída financeira</p>
            </div>
          </div>
          <button
            onClick={onOpenTransactionModal}
            className="w-full sm:w-auto bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all border border-rose-500/20"
          >
            Lançar Despesa
          </button>
        </div>
      </div>

      <h1 className="text-xl md:text-3xl font-bold cyber-font text-[var(--primary-color)] uppercase animate-reveal delay-100">Centro de Comando</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & Evolution */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] neon-shadow-primary transition-all hover:border-[var(--primary-color)]/30 group animate-reveal delay-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-[var(--primary-color)]/20 rounded-xl transition-colors group-hover:bg-[var(--primary-color)]/30"><Award className="text-[var(--primary-color)]" size={24} /></div>
                <div><p className="text-slate-400 text-xs">Nível Atual</p><p className="text-xl font-bold">Protocolo {stats.level}</p></div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[var(--primary-color)] h-full transition-all duration-500" style={{ width: `${(stats.xp % XP_PER_LEVEL) / (XP_PER_LEVEL / 100)}%` }}></div>
              </div>
              <p className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">XP: {stats.xp % XP_PER_LEVEL} / {XP_PER_LEVEL}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] transition-all hover:border-emerald-500/30 group animate-reveal delay-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl transition-colors group-hover:bg-emerald-500/30"><TrendingUp className="text-emerald-400" size={24} /></div>
                <div><p className="text-slate-400 text-xs">Renda Mensal</p><p className="text-xl font-bold">R$ {monthlyIncome.toLocaleString('pt-BR')}</p></div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${monthlyProgress}%` }}></div>
              </div>
              <div className="flex justify-between mt-2">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Performance</p>
                <p className="text-[9px] text-emerald-500 font-black">{Math.round(monthlyProgress)}%</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] transition-all hover:border-blue-500/30 group animate-reveal delay-400">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl transition-colors group-hover:bg-blue-500/30"><Target className="text-blue-400" size={24} /></div>
                <div><p className="text-slate-400 text-xs">Anual</p><p className="text-xl font-bold">R$ {annualIncome.toLocaleString('pt-BR')}</p></div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${annualProgress}%` }}></div>
              </div>
              <p className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">Meta: R$ {stats.annualGoal?.toLocaleString()}</p>
            </div>
          </div>

          {/* Mapeamento Mensal */}
          <div className="bg-slate-900 border border-slate-800 p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-8 transition-all hover:border-[var(--primary-color)]/20 shadow-2xl animate-reveal delay-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-[10px] md:text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 size={16} className="text-[var(--primary-color)]" />
                  Fluxo Operacional
                </h3>
                <div className="flex items-center gap-3 md:gap-4 text-[7px] md:text-[8px] font-black uppercase tracking-tighter text-slate-500 mt-1">
                  <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[var(--primary-color)]" /> Realizado</span>
                  <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-700" /> Previsto</span>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 bg-slate-950/50 p-1 rounded-xl border border-slate-800/50 self-start sm:self-auto">
                {(['Semanal', 'Mensal', 'Anual'] as const).map(view => (
                  <button
                    key={view}
                    onClick={() => setChartView(view)}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${chartView === view ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-shadow)]' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative h-48 md:h-64 flex items-end justify-between gap-1 md:gap-4 px-1 md:px-2">
              {/* Linha de Meta */}
              {maxChartValue > 0 && (
                <div
                  className="absolute left-0 right-0 border-t border-[var(--primary-color)]/20 border-dashed z-0 transition-all duration-700 pointer-events-none"
                  style={{ bottom: `${((chartView === 'Semanal' ? stats.weeklyGoal : chartView === 'Mensal' ? stats.monthlyGoal : stats.annualGoal) / maxChartValue) * 100}%` }}
                >
                  <span className="absolute -top-4 right-0 text-[8px] font-black text-[var(--primary-color)] uppercase tracking-widest opacity-40">
                    Meta: R$ {(chartView === 'Semanal' ? stats.weeklyGoal : chartView === 'Mensal' ? stats.monthlyGoal : stats.annualGoal).toLocaleString()}
                  </span>
                </div>
              )}

              {chartData.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-4 group z-10">
                  <div className="relative w-full flex flex-col items-center justify-end h-full gap-[2px]">
                    {/* Tooltip */}
                    <div className="absolute -top-14 bg-slate-800 text-[10px] font-black px-3 py-2 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-all z-20 text-white whitespace-nowrap shadow-2xl translate-y-2 group-hover:translate-y-0 flex flex-col gap-1 pointer-events-none">
                      <span className="text-emerald-400">Pago: R$ {data.realized.toLocaleString()}</span>
                      {data.pending > 0 && <span className="text-slate-400">Pendente: R$ {data.pending.toLocaleString()}</span>}
                      <div className="border-t border-slate-700 mt-1 pt-1 flex justify-between gap-4">
                        <span>TOTAL:</span>
                        <span>R$ {(data.realized + data.pending).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Barra Previsto (Fundo/Sombra) */}
                    {data.pending > 0 && (
                      <div
                        className="w-full max-w-[40px] bg-slate-800 rounded-t-xl transition-all duration-700 border-x border-t border-slate-700/50"
                        style={{ height: `${(data.pending / maxChartValue) * 100}%`, minHeight: '1px' }}
                      />
                    )}

                    {/* Barra Realizado */}
                    <div
                      className="w-full max-w-[32px] md:max-w-[40px] bg-gradient-to-t from-[var(--primary-color)]/20 to-[var(--primary-color)] rounded-t-lg md:rounded-t-xl transition-all duration-700 group-hover:brightness-125 cursor-default relative overflow-hidden group-hover:shadow-[0_0_20px_var(--primary-shadow)]"
                      style={{ height: `${(data.realized / maxChartValue) * 100}%`, minHeight: '4px' }}
                    >
                      <div className="absolute inset-x-0 top-0 h-[1px] md:h-[2px] bg-white/30" />
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-20 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-[var(--primary-color)] transition-colors text-center leading-tight">
                    {data.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Demandas Próximas */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col transition-all hover:border-slate-700 animate-reveal delay-600">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-[var(--primary-color)]" />
                Protocolos Pendentes
              </h3>
              <button onClick={() => onNavigate('kanban')} className="text-[9px] font-black text-slate-500 hover:text-[var(--primary-color)] transition-colors flex items-center gap-1 uppercase tracking-widest">
                Expandir Agenda <ChevronRight size={12} />
              </button>
            </div>
            <div className="p-2 divide-y divide-slate-800/50">
              {criticalTasks.length > 0 ? criticalTasks.map(task => (
                <div key={task.id} className="p-4 hover:bg-slate-800/40 rounded-2xl transition-all flex items-center justify-between group">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest truncate">
                      {getClientName(task.clientId)}
                    </span>
                    <span className="text-sm font-bold text-slate-200 group-hover:text-white truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs font-black text-emerald-400">R$ {task.value.toLocaleString('pt-BR')}</p>
                    <p className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${task.status === 'Em Andamento' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                      {task.status}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-600 text-xs italic">Nenhuma demanda pendente no momento.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Protocolo Focus */}
        <div className="lg:col-span-4 space-y-8 animate-reveal delay-700">
          <FocusWidget
            reminders={reminders}
            onAddReminder={onAddReminder}
            onUpdateReminder={onUpdateReminder}
            onToggleReminder={onToggleReminder}
            onDeleteReminder={onDeleteReminder}
          />

          {stats.objectives && (
            <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary-color)] shadow-[0_0_10px_var(--primary-color)]" />
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Diretrizes Master</h3>
              <p className="text-slate-300 text-xs leading-relaxed italic">"{stats.objectives}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
