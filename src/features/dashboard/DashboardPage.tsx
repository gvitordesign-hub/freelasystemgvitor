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

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [isPublicView, setIsPublicView] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    try {
      const [clients, tasks, transactions, services, invoices, reminders, budgets, albums, stats, holidays] = await Promise.all([
        db.clients.list(),
        db.tasks.list(),
        db.transactions.list(),
        db.services.list(),
        db.invoices.list(),
        db.reminders.list(),
        db.budgets.list(),
        db.albums.list(),
        db.settings.get(),
        db.holidays.list().catch(() => [])
      ]);

      setState({
        clients,
        tasks,
        transactions,
        services,
        invoices,
        reminders,
        budgets,
        albums,
        stats: stats || INITIAL_STATE.stats,
        holidays: holidays || []
      });
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time synchronization
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  const monthlyIncome = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return state.transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'Entrada' && t.status === 'Pago' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
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
        clients: prev.clients.filter(c => c.id !== id)
      }));
    } catch (e) {
      console.error('Error deleting client:', e);
    }
  }, []);

  const addInvoice = useCallback(async (invoice: Omit<Invoice, 'id'>) => {
    try {
      const newInvoice = await db.invoices.create(invoice);
      setState(prev => ({ ...prev, invoices: [...prev.invoices, newInvoice] }));
      return newInvoice.id;
    } catch (e) {
      console.error('Error adding invoice:', e);
      return '';
    }
  }, []);

  const updateInvoice = useCallback(async (updated: Invoice) => {
    // 1. Optimistic update
    setState(prev => {
      const nextInvoices = prev.invoices.map(i => i.id === updated.id ? updated : i);
      const invoiceTasks = prev.tasks.filter(t => t.invoiceId === updated.id);
      const calculatedTotal = invoiceTasks.reduce((a, c) => a + (Number(c.value) || 0), 0);
      const taskIds = new Set(invoiceTasks.map(t => t.id));

      const nextTransactions = prev.transactions.map(tx => {
        if (tx.taskId && taskIds.has(tx.taskId) && tx.type === 'Entrada') {
          const task = invoiceTasks.find(t => t.id === tx.taskId);
          if (task) {
            let newValue = tx.value;
            let newStatus = tx.status;
            let newDate = tx.date;

            if (updated.customValue !== undefined && updated.customValue !== null) {
              const scale = calculatedTotal > 0 ? (Number(updated.customValue) / calculatedTotal) : 1;
              newValue = Number(((Number(task.value) || 0) * scale).toFixed(2));
            } else {
              newValue = Number(task.value) || 0;
            }

            if (updated.status === 'Pago' && tx.status !== 'Pago') {
              newStatus = 'Pago';
              newDate = new Date().toISOString();
            } else if (updated.status === 'Pendente' && tx.status === 'Pago') {
              newStatus = 'Pendente';
            }

            return { ...tx, value: newValue, status: newStatus as 'Pago' | 'Pendente', date: newDate };
          }
        }
        return tx;
      });

      const nextTasks = updated.status === 'Pago'
        ? prev.tasks.map(t => taskIds.has(t.id) && t.status !== 'Concluído' ? { ...t, status: 'Concluído' as Status } : t)
        : prev.tasks;

      return {
        ...prev,
        invoices: nextInvoices,
        transactions: nextTransactions,
        tasks: nextTasks
      };
    });

    try {
      const result = await db.invoices.update(updated.id, updated);

      setState(prev => {
        const nextState = { ...prev, invoices: prev.invoices.map(i => i.id === result.id ? result : i) };

        const invoiceTasks = prev.tasks.filter(t => t.invoiceId === result.id);
        const calculatedTotal = invoiceTasks.reduce((a, c) => a + (Number(c.value) || 0), 0);
        const taskIds = new Set(invoiceTasks.map(t => t.id));

        let txUpdated = false;
        const newTransactions = prev.transactions.map(tx => {
          if (tx.taskId && taskIds.has(tx.taskId) && tx.type === 'Entrada') {
            const task = invoiceTasks.find(t => t.id === tx.taskId);
            if (task) {
              let newValue = tx.value;
              let newStatus = tx.status;
              let newDate = tx.date;

              if (result.customValue !== undefined && result.customValue !== null) {
                const scale = calculatedTotal > 0 ? (Number(result.customValue) / calculatedTotal) : 1;
                newValue = Number(((Number(task.value) || 0) * scale).toFixed(2));
              } else {
                newValue = Number(task.value) || 0;
              }

              if (result.status === 'Pago' && tx.status !== 'Pago') {
                newStatus = 'Pago';
                newDate = new Date().toISOString();
              } else if (result.status === 'Pendente' && tx.status === 'Pago') {
                newStatus = 'Pendente';
              }

              if (newValue !== tx.value || newStatus !== tx.status || newDate !== tx.date) {
                txUpdated = true;
                const newTx = { ...tx, value: newValue, status: newStatus as 'Pago' | 'Pendente', date: newDate };
                db.transactions.update(tx.id, { value: newValue, status: newStatus, date: newDate }).catch(console.error);
                return newTx;
              }
            }
          }
          return tx;
        });

        if (txUpdated) {
          nextState.transactions = newTransactions;
        }

        return nextState;
      });

      if (result.status === 'Pago') {
        setState(prev => {
          const currentTasks = prev.tasks.filter(t => t.invoiceId === result.id);
          const calculatedTotal = currentTasks.reduce((a, c) => a + (Number(c.value) || 0), 0);

          currentTasks.forEach(task => {
            if (task.status !== 'Concluído') {
              db.tasks.update(task.id, { status: 'Concluído' }).catch(console.error);
            }
          });

          const existingTxTaskIds = new Set(prev.transactions.filter(tx => tx.taskId && tx.type === 'Entrada').map(tx => tx.taskId));
          const tasksWithoutTx = currentTasks.filter(t => !existingTxTaskIds.has(t.id) && (Number(t.value) || 0) > 0);

          tasksWithoutTx.forEach(async (task) => {
            try {
              let val = Number(task.value) || 0;
              if (result.customValue !== undefined && result.customValue !== null && calculatedTotal > 0) {
                val = Number((val * (Number(result.customValue) / calculatedTotal)).toFixed(2));
              }
              const createdTx = await db.transactions.create({
                description: `Serviço: ${task.title}`,
                value: val,
                type: 'Entrada',
                date: new Date().toISOString().split('T')[0],
                status: 'Pago',
                category: 'Serviço',
                taskId: task.id
              });
              setState(s => ({
                ...s,
                transactions: [...s.transactions.filter(t => t.id !== createdTx.id), createdTx]
              }));
            } catch (err) {
              console.error('Error creating transaction for task:', err);
            }
          });

          return prev;
        });
      }
    } catch (e) {
      console.error('Error updating invoice:', e);
    }
  }, []);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    try {
      let finalInvoiceId = task.invoiceId;

      if (!finalInvoiceId) {
        const existingInvoice = state.invoices.find(
          inv => inv.clientId === task.clientId && inv.title.trim().toLowerCase() === 'outros'
        );

        if (existingInvoice) {
          finalInvoiceId = existingInvoice.id;
        } else {
          const newInvoiceId = await addInvoice({
            clientId: task.clientId,
            title: 'Outros',
            status: 'Pendente',
            notes: 'Pasta automática para demandas sem nota vinculada',
            createdAt: new Date().toISOString()
          });
          if (newInvoiceId) {
            finalInvoiceId = newInvoiceId;
          }
        }
      }

      const initialStatus = task.status;
      // If task is created as Concluído, we'll create it as Pendente first and trigger the payment confirmation modal to set it correctly
      const taskToCreate = {
        ...task,
        invoiceId: finalInvoiceId || undefined,
        status: initialStatus === 'Concluído' ? 'Pendente' : initialStatus
      };
      const newTask = await db.tasks.create(taskToCreate);

      setState(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));

      if (initialStatus === 'Concluído') {
        setPendingPaymentTask(newTask);
      }

      fetchData();
    } catch (e) {
      console.error('Error adding task:', e);
    }
  }, [fetchData, state.invoices, addInvoice]);

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

  const updateTask = useCallback(async (taskId: string, updatedTask: Omit<Task, 'id'>) => {
    try {
      let finalInvoiceId = updatedTask.invoiceId;

      if (!finalInvoiceId) {
        const existingInvoice = state.invoices.find(
          inv => inv.clientId === updatedTask.clientId && inv.title.trim().toLowerCase() === 'outros'
        );

        if (existingInvoice) {
          finalInvoiceId = existingInvoice.id;
        } else {
          const newInvoiceId = await addInvoice({
            clientId: updatedTask.clientId,
            title: 'Outros',
            status: 'Pendente',
            notes: 'Pasta automática para demandas sem nota vinculada',
            createdAt: new Date().toISOString()
          });
          if (newInvoiceId) {
            finalInvoiceId = newInvoiceId;
          }
        }
      }

      const taskBefore = state.tasks.find(t => t.id === taskId);
      const isConcluding = taskBefore && taskBefore.status !== 'Concluído' && updatedTask.status === 'Concluído';

      const taskToSave = { ...updatedTask, invoiceId: finalInvoiceId || undefined };
      if (isConcluding) {
        taskToSave.status = taskBefore.status;
      }

      const result = await db.tasks.update(taskId, taskToSave);

      setState(prev => {
        const nextTasks = prev.tasks.map(t => t.id === taskId ? result : t);

        // Sync linked transaction if it exists
        const linkedTx = prev.transactions.find(tx => tx.taskId === taskId && tx.type === 'Entrada');
        if (linkedTx) {
          const needsSync = linkedTx.value !== updatedTask.value ||
            linkedTx.description !== `Serviço: ${updatedTask.title}`;

          if (needsSync) {
            db.transactions.update(linkedTx.id, {
              value: updatedTask.value,
              description: `Serviço: ${updatedTask.title}`,
              category: updatedTask.category || linkedTx.category
            }).catch(e => console.error('Error syncing transaction:', e));

            return {
              ...prev,
              tasks: nextTasks,
              transactions: prev.transactions.map(tx =>
                tx.id === linkedTx.id
                  ? { ...tx, value: updatedTask.value, description: `Serviço: ${updatedTask.title}`, category: updatedTask.category || tx.category }
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

      fetchData();
    } catch (e) {
      console.error('Error updating task:', e);
    }
  }, [state.tasks, state.invoices, addInvoice, fetchData]);

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
      // 1. Create Invoice
      const newInvoice = await db.invoices.create({
        clientId: budget.clientId,
        title: `Orçamento Aprovado: ${new Date().toLocaleDateString()}`,
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
        budgets: [...prev.budgets, budget],
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
            currentIncome={monthlyIncome} 
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
