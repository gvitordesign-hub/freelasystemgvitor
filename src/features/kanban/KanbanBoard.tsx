import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, GripVertical, CheckCircle2, Circle,
  Clock, DollarSign, Calendar as CalendarIcon,
  LayoutDashboard, List, ChevronLeft, ChevronRight,
  Briefcase, AlertTriangle, Calendar, Pencil, Trash2, Maximize2, Zap,
  Sparkles, Check
} from 'lucide-react';
import { Task, Client, DayOfWeek, Status, Holiday } from '@/types';
import { DAYS_OF_WEEK } from '@/constants';
import TaskDetailModal from '@/components/modals/TaskDetailModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface KanbanBoardProps {
  tasks: Task[];
  clients: Client[];
  holidays?: Holiday[];
  onUpdateStatus: (taskId: string, status: Status) => void;
  onAddTask: () => void;
  onAddQuickTask?: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, day: DayOfWeek, date?: string, position?: number) => void;
  onUpdateTask?: (id: string, task: Partial<Task>) => void;
}

type ViewMode = 'kanban' | 'diario' | 'mensal';

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  tasks, 
  clients, 
  holidays, 
  onUpdateStatus, 
  onAddTask, 
  onAddQuickTask,
  onEditTask, 
  onDeleteTask, 
  onMoveTask,
  onUpdateTask
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ id: string, position: 'top' | 'bottom' } | null>(null);

  const handleToggleDeliverable = (task: Task, deliverableId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!task.deliverables || !onUpdateTask) return;

    const updatedDeliverables = task.deliverables.map(d =>
      d.id === deliverableId ? { ...d, completed: !d.completed } : d
    );

    const allCompleted = updatedDeliverables.length > 0 && updatedDeliverables.every(d => d.completed);
    const updates: Partial<Task> = { deliverables: updatedDeliverables };

    if (allCompleted && task.status !== 'Concluído') {
      updates.status = 'Concluído';
    }

    onUpdateTask(task.id, updates);

    if (selectedTask && selectedTask.id === task.id) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const boardRef = useRef<HTMLDivElement>(null);
  const dummyRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  const handleDummyScroll = () => {
    if (dummyRef.current && boardRef.current) {
      if (boardRef.current.scrollLeft !== dummyRef.current.scrollLeft) {
        boardRef.current.scrollLeft = dummyRef.current.scrollLeft;
      }
    }
  };

  const handleBoardScroll = () => {
    if (boardRef.current && dummyRef.current) {
      if (dummyRef.current.scrollLeft !== boardRef.current.scrollLeft) {
        dummyRef.current.scrollLeft = boardRef.current.scrollLeft;
      }
    }
  };

  const [scrollbarStyle, setScrollbarStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (boardRef.current && viewMode === 'kanban') {
      const updateDimensionsAndPosition = () => {
        if (boardRef.current) {
          const rect = boardRef.current.getBoundingClientRect();
          setContentWidth(boardRef.current.scrollWidth);
          setScrollbarStyle({
            position: 'fixed',
            bottom: 0,
            left: rect.left,
            width: rect.width,
            zIndex: 40,
          });
        }
      };
      
      updateDimensionsAndPosition();
      
      window.addEventListener('resize', updateDimensionsAndPosition);
      window.addEventListener('scroll', updateDimensionsAndPosition, true);
      
      const observer = new ResizeObserver(updateDimensionsAndPosition);
      observer.observe(boardRef.current);
      if (boardRef.current.firstElementChild) {
        observer.observe(boardRef.current.firstElementChild);
      }
      
      return () => {
        window.removeEventListener('resize', updateDimensionsAndPosition);
        window.removeEventListener('scroll', updateDimensionsAndPosition, true);
        observer.disconnect();
      };
    }
  }, [tasks, viewMode]);

  // Helper to get start of week (Sunday)
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    return date;
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

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || 'Cliente Externo';

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
    const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1).split('-')[0];

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    const dateStr = localDate.toISOString().split('T')[0];

    // Check if destination date is a holiday
    const isHoliday = holidays?.some(h => h.date === dateStr);
    if (isHoliday) {
      const holidayName = holidays?.find(h => h.date === dateStr)?.description || 'Feriado';
      alert(`Impossível reagendar: o dia "${dateStr}" foi configurado como feriado/folga (${holidayName}).`);
      return;
    }

    if (taskId) {
      let newPos: number | undefined = undefined;

      if (targetTaskId) {
        const colTasks = tasks
          .filter(t => (t.date?.split('T')[0] === dateStr) || (!t.date && t.day === formattedDay))
          .sort((a, b) => (a.position || 0) - (b.position || 0));

        const targetIndex = colTasks.findIndex(t => t.id === targetTaskId);
        if (targetIndex !== -1) {
          newPos = dropIndicator?.position === 'top' ? targetIndex : targetIndex + 1;
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

  const getDeadlineStyles = (status: Status, category?: string) => {
    const isQuick = category === 'Demanda Rápida';

    if (status === 'Concluído') {
      return {
        card: isQuick 
          ? 'border-amber-500/30 bg-amber-950/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)]' 
          : 'border-emerald-500/30 bg-emerald-950/15 shadow-[0_4px_20px_rgba(0,0,0,0.25)]',
        badge: isQuick 
          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
        text: 'text-slate-400 line-through',
        icon: <CheckCircle2 size={11} />,
        label: isQuick ? 'LEMBRETE CONCLUÍDO' : 'CONCLUÍDO'
      };
    }

    if (status === 'Em Andamento') {
      return {
        card: isQuick 
          ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/30 to-slate-900/90 shadow-[0_4px_20px_rgba(245,158,11,0.12)] hover:border-amber-400' 
          : 'border-blue-500/40 bg-gradient-to-b from-blue-950/30 to-slate-900/90 shadow-[0_4px_20px_rgba(59,130,246,0.12)] hover:border-blue-400',
        badge: isQuick 
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
        text: 'text-slate-100 font-bold',
        icon: isQuick ? <Zap size={11} className="fill-amber-400/30" /> : <Clock size={11} />,
        label: isQuick ? 'DEMANDA RÁPIDA' : 'EM ANDAMENTO'
      };
    }

    // Pendente
    return {
      card: isQuick 
        ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-slate-900/90 shadow-[0_4px_20px_rgba(245,158,11,0.1)] hover:border-amber-400' 
        : 'border-slate-800/90 bg-slate-900/80 hover:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.25)]',
      badge: isQuick 
        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
      text: 'text-slate-200',
      icon: isQuick ? <Zap size={11} className="fill-amber-400/30" /> : <Calendar size={11} />,
      label: isQuick ? 'DEMANDA RÁPIDA' : 'PENDENTE'
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
      <div className="flex flex-col h-full animate-reveal">
        <div className="flex items-center justify-between mb-4 bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-800/80 gap-4 shadow-lg">
          <h2 className="cyber-font font-bold text-white uppercase tracking-widest text-xs md:text-sm truncate">{monthName}</h2>
          <div className="flex gap-1 md:gap-2 shrink-0">
            <button onClick={prevMonth} className="p-2 md:p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"><ChevronLeft size={18} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 md:px-4 py-2 hover:bg-slate-800 rounded-xl text-[10px] font-bold uppercase text-slate-300 hover:text-white cursor-pointer">Hoje</button>
            <button onClick={nextMonth} className="p-2 md:p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
          <div className="grid grid-cols-7 gap-2 min-w-[700px] md:min-w-0">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-2 tracking-wider">{d}</div>
            ))}
            {days.map((date, idx) => {
              const dateStr = date?.toLocaleDateString('en-CA');
              const dayTasks = tasks.filter(t => t.date?.split('T')[0] === dateStr);
              const isToday = date?.toDateString() === new Date().toDateString();
              const holiday = dateStr ? holidays?.find(h => h.date === dateStr) : null;

              return (
                <div
                  key={idx}
                  className={`min-h-[90px] md:min-h-[130px] p-2.5 rounded-2xl border flex flex-col gap-1.5 transition-all duration-200 
                    ${date ? 'bg-slate-900/60 backdrop-blur-md hover:bg-slate-900/90' : 'opacity-0'} 
                    ${isToday ? 'border-[var(--primary-color)]/60 bg-[var(--primary-color)]/10 shadow-[0_0_20px_var(--primary-shadow)]' : 'border-slate-800/80'}
                    ${holiday ? 'border-rose-500/40 bg-rose-950/20' : ''}`}
                >
                  {date && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-bold cyber-font ${isToday ? 'text-[var(--primary-color)] font-black' : holiday ? 'text-rose-400' : 'text-slate-400'}`}>{date.getDate()}</span>
                        {holiday && (
                          <span className="text-[7px] bg-rose-500/20 border border-rose-500/40 text-rose-300 px-1.5 py-0.5 rounded font-black uppercase tracking-wider scale-90 origin-right truncate max-w-[55px]" title={holiday.description}>
                            FOLGA
                          </span>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {holiday && (
                          <div className="text-[7px] text-rose-300 font-bold uppercase tracking-tight text-center py-0.5 px-1 bg-rose-500/10 border border-rose-500/20 rounded truncate" title={holiday.description}>
                            {holiday.description}
                          </div>
                        )}
                        {dayTasks.map(t => {
                          const styles = getDeadlineStyles(t.status, t.category);
                          return (
                            <div
                              key={t.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedTask(t); }}
                              className={`text-[8px] md:text-[9px] p-1.5 rounded-lg border truncate font-medium cursor-pointer hover:brightness-125 active:scale-95 transition-all shadow-sm ${styles.card} ${styles.text}`}
                            >
                              {t.category === 'Demanda Rápida' ? `⚡ ${t.title}` : t.title}
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
    const dateStr = currentDate.toLocaleDateString('en-CA');
    const dayTasks = tasks.filter(t => t.date?.split('T')[0] === dateStr);
    const dayName = currentDate.toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const holiday = holidays?.find(h => h.date === dateStr);

    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto w-full animate-reveal">
        <div className="flex items-center justify-between mb-6 bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800/80 shadow-lg">
          <button onClick={prevDay} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronLeft size={20} /></button>
          <div className="text-center">
            <h2 className="cyber-font font-bold text-white uppercase text-sm">{dayName}</h2>
          </div>
          <button onClick={nextDay} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronRight size={20} /></button>
        </div>

        {holiday && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-3 shadow-lg">
            <AlertTriangle className="animate-pulse shrink-0 text-rose-400" size={18} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Feriado / Dia de Folga</p>
              <p className="text-[10px] text-rose-300 font-bold mt-0.5">{holiday.description}</p>
            </div>
          </div>
        )}

        <div className="space-y-4 flex-1">
          {dayTasks.length > 0 ? dayTasks.map(task => {
            const styles = getDeadlineStyles(task.status, task.category);
            const isQuick = task.category === 'Demanda Rápida';

            return (
              <div key={task.id} className={`border p-6 rounded-3xl flex items-center justify-between group transition-all duration-200 hover:-translate-y-0.5 ${styles.card}`}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-[var(--primary-color)] tracking-widest">{getClientName(task.clientId)}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${styles.badge}`}>
                      {styles.icon} {styles.label}
                    </span>
                  </div>
                  <h4 className={`text-base font-bold ${styles.text}`}>{task.title}</h4>
                  
                  {/* Barra de Progresso no Modo Diário */}
                  {task.deliverables && task.deliverables.length > 0 && (() => {
                    const total = task.deliverables.length;
                    const done = task.deliverables.filter(d => d.completed).length;
                    const percent = Math.round((done / total) * 100);

                    return (
                      <div className="w-full max-w-xs space-y-1.5 py-1">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Sparkles size={10} className="text-[var(--primary-color)]" />
                            {done}/{total} Entregáveis
                          </span>
                          <span className="text-emerald-400 font-mono">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--primary-color)] to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_8px_var(--primary-shadow)]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-2">
                    <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-tight ${
                      isQuick ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {task.category}
                    </span>
                    {isQuick ? (
                      <span className="text-[10px] bg-amber-500/15 px-2.5 py-1 rounded-lg text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                        <Zap size={10} className="fill-amber-400/30" /> Lembrete
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-500/15 px-2.5 py-1 rounded-lg text-emerald-300 border border-emerald-500/30 font-bold cyber-font">
                        R$ {task.value.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 md:gap-2 items-center">
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="p-3 rounded-2xl bg-slate-800/80 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/15 active:scale-90 transition-all cursor-pointer border border-slate-700/60"
                    title="Detalhes"
                  >
                    <Maximize2 size={18} />
                  </button>
                  <button
                    onClick={() => onEditTask(task)}
                    className="p-3 rounded-2xl bg-slate-800/80 text-slate-400 hover:text-blue-400 hover:bg-blue-500/15 active:scale-90 transition-all cursor-pointer border border-slate-700/60"
                    title="Editar"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => setTaskToDelete(task)}
                    className="p-3 rounded-2xl bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 active:scale-90 transition-all cursor-pointer border border-slate-700/60"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="w-px h-8 bg-slate-800 mx-1" />
                  <button
                    onClick={() => onUpdateStatus(task.id, task.status === 'Concluído' ? 'Pendente' : 'Concluído')}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all cursor-pointer ${
                      task.status === 'Concluído' 
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                        : 'bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 border border-slate-700/60'
                    }`}
                  >
                    <CheckCircle2 size={22} />
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="py-20 text-center flex flex-col items-center gap-4 opacity-40">
              <Clock size={48} className="text-slate-600" />
              <p className="cyber-font uppercase text-xs font-bold tracking-widest text-slate-400">Protocolo Vazio para Hoje</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-reveal max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black cyber-font text-white uppercase tracking-tight">Agenda de Missões</h1>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Gestão de Demandas & Entregas</p>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                viewMode === 'kanban' 
                  ? 'bg-[var(--primary-color)] text-white shadow-[0_2px_12px_var(--primary-shadow)]' 
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard size={14} /> Kanban Semanal
            </button>
            <button
              onClick={() => setViewMode('mensal')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                viewMode === 'mensal' 
                  ? 'bg-[var(--primary-color)] text-white shadow-[0_2px_12px_var(--primary-shadow)]' 
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <CalendarIcon size={14} /> Mensal
            </button>
            <button
              onClick={() => setViewMode('diario')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                viewMode === 'diario' 
                  ? 'bg-[var(--primary-color)] text-white shadow-[0_2px_12px_var(--primary-shadow)]' 
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <List size={14} /> Diário
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onAddQuickTask && (
            <button
              onClick={onAddQuickTask}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-500/20 text-amber-300 border border-amber-500/40 px-5 py-3.5 rounded-2xl font-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] text-xs uppercase tracking-widest active:scale-95 cursor-pointer"
              title="Criar lembrete rápido de serviço sem objetivo financeiro"
            >
              <Zap size={18} className="fill-amber-400/30" />
              Demanda Rápida
            </button>
          )}
          <button
            onClick={onAddTask}
            className="flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:brightness-110 text-white px-6 py-3.5 rounded-2xl font-black transition-all shadow-[0_4px_16px_var(--primary-shadow)] text-xs uppercase tracking-widest active:scale-95 cursor-pointer"
          >
            <Plus size={18} />
            Adicionar Demanda
          </button>
        </div>
      </div>

      <div className={`flex-1 ${viewMode === 'kanban' ? '' : 'overflow-hidden'}`}>
        {viewMode === 'kanban' && (
          <div className="h-full flex flex-col gap-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-800/80 shadow-md">
                <button onClick={prevWeek} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronLeft size={18} /></button>
                <span className="cyber-font text-white font-bold text-xs uppercase tracking-widest min-w-[130px] text-center">{weekRangeLabel}</span>
                <button onClick={nextWeek} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronRight size={18} /></button>
              </div>
              <button onClick={resetToToday} className="text-[10px] font-black text-[var(--primary-color)] hover:underline uppercase tracking-widest cursor-pointer">
                Voltar para Hoje
              </button>
            </div>

            <div 
              ref={boardRef}
              onScroll={handleBoardScroll}
              className="flex-1 flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory no-scrollbar"
            >
              {weekDates.map(date => {
                const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
                const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1).split('-')[0];
                const dateStr = date.toLocaleDateString('en-CA');

                const isToday = new Date().toDateString() === date.toDateString();
                const holiday = holidays?.find(h => h.date === dateStr);
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
                    className={`flex-shrink-0 w-[85vw] sm:w-80 border rounded-3xl flex flex-col snap-center transition-all duration-200 shadow-[0_8px_24px_rgba(0,0,0,0.3)]
                      ${isToday 
                        ? 'bg-slate-900/90 border-[var(--primary-color)]/50 shadow-[0_0_24px_var(--primary-shadow)]' 
                        : holiday 
                        ? 'bg-slate-900/80 border-rose-500/20' 
                        : 'bg-slate-900/75 backdrop-blur-xl border-slate-800/80'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, date)}
                  >
                    <div className={`p-4 border-b flex items-center justify-between rounded-t-3xl 
                      ${isToday ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/30' : holiday ? 'bg-rose-950/20 border-rose-500/20' : 'bg-slate-950/50 border-slate-800/80'}`}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <h3 className={`font-black cyber-font uppercase tracking-widest text-[11px] ${isToday ? 'text-[var(--primary-color)]' : holiday ? 'text-rose-400' : 'text-slate-200'}`}>{formattedDayName}</h3>
                          {holiday && (
                            <span className="text-[7px] font-black tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded">FOLGA</span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">{date.toLocaleDateString('pt-BR')}</span>
                      </div>
                      {holiday ? (
                        <span className="text-[8px] font-black text-rose-300 px-2.5 py-1 rounded-lg border bg-rose-950/40 border-rose-500/30 truncate max-w-[120px]" title={holiday.description.toUpperCase()}>
                          {holiday.description.toUpperCase()}
                        </span>
                      ) : (
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold cyber-font ${isToday ? 'bg-[var(--primary-color)] text-slate-950 border-[var(--primary-color)] shadow-[0_0_8px_var(--primary-color)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          {colTasks.length}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[400px] md:min-h-[500px] custom-scrollbar">
                      {colTasks.map(task => {
                        const styles = getDeadlineStyles(task.status, task.category);
                        const isDragged = draggedTaskId === task.id;
                        const isQuick = task.category === 'Demanda Rápida';

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
                              className={`group border p-4 rounded-2xl transition-all duration-200 cursor-pointer hover:border-[var(--primary-color)]/60 hover:-translate-y-0.5
                                ${isDragged ? 'opacity-20 border-dashed border-[var(--primary-color)] scale-95 shadow-none' : ''} 
                                ${styles.card}`}
                            >
                              <div className="flex justify-between items-start mb-2.5">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800 max-w-[150px] truncate">
                                    {getClientName(task.clientId)}
                                  </span>
                                  <div className={`flex items-center gap-1 text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${styles.badge}`}>
                                    {styles.icon} {styles.label}
                                  </div>
                                </div>
                                <div className="text-slate-600 group-hover:text-[var(--primary-color)] transition-colors">
                                  <GripVertical size={14} />
                                </div>
                              </div>

                              <h4 className={`font-bold text-sm mb-2 leading-snug transition-all ${styles.text}`}>
                                {task.title}
                              </h4>

                              {/* Barra de Progresso e Checklist de Entregáveis */}
                              {task.deliverables && task.deliverables.length > 0 && (() => {
                                const total = task.deliverables.length;
                                const done = task.deliverables.filter(d => d.completed).length;
                                const percent = Math.round((done / total) * 100);
                                const isFullyDone = done === total;

                                return (
                                  <div className="my-2.5 space-y-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                                      <span className="text-slate-400 flex items-center gap-1">
                                        <Sparkles size={10} className={isFullyDone ? 'text-emerald-400' : 'text-[var(--primary-color)]'} />
                                        {done}/{total} Entregáveis
                                      </span>
                                      <span className={isFullyDone ? 'text-emerald-400 font-mono' : 'text-slate-300 font-mono'}>
                                        {percent}%
                                      </span>
                                    </div>

                                    {/* Barra de Progresso Neon */}
                                    <div className="w-full bg-slate-800/90 h-1.5 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          isFullyDone
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                            : 'bg-gradient-to-r from-[var(--primary-color)] to-emerald-400 shadow-[0_0_8px_var(--primary-shadow)]'
                                        }`}
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>

                                    {/* Mini Checklist de Entregáveis */}
                                    <div className="space-y-1 pt-1 max-h-24 overflow-y-auto custom-scrollbar">
                                      {task.deliverables.map(d => (
                                        <div
                                          key={d.id}
                                          onClick={(e) => handleToggleDeliverable(task, d.id, e)}
                                          className="flex items-center justify-between gap-1.5 py-0.5 px-1 rounded-lg hover:bg-slate-800/60 cursor-pointer group/item transition-colors"
                                        >
                                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            <div
                                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                                                d.completed
                                                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                                                  : 'border-slate-600 group-hover/item:border-slate-400 bg-slate-900'
                                              }`}
                                            >
                                              {d.completed && <Check size={9} strokeWidth={3} />}
                                            </div>
                                            <span className={`text-[10px] truncate ${d.completed ? 'line-through text-slate-500' : 'text-slate-300 font-medium'}`}>
                                              {d.title}
                                            </span>
                                          </div>
                                          <span className="text-[9px] font-mono text-emerald-400/80 font-bold shrink-0">
                                            R${d.value}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/60">
                                <div className="flex flex-col">
                                  {isQuick ? (
                                    <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs">
                                      <Zap size={12} className="fill-amber-400/30" />
                                      Lembrete
                                    </div>
                                  ) : (
                                    <div className={`flex items-center gap-0.5 font-black text-xs cyber-font ${task.status === 'Concluído' ? 'text-slate-500' : 'text-emerald-400'}`}>
                                      <DollarSign size={12} />
                                      {task.value.toLocaleString('pt-BR')}
                                    </div>
                                  )}

                                  {task.status === 'Concluído' && !isQuick && (
                                    <div className="flex items-center gap-1 text-purple-400 text-[8px] font-bold uppercase mt-1">
                                      <Briefcase size={8} /> Portfólio
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-1 items-center">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                                    className="p-1.5 rounded-lg transition-colors text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
                                    title="Expandir"
                                  >
                                    <Maximize2 size={13} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                    className="p-1.5 rounded-lg transition-colors text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                                    title="Editar"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setTaskToDelete(task); }}
                                    className="p-1.5 rounded-lg transition-colors text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                    title="Excluir"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                  <div className="w-px h-4 bg-slate-800 mx-1"></div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, 'Em Andamento'); }}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${task.status === 'Em Andamento' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                                  >
                                    <Circle size={13} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, 'Concluído'); }}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${task.status === 'Concluído' ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-slate-500 hover:text-slate-300'}`}
                                  >
                                    <CheckCircle2 size={13} />
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
                        <div className={`h-32 border-2 border-dashed rounded-2xl flex items-center justify-center text-[10px] font-bold uppercase tracking-widest italic opacity-40
                          ${holiday ? 'border-rose-500/30 text-rose-400' : 'border-slate-800/80 text-slate-600'}`}>
                          {holiday ? 'Dia de Folga' : 'Sem Missões'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Dummy scrollbar to keep horizontal scroll sticky */}
            <div
              ref={dummyRef}
              onScroll={handleDummyScroll}
              style={scrollbarStyle}
              className="overflow-x-auto h-3 bg-slate-950/80 border-t border-slate-800 z-40"
            >
              <div style={{ width: `${contentWidth}px`, height: '1px' }} />
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
          onToggleDeliverable={(deliverableId) => handleToggleDeliverable(selectedTask, deliverableId)}
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
