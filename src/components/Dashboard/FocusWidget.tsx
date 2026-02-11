
import React, { useState } from 'react';
import { Target, Zap, Plus, Circle, CheckCircle2, DollarSign, Trash2, ArrowRight, Sparkles, Calendar, Clock, Bell, Pencil, X } from 'lucide-react';
import { Reminder } from '../../types';

interface FocusWidgetProps {
  reminders: Reminder[];
  onAddReminder: (text: string, date?: string, time?: string, alertBefore?: number) => void;
  onUpdateReminder: (id: string, text: string, date?: string, time?: string, alertBefore?: number) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

const FocusWidget: React.FC<FocusWidgetProps> = ({
  reminders,
  onAddReminder,
  onUpdateReminder,
  onToggleReminder,
  onDeleteReminder
}) => {
  const [inputValue, setInputValue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [alertBefore, setAlertBefore] = useState<number>(0);
  const [showOptions, setShowOptions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (editingId) {
      onUpdateReminder(editingId, inputValue, date || undefined, time || undefined, alertBefore || undefined);
    } else {
      onAddReminder(inputValue, date || undefined, time || undefined, alertBefore || undefined);
    }

    resetForm();
  };

  const resetForm = () => {
    setInputValue('');
    setDate('');
    setTime('');
    setAlertBefore(0);
    setShowOptions(false);
    setEditingId(null);
  };

  const handleEdit = (rem: Reminder) => {
    setInputValue(rem.text);
    setDate(rem.date || '');
    setTime(rem.time || '');
    setAlertBefore(rem.alertBefore || 0);
    setEditingId(rem.id);
    setShowOptions(true);
  };

  const getAlertLabel = (minutes: number) => {
    if (minutes === 60) return '1 hora antes';
    if (minutes === 120) return '2 horas antes';
    if (minutes === 30) return '30 min antes';
    if (minutes === 15) return '15 min antes';

    return `${minutes} min antes`;
  };

  return (
    <div className="space-y-6">

      {/* Lembretes Rápidos */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-800 bg-slate-950/30">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Briefing de Operações</h3>
          <form onSubmit={handleAdd} className="relative space-y-3">
            <div className="relative">
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onFocus={() => setShowOptions(true)}
                placeholder={editingId ? "Editando lembrete..." : "Novo lembrete (Dica: use R$ para financeiro)"}
                className={`w-full bg-slate-800 border ${editingId ? 'border-[var(--primary-color)]' : 'border-slate-700'} rounded-2xl pl-12 pr-12 py-4 text-xs text-white focus:border-[var(--primary-color)] outline-none transition-all`}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">
                {editingId ? <Pencil size={18} className="text-[var(--primary-color)]" /> : <Plus size={18} />}
              </div>

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="p-2 bg-rose-500/20 text-rose-500 rounded-xl hover:bg-rose-500/30 transition-colors"
                    title="Cancelar Edição"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="submit"
                  className="p-2 bg-[var(--primary-color)]/20 text-[var(--primary-color)] rounded-xl hover:bg-[var(--primary-color)]/30 transition-colors"
                  title={editingId ? "Salvar Alterações" : "Adicionar Lembrete"}
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {showOptions && (
              <div className="flex flex-wrap gap-2 animate-reveal">
                <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 flex-1 min-w-[120px]">
                  <Calendar size={14} className="text-slate-500" />
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="bg-transparent text-[10px] text-slate-300 outline-none w-full"
                  />
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 flex-1 min-w-[100px]">
                  <Clock size={14} className="text-slate-500" />
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="bg-transparent text-[10px] text-slate-300 outline-none w-full"
                  />
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 flex-1 min-w-[140px]">
                  <Bell size={14} className={alertBefore > 0 ? "text-[var(--primary-color)]" : "text-slate-500"} />
                  <select
                    value={alertBefore}
                    onChange={e => setAlertBefore(Number(e.target.value))}
                    className="bg-transparent text-[10px] text-slate-300 outline-none w-full appearance-none cursor-pointer"
                  >
                    <option value={0} className="bg-slate-900 text-slate-500">Sem alerta</option>
                    <option value={5} className="bg-slate-900">5 min antes</option>
                    <option value={15} className="bg-slate-900">15 min antes</option>
                    <option value={30} className="bg-slate-900">30 min antes</option>
                    <option value={60} className="bg-slate-900">1 hora antes</option>
                    <option value={120} className="bg-slate-900">2 horas antes</option>
                  </select>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="flex-1 p-4 max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
          {reminders.map(rem => (
            <div
              key={rem.id}
              className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${rem.completed ? 'bg-slate-950/50 border-transparent opacity-50' : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'}`}
            >
              <div className="flex items-center gap-4 w-full overflow-hidden">
                <button
                  onClick={() => onToggleReminder(rem.id)}
                  className={`transition-colors shrink-0 ${rem.completed ? 'text-emerald-500' : 'text-slate-600 hover:text-white'}`}
                >
                  {rem.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className={`text-xs font-bold truncate ${rem.completed ? 'line-through text-slate-600' : 'text-slate-200'}`}>
                    {rem.text}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {rem.type === 'finance' && (
                      <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter flex items-center gap-1 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        <DollarSign size={8} /> Financeiro
                      </span>
                    )}
                    {(rem.date || rem.time) && (
                      <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1 bg-slate-900/50 px-1.5 py-0.5 rounded">
                        <Calendar size={8} />
                        {rem.date && (() => {
                          const [y, m, d] = rem.date.split('-').map(Number);
                          return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
                        })()}
                        {rem.time && ` às ${rem.time}`}
                      </span>
                    )}
                    {rem.alertBefore && rem.alertBefore > 0 && (
                      <span className="text-[8px] font-bold text-[var(--primary-color)] flex items-center gap-1 bg-[var(--primary-color)]/10 px-1.5 py-0.5 rounded">
                        <Bell size={8} />
                        {getAlertLabel(rem.alertBefore)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(rem)}
                  className="p-1.5 text-slate-500 hover:text-[var(--primary-color)] transition-colors hover:bg-slate-800 rounded-lg"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDeleteReminder(rem.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors hover:bg-slate-800 rounded-lg"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {reminders.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Nenhum lembrete operacional</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FocusWidget;
