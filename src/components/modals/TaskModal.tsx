import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  DollarSign, 
  UserPlus, 
  ChevronLeft, 
  ChevronDown,
  FileText, 
  PlusCircle, 
  Package, 
  Plus, 
  Trash2, 
  Sparkles, 
  Layers, 
  Check, 
  Search, 
  AlertTriangle, 
  Building2, 
  User, 
  Clock 
} from 'lucide-react';
import { Client, DayOfWeek, Task, Invoice, Holiday, Service, DeliverableItem } from '../../types';

interface TaskModalProps {
  clients: Client[];
  invoices: Invoice[];
  services?: Service[];
  editingTask?: Task | null;
  holidays?: Holiday[];
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => void;
  onUpdate?: (taskId: string, task: Omit<Task, 'id'>) => void;
  onQuickAddClient: (client: Omit<Client, 'id'>) => Promise<string> | string;
  onQuickAddInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<string> | string;
}

const TaskModal: React.FC<TaskModalProps> = ({
  clients,
  invoices,
  services = [],
  editingTask,
  holidays,
  onClose,
  onSubmit,
  onUpdate,
  onQuickAddClient,
  onQuickAddInvoice
}) => {
  const isEditMode = !!editingTask;
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [isAddingNewInvoice, setIsAddingNewInvoice] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', company: '' });
  const [newInvoiceTitle, setNewInvoiceTitle] = useState('');

  // Client search combobox state
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const clientSearchInputRef = useRef<HTMLInputElement>(null);

  // Deliverables (Entregáveis) State
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>(
    editingTask?.deliverables ? [...editingTask.deliverables] : []
  );
  const [newDeliverableName, setNewDeliverableName] = useState('');
  const [newDeliverablePrice, setNewDeliverablePrice] = useState('');

  const [formData, setFormData] = useState({
    title: editingTask?.title || '',
    clientId: editingTask?.clientId || '',
    invoiceId: editingTask?.invoiceId || '',
    value: editingTask?.value?.toString() || '',
    date: editingTask?.date ? (editingTask.date.includes('T') ? editingTask.date.split('T')[0] : editingTask.date) : new Date().toLocaleDateString('en-CA'),
    category: editingTask?.category || 'Design',
    briefing: editingTask?.briefing || '',
    status: editingTask?.status || 'Pendente'
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

  // Clear invoice area when toggling to add new client
  useEffect(() => {
    if (isAddingNewClient) {
      setFormData(prev => ({ ...prev, invoiceId: '' }));
      setIsAddingNewInvoice(false);
      setNewInvoiceTitle('');
      setIsClientDropdownOpen(false);
    }
  }, [isAddingNewClient]);

  // Deliverables Total Calculation
  const deliverablesTotal = useMemo(() => {
    return deliverables.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
  }, [deliverables]);

  // Auto-sync total value when deliverables change
  const handleAddDeliverable = (name: string, price: number, serviceId?: string) => {
    if (!name.trim()) return;
    const newItem: DeliverableItem = {
      id: Math.random().toString(36).substring(2, 9),
      title: name.trim(),
      value: price,
      completed: false,
      serviceId
    };
    const updated = [...deliverables, newItem];
    setDeliverables(updated);
    const sum = updated.reduce((acc, it) => acc + (Number(it.value) || 0), 0);
    setFormData(prev => ({ ...prev, value: sum.toString() }));
    setNewDeliverableName('');
    setNewDeliverablePrice('');
  };

  const handleRemoveDeliverable = (id: string) => {
    const updated = deliverables.filter(d => d.id !== id);
    setDeliverables(updated);
    if (updated.length > 0) {
      const sum = updated.reduce((acc, it) => acc + (Number(it.value) || 0), 0);
      setFormData(prev => ({ ...prev, value: sum.toString() }));
    }
  };

  const handleUpdateDeliverable = (id: string, updates: Partial<DeliverableItem>) => {
    const updated = deliverables.map(d => (d.id === id ? { ...d, ...updates } : d));
    setDeliverables(updated);
    const sum = updated.reduce((acc, it) => acc + (Number(it.value) || 0), 0);
    setFormData(prev => ({ ...prev, value: sum.toString() }));
  };

  const categories = ['Design', 'Desenvolvimento', 'Marketing', 'Redação', 'Consultoria', 'Social Media', 'Edição Video'];

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => inv.clientId === formData.clientId);
  }, [invoices, formData.clientId]);

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
        formattedDate: `${day} de ${monthNames[d.getMonth()]} de ${year}`
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

    // Check for holiday
    if (activeHoliday) {
      alert(`Impossível agendar: "${formData.date}" foi configurado como feriado/folga (${activeHoliday.description || 'Feriado'}).`);
      return;
    }

    let finalClientId = formData.clientId;
    let finalInvoiceId = formData.invoiceId;

    if (isAddingNewClient) {
      if (!newClientData.name.trim()) return alert('Preencha ao menos o nome do cliente.');
      finalClientId = await onQuickAddClient(newClientData);
    }

    if (!finalClientId) {
      alert('Selecione ou cadastre um cliente para o projeto.');
      return;
    }

    if (isAddingNewInvoice && newInvoiceTitle.trim()) {
      finalInvoiceId = await onQuickAddInvoice({
        clientId: finalClientId,
        title: newInvoiceTitle.trim(),
        createdAt: new Date().toISOString(),
        status: 'Pendente'
      });
    }

    const dateObj = new Date(formData.date + 'T12:00:00');
    const dayNames: DayOfWeek[] = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const derivedDay = dayNames[dateObj.getDay()];

    const taskData: Omit<Task, 'id'> = {
      title: formData.title,
      clientId: finalClientId,
      invoiceId: finalInvoiceId || undefined,
      value: parseFloat(formData.value) || 0,
      day: derivedDay,
      date: formData.date,
      status: formData.status as any,
      category: formData.category,
      briefing: formData.briefing || undefined,
      position: editingTask?.position || 0,
      deliverables: deliverables.length > 0 ? deliverables : undefined
    };

    if (isEditMode && onUpdate && editingTask) {
      onUpdate(editingTask.id, taskData);
    } else {
      onSubmit(taskData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold cyber-font text-white uppercase tracking-tighter">
              {isEditMode ? 'Editar Demanda de Projeto' : 'Nova Demanda de Projeto'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Crie o projeto mestre e adicione seus entregáveis discriminados
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">
              Título do Projeto / Demanda Mestre *
            </label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: CD CAROLL SOUÁ, Identidade Visual Tech..."
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:border-[var(--primary-color)] outline-none text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Searchable Client Selector */}
            <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800 relative" ref={clientDropdownRef}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={12} className="text-[var(--primary-color)]" />
                  Cliente *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewClient(!isAddingNewClient);
                    if (!isAddingNewClient) setNewClientData({ name: '', company: '' });
                  }}
                  className="text-[9px] font-black uppercase text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus size={11} />
                  {isAddingNewClient ? 'Selecionar da Lista' : '+ Novo'}
                </button>
              </div>

              {isAddingNewClient ? (
                <div className="space-y-2">
                  <input
                    required={isAddingNewClient}
                    placeholder="Nome completo do Cliente *"
                    value={newClientData.name}
                    onChange={e => setNewClientData({ ...newClientData, name: e.target.value })}
                    className="w-full bg-slate-900 text-xs px-3 py-2.5 rounded-xl border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:border-[var(--primary-color)]"
                  />
                  <input
                    placeholder="Empresa / Projeto (opcional)"
                    value={newClientData.company}
                    onChange={e => setNewClientData({ ...newClientData, company: e.target.value })}
                    className="w-full bg-slate-900 text-xs px-3 py-2.5 rounded-xl border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:border-[var(--primary-color)]"
                  />
                </div>
              ) : (
                <div className="relative">
                  {/* Combobox Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                    className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-700 focus:border-[var(--primary-color)] rounded-xl px-3.5 py-2.5 text-xs text-left text-white flex items-center justify-between gap-2 transition-all shadow-inner cursor-pointer"
                  >
                    {selectedClient ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-[var(--primary-color)]/20 text-[var(--primary-color)] font-black flex items-center justify-center text-[10px] shrink-0 border border-[var(--primary-color)]/30">
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
                          placeholder="Digitar nome ou empresa do cliente..."
                          className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none pr-2"
                        />
                        {clientSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setClientSearchTerm('')}
                            className="text-slate-500 hover:text-white p-1"
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
                                setFormData(prev => ({ ...prev, clientId: c.id, invoiceId: '' }));
                                setIsAddingNewInvoice(false);
                                setNewInvoiceTitle('');
                                setIsClientDropdownOpen(false);
                                setClientSearchTerm('');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                                isSelected 
                                  ? 'bg-[var(--primary-color)]/20 text-white font-bold border border-[var(--primary-color)]/40' 
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-5 h-5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-center shrink-0">
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
                              {isSelected && <Check size={14} className="text-[var(--primary-color)] shrink-0" />}
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
                              className="text-[10px] font-black uppercase text-[var(--primary-color)] hover:underline inline-flex items-center gap-1"
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

            {/* Invoice Link */}
            <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={12} className="text-emerald-400" />
                  Vincular Nota de Cobrança
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewInvoice(!isAddingNewInvoice)}
                  className="text-[9px] font-black uppercase text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle size={11} />
                  {isAddingNewInvoice ? 'Selecionar da Lista' : '+ Nova'}
                </button>
              </div>
              {isAddingNewInvoice ? (
                <input
                  required={isAddingNewInvoice}
                  placeholder="Título da Nova Nota *"
                  value={newInvoiceTitle}
                  onChange={e => setNewInvoiceTitle(e.target.value)}
                  className="w-full bg-slate-900 text-xs px-3 py-2.5 rounded-xl border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:border-emerald-500"
                />
              ) : (
                <select
                  value={formData.invoiceId}
                  onChange={e => setFormData({ ...formData, invoiceId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer shadow-inner"
                >
                  <option value="">Nenhuma (Pasta Geral / Avulsa)</option>
                  {filteredInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.title} {inv.status === 'Pago' ? '(Pago)' : '(Pendente)'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Seção Entregáveis do Projeto com Cardápio de Serviços */}
          <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="text-[var(--primary-color)]" size={18} />
                <span className="text-xs font-black cyber-font text-white uppercase tracking-wider">
                  Entregáveis & Peças do Projeto
                </span>
              </div>
              {deliverables.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {deliverables.length} {deliverables.length === 1 ? 'peça' : 'peças'} • Total: {deliverablesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )}
            </div>

            {/* Chips Rápidos do Cardápio de Serviços */}
            {services.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-400" />
                  Inserir do Cardápio de Serviços (1 clique):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-0.5">
                  {services.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleAddDeliverable(s.name, s.baseValue, s.id)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-800/80 hover:bg-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/50 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                    >
                      <Plus size={11} className="text-[var(--primary-color)]" />
                      <span>{s.name}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        R$ {s.baseValue}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input para adicionar entregável avulso */}
            <div className="flex gap-2 items-center pt-1">
              <input
                type="text"
                placeholder="Nome da peça (ex: Motion - Ouça Agora, Capa Youtube...)"
                value={newDeliverableName}
                onChange={e => setNewDeliverableName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newDeliverableName.trim()) {
                      handleAddDeliverable(newDeliverableName, parseFloat(newDeliverablePrice) || 0);
                    }
                  }
                }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--primary-color)]"
              />
              <div className="w-28 relative">
                <span className="absolute left-2.5 top-2 text-[10px] text-slate-500 font-bold">R$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newDeliverablePrice}
                  onChange={e => setNewDeliverablePrice(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newDeliverableName.trim()) {
                        handleAddDeliverable(newDeliverableName, parseFloat(newDeliverablePrice) || 0);
                      }
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-2.5 py-2 text-xs text-white outline-none focus:border-[var(--primary-color)] font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (newDeliverableName.trim()) {
                    handleAddDeliverable(newDeliverableName, parseFloat(newDeliverablePrice) || 0);
                  }
                }}
                className="bg-slate-800 hover:bg-[var(--primary-color)] text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700 hover:border-[var(--primary-color)] flex items-center gap-1 shrink-0"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>

            {/* Lista dos Entregáveis Adicionados */}
            {deliverables.length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                {deliverables.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 group hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-slate-800 text-[10px] font-black text-slate-400 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={e => handleUpdateDeliverable(item.id, { title: e.target.value })}
                        className="bg-transparent text-xs text-white outline-none focus:bg-slate-800 px-1.5 py-0.5 rounded flex-1 min-w-0"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1 text-[9px] text-slate-500 font-bold">R$</span>
                        <input
                          type="number"
                          value={item.value}
                          onChange={e => handleUpdateDeliverable(item.id, { value: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-800 border border-slate-700/80 rounded-lg pl-6 pr-1.5 py-1 text-xs text-emerald-400 font-mono outline-none focus:border-emerald-500 text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remover peça"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic text-center py-2">
                Nenhum entregável adicionado ainda. Use o cardápio acima ou adicione peças individualmente.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Categoria Geral</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-xs outline-none focus:border-[var(--primary-color)] shadow-inner cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Enhanced Date Picker Interface */}
            <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <CalendarIcon size={12} className="text-[var(--primary-color)]" />
                  Prazo de Entrega *
                </label>
                {formattedDateInfo.dayOfWeek && (
                  <span className="text-[9px] font-bold text-[var(--primary-color)] uppercase tracking-wider">
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
                      ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, date: getPresetDate('tomorrow') }))}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                    formData.date === getPresetDate('tomorrow')
                      ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                  }`}
                >
                  Amanhã
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, date: getPresetDate('friday') }))}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                    formData.date === getPresetDate('friday')
                      ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                  }`}
                >
                  Sexta
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, date: getPresetDate('nextMonday') }))}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                    formData.date === getPresetDate('nextMonday')
                      ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-medium [color-scheme:dark] outline-none focus:border-[var(--primary-color)] shadow-inner transition-all"
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
                  <Clock size={11} className="text-slate-500" />
                  <span>Agendado para <strong className="text-slate-200">{formattedDateInfo.formattedDate}</strong></span>
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Valor Total do Projeto (R$) *
              </label>
              {deliverables.length > 0 && (
                <span className="text-[9px] font-bold text-slate-400">
                  Soma calculada a partir das {deliverables.length} peças
                </span>
              )}
            </div>
            <input
              required
              type="number"
              step="0.01"
              value={formData.value}
              onChange={e => setFormData({ ...formData, value: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm font-mono font-bold focus:border-[var(--primary-color)] outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Status do Projeto</label>
            <div className="flex gap-2">
              {(['Pendente', 'Em Andamento', 'Concluído'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: s })}
                  className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                    formData.status === s
                      ? s === 'Concluído'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : s === 'Em Andamento'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Briefing / Observações</label>
            <textarea
              value={formData.briefing}
              onChange={e => setFormData({ ...formData, briefing: e.target.value })}
              placeholder="Descreva os requisitos, referências e especificações deste projeto..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-xs focus:border-[var(--primary-color)] outline-none resize-none placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[var(--primary-color)] hover:brightness-110 text-white font-black py-4 rounded-2xl transition-all neon-shadow-primary uppercase tracking-widest text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check size={16} />
            {isEditMode ? 'Salvar Alterações no Projeto' : 'Confirmar Demanda de Projeto'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;

