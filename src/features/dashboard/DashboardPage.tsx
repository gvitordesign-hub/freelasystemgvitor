import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast, errorMessage } from '@/context/ToastContext';
import type { ReceiptResult } from '@/components/modals/ReceiptModal';
import { Menu, Clock, Loader2, LayoutDashboard, Trophy, DollarSign, Users, Plus } from 'lucide-react';
import { Client, Task, AppState, Status, UserStats, Transaction, DayOfWeek, Budget, Service, Invoice, Reminder, Holiday } from '@/types';
import { INITIAL_STATE, XP_PER_TASK, XP_PER_CLIENT, XP_PER_LEVEL, XP_DAILY_BRIEFING } from '@/constants';
import { db } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import GamificationBar from '@/features/dashboard/GamificationBar';
import Sidebar from '@/features/dashboard/Sidebar';
import { DashboardTab } from '@/features/dashboard/types';
import SystemLoader from '@/components/common/SystemLoader';
import { getLocalDateString, isSameMonthAndYear } from '@/utils/dateUtils';

// Code-splitting: features e modais só são carregados quando usados
const KanbanBoard = lazy(() => import('@/features/kanban/KanbanBoard'));
const FinanceDashboard = lazy(() => import('@/features/finance/FinanceDashboard'));
const ClientManagement = lazy(() => import('@/features/clients/ClientManagement'));
const SettingsView = lazy(() => import('@/features/settings/SettingsView'));
const BudgetBuilder = lazy(() => import('@/features/budgets/BudgetBuilder'));
const CommandCenter = lazy(() => import('@/features/dashboard/CommandCenter'));
const TaskModal = lazy(() => import('@/components/modals/TaskModal'));
const QuickTaskModal = lazy(() => import('@/components/modals/QuickTaskModal'));
const PaymentModal = lazy(() => import('@/components/modals/PaymentModal'));
const ProjectNoteModal = lazy(() => import('@/components/modals/ProjectNoteModal'));
const BriefingModal = lazy(() => import('@/components/modals/BriefingModal'));
const TransactionModal = lazy(() => import('@/components/modals/TransactionModal'));

// Cada aba tem seu endereço: atualizar a página (F5) mantém a tela e os links funcionam
export const TAB_PATHS: Record<DashboardTab, string> = {
  dashboard: '/dashboard',
  kanban: '/agenda',
  finance: '/financeiro',
  budgets: '/propostas',
  clients: '/clientes',
  settings: '/configuracoes'
};
const tabFromPath = (pathname: string): DashboardTab => {
  const hit = (Object.entries(TAB_PATHS) as [DashboardTab, string][]).find(([, path]) => pathname.startsWith(path));
  return hit ? hit[0] : 'dashboard';
};

