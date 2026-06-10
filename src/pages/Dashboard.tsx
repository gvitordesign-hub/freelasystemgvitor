
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Trophy,
  Menu,
  TrendingUp,
  Award,
  Settings,
  CheckCircle2,
  X,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  ExternalLink,
  Target,
  BarChart3,
  Calculator,
  Zap,
  Plus,
  TrendingDown
} from 'lucide-react';
import { Client, Task, AppState, Status, UserStats, Transaction, DayOfWeek, Album, Budget, Service, Invoice, Reminder, Holiday } from '../types';
import { INITIAL_STATE, XP_PER_TASK, XP_PER_CLIENT, XP_PER_LEVEL, XP_DAILY_BRIEFING } from '../constants';
import { db } from '../lib/database';
import { supabase } from '../lib/supabase';
import KanbanBoard from '../components/KanbanBoard';
import FinanceDashboard from '../components/FinanceDashboard';
import ClientManagement from '../components/ClientManagement';
import GamificationBar from '../components/GamificationBar';
import SettingsView from '../components/SettingsView';
import BudgetBuilder from '../components/Budget/BudgetBuilder';
import TaskModal from '../components/Modals/TaskModal';
import PaymentModal from '../components/Modals/PaymentModal';
import ProjectNoteModal from '../components/Modals/ProjectNoteModal';
import BriefingModal from '../components/Modals/BriefingModal';
import FocusWidget from '../components/Dashboard/FocusWidget';
import TransactionModal from '../components/Modals/TransactionModal';
import OverdueAlert from '../components/OverdueAlert';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'kanban' | 'finance' | 'clients' | 'dashboard' | 'settings' | 'budgets'>('dashboard');
  const [isPublicView, setIsPublicView] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  // Initial fetch
  useEffect(() => {
    setIsInitialLoading(true);
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedClientForInvoice, setSelectedClientForInvoice] = useState<Client | null>(null);
  const [pendingPaymentTask, setPendingPaymentTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [chartView, setChartView] = useState<'Semanal' | 'Mensal' | 'Anual'>('Mensal');

  // Stats Calculations
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

  const annualIncome = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return state.transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'Entrada' && t.status === 'Pago' && d.getFullYear() === currentYear;
      })
      .reduce((acc, curr) => acc + curr.value, 0);
  }, [state.transactions]);

  const chartData = useMemo(() => {
    const now = new Date();
    const data = [];

    if (chartView === 'Semanal') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
        const periodTransactions = state.transactions.filter(t => {
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
        const periodTransactions = state.transactions.filter(t => {
          const td = new Date(t.date);
          return t.type === 'Entrada' &&
            td.getMonth() === d.getMonth() &&
            td.getFullYear() === d.getFullYear();
        });

        const realized = periodTransactions.filter(t => t.status === 'Pago').reduce((acc, curr) => acc + curr.value, 0);
        const pending = periodTransactions.filter(t => t.status === 'Pendente').reduce((acc, curr) => acc + curr.value, 0);

        data.push({ label, realized, pending });
      }
    } else { // Anual
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      for (let i = 0; i < 12; i++) {
        const periodTransactions = state.transactions.filter(t => {
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
  }, [state.transactions, chartView]);

  const maxChartValue = useMemo(() => {
    const values = chartData.map(d => d.realized + d.pending);
    const goal = chartView === 'Semanal' ? state.stats.weeklyGoal :
      chartView === 'Mensal' ? state.stats.monthlyGoal :
        state.stats.annualGoal;
    return Math.max(...values, goal || 1000);
  }, [chartData, chartView, state.stats]);

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

  // Removed localStorage sync in favor of Supabase

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

    // Request notification permission on mount
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    return () => clearInterval(interval);
  }, [state.reminders]);


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
    try {
      const result = await db.invoices.update(updated.id, updated);
      
      setState(prev => {
        const nextState = { ...prev, invoices: prev.invoices.map(i => i.id === result.id ? result : i) };
        
        const invoiceTasks = prev.tasks.filter(t => t.invoiceId === result.id);
        const completedInvoiceTasks = invoiceTasks.filter(t => t.status === 'Concluído');
        const calculatedTotal = completedInvoiceTasks.reduce((a, c) => a + c.value, 0);
        const taskIds = new Set(invoiceTasks.map(t => t.id));
        
        let txUpdated = false;
        const newTransactions = prev.transactions.map(tx => {
          if (tx.taskId && taskIds.has(tx.taskId) && tx.type === 'Entrada') {
            const task = completedInvoiceTasks.find(t => t.id === tx.taskId);
            if (task) {
              let newValue = tx.value;
              let newStatus = tx.status;
              
              if (updated.customValue !== undefined && updated.customValue !== null) {
                const scale = calculatedTotal > 0 ? (updated.customValue / calculatedTotal) : 1;
                newValue = Number((task.value * scale).toFixed(2));
              } else {
                newValue = task.value;
              }

              if (updated.status === 'Pago' && tx.status !== 'Pago') {
                newStatus = 'Pago';
              }

              if (newValue !== tx.value || newStatus !== tx.status) {
                txUpdated = true;
                const newTx = { ...tx, value: newValue, status: newStatus as 'Pago' | 'Pendente' };
                db.transactions.update(tx.id, { value: newValue, status: newStatus }).catch(console.error);
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
    } catch (e) {
      console.error('Error updating invoice:', e);
    }
  }, []);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    try {
      const initialStatus = task.status;
      // If task is created as Concluído, we'll create it as Pendente first and trigger the payment confirmation modal to set it correctly
      const taskToCreate = { ...task, status: initialStatus === 'Concluído' ? 'Pendente' : initialStatus };
      const newTask = await db.tasks.create(taskToCreate);
      
      setState(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));

      if (initialStatus === 'Concluído') {
        setPendingPaymentTask(newTask);
      }
      
      fetchData();
    } catch (e) {
      console.error('Error adding task:', e);
    }
  }, [fetchData]);

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
      const taskBefore = state.tasks.find(t => t.id === taskId);
      const isConcluding = taskBefore && taskBefore.status !== 'Concluído' && updatedTask.status === 'Concluído';
      
      const taskToSave = { ...updatedTask };
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
  }, [state.tasks, fetchData]);


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
        
        // Find and delete any linked transactions since the task is no longer Concluído
        const relatedTxs = state.transactions.filter(tx => tx.taskId === taskId);
        if (relatedTxs.length > 0) {
          await Promise.all(relatedTxs.map(tx => db.transactions.delete(tx.id)));
        }

        setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === taskId ? result : t),
          transactions: prev.transactions.filter(tx => tx.taskId !== taskId)
        }));
      } catch (e) {
        console.error('Error updating task status:', e);
      }
    }
  }, [state.tasks, state.transactions]);

  const handleConfirmPayment = async (received: boolean) => {
    if (!pendingPaymentTask) return;

    try {
      // 1. Update task status in Supabase
      const updatedTask = await db.tasks.update(pendingPaymentTask.id, { status: 'Concluído' });

      // 2. Find and update or create related transactions in Supabase
      const relatedTxs = state.transactions.filter(tx => tx.taskId === pendingPaymentTask.id);
      
      let updatedTxs: Transaction[] = [];
      if (relatedTxs.length > 0) {
        updatedTxs = await Promise.all(relatedTxs.map(tx =>
          db.transactions.update(tx.id, {
            status: received ? 'Pago' : 'Pendente',
            date: received ? new Date().toISOString() : tx.date
          })
        ));
      } else if (pendingPaymentTask.value > 0) {
        const newTx = await db.transactions.create({
          description: `Serviço: ${pendingPaymentTask.title}`,
          value: pendingPaymentTask.value,
          type: 'Entrada',
          date: new Date().toISOString(),
          status: received ? 'Pago' : 'Pendente',
          category: 'Serviço',
          taskId: pendingPaymentTask.id
        });
        updatedTxs = [newTx];
      }

      setState(prev => {
        const updatedTasks = prev.tasks.map(t => t.id === pendingPaymentTask.id ? updatedTask : t);
        const otherTransactions = prev.transactions.filter(tx => tx.taskId !== pendingPaymentTask.id);
        const updatedTransactions = [...otherTransactions, ...updatedTxs];
        
        return { ...prev, tasks: updatedTasks, transactions: updatedTransactions };
      });

      addXP(XP_PER_TASK);
      setPendingPaymentTask(null);
    } catch (e) {
      console.error('Error confirming payment:', e);
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

  const getClientName = (clientId: string) => state.clients.find(c => c.id === clientId)?.name || 'Cliente Externo';

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--primary-color)]/20 border-t-[var(--primary-color)] rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Sincronizando Sistema...</p>
        </div>
      </div>
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
          onEditTask={(task) => { setEditingTask(task); setIsTaskModalOpen(true); }}
          onDeleteTask={deleteTask}
          onMoveTask={moveTask}
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
          onSaveCatalog={(s) => setState(prev => ({ ...prev, services: [...prev.services, { ...s, id: Math.random().toString(36).substr(2, 9) }] }))}
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
          />
        );
      case 'dashboard':
      default:
        const monthlyProgress = Math.min((monthlyIncome / (state.stats.monthlyGoal || 1)) * 100, 100);
        const annualProgress = Math.min((annualIncome / (state.stats.annualGoal || 1)) * 100, 100);

        return (
          <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            {/* Overdue Client Alert */}
            <OverdueAlert
              clients={state.clients}
              invoices={state.invoices}
              overdueAlertDays={state.stats.overdueAlertDays ?? 30}
              onNavigateToClient={(_client) => setActiveTab('clients')}
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
                  onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
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
                  onClick={() => setIsTransactionModalOpen(true)}
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
                      <div><p className="text-slate-400 text-xs">Nível Atual</p><p className="text-xl font-bold">Protocolo {state.stats.level}</p></div>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[var(--primary-color)] h-full transition-all duration-500" style={{ width: `${(state.stats.xp % XP_PER_LEVEL) / (XP_PER_LEVEL / 100)}%` }}></div>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">XP: {state.stats.xp % XP_PER_LEVEL} / {XP_PER_LEVEL}</p>
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
                    <p className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">Meta: R$ {state.stats.annualGoal?.toLocaleString()}</p>
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
                        style={{ bottom: `${((chartView === 'Semanal' ? state.stats.weeklyGoal : chartView === 'Mensal' ? state.stats.monthlyGoal : state.stats.annualGoal) / maxChartValue) * 100}%` }}
                      >
                        <span className="absolute -top-4 right-0 text-[8px] font-black text-[var(--primary-color)] uppercase tracking-widest opacity-40">
                          Meta: R$ {(chartView === 'Semanal' ? state.stats.weeklyGoal : chartView === 'Mensal' ? state.stats.monthlyGoal : state.stats.annualGoal).toLocaleString()}
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
                    <button onClick={() => setActiveTab('kanban')} className="text-[9px] font-black text-slate-500 hover:text-[var(--primary-color)] transition-colors flex items-center gap-1 uppercase tracking-widest">
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
                  reminders={state.reminders}
                  onAddReminder={addReminder}
                  onUpdateReminder={updateReminder}
                  onToggleReminder={toggleReminder}
                  onDeleteReminder={deleteReminder}
                />

                {state.stats.objectives && (
                  <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary-color)] shadow-[0_0_10px_var(--primary-color)]" />
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Diretrizes Master</h3>
                    <p className="text-slate-300 text-xs leading-relaxed italic">"{state.stats.objectives}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex ${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col print:hidden`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--primary-color)] rounded-lg flex items-center justify-center neon-shadow-primary shrink-0 transition-colors">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-xl font-black cyber-font tracking-tighter text-white leading-none">FRELLA</span>
                <span className="text-[10px] font-black tracking-[0.3em] text-[var(--primary-color)] mt-0.5 opacity-80">SYSTEM</span>
              </div>
            )}
          </div>
          {isMobileMenuOpen && <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-500 hover:text-white"><X size={20} /></button>}

          {/* Desktop Toggle Button - Visible when SIDEBAR OPEN */}
          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="hidden lg:flex p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all items-center justify-center ml-2"
              title="Recolher Menu"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Desktop Toggle Button - Visible when SIDEBAR CLOSED (Below Logo) */}
        {!isSidebarOpen && (
          <div className="px-4 mb-2 hidden lg:flex justify-center animate-fade-in">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center justify-center"
              title="Expandir Menu"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} collapsed={!isSidebarOpen} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Trophy size={20} />} label="Agenda" active={activeTab === 'kanban'} collapsed={!isSidebarOpen} onClick={() => { setActiveTab('kanban'); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<DollarSign size={20} />} label="Fluxo" active={activeTab === 'finance'} collapsed={!isSidebarOpen} onClick={() => { setActiveTab('finance'); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Calculator size={20} />} label="Propostas" active={activeTab === 'budgets'} collapsed={!isSidebarOpen} onClick={() => { setActiveTab('budgets'); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Users size={20} />} label="Frella CRM" active={activeTab === 'clients'} collapsed={!isSidebarOpen} onClick={() => { setActiveTab('clients'); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Settings size={20} />} label="Protocolos" active={activeTab === 'settings'} collapsed={!isSidebarOpen} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} />
        </nav>

        {isSidebarOpen && user && (
          <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Acesso Verificado</p>
              <p className="text-[10px] font-bold text-purple-400 truncate tracking-tight">{user.email}</p>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="lg:hidden h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 shrink-0">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-400 hover:text-white"><Menu size={24} /></button>
          <span className="ml-4 font-bold cyber-font text-sm uppercase tracking-widest text-[var(--primary-color)]">FRELLA SYSTEM</span>
        </header>

        {!isPublicView && <GamificationBar stats={state.stats} currentIncome={monthlyIncome} />}

        <div className="flex-1 overflow-auto custom-scrollbar">
          {renderContent()}
        </div>
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
        isTaskModalOpen && <TaskModal
          clients={state.clients}
          invoices={state.invoices}
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
    </div >
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; collapsed?: boolean; onClick: () => void; }> = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${active ? 'bg-[var(--primary-color)]/15 text-[var(--primary-color)] border border-[var(--primary-color)]/20 shadow-[0_0_10px_var(--primary-shadow)]' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}>
    <div className="shrink-0">{icon}</div>
    {!collapsed && <span className="font-bold text-xs whitespace-nowrap uppercase tracking-[0.1em]">{label}</span>}
  </button>
);

export default Dashboard;
