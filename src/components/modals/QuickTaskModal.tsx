import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Zap, 
  Calendar as CalendarIcon, 
  User, 
  PlusCircle, 
  Search, 
  Check, 
  ChevronDown, 
  AlertTriangle, 
  Clock, 
  Plus, 
  UserPlus 
} from 'lucide-react';
import { Client, DayOfWeek, Task, Holiday } from '../../types';

interface QuickTaskModalProps {
  clients: Client[];
  holidays?: Holiday[];
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => void;
  onQuickAddClient: (client: Omit<Client, 'id'>) => Promise<string> | string;
}

const QuickTaskModal: React.FC<QuickTaskModalProps> = ({
  clients,
  holidays,
  onClose,
  onSubmit,
  onQuickAddClient
}) => {
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', company: '' });

  // Client search combobox state
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const clientSearchInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    clientId: clients.length > 0 ? clients[0].id : '',
    date: new Date().toLocaleDateString('en-CA'),
    briefing: ''
  });

  // Handle outside click for client dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isClientDropdownOpen && clientSearchInputRef.current) {
      setTimeout(() => clientSearchInputRef.current?.focus(), 50);
    }
  }, [isClientDropdownOpen]);

  // Filter clients by search query (Name or Company)
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return clients;
    const term = clientSearchTerm.toLowerCase().trim();
    return clients.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.company && c.company.toLowerCase().includes(term)) ||
      (c.contact && c.contact.toLowerCase().includes(term))
    );
  }, [clients, clientSearchTerm]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === formData.clientId);
  }, [clients, formData.clientId]);

  // Date Presets & Formatter Helper
  const getPresetDate = (type: 'today' | 'tomorrow' | 'friday' | 'nextMonday'): string => {
    const now = new Date();
    if (type === 'today') {
      return now.toLocaleDateString('en-CA');
    }
    if (type === 'tomorrow') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return d.toLocaleDateString('en-CA');
    }
    if (type === 'friday') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toLocaleDateString('en-CA');
    }
    if (type === 'nextMonday') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = (1 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toLocaleDateString('en-CA');
    }
    return now.toLocaleDateString('en-CA');
  };

  const formattedDateInfo = useMemo(() => {
    if (!formData.date) return { dayOfWeek: '', formattedDate: '' };
    try {
      const parts = formData.date.split('-');
      if (parts.length !== 3) return { dayOfWeek: '', formattedDate: formData.date };
      const [year, month, day] = parts.map(Number);
      const d = new Date(year, month - 1, day, 12, 0, 0);
      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      return {
        dayOfWeek: dayNames[d.getDay()],
        formattedDate: `${day} de ${monthNames[d.getMonth()]}`
      };
    } catch {
      return { dayOfWeek: '', formattedDate: formData.date };
    }
  }, [formData.date]);

  const activeHoliday = useMemo(() => {
    return holidays?.find(h => h.date === formData.date);
  }, [holidays, formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Informe o que precisa ser feito.');
      return;
    }

    // Check for holiday
    if (activeHoliday) {
      alert(`Impossível agendar: "${formData.date}" foi configurado como feriado/folga (${activeHoliday.description || 'Feriado'}).`);
      return;
    }

    let finalClientId = formData.clientId;

    if (isAddingNewClient) {
      if (!newClientData.name.trim()) {
        alert('Preencha o nome do novo cliente.');
        return;
      }
      finalClientId = await onQuickAddClient(newClientData);
    }

    if (!finalClientId) {
      alert('Selecione ou crie um cliente para esta demanda.');
      return;
    }

    const dateObj = new Date(formData.date + 'T12:00:00');
    const dayNames: DayOfWeek[] = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const derivedDay = dayNames[dateObj.getDay()];

    const taskData: Omit<Task, 'id'> = {
      title: formData.title,
      clientId: finalClientId,
      value: 0, // Demanda rápida sem objetivo financeiro
      day: derivedDay,
      date: formData.date,
      status: 'Pendente',
      category: 'Demanda Rápida',
      briefing: formData.briefing || undefined,
      position: 0
    };

    onSubmit(taskData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 w-full max-w-lg flex flex-col rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.15)] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 text-amber-400">
              <Zap size={22} className="fill-amber-400/20" />
            </div>
            <div>
              <h2 className="text-xl font-bold cyber-font text-white uppercase tracking-tighter flex items-center gap-2">
                Demanda Rápida
              </h2>
              <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">
                Lembrete de serviço sem objetivo financeiro
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-800 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
              O que precisa ser feito? *
            </label>
            <input
              required
              autoFocus
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Enviar briefing no WhatsApp, Ajustar cor do logo..."
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-white placeholder:text-slate-600 outline-none text-sm font-medium transition-all shadow-inner"
            />
          </div>

          {/* Searchable Client Selector */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 space-y-3 relative" ref={clientDropdownRef}>
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <User size={12} className="text-amber-400" />
                Cliente Vinculado *
              </label>
              <button 
                type="button" 
                onClick={() => {
                  setIsAddingNewClient(!isAddingNewClient);
                  if (!isAddingNewClient) setNewClientData({ name: '', company: '' });
                }} 
                className="text-[9px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <UserPlus size={11} />
                {isAddingNewClient ? 'Selecionar da Lista' : 'Novo Cliente'}
              </button>
            </div>

            {isAddingNewClient ? (
              <div className="space-y-2 pt-1">
                <input 
                  required={isAddingNewClient} 
                  placeholder="Nome do cliente *" 
                  value={newClientData.name} 
                  onChange={e => setNewClientData({ ...newClientData, name: e.target.value })} 
                  className="w-full bg-slate-900 text-xs px-3 py-2.5 rounded-xl border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:border-amber-500" 
                />
                <input 
                  placeholder="Empresa (opcional)" 
                  value={newClientData.company} 
                  onChange={e => setNewClientData({ ...newClientData, company: e.target.value })} 
                  className="w-full bg-slate-900 text-xs px-3 py-2.5 rounded-xl border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:border-amber-500" 
                />
              </div>
            ) : (
              <div className="relative">
                {/* Combobox Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-left text-white flex items-center justify-between gap-2 transition-all shadow-inner cursor-pointer"
                >
                  {selectedClient ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-[10px] shrink-0 border border-amber-500/30">
                        {selectedClient.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-100">{selectedClient.name}</span>
                        {selectedClient.company && (
                          <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                            ({selectedClient.company})
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 font-medium">Selecione ou busque um cliente...</span>
                  )}
                  <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Popover */}
                {isClientDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Filter Input inside Dropdown */}
                    <div className="p-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2">
                      <Search size={14} className="text-slate-500 shrink-0 ml-1" />
                      <input
                        ref={clientSearchInputRef}
                        type="text"
                        value={clientSearchTerm}
                        onChange={e => setClientSearchTerm(e.target.value)}
                        placeholder="Buscar por nome ou empresa..."
                        className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none pr-2"
                      />
                      {clientSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setClientSearchTerm('')}
                          className="text-slate-500 hover:text-white p-1 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Filtered Clients List */}
                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                      {filteredClients.map(c => {
                        const isSelected = formData.clientId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, clientId: c.id }));
                              setIsClientDropdownOpen(false);
                              setClientSearchTerm('');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-amber-500/20 text-white font-bold border border-amber-500/40' 
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-5 h-5 rounded-md bg-slate-800 text-[10px] font-bold text-amber-400 flex items-center justify-center shrink-0">
                                {c.name.charAt(0)}
                              </div>
                              <div className="truncate">
                                <span className="font-semibold">{c.name}</span>
                                {c.company && (
                                  <span className="text-[10px] text-slate-500 ml-1.5">
                                    • {c.company}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && <Check size={14} className="text-amber-400 shrink-0" />}
                          </button>
                        );
                      })}

                      {filteredClients.length === 0 && (
                        <div className="py-4 px-3 text-center">
                          <p className="text-xs text-slate-500 italic mb-2">Nenhum cliente encontrado com "{clientSearchTerm}"</p>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewClient(true);
                              setNewClientData({ name: clientSearchTerm, company: '' });
                              setIsClientDropdownOpen(false);
                              setClientSearchTerm('');
                            }}
                            className="text-[10px] font-black uppercase text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={12} /> Cadastrar "{clientSearchTerm}"
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Date Picker Interface */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <CalendarIcon size={12} className="text-amber-400" />
                Data Alvo *
              </label>
              {formattedDateInfo.dayOfWeek && (
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                  {formattedDateInfo.dayOfWeek}
                </span>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, date: getPresetDate('today') }))}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                  formData.date === getPresetDate('today')
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, date: getPresetDate('tomorrow') }))}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                  formData.date === getPresetDate('tomorrow')
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, date: getPresetDate('friday') }))}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                  formData.date === getPresetDate('friday')
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                Sexta
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, date: getPresetDate('nextMonday') }))}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                  formData.date === getPresetDate('nextMonday')
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                Próx. Seg
              </button>
            </div>

            {/* Styled Date Input */}
            <div className="relative">
              <input 
                required 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white text-xs font-medium [color-scheme:dark] outline-none shadow-inner transition-all" 
              />
            </div>

            {/* Formatted Date Preview & Holiday Warning */}
            {activeHoliday ? (
              <div className="flex items-center gap-1.5 p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-[10px] font-bold animate-pulse">
                <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                <span>Feriado/Folga: {activeHoliday.description || 'Data Bloqueada'}</span>
              </div>
            ) : formattedDateInfo.formattedDate ? (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium px-1">
                <Clock size={11} className="text-amber-400/70" />
                <span>Agendado para <strong className="text-slate-200">{formattedDateInfo.formattedDate}</strong></span>
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
              Observações / Detalhes (Opcional)
            </label>
            <textarea
              value={formData.briefing}
              onChange={e => setFormData({ ...formData, briefing: e.target.value })}
              placeholder="Instruções rápidas, notas de acompanhamento ou links..."
              rows={3}
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-white text-xs outline-none resize-none placeholder:text-slate-600 shadow-inner"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] uppercase tracking-widest text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Zap size={16} className="fill-slate-950" />
            Adicionar Lembrete Rápido
          </button>
        </form>
      </div>
    </div>
  );
};

export default QuickTaskModal;
