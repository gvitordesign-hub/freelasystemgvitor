
import React, { useState, useMemo } from 'react';
import {
  Plus, GripVertical, CheckCircle2, Circle,
  Clock, DollarSign, Calendar as CalendarIcon,
  LayoutDashboard, List, ChevronLeft, ChevronRight,
  Briefcase, AlertTriangle, Calendar, Pencil, Trash2, Maximize2
} from 'lucide-react';
import { Task, Client, DayOfWeek, Status } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import TaskDetailModal from './Modals/TaskDetailModal';
import ConfirmModal from './Modals/ConfirmModal';

interface KanbanBoardProps {
  tasks: Task[];
  clients: Client[];
  onUpdateStatus: (taskId: string, status: Status) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, day: DayOfWeek, date?: string, position?: number) => void;
}

type ViewMode = 'kanban' | 'diario' | 'mensal';
type DeadlineLevel = 'critical' | 'moderate' | 'light';

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, clients, onUpdateStatus, onAddTask, onEditTask, onDeleteTask, onMoveTask }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ id: string, position: 'top' | 'bottom' } | null>(null);

  // Helper to get start of week (Sunday)
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    // Actually, let's stick to simple Sunday start or adjust per user pref. 
    // User requested "Carousel", usually implies sequential days.
    // Let's standard on current date's Monday? Or just Sunday?
    // Let's use Monday as start of week.
    const monday = new Date(date.setDate(date.getDate() - date.getDay() + 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));

  // Generate 7 days from currentWeekStart
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentWeekStart]);

  const nextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const resetToToday = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || 'Frella Unknown';

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setDraggedTaskId(null);
  };

  const onDrop = (e: React.DragEvent, date: Date, targetTaskId?: string) => {
    e.preventDefault();
    setDraggedTaskId(null);
    setDropIndicator(null);

    const taskId = e.dataTransfer.getData('taskId');
    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1).split('-')[0]; // "Segunda"

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    const dateStr = localDate.toISOString().split('T')[0];

    if (taskId) {
      let newPos: number | undefined = undefined;

      if (targetTaskId) {
        const colTasks = tasks
          .filter(t => (t.date?.split('T')[0] === dateStr) || (!t.date && t.day === formattedDay))
          .sort((a, b) => (a.position || 0) - (b.position || 0));

        const targetIndex = colTasks.findIndex(t => t.id === targetTaskId);
        if (targetIndex !== -1) {
          newPos = dropIndicator?.position === 'top' ? targetIndex : targetIndex + 1;

          // If we are moving within the same column and down, adjust the index
          const sourceTask = tasks.find(t => t.id === taskId);
          const sameCol = sourceTask && (sourceTask.date?.split('T')[0] === dateStr || (!sourceTask.date && sourceTask.day === formattedDay));
          if (sameCol && sourceTask.position < targetIndex && dropIndicator?.position === 'bottom') {
            // newPos is already targetIndex + 1, which works
          }
        }
      }

      onMoveTask(taskId, formattedDay as DayOfWeek, dateStr, newPos);
    }
  };

  const handleDragOverCard = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (taskId === draggedTaskId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const isTop = y < rect.height / 2;
    setDropIndicator({ id: taskId, position: isTop ? 'top' : 'bottom' });
  };

  // ... (getDeadlineStyles kept same) ...
  const getDeadlineStyles = (status: Status) => {
    if (status === 'Concluído') {
      return {
        card: 'border-emerald-500/30 bg-emerald-500/5',
        badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        text: 'text-slate-500 line-through',
        icon: <CheckCircle2 size={10} />,
        label: 'CONCLUÍDO'
      };
    }

    if (status === 'Em Andamento') {
      return {
        card: 'border-slate-800 bg-slate-900/50 hover:border-blue-500/30',
        badge: 'bg-slate-800 text-slate-400 border border-slate-700',
        text: 'text-slate-200',
        icon: <Clock size={10} />,
        label: 'EM ANDAMENTO'
      };
    }

    // Pendente
    return {
      card: 'border-red-500/20 bg-slate-900/50 hover:border-red-500/40',
      badge: 'bg-red-500/10 text-red-400 border border-red-500/20',
      text: 'text-slate-200',
      icon: <Calendar size={10} />,
      label: 'PENDENTE'
    };
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextDay = () => setCurrentDate(new Date(currentDate.getTime() + 86400000));
  const prevDay = () => setCurrentDate(new Date(currentDate.getTime() - 86400000));

  // Header Date Range Display
  const weekRangeLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}`;
  }, [weekDates]);

  const renderMonthlyView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 gap-4">
          <h2 className="cyber-font font-bold text-white uppercase tracking-widest text-xs md:text-sm truncate">{monthName}</h2>
          <div className="flex gap-1 md:gap-2 shrink-0">
            <button onClick={prevMonth} className="p-2 md:p-2.5 hover:bg-slate-800 rounded-lg text-slate-400 active:scale-90 transition-all"><ChevronLeft size={18} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 md:px-4 py-2 hover:bg-slate-800 rounded-lg text-[10px] font-bold uppercase text-slate-400">Hoje</button>
            <button onClick={nextMonth} className="p-2 md:p-2.5 hover:bg-slate-800 rounded-lg text-slate-400 active:scale-90 transition-all"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
          <div className="grid grid-cols-7 gap-1 md:gap-2 min-w-[700px] md:min-w-0">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-600 uppercase py-2">{d}</div>
            ))}
            {days.map((date, idx) => {
              const dateStr = date?.toISOString().split('T')[0];
              const dayTasks = tasks.filter(t => t.date?.split('T')[0] === dateStr);
              const isToday = date?.toDateString() === new Date().toDateString();

              return (
                <div
                  key={idx}
                  className={`min-h-[80px] md:min-h-[120px] p-2 rounded-xl border border-slate-800/50 flex flex-col gap-1 transition-all ${date ? 'bg-slate-900/20 hover:bg-slate-900/40' : 'opacity-0'} ${isToday ? 'border-[var(--primary-color)]/50 bg-[var(--primary-color)]/5' : ''}`}
                >
                  {date && (
                    <>
                      <span className={`text-[10px] font-bold ${isToday ? 'text-[var(--primary-color)]' : 'text-slate-500'}`}>{date.getDate()}</span>
                      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                        {dayTasks.map(t => {
                          const styles = getDeadlineStyles(t.status);
                          return (
                            <div
                              key={t.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedTask(t); }}
                              className={`text-[8px] md:text-[9px] p-1 rounded border-l-2 truncate font-medium cursor-pointer hover:brightness-110 active:scale-95 transition-all ${styles.card} ${styles.text}`}
                            >
                              {t.title}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDailyView = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayTasks = tasks.filter(t => t.date?.split('T')[0] === dateStr);
    const dayName = currentDate.toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6 bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
          <button onClick={prevDay} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><ChevronLeft size={20} /></button>
          <div className="text-center">
            <h2 className="cyber-font font-bold text-white uppercase text-sm">{dayName}</h2>
          </div>
          <button onClick={nextDay} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><ChevronRight size={20} /></button>
        </div>

        <div className="space-y-4 flex-1">
          {dayTasks.length > 0 ? dayTasks.map(task => {
            const styles = getDeadlineStyles(task.status);
            return (
              <div key={task.id} className={`bg-slate-900 border p-6 rounded-3xl flex items-center justify-between group transition-all ${styles.card}`}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-[var(--primary-color)] tracking-widest">{getClientName(task.clientId)}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 ${styles.badge}`}>
                      {styles.icon} {styles.label}
                    </span>
                  </div>
                  <h4 className={`text-lg font-bold ${styles.text}`}>{task.title}</h4>
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-slate-800 px-2 py-1 rounded-md text-slate-400 border border-slate-700 font-bold uppercase tracking-tighter">{task.category}</span>
                    <span className="text-[10px] bg-emerald-500/10 px-2 py-1 rounded-md text-emerald-400 border border-emerald-500/20 font-bold">R$ {task.value.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 md:gap-2 items-center">
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="p-3 md:p-3.5 rounded-2xl bg-slate-800 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 active:scale-90 transition-all"
                    title="Detalhes"
                  >
                    <Maximize2 size={20} />
                  </button>
                  <button
                    onClick={() => onEditTask(task)}
                    className="p-3 md:p-3.5 rounded-2xl bg-slate-800 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 active:scale-90 transition-all"
                    title="Editar"
                  >
                    <Pencil size={20} />
                  </button>
                  <button
                    onClick={() => setTaskToDelete(task)}
                    className="p-3 md:p-3.5 rounded-2xl bg-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={20} />
                  </button>
                  <div className="w-px h-10 bg-slate-800 mx-1 md:mx-2" />
                  <button
                    onClick={() => onUpdateStatus(task.id, task.status === 'Concluído' ? 'Pendente' : 'Concluído')}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-all ${task.status === 'Concluído' ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-800 text-slate-500 hover:bg-emerald-500/20 hover:text-emerald-400'}`}
                  >
                    <CheckCircle2 size={24} />
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="py-20 text-center flex flex-col items-center gap-4 opacity-40">
              <Clock size={48} className="text-slate-600" />
              <p className="cyber-font uppercase text-xs font-bold tracking-widest">Protocolo Vazio para Hoje</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-reveal">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold cyber-font text-white uppercase">Agenda de Missões</h1>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'kanban' ? 'bg-[var(--primary-color)] text-white neon-shadow-primary' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'}`}
            >
              <LayoutDashboard size={14} /> Kanban Semanal
            </button>
            <button
              onClick={() => setViewMode('mensal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'mensal' ? 'bg-[var(--primary-color)] text-white neon-shadow-primary' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'}`}
            >
              <CalendarIcon size={14} /> Mensal
            </button>
            <button
              onClick={() => setViewMode('diario')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'diario' ? 'bg-[var(--primary-color)] text-white neon-shadow-primary' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'}`}
            >
              <List size={14} /> Diário
            </button>
          </div>
        </div>
        <button
          onClick={onAddTask}
          className="flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:brightness-110 text-white px-6 py-4 rounded-2xl font-black transition-all neon-shadow-primary text-xs uppercase tracking-widest shrink-0"
        >
          <Plus size={18} />
          Adicionar Demanda
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' && (
          <div className="h-full flex flex-col gap-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                <button onClick={prevWeek} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><ChevronLeft size={18} /></button>
                <span className="cyber-font text-white font-bold text-xs uppercase tracking-widest min-w-[120px] text-center">{weekRangeLabel}</span>
                <button onClick={nextWeek} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><ChevronRight size={18} /></button>
              </div>
              <button onClick={resetToToday} className="text-[10px] font-bold text-[var(--primary-color)] hover:underline uppercase tracking-widest">
                Voltar para Hoje
              </button>
            </div>

            <div className="flex-1 flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory">
              {weekDates.map(date => {
                const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
                const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1).split('-')[0];
                const dateNum = date.getDate();
                const dateStr = date.toISOString().split('T')[0]; // Current column date YYYY-MM-DD

                const isToday = new Date().toDateString() === date.toDateString();

                // Filter tasks for this date
                // Fallback: If task has NO date, show it on its matching 'day' string IF we are in the current week
                const isCurrentWeek = getStartOfWeek(new Date()).getTime() === currentWeekStart.getTime();

                const colTasks = tasks.filter(t => {
                  if (t.date) {
                    return t.date.split('T')[0] === dateStr;
                  }
                  if (isCurrentWeek && t.day === formattedDayName) {
                    return true;
                  }
                  return false;
                }).sort((a, b) => (a.position || 0) - (b.position || 0));

                return (
                  <div
                    key={dateStr}
                    className={`flex-shrink-0 w-[85vw] sm:w-80 border rounded-3xl flex flex-col snap-center transition-all ${isToday ? 'bg-[var(--primary-color)]/5 border-[var(--primary-color)]/30' : 'bg-slate-900/40 border-slate-800'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, date)}
                  >
                    <div className={`p-5 border-b flex items-center justify-between rounded-t-3xl ${isToday ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/20' : 'bg-slate-900/60 border-slate-800'}`}>
                      <div className="flex flex-col">
                        <h3 className={`font-bold cyber-font uppercase tracking-widest text-[10px] ${isToday ? 'text-[var(--primary-color)]' : 'text-slate-300'}`}>{formattedDayName}</h3>
                        <span className="text-[9px] font-bold text-slate-500">{date.toLocaleDateString('pt-BR')}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${isToday ? 'bg-[var(--primary-color)] text-slate-950 border-[var(--primary-color)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[400px] md:min-h-[500px] custom-scrollbar">
                      {colTasks.map(task => {
                        const styles = getDeadlineStyles(task.status);
                        const isDragged = draggedTaskId === task.id;
                        return (
                          <div key={task.id} className="relative">
                            {dropIndicator?.id === task.id && dropIndicator?.position === 'top' && (
                              <div className="h-1 bg-[var(--primary-color)] rounded-full mb-1 animate-pulse" />
                            )}
                            <div
                              draggable
                              onDragStart={(e) => onDragStart(e, task.id)}
                              onDragEnd={onDragEnd}
                              onDragOver={(e) => handleDragOverCard(e, task.id)}
                              onDrop={(e) => onDrop(e, date, task.id)}
                              onClick={() => setSelectedTask(task)}
                              className={`group border p-4 rounded-2xl transition-all cursor-pointer hover:border-[var(--primary-color)]/50 
                                ${isDragged ? 'opacity-20 border-dashed border-[var(--primary-color)] scale-95 shadow-none' : ''} 
                                ${styles.card}`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-950 px-2 py-1 rounded-md border border-slate-800 max-w-[150px] truncate">
                                    {getClientName(task.clientId)}
                                  </span>
                                  <div className={`flex items-center gap-1 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${styles.badge}`}>
                                    {styles.icon} {styles.label}
                                  </div>
                                </div>
                                <div className={`text-slate-700 group-hover:text-[var(--primary-color)] transition-colors`}>
                                  <GripVertical size={14} />
                                </div>
                              </div>

                              <h4 className={`font-bold text-sm mb-4 leading-snug transition-all ${styles.text}`}>
                                {task.title}
                              </h4>

                              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/50">
                                <div className="flex flex-col">
                                  <div className={`flex items-center gap-1 font-black text-xs ${task.status === 'Concluído' ? 'text-slate-600' : 'text-emerald-400'}`}>
                                    <DollarSign size={12} />
                                    {task.value.toLocaleString('pt-BR')}
                                  </div>
                                  {task.status === 'Concluído' && (
                                    <div className="flex items-center gap-1 text-purple-400 text-[8px] font-bold uppercase mt-1">
                                      <Briefcase size={8} /> Portfólio
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-1 items-center">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                                    className="p-1.5 rounded-lg transition-colors text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10"
                                    title="Expandir"
                                  >
                                    <Maximize2 size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                    className="p-1.5 rounded-lg transition-colors text-slate-600 hover:text-blue-400 hover:bg-blue-500/10"
                                    title="Editar"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setTaskToDelete(task); }}
                                    className="p-1.5 rounded-lg transition-colors text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                                    title="Excluir"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <div className="w-px h-4 bg-slate-800 mx-1"></div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, 'Em Andamento'); }}
                                    className={`p-1.5 rounded-lg transition-colors ${task.status === 'Em Andamento' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}
                                  >
                                    <Circle size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, 'Concluído'); }}
                                    className={`p-1.5 rounded-lg transition-colors ${task.status === 'Concluído' ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-slate-600 hover:text-slate-400'}`}
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            {dropIndicator?.id === task.id && dropIndicator?.position === 'bottom' && (
                              <div className="h-1 bg-[var(--primary-color)] rounded-full mt-1 animate-pulse" />
                            )}
                          </div>
                        );
                      })}

                      {colTasks.length === 0 && (
                        <div className="h-32 border-2 border-dashed border-slate-800/50 rounded-2xl flex items-center justify-center text-slate-700 text-[10px] font-bold uppercase tracking-widest italic opacity-40">
                          Sem Missões
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {viewMode === 'mensal' && renderMonthlyView()}
        {viewMode === 'diario' && renderDailyView()}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          client={clients.find(c => c.id === selectedTask.clientId)}
          onClose={() => setSelectedTask(null)}
          onEdit={() => {
            onEditTask(selectedTask);
            setSelectedTask(null);
          }}
          onDelete={() => {
            setTaskToDelete(selectedTask);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <ConfirmModal
          title="Excluir Demanda"
          message={`Você tem certeza que deseja deletar o projeto "${taskToDelete.title}"? Esta ação não poderá ser desfeita.`}
          confirmLabel="Sim, Excluir"
          cancelLabel="Manter Projeto"
          onConfirm={() => {
            onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
            setSelectedTask(null);
          }}
          onCancel={() => setTaskToDelete(null)}
          isDanger={true}
        />
      )}
    </div>
  );
};

export default KanbanBoard;
