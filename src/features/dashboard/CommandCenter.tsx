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
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Overdue Client Alert */}
      <OverdueAlert
        clients={clients}
        invoices={invoices}
        overdueAlertDays={stats.overdueAlertDays ?? 30}
        onNavigateToClient={() => onNavigate('clients')}
      />

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-reveal">
        {/* Quick Demand Addition Card */}
        <div className="bg-slate-900/75 backdrop-blur-xl border border-slate-800/80 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-[var(--primary-color)]/40 hover:-translate-y-0.5 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/5 rounded-2xl flex items-center justify-center text-[var(--primary-color)] border border-[var(--primary-color)]/30 shadow-[0_0_15px_var(--primary-shadow)] group-hover:scale-105 transition-transform">
              <Plus size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest">Protocolo Rápido</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Nova demanda para sua agenda</p>
            </div>
          </div>
          <button
            onClick={onOpenTaskModal}
            className="w-full sm:w-auto bg-[var(--primary-color)] hover:brightness-110 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_var(--primary-shadow)] active:scale-95 cursor-pointer"
          >
            Lançar Demanda
          </button>
        </div>

        {/* Quick Expense Addition Card */}
        <div className="bg-slate-900/75 backdrop-blur-xl border border-slate-800/80 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-rose-500/40 hover:-translate-y-0.5 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500/20 to-rose-500/5 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)] group-hover:scale-105 transition-transform">
              <TrendingDown size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest">Despesa Rápida</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Lançar saída financeira</p>
            </div>
          </div>
          <button
            onClick={onOpenTransactionModal}
            className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(244,63,94,0.3)] active:scale-95 cursor-pointer"
          >
            Lançar Despesa
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between animate-reveal delay-100">
        <div>
          <h1 className="text-xl md:text-3xl font-black cyber-font text-white uppercase tracking-tight">
            Centro de Comando
          </h1>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Visão Executiva & Performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column: Stats & Evolution */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Level Card */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-6 rounded-[2rem] transition-all duration-300 hover:border-[var(--primary-color)]/40 hover:-translate-y-1 group animate-reveal delay-200 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-[var(--primary-color)]/15 border border-[var(--primary-color)]/30 rounded-2xl transition-transform group-hover:scale-105 shadow-[0_0_12px_var(--primary-shadow)]">
                  <Award className="text-[var(--primary-color)]" size={22} />
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Nível Atual</p>
                  <p className="text-xl font-black cyber-font text-white">Protocolo {stats.level}</p>
                </div>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color)]/80 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_var(--primary-color)]" 
                  style={{ width: `${(stats.xp % XP_PER_LEVEL) / (XP_PER_LEVEL / 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-2.5 font-black uppercase tracking-wider font-mono">XP: {stats.xp % XP_PER_LEVEL} / {XP_PER_LEVEL}</p>
            </div>

            {/* Monthly Income Card */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-6 rounded-[2rem] transition-all duration-300 hover:border-emerald-500/40 hover:-translate-y-1 group animate-reveal delay-300 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl transition-transform group-hover:scale-105 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <TrendingUp className="text-emerald-400" size={22} />
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Renda Mensal</p>
                  <p className="text-xl font-black cyber-font text-emerald-400">R$ {monthlyIncome.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                  style={{ width: `${monthlyProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2.5">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Performance</p>
                <p className="text-[9px] text-emerald-400 font-black cyber-font">{Math.round(monthlyProgress)}%</p>
              </div>
            </div>

            {/* Annual Goal Card */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-6 rounded-[2rem] transition-all duration-300 hover:border-cyan-500/40 hover:-translate-y-1 group animate-reveal delay-400 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-cyan-500/15 border border-cyan-500/30 rounded-2xl transition-transform group-hover:scale-105 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                  <Target className="text-cyan-400" size={22} />
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Anual</p>
                  <p className="text-xl font-black cyber-font text-cyan-400">R$ {annualIncome.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(6,182,212,0.4)]" 
                  style={{ width: `${annualProgress}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-2.5 font-black uppercase tracking-wider font-mono">Meta: R$ {stats.annualGoal?.toLocaleString()}</p>
            </div>
          </div>

          {/* Mapeamento Mensal / Fluxo Operacional */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-6 md:p-8 rounded-[2.5rem] space-y-6 md:space-y-8 transition-all hover:border-slate-700/80 shadow-[0_12px_36px_rgba(0,0,0,0.35)] animate-reveal delay-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-xs md:text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2.5">
                  <BarChart3 size={18} className="text-[var(--primary-color)]" />
                  Fluxo Operacional
                </h3>
                <div className="flex items-center gap-4 text-[8px] md:text-[9px] font-black uppercase tracking-wider text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--primary-color)] shadow-[0_0_6px_var(--primary-color)]" /> Realizado</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-700" /> Previsto</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto shadow-inner">
                {(['Semanal', 'Mensal', 'Anual'] as const).map(view => (
                  <button
                    key={view}
                    onClick={() => setChartView(view)}
                    className={`px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 cursor-pointer ${
                      chartView === view 
                        ? 'bg-[var(--primary-color)] text-white shadow-[0_2px_12px_var(--primary-shadow)]' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative h-48 md:h-64 flex items-end justify-between gap-2 md:gap-4 px-2">
              {/* Linha de Meta */}
              {maxChartValue > 0 && (
                <div
                  className="absolute left-0 right-0 border-t border-[var(--primary-color)]/25 border-dashed z-0 transition-all duration-700 pointer-events-none"
                  style={{ bottom: `${((chartView === 'Semanal' ? stats.weeklyGoal : chartView === 'Mensal' ? stats.monthlyGoal : stats.annualGoal) / maxChartValue) * 100}%` }}
                >
                  <span className="absolute -top-4 right-0 text-[8px] font-black text-[var(--primary-color)] uppercase tracking-widest opacity-60">
                    Meta: R$ {(chartView === 'Semanal' ? stats.weeklyGoal : chartView === 'Mensal' ? stats.monthlyGoal : stats.annualGoal).toLocaleString()}
                  </span>
                </div>
              )}

              {chartData.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group z-10">
                  <div className="relative w-full flex flex-col items-center justify-end h-full gap-1">
                    {/* Tooltip */}
                    <div className="absolute -top-16 bg-slate-900/95 backdrop-blur-md text-[10px] font-black px-3.5 py-2.5 rounded-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-all z-20 text-white whitespace-nowrap shadow-2xl translate-y-2 group-hover:translate-y-0 flex flex-col gap-1 pointer-events-none">
                      <span className="text-emerald-400 cyber-font">Pago: R$ {data.realized.toLocaleString()}</span>
                      {data.pending > 0 && <span className="text-amber-400 cyber-font">Pendente: R$ {data.pending.toLocaleString()}</span>}
                      <div className="border-t border-slate-700/80 mt-1 pt-1 flex justify-between gap-4 font-mono">
                        <span className="text-slate-400">TOTAL:</span>
                        <span className="text-white">R$ {(data.realized + data.pending).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Barra Previsto */}
                    {data.pending > 0 && (
                      <div
                        className="w-full max-w-[36px] bg-slate-800/90 rounded-t-xl transition-all duration-700 border-x border-t border-slate-700/60"
                        style={{ height: `${(data.pending / maxChartValue) * 100}%`, minHeight: '2px' }}
                      />
                    )}

                    {/* Barra Realizado */}
                    <div
                      className="w-full max-w-[32px] md:max-w-[38px] bg-gradient-to-t from-[var(--primary-color)]/30 to-[var(--primary-color)] rounded-t-xl transition-all duration-700 group-hover:brightness-125 cursor-default relative overflow-hidden group-hover:shadow-[0_0_24px_var(--primary-shadow)]"
                      style={{ height: `${(data.realized / maxChartValue) * 100}%`, minHeight: '6px' }}
                    >
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-white/40" />
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-20 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[var(--primary-color)] transition-colors text-center leading-tight">
                    {data.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Demandas Próximas */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-[2.5rem] overflow-hidden flex flex-col transition-all hover:border-slate-700/80 shadow-[0_12px_36px_rgba(0,0,0,0.3)] animate-reveal delay-600">
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-[var(--primary-color)]" />
                Protocolos Pendentes
              </h3>
              <button 
                onClick={() => onNavigate('kanban')} 
                className="text-[9px] font-black text-slate-400 hover:text-[var(--primary-color)] transition-colors flex items-center gap-1 uppercase tracking-widest cursor-pointer"
              >
                Expandir Agenda <ChevronRight size={12} />
              </button>
            </div>
            <div className="p-3 divide-y divide-slate-800/50">
              {criticalTasks.length > 0 ? criticalTasks.map(task => (
                <div key={task.id} className="p-4 hover:bg-slate-800/50 rounded-2xl transition-all flex items-center justify-between group">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest truncate">
                      {getClientName(task.clientId)}
                    </span>
                    <span className="text-sm font-bold text-slate-100 group-hover:text-[var(--primary-color)] transition-colors truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs font-black text-emerald-400 cyber-font">
                      {task.category === 'Demanda Rápida' ? 'Lembrete' : `R$ ${task.value.toLocaleString('pt-BR')}`}
                    </p>
                    <p className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${
                      task.status === 'Em Andamento' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                    }`}>
                      {task.status}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-500 text-xs italic">Nenhuma demanda pendente no momento.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Protocolo Focus */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8 animate-reveal delay-700">
          <FocusWidget
            reminders={reminders}
            onAddReminder={onAddReminder}
            onUpdateReminder={onUpdateReminder}
            onToggleReminder={onToggleReminder}
            onDeleteReminder={onDeleteReminder}
          />

          {stats.objectives && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--primary-color)] shadow-[0_0_12px_var(--primary-color)]" />
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Diretrizes Master</h3>
              <p className="text-slate-200 text-xs leading-relaxed italic">"{stats.objectives}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