const SuspenseFallback: React.FC = () => (
  <SystemLoader compact message="Carregando módulo..." fullScreen={false} />
);

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = tabFromPath(location.pathname);
  const setActiveTab = useCallback((tab: DashboardTab) => navigate(TAB_PATHS[tab]), [navigate]);
  const [isPublicView, setIsPublicView] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Sempre aponta para o estado mais recente (evita closures velhas em callbacks async)
  const stateRef = useRef<AppState>(state);
  stateRef.current = state;
  // Descarta respostas antigas: só a requisição mais nova pode atualizar a tela
  const requestSeq = useRef(0);

  const fetchData = useCallback(async (isSilent = false) => {
    const userId = user?.id;
    if (!userId) return;
    const seq = ++requestSeq.current;
    if (!isSilent) setSyncStatus('syncing');
    try {
      const [
        clientsRes,
        tasksRes,
        transactionsRes,
        servicesRes,
        invoicesRes,
        remindersRes,
        budgetsRes,
        albumsRes,
        statsRes,
        holidaysRes
      ] = await Promise.allSettled([
        db.clients.list(),
        db.tasks.list(),
        db.transactions.list(),
        db.services.list(),
        db.invoices.list(),
        db.reminders.list(),
        db.budgets.list(),
        db.albums.list(),
        db.settings.get(),
        db.holidays.list()
      ]);

      // Uma requisição mais nova já está em andamento/terminou: ignora esta
      if (seq !== requestSeq.current) return;

      const all = [clientsRes, tasksRes, transactionsRes, servicesRes, invoicesRes, remindersRes, budgetsRes, albumsRes, statsRes, holidaysRes];
      const failed = all.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
      failed.forEach(r => console.error('Falha ao carregar tabela:', r.reason));

      // Tabela que falhou mantém os dados anteriores (nunca vira lista vazia)
      setState(prev => ({
        clients: clientsRes.status === 'fulfilled' ? clientsRes.value : prev.clients,
        tasks: tasksRes.status === 'fulfilled' ? tasksRes.value : prev.tasks,
        transactions: transactionsRes.status === 'fulfilled' ? transactionsRes.value : prev.transactions,
        services: servicesRes.status === 'fulfilled' ? servicesRes.value : prev.services,
        invoices: invoicesRes.status === 'fulfilled' ? invoicesRes.value : prev.invoices,
        reminders: remindersRes.status === 'fulfilled' ? remindersRes.value : prev.reminders,
        budgets: budgetsRes.status === 'fulfilled' ? budgetsRes.value : prev.budgets,
        albums: albumsRes.status === 'fulfilled' ? albumsRes.value : prev.albums,
        stats: statsRes.status === 'fulfilled' && statsRes.value ? statsRes.value : (prev.stats || INITIAL_STATE.stats),
        holidays: holidaysRes.status === 'fulfilled' ? holidaysRes.value : prev.holidays
      }));
      setSyncStatus(failed.length > 0 ? 'error' : 'synced');
      if (failed.length === 0) setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      setSyncStatus('error');
    } finally {
      setIsInitialLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sincronização em tempo real:
  // - Supabase Realtime por tabela (filtrado pelo usuário), com debounce de 500 ms
  // - Recarrega ao voltar o foco / a conexão (sem polling fixo)
  useEffect(() => {
    if (!user) return;

    let active = true;
    let debounceTimer: any = null;
    let reconnectTimer: any = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const scheduleFetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (active) fetchData(true);
      }, 500);
    };

    const REALTIME_TABLES = ['clients', 'tasks', 'transactions', 'invoices', 'user_settings', 'services', 'budgets', 'reminders'];

    const setupRealtime = () => {
      const ch = supabase.channel(`gvitor-sync-${user.id}-${Date.now()}`);
      REALTIME_TABLES.forEach(table => {
        ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${user.id}` }, scheduleFetch);
      });
      ch.subscribe((status) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          setSyncStatus('synced');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setSyncStatus('error');
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (!active) return;
            supabase.removeChannel(ch);
            channel = setupRealtime();
            fetchData(true);
          }, 4000);
        }
      });
      return ch;
    };

    channel = setupRealtime();

    const handleSyncEvent = () => {
      if (document.visibilityState === 'visible' && active) fetchData(true);
    };
    document.addEventListener('visibilitychange', handleSyncEvent);
    window.addEventListener('focus', handleSyncEvent);
    window.addEventListener('online', handleSyncEvent);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
      clearTimeout(reconnectTimer);
      document.removeEventListener('visibilitychange', handleSyncEvent);
      window.removeEventListener('focus', handleSyncEvent);
      window.removeEventListener('online', handleSyncEvent);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedClientForInvoice, setSelectedClientForInvoice] = useState<Client | null>(null);
  const [pendingPaymentTask, setPendingPaymentTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
  });

  const { weeklyIncome, weeklyPendingIncome, weekLabel } = useMemo(() => {
    const start = new Date(selectedWeekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedWeekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const weekDateStrings = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(selectedWeekStart);
      d.setDate(d.getDate() + i);
      weekDateStrings.add(d.toLocaleDateString('en-CA'));
    }

    const isCurrentCalendarWeek = (() => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const nowDay = now.getDay();
      const diff = (nowDay === 0 ? -6 : 1) - nowDay;
      const thisMonday = new Date(now);
      thisMonday.setDate(thisMonday.getDate() + diff);
      return thisMonday.getTime() === start.getTime();
    })();

    // 1. Transactions in this week (type === 'Entrada')
    const weekTransactions = state.transactions.filter(t => {
      if (t.type !== 'Entrada') return false;
      if (!t.date) return false;
      const dateOnly = t.date.split('T')[0];
      return weekDateStrings.has(dateOnly);
    });

    const txReceived = weekTransactions
      .filter(t => t.status === 'Pago')
      .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    const txPending = weekTransactions
      .filter(t => t.status === 'Pendente')
      .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    // 2. Tasks in this week
    const linkedTxTaskIds = new Set(state.transactions.filter(tx => tx.taskId && tx.type === 'Entrada').map(tx => tx.taskId));

    const weekTasks = state.tasks.filter(t => {
      if (t.date) {
        return weekDateStrings.has(t.date.split('T')[0]);
      }
      if (isCurrentCalendarWeek && t.day) {
        return true;
      }
      return false;
    });

    const tasksReceived = weekTasks
      .filter(t => t.status === 'Concluído' && !linkedTxTaskIds.has(t.id))
      .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    const startLabel = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
    const endLabel = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();

    return {
      weeklyIncome: txReceived + tasksReceived,
      weeklyPendingIncome: txPending,
      weekLabel: `${startLabel} - ${endLabel}`
    };
  }, [selectedWeekStart, state.transactions, state.tasks]);

  const monthlyIncome = useMemo(() => {
    const now = new Date();
    return state.transactions
      .filter(t => t.type === 'Entrada' && t.status === 'Pago' && isSameMonthAndYear(t.date, now))
      .reduce((acc, curr) => acc + curr.value, 0);
  }, [state.transactions]);

  const monthlyPendingIncome = useMemo(() => {
    const now = new Date();
    return state.transactions
      .filter(t => t.type === 'Entrada' && t.status === 'Pendente' && isSameMonthAndYear(t.date, now))
      .reduce((acc, curr) => acc + curr.value, 0);
  }, [state.transactions]);

  const criticalTasks = useMemo(() => {
    return state.tasks
      .filter(t => t.status !== 'Concluído')
      .slice(0, 5);
  }, [state.tasks]);

  const pendingPayments = useMemo(() => {
    return state.transactions.filter(t => t.status === 'Pendente' && t.type === 'Saída');
  }, [state.transactions]);

  // Briefing Daily Trigger
  useEffect(() => {
    const today = getLocalDateString();
    if (state.stats.lastBriefingDate !== today) {
      setShowBriefing(true);
    }
  }, [state.stats.lastBriefingDate]);

  useEffect(() => {
    const root = document.documentElement;
    const colors = {
      purple: { primary: '#a855f7', shadow: 'rgba(168, 85, 247, 0.4)' },
      emerald: { primary: '#10b981', shadow: 'rgba(16, 185, 129, 0.4)' },
      cyan: { primary: '#06b6d4', shadow: 'rgba(6, 182, 212, 0.4)' },
      rose: { primary: '#f43f5e', shadow: 'rgba(244, 63, 94, 0.4)' }
    };
    const theme = colors[state.stats.themeColor] || colors.purple;
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--primary-shadow', theme.shadow);
  }, [state.stats.themeColor]);

  const addXP = useCallback((amount: number) => {
    const prevStats = stateRef.current.stats;
    const newXP = prevStats.xp + amount;
    const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
    // Atualiza o ref já, para chamadas em sequência acumularem corretamente
    stateRef.current = { ...stateRef.current, stats: { ...prevStats, xp: newXP, level: newLevel } };
    setState(prev => ({ ...prev, stats: { ...prev.stats, xp: newXP, level: newLevel } }));
    db.settings.update({ xp: newXP, level: newLevel }).catch(e => console.error('Error updating XP:', e));
  }, []);

  const handleStartDay = () => {
    const today = getLocalDateString();
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        lastBriefingDate: today
      }
    }));
    addXP(XP_DAILY_BRIEFING);
    setShowBriefing(false);
  };

  /* Logic for checking reminders */
  const [activeAlert, setActiveAlert] = useState<Reminder | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      state.reminders.forEach(reminder => {
        if (reminder.completed || !reminder.date || !reminder.time || !reminder.alertBefore) return;

        const [year, month, day] = reminder.date.split('-').map(Number);
        const [hours, minutes] = reminder.time.split(':').map(Number);

        // Create date in local time
        const reminderDate = new Date(year, month - 1, day, hours, minutes);

        // Adjust for "alertBefore"
        const alertTime = new Date(reminderDate.getTime() - reminder.alertBefore * 60000);

        // Check if now is within the same minute as alertTime (or slightly after, to be safe)
        // Using a 60s window
        const diff = now.getTime() - alertTime.getTime();

        if (diff >= 0 && diff < 60000) {
          // Simple debounce: don't show if already showing this one (optional, but good)
          if (activeAlert?.id === reminder.id) return;

          setActiveAlert(reminder);
          // Optional: Browser notification
          if (Notification.permission === 'granted') {
            new Notification('Lembrete FRELLA SYSTEM', { body: reminder.text });
          }
        }
      });
    }, 10000); // Check every 10 seconds for better responsiveness

    return () => clearInterval(interval);
  }, [state.reminders, activeAlert]);

  const addReminder = async (text: string, date?: string, time?: string, alertBefore?: number) => {
    const type = text.toUpperCase().includes('R$') || text.includes('$') ? 'finance' : 'task';
    try {
      const newReminder = await db.reminders.create({
        text,
        type,
        completed: false,
        date: date || null,
        time: time || null,
        alertBefore: alertBefore || 0
      });
      setState(prev => ({ ...prev, reminders: [newReminder, ...prev.reminders] }));
    } catch (e) {
      console.error('Error adding reminder:', e);
    }
  };

  const updateReminder = async (id: string, text: string, date?: string, time?: string, alertBefore?: number) => {
    try {
      const result = await db.reminders.update(id, { text, date, time, alertBefore });
      setState(prev => ({
        ...prev,
        reminders: prev.reminders.map(r => r.id === id ? result : r)
      }));
    } catch (e) {
      console.error('Error updating reminder:', e);
    }
  };

  const toggleReminder = async (id: string) => {
    const reminder = state.reminders.find(r => r.id === id);
    if (!reminder) return;
    try {
      const result = await db.reminders.update(id, { completed: !reminder.completed });
      setState(prev => ({
        ...prev,
        reminders: prev.reminders.map(r => r.id === id ? result : r)
      }));
    } catch (e) {
      console.error('Error toggling reminder:', e);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await db.reminders.delete(id);
      setState(prev => ({
        ...prev,
        reminders: prev.reminders.filter(r => r.id !== id)
      }));
    } catch (e) {
      console.error('Error deleting reminder:', e);
    }
  };

  const addClient = useCallback(async (client: Omit<Client, 'id'>) => {
    try {
      const newClient = await db.clients.create(client);
      setState(prev => ({ ...prev, clients: [...prev.clients, newClient] }));
      addXP(XP_PER_CLIENT);
      return newClient.id;
    } catch (e) {
      console.error('Error adding client:', e);
      return '';
    }
  }, [addXP]);

  const updateClient = useCallback(async (id: string, updated: Partial<Client>) => {
    try {
      const result = await db.clients.update(id, updated);
      setState(prev => ({
        ...prev,
        clients: prev.clients.map(c => c.id === id ? { ...c, ...result } : c)
      }));
    } catch (e) {
      console.error('Error updating client:', e);
    }
  }, []);

  const deleteClient = useCallback(async (id: string) => {
    try {
      await db.clients.delete(id);
      setState(prev => ({
        ...prev,
        clients: prev.clients.filter(c => c.id !== id),
        tasks: prev.tasks.map(t => t.clientId === id ? { ...t, clientId: undefined } : t),
        invoices: prev.invoices.map(i => i.clientId === id ? { ...i, clientId: undefined } : i),
        budgets: prev.budgets.filter(b => b.clientId !== id)
      }));
      setLastSyncTime(new Date());
    } catch (e: any) {
      console.error('Error deleting client:', e);
      throw e;
    }
  }, []);

  const addInvoice = useCallback(async (invoice: Omit<Invoice, 'id'>) => {
    try {
      const newInvoice = await db.invoices.create(invoice);
      setState(prev => {
        if (prev.invoices.some(i => i.id === newInvoice.id)) {
          return prev;
        }
        return { ...prev, invoices: [...prev.invoices, newInvoice] };
      });
      return newInvoice.id;
    } catch (e) {
      console.error('Error adding invoice:', e);
      return '';
    }
  }, []);

  /**
   * Regra única de pagamento: a nota é a fonte da verdade.
   * - Campos de cadastro (título, observações, valor total) são gravados só se mudaram.
   * - Pendente → Pago: db.invoices.pay() (nota + tarefas + caixa, atômico no banco).
   * - Pago → Pendente: db.invoices.reopen().
   * Editar observações NUNCA mexe nas transações.
   */
  const updateInvoice = useCallback(async (updated: Invoice, opts?: { method?: string }) => {
    const current = stateRef.current.invoices.find(i => i.id === updated.id);
    if (!current) return;

    const norm = (v?: number | null) => (v === undefined || v === null ? null : Number(v));
    const patch: Partial<Invoice> = {};
    if (updated.title !== current.title) patch.title = updated.title;
    if ((updated.notes || '') !== (current.notes || '')) patch.notes = updated.notes;
    const customChanged = norm(updated.customValue) !== norm(current.customValue);
    if (customChanged) patch.customValue = norm(updated.customValue);

    const wasPaid = current.status === 'Pago';
    const willBePaid = updated.status === 'Pago';
    const payNow = willBePaid && !wasPaid;
    const reopenNow = !willBePaid && wasPaid;
    const repay = willBePaid && wasPaid && customChanged; // valor total mudou numa nota já paga

    if (Object.keys(patch).length === 0 && !payNow && !reopenNow) return;

    // Atualização otimista dos campos de cadastro
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.map(i => i.id === updated.id
        ? { ...i, ...patch, ...(payNow ? { status: 'Pago' as const, paidAt: updated.paidAt || new Date().toISOString() } : {}), ...(reopenNow ? { status: 'Pendente' as const, paidAt: null } : {}) }
        : i)
    }));

    try {
      if (Object.keys(patch).length > 0) {
        await db.invoices.update(updated.id, patch);
      }
      if (payNow || repay) {
        const paidDate = getLocalDateString(updated.paidAt ? new Date(updated.paidAt) : new Date());
        await db.invoices.pay(updated.id, paidDate, opts?.method);
        toast.success(repay ? 'Valor da nota atualizado e caixa reajustado.' : 'Nota quitada e lançada no caixa.');
      } else if (reopenNow) {
        await db.invoices.reopen(updated.id);
        toast.success('Nota reaberta. Lançamentos voltaram para pendente.');
      }
    } catch (e) {
      console.error('Error updating invoice:', e);
      toast.error(errorMessage(e, 'Não foi possível atualizar a nota.'), () => updateInvoice(updated, opts));
    } finally {
      // Fonte da verdade: recarrega do banco (desfaz o otimismo se algo falhou)
      fetchData(true);
    }
  }, [fetchData, toast]);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    try {
      const finalInvoiceId = task.invoiceId;

      const initialStatus = task.status;
      // If task is created as Concluído, we'll create it as Pendente first and trigger the payment confirmation modal to set it correctly
      const taskToCreate = {
        ...task,
        invoiceId: finalInvoiceId || undefined,
        status: initialStatus === 'Concluído' ? 'Pendente' : initialStatus
      };
      const newTask = await db.tasks.create(taskToCreate);

      setState(prev => {
        if (prev.tasks.some(t => t.id === newTask.id)) {
          return prev;
        }
        return { ...prev, tasks: [...prev.tasks, newTask] };
      });

      if (initialStatus === 'Concluído') {
        setPendingPaymentTask(newTask);
      }
    } catch (e) {
      console.error('Error adding task:', e);
      toast.error(errorMessage(e, 'Não foi possível criar a demanda.'));
    }
  }, [toast]);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    try {
      const newTx = await db.transactions.create(tx);
      setState(prev => ({
        ...prev,
        transactions: [...prev.transactions, newTx]
      }));
      toast.success('Lançamento registrado.');
    } catch (e) {
      console.error('Error adding transaction:', e);
      toast.error(errorMessage(e, 'Não foi possível registrar o lançamento.'), () => addTransaction(tx));
    }
  }, [toast]);

  const updateTransaction = useCallback(async (id: string, patch: Partial<Transaction>) => {
    try {
      const saved = await db.transactions.update(id, patch);
      setState(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === id ? saved : t) }));
      toast.success('Lançamento atualizado.');
    } catch (e) {
      console.error('Error updating transaction:', e);
      toast.error(errorMessage(e, 'Não foi possível atualizar o lançamento.'), () => updateTransaction(id, patch));
      fetchData(true);
    }
  }, [toast, fetchData]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await db.transactions.delete(id);
      setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
      toast.success('Lançamento excluído.');
    } catch (e) {
      console.error('Error deleting transaction:', e);
      toast.error(errorMessage(e, 'Não foi possível excluir o lançamento.'));
      fetchData(true);
    }
  }, [toast, fetchData]);

  /** Abatimento: pagamento parcial; entra no caixa e a nota segue pendente. */
  const addAbatement = useCallback(async (invoice: Invoice, amount: number, date: string, method: string) => {
    try {
      const client = stateRef.current.clients.find(c => c.id === invoice.clientId);
      const label = client ? (client.company || client.name) : '';
      const newTx = await db.transactions.create({
        description: `Abatimento: ${invoice.title}${label ? ` (${label})` : ''}`,
        value: amount,
        type: 'Entrada',
        date,
        status: 'Pago',
        category: 'Serviço',
        invoiceId: invoice.id,
        method,
        abatement: true
      });
      setState(prev => ({ ...prev, transactions: [...prev.transactions, newTx] }));
      toast.success('Abatimento registrado no caixa. A nota segue pendente.');
    } catch (e) {
      console.error('Error adding abatement:', e);
      toast.error(errorMessage(e, 'Não foi possível registrar o abatimento.'));
    }
  }, [toast]);

  const updateTask = useCallback(async (taskId: string, updatedTask: Omit<Task, 'id'> | Partial<Task>) => {
    try {
      const taskBefore = state.tasks.find(t => t.id === taskId);
      if (!taskBefore) return;

      const mergedTask = { ...taskBefore, ...updatedTask };
      const finalInvoiceId = mergedTask.invoiceId;

      const isConcluding = taskBefore.status !== 'Concluído' && mergedTask.status === 'Concluído';

      const taskToSave: Partial<Task> = { ...mergedTask, invoiceId: finalInvoiceId || undefined };
      if (isConcluding) {
        taskToSave.status = taskBefore.status;
      }

      // Optimistic state update: UI responds immediately
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updatedTask } : t)
      }));

      const result = await db.tasks.update(taskId, taskToSave);

      // Mantém o lançamento vinculado em sincronia (efeito colateral fora do setState)
      const linkedTx = stateRef.current.transactions.find(tx => tx.taskId === taskId && tx.type === 'Entrada');
      const newDescription = `Serviço: ${mergedTask.title}`;
      let syncedTx: Transaction | null = null;
      if (linkedTx && (linkedTx.value !== mergedTask.value || linkedTx.description !== newDescription)) {
        syncedTx = await db.transactions.update(linkedTx.id, {
          value: mergedTask.value,
          description: newDescription,
          category: mergedTask.category || linkedTx.category
        });
      }

      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? result : t),
        transactions: syncedTx ? prev.transactions.map(tx => tx.id === syncedTx!.id ? syncedTx! : tx) : prev.transactions
      }));

      if (isConcluding) {
        setPendingPaymentTask(result);
      }
    } catch (e) {
      console.error('Error updating task:', e);
      toast.error(errorMessage(e, 'Não foi possível salvar a demanda.'));
      fetchData(true);
    }
  }, [state.tasks, state.transactions, fetchData, toast]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      // Lançamentos ainda não pagos da tarefa saem junto; os pagos ficam como histórico
      const unpaid = stateRef.current.transactions.filter(tx => tx.taskId === taskId && tx.status !== 'Pago');
      await Promise.all(unpaid.map(tx => db.transactions.delete(tx.id)));
      await db.tasks.delete(taskId);
      const unpaidIds = new Set(unpaid.map(tx => tx.id));
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId),
        transactions: prev.transactions
          .filter(tx => !unpaidIds.has(tx.id))
          .map(tx => tx.taskId === taskId ? { ...tx, taskId: undefined } : tx)
      }));
      toast.success('Demanda excluída.');
    } catch (e) {
      console.error('Error deleting task:', e);
      toast.error(errorMessage(e, 'Não foi possível excluir a demanda.'));
      fetchData(true);
    }
  }, [fetchData, toast]);

  const moveTask = useCallback(async (taskId: string, day: DayOfWeek, date?: string, newPosition?: number) => {
    try {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;

      const targetDate = date || task.date;
      const sameColumn = task.day === day && task.date === targetDate;

      let updatedTasks = [...state.tasks];
      const tasksInCol = updatedTasks
        .filter(t => t.day === day && (date ? t.date === date : true))
        .sort((a, b) => a.position - b.position);

      if (newPosition !== undefined) {
        // Remove task from its current position
        const filteredTasks = tasksInCol.filter(t => t.id !== taskId);
        // Insert at new position
        filteredTasks.splice(newPosition, 0, { ...task, day, date: targetDate, position: newPosition });

        // Update positions for all tasks in this column
        const updates = filteredTasks.map((t, idx) => {
          const newPos = idx;
          if (t.id === taskId) {
            return db.tasks.update(t.id, { day, date: targetDate, position: newPos });
          } else if (t.position !== newPos) {
            return db.tasks.update(t.id, { position: newPos });
          }
          return null;
        }).filter(Boolean);

        await Promise.all(updates);
      } else {
        const result = await db.tasks.update(taskId, { day, date: date || undefined });
        updatedTasks = updatedTasks.map(t => t.id === taskId ? result : t);
      }

      // Refresh data to ensure state is in sync with DB positions
      fetchData();
    } catch (e) {
      console.error('Error moving task:', e);
    }
  }, [state.tasks, fetchData]);

  const updateTaskStatus = useCallback(async (taskId: string, status: Status) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (status === 'Concluído') {
      setPendingPaymentTask(task);
    } else {
      try {
        const result = await db.tasks.update(taskId, { status });

        // Remove apenas transações NÃO pagas vinculadas (dados financeiros pagos são preservados)
        const pendingTxs = state.transactions.filter(tx => tx.taskId === taskId && tx.status !== 'Pago');
        if (pendingTxs.length > 0) {
          await Promise.all(pendingTxs.map(tx => db.transactions.delete(tx.id)));
        }

        setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === taskId ? result : t),
          transactions: prev.transactions.filter(tx => !(tx.taskId === taskId && tx.status !== 'Pago'))
        }));
      } catch (e) {
        console.error('Error updating task status:', e);
      }
    }
  }, [state.tasks, state.transactions]);

  const handleConfirmPayment = async (received: boolean, receipt?: ReceiptResult) => {
    if (!pendingPaymentTask) return;

    const task = pendingPaymentTask;
    setPendingPaymentTask(null);
    addXP(XP_PER_TASK);

    const today = receipt?.date || getLocalDateString();
    const method = receipt?.method;

    try {
      await db.tasks.update(task.id, { status: 'Concluído' });

      // Consulta fresca ao banco (não usa estado velho) + índice único = sem duplicatas
      const existing = await db.transactions.findEntradaByTask(task.id);
      if (existing) {
        await db.transactions.update(existing.id, {
          status: received ? 'Pago' : 'Pendente',
          date: received ? today : existing.date,
          invoiceId: task.invoiceId ?? existing.invoiceId,
          ...(received && method ? { method } : {})
        });
      } else if (task.value > 0) {
        await db.transactions.create({
          description: `Serviço: ${task.title}`,
          value: task.value,
          type: 'Entrada',
          date: today,
          status: received ? 'Pago' : 'Pendente',
          category: task.category || 'Serviço',
          taskId: task.id,
          invoiceId: task.invoiceId,
          method: received ? method : undefined
        });
      }

      // Se este foi o último recebimento da nota, quita a nota também (Notas e Caixa sempre iguais)
      if (received && task.invoiceId) {
        const inv = stateRef.current.invoices.find(i => i.id === task.invoiceId);
        if (inv && inv.status !== 'Pago' && await db.invoices.isFullyReceived(task.invoiceId)) {
          await db.invoices.pay(task.invoiceId, today, method);
          toast.success('Recebimento registrado. Todas as demandas da nota foram pagas: nota quitada.');
        } else {
          toast.success(received ? 'Recebimento registrado no caixa.' : 'Demanda concluída; recebimento previsto no caixa.');
        }
      } else {
        toast.success(received ? 'Recebimento registrado no caixa.' : 'Demanda concluída; recebimento previsto no caixa.');
      }
    } catch (e) {
      console.error('Error confirming payment:', e);
      toast.error(errorMessage(e, 'Não foi possível registrar o recebimento.'));
    } finally {
      fetchData(true);
    }
  };

  const handleBudgetApprove = useCallback(async (budget: Budget, tasks: Omit<Task, 'id'>[], _transaction?: Omit<Transaction, 'id'>) => {
    try {
      // 0. Persist Budget to Supabase
      const savedBudget = await db.budgets.create({
        clientId: budget.clientId,
        items: budget.items,
        discount: budget.discount,
        discountType: budget.discountType,
        downPayment: budget.downPayment,
        validityDays: budget.validityDays,
        terms: budget.terms,
        status: 'Approved',
        createdAt: budget.createdAt || new Date().toISOString()
      });

      // 1. Create Invoice
      const newInvoice = await db.invoices.create({
        clientId: budget.clientId,
        title: `Orçamento Aprovado: ${new Date().toLocaleDateString('pt-BR')}`,
        status: 'Pendente',
        notes: '',
        createdAt: new Date().toISOString()
      });

      // 2. Create Tasks linked to invoice
      const newTasks = await Promise.all(tasks.map(t => db.tasks.create({ ...t, invoiceId: newInvoice.id })));

      // O recebimento só entra no caixa quando a nota/tarefa for paga (evita contar a receita 2x)

      setState(prev => ({
        ...prev,
        budgets: [...prev.budgets, savedBudget],
        invoices: [...prev.invoices, newInvoice],
        tasks: [...prev.tasks, ...newTasks]
      }));

      addXP(300);
      setActiveTab('kanban');
    } catch (e) {
      console.error('Error approving budget:', e);
    }
  }, [addXP]);

  const updateService = useCallback(async (id: string, updatedService: Omit<Service, 'id'>) => {
    try {
      const result = await db.services.update(id, updatedService);
      setState(prev => ({
        ...prev,
        services: prev.services.map(s => s.id === id ? result : s)
      }));
    } catch (e) {
      console.error('Error updating service:', e);
    }
  }, []);

  const addService = useCallback(async (service: Omit<Service, 'id'>) => {
    try {
      const result = await db.services.create(service);
      setState(prev => ({
        ...prev,
        services: [...prev.services, result]
      }));
      return result;
    } catch (e) {
      console.error('Error adding service:', e);
      return null;
    }
  }, []);

  const deleteService = useCallback(async (id: string) => {
    try {
      await db.services.delete(id);
      setState(prev => ({
        ...prev,
        services: prev.services.filter(s => s.id !== id)
      }));
    } catch (e) {
      console.error('Error deleting service:', e);
    }
  }, []);

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      await db.invoices.delete(id);
      setState(prev => ({
        ...prev,
        invoices: prev.invoices.filter(i => i.id !== id),
        tasks: prev.tasks.map(t => t.invoiceId === id ? { ...t, invoiceId: undefined } : t)
      }));
    } catch (e) {
      console.error('Error deleting invoice:', e);
    }
  }, []);

  const updateStats = useCallback(async (newStats: Partial<UserStats>) => {
    try {
      await db.settings.update(newStats);
      setState(prev => ({ ...prev, stats: { ...prev.stats, ...newStats } }));
    } catch (e) {
      console.error('Error updating stats:', e);
    }
  }, []);

  const addHoliday = useCallback(async (holiday: Omit<Holiday, 'id'>) => {
    try {
      const newHoliday = await db.holidays.create(holiday);
      setState(prev => ({ ...prev, holidays: [...prev.holidays, newHoliday] }));
    } catch (e) {
      console.error('Error adding holiday:', e);
    }
  }, []);

  const deleteHoliday = useCallback(async (id: string) => {
    try {
      await db.holidays.delete(id);
      setState(prev => ({ ...prev, holidays: prev.holidays.filter(h => h.id !== id) }));
    } catch (e) {
      console.error('Error deleting holiday:', e);
    }
  }, []);

  const syncHolidays = useCallback(async (holidaysList: Omit<Holiday, 'id'>[]) => {
    try {
      const newHolidays = await db.holidays.bulkCreate(holidaysList);
      setState(prev => ({ ...prev, holidays: [...prev.holidays, ...newHolidays] }));
    } catch (e) {
      console.error('Error syncing holidays:', e);
    }
  }, []);

  const handleNavigate = useCallback((tab: DashboardTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  }, [setActiveTab]);

  // Atalhos de teclado (desativados ao digitar ou com algum modal aberto)
  const anyModalOpen = isTaskModalOpen || isQuickTaskModalOpen || isTransactionModalOpen || !!pendingPaymentTask || !!selectedClientForInvoice || showBriefing;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || anyModalOpen) return;
      const el = e.target as HTMLElement | null;
      if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return;
      const tabs: DashboardTab[] = ['dashboard', 'kanban', 'finance', 'budgets', 'clients', 'settings'];
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setEditingTask(null); setIsTaskModalOpen(true); }
      else if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setIsTransactionModalOpen(true); }
      else if (/^[1-6]$/.test(e.key)) { e.preventDefault(); handleNavigate(tabs[Number(e.key) - 1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anyModalOpen, handleNavigate]);

  if (isInitialLoading) {
    return (
      <SystemLoader
        message="Sincronizando Sistema..."
        submessage="Carregando tarefas e finanças"
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'kanban':
        return <KanbanBoard
          tasks={state.tasks}
          clients={state.clients}
          holidays={state.holidays}
          currentWeekStart={selectedWeekStart}
          onWeekChange={setSelectedWeekStart}
          onUpdateStatus={updateTaskStatus}
          onAddTask={() => setIsTaskModalOpen(true)}
          onAddQuickTask={() => setIsQuickTaskModalOpen(true)}
          onEditTask={(task) => { setEditingTask(task); setIsTaskModalOpen(true); }}
          onDeleteTask={deleteTask}
          onMoveTask={moveTask}
          onUpdateTask={updateTask}
        />;
      case 'finance':
        return <FinanceDashboard
          transactions={state.transactions}
          tasks={state.tasks}
          clients={state.clients}
          invoices={state.invoices}
          weeklyGoal={state.stats.weeklyGoal}
          monthlyGoal={state.stats.monthlyGoal}
          onAddTransaction={addTransaction}
          onUpdateTransaction={updateTransaction}
          onDeleteTransaction={deleteTransaction}
          onViewClientNote={setSelectedClientForInvoice}
          onEditTask={(task) => { setEditingTask(task); setIsTaskModalOpen(true); }}
        />;
      case 'clients':
        return (
          <ClientManagement
            clients={state.clients}
            transactions={state.transactions}
            tasks={state.tasks}
            invoices={state.invoices}
            overdueAlertDays={state.stats.overdueAlertDays ?? 30}
            onAddClient={addClient}
            onUpdateClient={updateClient}
            onDeleteClient={deleteClient}
            onViewInvoice={setSelectedClientForInvoice}
          />
        );
      case 'budgets':
        return <BudgetBuilder
          clients={state.clients}
          services={state.services}
          stats={state.stats}
          onApprove={handleBudgetApprove}
          onQuickAddClient={addClient}
          onSaveCatalog={addService}
          onUpdateCatalog={updateService}
          onDeleteCatalog={deleteService}
          onUpdateStats={updateStats}
        />;
      case 'settings':
        return (
          <SettingsView
            stats={state.stats}
            onUpdateStats={updateStats}
            clients={state.clients}
            onAddTask={addTask}
            holidays={state.holidays}
            onAddHoliday={addHoliday}
            onDeleteHoliday={deleteHoliday}
            onSyncHolidays={syncHolidays}
            services={state.services}
            onAddService={addService}
            onUpdateService={updateService}
            onDeleteService={deleteService}
          />
        );
      case 'dashboard':
      default:
        return (
          <CommandCenter
            stats={state.stats}
            tasks={state.tasks}
            transactions={state.transactions}
            clients={state.clients}
            invoices={state.invoices}
            reminders={state.reminders}
            onNavigate={handleNavigate}
            onOpenTaskModal={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
            onOpenTransactionModal={() => setIsTransactionModalOpen(true)}
            onAddReminder={addReminder}
            onUpdateReminder={updateReminder}
            onToggleReminder={toggleReminder}
            onDeleteReminder={deleteReminder}
          />
        );
    }
  };

  return (
    <Suspense fallback={<SuspenseFallback />}>
      <div className="min-h-screen flex bg-slate-950 text-slate-50">
        <Sidebar
          activeTab={activeTab}
          isSidebarOpen={isSidebarOpen}
          isMobileMenuOpen={isMobileMenuOpen}
          userEmail={user?.email}
          onNavigate={handleNavigate}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

      <main className="flex-1 flex flex-col overflow-hidden w-full relative">
        {!isPublicView && (
          <GamificationBar 
            stats={state.stats} 
            currentIncome={weeklyIncome} 
            pendingIncome={weeklyPendingIncome}
            weekLabel={weekLabel}
            syncStatus={syncStatus}
            onManualSync={() => fetchData()}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          />
        )}

        <div className="flex-1 overflow-auto custom-scrollbar pb-24 lg:pb-6">
          {renderContent()}
        </div>

        {/* Mobile Bottom Navigation Bar (Natural Thumb Zone) */}
        {!isPublicView && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 px-2 py-1.5 pb-safe flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
            <button
              onClick={() => handleNavigate('dashboard')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all touch-target cursor-pointer active:scale-95 ${
                activeTab === 'dashboard' ? 'text-[var(--primary-color)] font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LayoutDashboard size={19} />
              <span className="text-[11px] uppercase tracking-wider">Início</span>
            </button>

            <button
              onClick={() => handleNavigate('kanban')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all touch-target cursor-pointer active:scale-95 ${
                activeTab === 'kanban' ? 'text-[var(--primary-color)] font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Trophy size={19} />
              <span className="text-[11px] uppercase tracking-wider">Agenda</span>
            </button>

            {/* Quick Action Center Button */}
            <div className="flex-1 flex justify-center -mt-6">
              <button
                onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--primary-color)] to-[var(--primary-color)]/90 text-slate-950 font-black shadow-[0_0_20px_var(--primary-shadow)] active:scale-90 transition-all border-2 border-slate-950 cursor-pointer shrink-0"
                title="Nova Demanda"
                aria-label="Nova Demanda"
              >
                <Plus size={24} className="stroke-[3]" />
              </button>
            </div>

            <button
              onClick={() => handleNavigate('finance')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all touch-target cursor-pointer active:scale-95 ${
                activeTab === 'finance' ? 'text-[var(--primary-color)] font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <DollarSign size={19} />
              <span className="text-[11px] uppercase tracking-wider">Fluxo</span>
            </button>

            <button
              onClick={() => handleNavigate('clients')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all touch-target cursor-pointer active:scale-95 ${
                activeTab === 'clients' ? 'text-[var(--primary-color)] font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Users size={19} />
              <span className="text-[11px] uppercase tracking-wider">CRM</span>
            </button>
          </nav>
        )}
      </main>

      {/* Modals & Overlays */}
      {
        showBriefing && (
          <BriefingModal
            userName={state.stats.name || 'Usuário'}
            criticalTasks={criticalTasks}
            pendingTransactions={pendingPayments}
            onStart={handleStartDay}
            onQuickAddDemand={() => {
              setIsTaskModalOpen(true);
              setEditingTask(null);
              setShowBriefing(false);
            }}
            onQuickAddExpense={() => {
              setIsTransactionModalOpen(true);
              setShowBriefing(false);
            }}
            onSkip={() => setShowBriefing(false)}
          />
        )
      }
      {
        isQuickTaskModalOpen && <QuickTaskModal
          clients={state.clients}
          holidays={state.holidays}
          onClose={() => setIsQuickTaskModalOpen(false)}
          onSubmit={addTask}
          onQuickAddClient={addClient}
        />
      }
      {
        isTaskModalOpen && <TaskModal
          clients={state.clients}
          invoices={state.invoices}
          services={state.services}
          editingTask={editingTask}
          holidays={state.holidays}
          onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
          onSubmit={addTask}
          onUpdate={updateTask}
          onQuickAddClient={addClient}
          onQuickAddInvoice={addInvoice}
        />
      }
      {pendingPaymentTask && <PaymentModal task={pendingPaymentTask} onConfirm={handleConfirmPayment} onClose={() => setPendingPaymentTask(null)} />}
      {
        selectedClientForInvoice && <ProjectNoteModal
          client={selectedClientForInvoice}
          tasks={state.tasks.filter(t => t.clientId === selectedClientForInvoice.id)}
          invoices={state.invoices}
          abatements={state.transactions.filter(t => t.abatement && t.invoiceId)}
          onAddAbatement={addAbatement}
          onDeleteAbatement={deleteTransaction}
          pixKey={state.stats.pixKey || ''}
          onUpdateInvoice={updateInvoice}
          onDeleteInvoice={deleteInvoice}
          onUpdatePix={(pix) => updateStats({ pixKey: pix })}
          onClose={() => setSelectedClientForInvoice(null)}
        />
      }
      {
        isTransactionModalOpen && (
          <TransactionModal
            onClose={() => setIsTransactionModalOpen(false)}
            onSubmit={addTransaction}
          />
        )
      }
      {/* Alert Popup */}
      {
        activeAlert && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
            <div className="bg-slate-900 border border-[var(--primary-color)] p-8 rounded-[2rem] w-full max-w-sm relative shadow-[0_0_50px_rgba(168,85,247,0.2)] animate-scale-up">
              <div className="absolute -top-6 -left-6 bg-[var(--primary-color)] text-slate-950 p-4 rounded-2xl shadow-xl rotate-[-10deg]">
                <Clock size={32} />
              </div>

              <div className="mt-4 text-center space-y-4">
                <h3 className="text-sm font-black text-[var(--primary-color)] uppercase tracking-wide">Lembrete Programado</h3>
                <p className="text-xl font-bold text-white leading-tight">"{activeAlert.text}"</p>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="bg-slate-800 px-2 py-1 rounded-lg">{new Date(activeAlert.date!).toLocaleDateString('pt-BR')}</span>
                  <span>às</span>
                  <span className="bg-slate-800 px-2 py-1 rounded-lg">{activeAlert.time}</span>
                </div>

                <button
                  onClick={() => setActiveAlert(null)}
                  className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 text-white font-black uppercase tracking-wide py-4 rounded-xl shadow-lg shadow-[var(--primary-color)]/20 transition-all active:scale-95"
                >
                  Recebido
                </button>
              </div>
            </div>
          </div>
        )
      }
      </div>
    </Suspense>
  );
};

export default DashboardPage;
