import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
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

const SuspenseFallback: React.FC = () => (
  <SystemLoader compact message="Carregando módulo..." fullScreen={false} />
);

/**
 * Auto-healing: reconcilia notas marcadas como pagas com as transações do fluxo de caixa.
 * Garante que se uma nota está 'Pago', transações 'Pago' com os valores proporcionais corretos
 * existam no fluxo de caixa, sincronizando banco e interface sem perdas.
 */
const reconcileInvoicesAndTransactions = async (
  invoices: Invoice[],
  tasks: Task[],
  transactions: Transaction[],
  clients: Client[]
): Promise<Transaction[]> => {
  let currentTransactions = [...transactions];
  const todayDate = getLocalDateString(new Date());

  for (const inv of invoices) {
    if (inv.status === 'Pago') {
      const invTasks = tasks.filter(t => t.invoiceId === inv.id);
      const calculatedTotal = invTasks.reduce((sum, t) => sum + (Number(t.value) || 0), 0);
      const invoiceTotal = (inv.customValue !== undefined && inv.customValue !== null)
        ? Number(inv.customValue)
        : calculatedTotal;
      const paymentDate = inv.paidAt ? inv.paidAt.split('T')[0] : todayDate;
      const client = clients.find(c => c.id === inv.clientId);

      if (invTasks.length > 0 && calculatedTotal > 0) {
        for (const task of invTasks) {
          let expectedValue = Number(task.value) || 0;
          if (inv.customValue !== undefined && inv.customValue !== null && calculatedTotal > 0) {
            expectedValue = Number((expectedValue * (Number(inv.customValue) / calculatedTotal)).toFixed(2));
          }

          const existingTx = currentTransactions.find(tx => tx.taskId === task.id && tx.type === 'Entrada');
          if (existingTx) {
            if (existingTx.status !== 'Pago' || Math.abs(existingTx.value - expectedValue) > 0.01) {
              const updatedTx: Transaction = {
                ...existingTx,
                status: 'Pago',
                value: expectedValue,
                date: existingTx.date || paymentDate,
                invoiceId: inv.id
              };
              currentTransactions = currentTransactions.map(t => t.id === existingTx.id ? updatedTx : t);
              db.transactions.update(existingTx.id, {
                status: 'Pago',
                value: expectedValue,
                date: existingTx.date || paymentDate,
                invoiceId: inv.id
              }).catch(e => console.error('Error reconciling tx in DB:', e));
            }
          } else if (expectedValue > 0) {
            try {
              const newTx = await db.transactions.create({
                description: `Serviço: ${task.title}`,
                value: expectedValue,
                type: 'Entrada',
                date: paymentDate,
                status: 'Pago',
                category: task.category || 'Serviço',
                taskId: task.id,
                invoiceId: inv.id
              });
              currentTransactions = [...currentTransactions, newTx];
            } catch (err) {
              console.error('Error auto-creating reconciled tx:', err);
            }
          }
        }
      } else if (invoiceTotal > 0) {
        const existingTx = currentTransactions.find(tx => 
          (tx.invoiceId === inv.id || (!tx.taskId && tx.description.includes(inv.title))) && tx.type === 'Entrada'
        );

        if (existingTx) {
          if (existingTx.status !== 'Pago' || Math.abs(existingTx.value - invoiceTotal) > 0.01) {
            const updatedTx: Transaction = {
              ...existingTx,
              status: 'Pago',
              value: invoiceTotal,
              date: existingTx.date || paymentDate,
              invoiceId: inv.id
            };
            currentTransactions = currentTransactions.map(t => t.id === existingTx.id ? updatedTx : t);
            db.transactions.update(existingTx.id, {
              status: 'Pago',
              value: invoiceTotal,
              date: existingTx.date || paymentDate,
              invoiceId: inv.id
            }).catch(e => console.error('Error reconciling invoice tx in DB:', e));
          }
        } else {
          try {
            const newTx = await db.transactions.create({
              description: `Nota: ${inv.title}${client ? ` (${client.company || client.name})` : ''}`,
              value: invoiceTotal,
              type: 'Entrada',
              date: paymentDate,
              status: 'Pago',
              category: 'Serviço',
              invoiceId: inv.id
            });
            currentTransactions = [...currentTransactions, newTx];
          } catch (err) {
            console.error('Error auto-creating reconciled invoice tx:', err);
          }
        }
      }
    }
  }

  return currentTransactions;
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [isPublicView, setIsPublicView] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    const userId = user?.id;
    if (!userId) return;
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

      const clients = clientsRes.status === 'fulfilled' ? clientsRes.value : [];
      const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value : [];
      const rawTransactions = transactionsRes.status === 'fulfilled' ? transactionsRes.value : [];
      const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value : [];

      // Auto-reconcile paid invoices and cash flow
      const reconciledTransactions = (invoices.length > 0)
        ? await reconcileInvoicesAndTransactions(invoices, tasks, rawTransactions, clients)
        : rawTransactions;

      setState(prev => ({
        clients: clientsRes.status === 'fulfilled' ? clients : prev.clients,
        tasks: tasksRes.status === 'fulfilled' ? tasks : prev.tasks,
        transactions: transactionsRes.status === 'fulfilled' ? reconciledTransactions : prev.transactions,
        services: servicesRes.status === 'fulfilled' ? servicesRes.value : prev.services,
        invoices: invoicesRes.status === 'fulfilled' ? invoices : prev.invoices,
        reminders: remindersRes.status === 'fulfilled' ? remindersRes.value : prev.reminders,
        budgets: budgetsRes.status === 'fulfilled' ? budgetsRes.value : prev.budgets,
        albums: albumsRes.status === 'fulfilled' ? albumsRes.value : prev.albums,
        stats: statsRes.status === 'fulfilled' && statsRes.value ? statsRes.value : (prev.stats || INITIAL_STATE.stats),
        holidays: holidaysRes.status === 'fulfilled' ? holidaysRes.value : prev.holidays
      }));
      setSyncStatus('synced');
      setLastSyncTime(new Date());
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

  // Continuous real-time synchronization:
  // 1. Supabase WebSockets (multi-table channels)
  // 2. Heartbeat polling every 10 seconds
  // 3. Window focus / visibilitychange / online events
  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;
    let reconnectTimeout: any = null;

    const setupRealtime = () => {
      const channel = supabase
        .channel(`gvitor-sync-${user.id}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          if (isSubscribed) fetchData(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
          if (isSubscribed) fetchData(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          if (isSubscribed) fetchData(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          if (isSubscribed) fetchData(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
          if (isSubscribed) fetchData(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings' }, () => {
          if (isSubscribed) fetchData(true);
        })
        .subscribe((status) => {
          if (!isSubscribed) return;
          if (status === 'SUBSCRIBED') {
            setSyncStatus('synced');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setSyncStatus('error');
            // Auto-reconnect after 4 seconds
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
              if (isSubscribed) {
                supabase.removeChannel(channel);
                setupRealtime();
                fetchData(true);
              }
            }, 4000);
          }
        });

      return channel;
    };

    const activeChannel = setupRealtime();

    // 2. Heartbeat background polling (every 10s while tab is visible)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && isSubscribed) {
        fetchData(true);
      }
    }, 10000);

    // 3. Tab visibility, window focus, network reconnect listeners
    const handleSyncEvent = () => {
      if (document.visibilityState === 'visible' && isSubscribed) {
        fetchData(true);
      }
    };

    document.addEventListener('visibilitychange', handleSyncEvent);
    window.addEventListener('focus', handleSyncEvent);
    window.addEventListener('online', handleSyncEvent);

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleSyncEvent);
      window.removeEventListener('focus', handleSyncEvent);
      window.removeEventListener('online', handleSyncEvent);
      supabase.removeChannel(activeChannel);
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
    const today = new Date().toISOString().split('T')[0];
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

  const addXP = useCallback(async (amount: number) => {
    setState(prev => {
      const newXP = prev.stats.xp + amount;
      const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
      const updatedStats = { ...prev.stats, xp: newXP, level: newLevel };
      db.settings.update(updatedStats).catch(e => console.error('Error updating XP:', e));
      return { ...prev, stats: updatedStats };
    });
  }, []);

  const handleStartDay = () => {
    const today = new Date().toISOString().split('T')[0];
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

  const updateInvoice = useCallback(async (updated: Invoice) => {
    const todayIso = new Date().toISOString();
    const todayDate = getLocalDateString(new Date());

    let invoiceWithPaymentDate: Invoice = { ...updated };
    if (updated.status === 'Pago') {
      invoiceWithPaymentDate.paidAt = updated.paidAt || todayIso;
    } else if (updated.status === 'Pendente') {
      invoiceWithPaymentDate.paidAt = null;
    }

    const paymentDate = invoiceWithPaymentDate.paidAt ? invoiceWithPaymentDate.paidAt.split('T')[0] : todayDate;

    // Snapshot existing data for calculations
    const client = state.clients.find(c => c.id === invoiceWithPaymentDate.clientId);
    const invoiceTasks = state.tasks.filter(t => t.invoiceId === invoiceWithPaymentDate.id);
    const calculatedTotal = invoiceTasks.reduce((a, c) => a + (Number(c.value) || 0), 0);
    const invoiceTotal = (invoiceWithPaymentDate.customValue !== undefined && invoiceWithPaymentDate.customValue !== null)
      ? Number(invoiceWithPaymentDate.customValue)
      : calculatedTotal;
    const taskIds = new Set(invoiceTasks.map(t => t.id));

    // Prepare synchronized transactions
    interface TxAction {
      isNew: boolean;
      tx: Transaction;
    }
    const txActions: TxAction[] = [];

    if (invoiceWithPaymentDate.status === 'Pago') {
      if (invoiceTasks.length > 0 && calculatedTotal > 0) {
        for (const task of invoiceTasks) {
          let val = Number(task.value) || 0;
          if (invoiceWithPaymentDate.customValue !== undefined && invoiceWithPaymentDate.customValue !== null && calculatedTotal > 0) {
            val = Number((val * (Number(invoiceWithPaymentDate.customValue) / calculatedTotal)).toFixed(2));
          }

          const existingTx = state.transactions.find(tx => tx.taskId === task.id && tx.type === 'Entrada');
          if (existingTx) {
            txActions.push({
              isNew: false,
              tx: {
                ...existingTx,
                value: val,
                status: 'Pago',
                date: existingTx.date || paymentDate,
                invoiceId: invoiceWithPaymentDate.id
              }
            });
          } else if (val > 0) {
            txActions.push({
              isNew: true,
              tx: {
                id: 'opt-' + task.id + '-' + Date.now(),
                description: `Serviço: ${task.title}`,
                value: val,
                type: 'Entrada',
                date: paymentDate,
                status: 'Pago',
                category: task.category || 'Serviço',
                taskId: task.id,
                invoiceId: invoiceWithPaymentDate.id
              }
            });
          }
        }
      } else if (invoiceTotal > 0) {
        const existingTx = state.transactions.find(tx => 
          (tx.invoiceId === invoiceWithPaymentDate.id || (!tx.taskId && tx.description.includes(invoiceWithPaymentDate.title))) && tx.type === 'Entrada'
        );

        if (existingTx) {
          txActions.push({
            isNew: false,
            tx: {
              ...existingTx,
              value: invoiceTotal,
              status: 'Pago',
              date: existingTx.date || paymentDate,
              invoiceId: invoiceWithPaymentDate.id
            }
          });
        } else {
          txActions.push({
            isNew: true,
            tx: {
              id: 'opt-inv-' + invoiceWithPaymentDate.id + '-' + Date.now(),
              description: `Nota: ${invoiceWithPaymentDate.title}${client ? ` (${client.company || client.name})` : ''}`,
              value: invoiceTotal,
              type: 'Entrada',
              date: paymentDate,
              status: 'Pago',
              category: 'Serviço',
              invoiceId: invoiceWithPaymentDate.id
            }
          });
        }
      }
    } else if (invoiceWithPaymentDate.status === 'Pendente') {
      // Revert any linked transactions to Pendente
      state.transactions.forEach(tx => {
        const isLinkedToTask = tx.taskId && taskIds.has(tx.taskId) && tx.type === 'Entrada';
        const isLinkedToInv = (tx.invoiceId === invoiceWithPaymentDate.id || (!tx.taskId && tx.description.includes(invoiceWithPaymentDate.title))) && tx.type === 'Entrada';
        if (isLinkedToTask || isLinkedToInv) {
          txActions.push({
            isNew: false,
            tx: { ...tx, status: 'Pendente' }
          });
        }
      });
    }

    // 1. Synchronous Optimistic Update
    setState(prev => {
      const nextInvoices = prev.invoices.map(i => i.id === invoiceWithPaymentDate.id ? invoiceWithPaymentDate : i);
      const nextTasks = invoiceWithPaymentDate.status === 'Pago'
        ? prev.tasks.map(t => taskIds.has(t.id) && t.status !== 'Concluído' ? { ...t, status: 'Concluído' as Status } : t)
        : prev.tasks;

      const txActionMap = new Map(txActions.map(a => [a.tx.id, a.tx]));
      const updatedExisting = prev.transactions.map(tx => txActionMap.get(tx.id) || tx);
      const newTransactions = txActions.filter(a => a.isNew).map(a => a.tx);

      return {
        ...prev,
        invoices: nextInvoices,
        tasks: nextTasks,
        transactions: [...updatedExisting, ...newTransactions]
      };
    });

    // 2. Asynchronous DB Persistence
    try {
      // A. Update invoice in DB
      await db.invoices.update(invoiceWithPaymentDate.id, invoiceWithPaymentDate);

      // B. If Pago, mark tasks Concluído in DB
      if (invoiceWithPaymentDate.status === 'Pago' && invoiceTasks.length > 0) {
        const tasksToComplete = invoiceTasks.filter(t => t.status !== 'Concluído');
        if (tasksToComplete.length > 0) {
          await Promise.all(tasksToComplete.map(t => db.tasks.update(t.id, { status: 'Concluído' })));
        }
      }

      // C. Persist all transaction changes
      await Promise.all(
        txActions.map(async (action) => {
          if (action.isNew) {
            return await db.transactions.create({
              description: action.tx.description,
              value: action.tx.value,
              type: action.tx.type,
              date: action.tx.date,
              status: action.tx.status,
              category: action.tx.category,
              taskId: action.tx.taskId,
              invoiceId: action.tx.invoiceId
            });
          } else {
            return await db.transactions.update(action.tx.id, {
              value: action.tx.value,
              status: action.tx.status,
              date: action.tx.date,
              description: action.tx.description,
              category: action.tx.category,
              invoiceId: action.tx.invoiceId
            });
          }
        })
      );

      // D. Silent sync from DB to guarantee absolute synchronization
      fetchData(true);
    } catch (e) {
      console.error('Error updating invoice and syncing transactions:', e);
      fetchData(true);
    }
  }, [state.clients, state.tasks, state.transactions, fetchData]);

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
    }
  }, []);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    try {
      const newTx = await db.transactions.create(tx);
      setState(prev => ({
        ...prev,
        transactions: [...prev.transactions, newTx]
      }));
    } catch (e) {
      console.error('Error adding transaction:', e);
    }
  }, []);

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

      setState(prev => {
        const nextTasks = prev.tasks.map(t => t.id === taskId ? result : t);

        // Sync linked transaction if it exists
        const linkedTx = prev.transactions.find(tx => tx.taskId === taskId && tx.type === 'Entrada');
        if (linkedTx) {
          const needsSync = linkedTx.value !== mergedTask.value ||
            linkedTx.description !== `Serviço: ${mergedTask.title}`;

          if (needsSync) {
            db.transactions.update(linkedTx.id, {
              value: mergedTask.value,
              description: `Serviço: ${mergedTask.title}`,
              category: mergedTask.category || linkedTx.category
            }).catch(e => console.error('Error syncing transaction:', e));

            return {
              ...prev,
              tasks: nextTasks,
              transactions: prev.transactions.map(tx =>
                tx.id === linkedTx.id
                  ? { ...tx, value: mergedTask.value, description: `Serviço: ${mergedTask.title}`, category: mergedTask.category || tx.category }
                  : tx
              )
            };
          }
        }
        return { ...prev, tasks: nextTasks };
      });

      if (isConcluding) {
        setPendingPaymentTask(result);
      }
    } catch (e) {
      console.error('Error updating task:', e);
      fetchData(true);
    }
  }, [state.tasks, state.transactions, fetchData]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await db.tasks.delete(taskId);
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId),
        transactions: prev.transactions.filter(t => t.taskId !== taskId)
      }));
    } catch (e) {
      console.error('Error deleting task:', e);
    }
  }, []);

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

  const handleConfirmPayment = async (received: boolean) => {
    if (!pendingPaymentTask) return;

    const taskToConclude = pendingPaymentTask;
    setPendingPaymentTask(null);
    addXP(XP_PER_TASK);

    const todayDate = new Date().toISOString().split('T')[0];

    // Optimistically update task and transactions
    setState(prev => {
      const updatedTasks = prev.tasks.map(t => t.id === taskToConclude.id ? { ...t, status: 'Concluído' as Status } : t);

      const relatedTxs = prev.transactions.filter(tx => tx.taskId === taskToConclude.id);
      let updatedTxs = prev.transactions;

      if (relatedTxs.length > 0) {
        updatedTxs = prev.transactions.map(tx => {
          if (tx.taskId === taskToConclude.id) {
            return {
              ...tx,
              status: (received ? 'Pago' : 'Pendente') as 'Pago' | 'Pendente',
              date: received ? todayDate : tx.date
            };
          }
          return tx;
        });
      } else if (taskToConclude.value > 0) {
        const optimisticTx: Transaction = {
          id: 'temp-' + Date.now(),
          description: `Serviço: ${taskToConclude.title}`,
          value: taskToConclude.value,
          type: 'Entrada',
          date: todayDate,
          status: received ? 'Pago' : 'Pendente',
          category: 'Serviço',
          taskId: taskToConclude.id
        };
        updatedTxs = [...prev.transactions, optimisticTx];
      }

      return {
        ...prev,
        tasks: updatedTasks,
        transactions: updatedTxs
      };
    });

    try {
      // 1. Update task status in Supabase
      const updatedTask = await db.tasks.update(taskToConclude.id, { status: 'Concluído' });

      // 2. Find and update or create related transactions in Supabase
      const relatedTxs = state.transactions.filter(tx => tx.taskId === taskToConclude.id);

      let updatedTxs: Transaction[] = [];
      if (relatedTxs.length > 0) {
        updatedTxs = await Promise.all(relatedTxs.map(tx =>
          db.transactions.update(tx.id, {
            status: received ? 'Pago' : 'Pendente',
            date: received ? todayDate : tx.date
          })
        ));
      } else if (taskToConclude.value > 0) {
        const newTx = await db.transactions.create({
          description: `Serviço: ${taskToConclude.title}`,
          value: taskToConclude.value,
          type: 'Entrada',
          date: todayDate,
          status: received ? 'Pago' : 'Pendente',
          category: 'Serviço',
          taskId: taskToConclude.id
        });
        updatedTxs = [newTx];
      }

      setState(prev => {
        const otherTransactions = prev.transactions.filter(tx => tx.taskId !== taskToConclude.id && !tx.id.startsWith('temp-'));
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.id === taskToConclude.id ? updatedTask : t),
          transactions: [...otherTransactions, ...updatedTxs]
        };
      });
    } catch (e) {
      console.error('Error confirming payment:', e);
      fetchData();
    }
  };

  const handleBudgetApprove = useCallback(async (budget: Budget, tasks: Omit<Task, 'id'>[], transaction: Omit<Transaction, 'id'>) => {
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

      // 3. Create Transaction
      const newTransaction = await db.transactions.create({ ...transaction, taskId: undefined }); // Or link to one of the tasks if appropriate

      setState(prev => ({
        ...prev,
        budgets: [...prev.budgets, savedBudget],
        invoices: [...prev.invoices, newInvoice],
        tasks: [...prev.tasks, ...newTasks],
        transactions: [...prev.transactions, newTransaction]
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
  }, []);

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
              <span className="text-[9px] uppercase tracking-wider">Início</span>
            </button>

            <button
              onClick={() => handleNavigate('kanban')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all touch-target cursor-pointer active:scale-95 ${
                activeTab === 'kanban' ? 'text-[var(--primary-color)] font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Trophy size={19} />
              <span className="text-[9px] uppercase tracking-wider">Agenda</span>
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
              <span className="text-[9px] uppercase tracking-wider">Fluxo</span>
            </button>

            <button
              onClick={() => handleNavigate('clients')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all touch-target cursor-pointer active:scale-95 ${
                activeTab === 'clients' ? 'text-[var(--primary-color)] font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Users size={19} />
              <span className="text-[9px] uppercase tracking-wider">CRM</span>
            </button>
          </nav>
        )}
      </main>

      {/* Modals & Overlays */}
      {
        showBriefing && (
          <BriefingModal
            userName={state.stats.name || 'Agente'}
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
                <h3 className="text-sm font-black text-[var(--primary-color)] uppercase tracking-widest">Lembrete Programado</h3>
                <p className="text-xl font-bold text-white leading-tight">"{activeAlert.text}"</p>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="bg-slate-800 px-2 py-1 rounded-lg">{new Date(activeAlert.date!).toLocaleDateString('pt-BR')}</span>
                  <span>às</span>
                  <span className="bg-slate-800 px-2 py-1 rounded-lg">{activeAlert.time}</span>
                </div>

                <button
                  onClick={() => setActiveAlert(null)}
                  className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-[var(--primary-color)]/20 transition-all active:scale-95"
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
