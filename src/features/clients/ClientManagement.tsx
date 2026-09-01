import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Building2, 
  Phone, 
  UserPlus, 
  MoreVertical, 
  Users, 
  FileText, 
  LayoutGrid, 
  List, 
  Edit2, 
  Trash2, 
  ChevronRight,
  TrendingUp,
  Activity,
  X,
  DollarSign,
  Clock,
  CheckCircle2,
  Search,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { Client, Transaction, Task, Invoice } from '@/types';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface ClientManagementProps {
  clients: Client[];
  transactions: Transaction[];
  tasks: Task[];
  invoices: Invoice[];
  overdueAlertDays?: number;
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (id: string, updated: Partial<Client>) => void;
  onDeleteClient: (id: string) => void;
  onViewInvoice: (client: Client) => void;
}

type StatusFilterOption = 'Todos' | 'Inadimplentes' | 'Ativo' | 'Inativo' | 'Prospect';

const ClientManagement: React.FC<ClientManagementProps> = ({ 
  clients, 
  transactions,
  tasks,
  invoices,
  overdueAlertDays = 30,
  onAddClient, 
  onUpdateClient, 
  onDeleteClient, 
  onViewInvoice 
}) => {
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('Todos');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: '', company: '', contact: '', xp: 0, status: 'Ativo' });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Compute per-client financial & overdue invoice summary
  const getClientFinancials = useMemo(() => {
    const financials = new Map<string, { 
      paidTotal: number; 
      pendingTotal: number; 
      activeTasks: number; 
      pendingInvoices: number;
      overdueInvoicesCount: number;
      isOverdue: boolean;
    }>();
    
    const now = new Date();
    const thresholdMs = overdueAlertDays * 24 * 60 * 60 * 1000;

    clients.forEach(client => {
      const clientTasks = tasks.filter(t => t.clientId === client.id);
      const clientInvoices = invoices.filter(i => i.clientId === client.id);
      
      // 1. Calculate from Invoices (respecting customValue)
      let invoicePaid = 0;
      let invoicePending = 0;
      const tasksInInvoices = new Set<string>();

      clientInvoices.forEach(inv => {
        const invTasks = clientTasks.filter(t => t.invoiceId === inv.id);
        invTasks.forEach(t => tasksInInvoices.add(t.id));
        
        const invTotal = inv.customValue !== undefined && inv.customValue !== null
          ? Number(inv.customValue)
          : invTasks.reduce((sum, t) => sum + (Number(t.value) || 0), 0);

        if (inv.status === 'Pago') {
          invoicePaid += invTotal;
        } else {
          invoicePending += invTotal;
        }
      });

      // 2. Calculate unassigned tasks (not linked to any invoice)
      let unassignedPaid = 0;
      let unassignedPending = 0;
      const unassignedTasks = clientTasks.filter(t => !tasksInInvoices.has(t.id));

      unassignedTasks.forEach(t => {
        const linkedTx = transactions.find(tx => tx.taskId === t.id && tx.type === 'Entrada');
        if (linkedTx) {
          if (linkedTx.status === 'Pago') {
            unassignedPaid += Number(linkedTx.value) || 0;
          } else {
            unassignedPending += Number(linkedTx.value) || 0;
          }
        } else {
          unassignedPending += Number(t.value) || 0;
        }
      });

      // 3. Direct client transactions not linked to invoice tasks
      const directTransactions = transactions.filter(t => 
        t.type === 'Entrada' && 
        (!t.taskId || (!tasksInInvoices.has(t.taskId) && !unassignedTasks.some(ut => ut.id === t.taskId))) &&
        (client.name && t.description.toLowerCase().includes(client.name.toLowerCase()))
      );
      let directPaid = 0;
      let directPending = 0;
      directTransactions.forEach(tx => {
        if (tx.status === 'Pago') directPaid += Number(tx.value) || 0;
        else directPending += Number(tx.value) || 0;
      });

      const paidTotal = invoicePaid + unassignedPaid + directPaid;
      const pendingTotal = invoicePending + unassignedPending + directPending;
      
      const activeTasks = clientTasks.filter(t => t.status !== 'Concluído').length;
      const pendingInvoices = clientInvoices.filter(i => i.status === 'Pendente').length;
      
      // Calculate invoices past overdue alert threshold
      const overdueInvoicesCount = clientInvoices.filter(i => {
        if (i.status !== 'Pendente') return false;
        const created = new Date(i.createdAt);
        return (now.getTime() - created.getTime()) >= thresholdMs;
      }).length;

      financials.set(client.id, {
        paidTotal,
        pendingTotal,
        activeTasks,
        pendingInvoices,
        overdueInvoicesCount,
        isOverdue: overdueInvoicesCount > 0
      });
    });
    
    return financials;
  }, [clients, transactions, tasks, invoices, overdueAlertDays]);

  // Total count of overdue clients
  const totalOverdueClientsCount = useMemo(() => {
    let count = 0;
    getClientFinancials.forEach(fin => {
      if (fin.isOverdue) count++;
    });
    return count;
  }, [getClientFinancials]);

  // Filter clients by search query AND status filter (including Inadimplentes)
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Search filter (Name or Company)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(term);
        const matchesCompany = c.company && c.company.toLowerCase().includes(term);
        if (!matchesName && !matchesCompany) return false;
      }

      // Inadimplentes filter
      if (statusFilter === 'Inadimplentes') {
        const fin = getClientFinancials.get(c.id);
        return fin?.isOverdue ?? false;
      }

      // Specific status filter (Ativo, Inativo, Prospect)
      if (statusFilter !== 'Todos') {
        return (c.status || 'Ativo') === statusFilter;
      }

      return true;
    });
  }, [clients, searchTerm, statusFilter, getClientFinancials]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      onUpdateClient(editingClient.id, formData);
      setEditingClient(null);
    } else {
      onAddClient(formData);
    }
    setFormData({ name: '', company: '', contact: '', xp: 0, status: 'Ativo' });
    setShowForm(false);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      company: client.company,
      contact: client.contact || '',
      xp: client.xp || 0,
      status: client.status || 'Ativo'
    });
    setShowForm(true);
    setActiveMenu(null);
  };

  const handleDelete = (client: Client) => {
    setDeletingClient(client);
    setActiveMenu(null);
  };

  const ActionMenu = ({ client }: { client: Client }) => (
    <div className="absolute top-4 right-4 z-10">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setActiveMenu(activeMenu === client.id ? null : client.id);
        }}
        className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
      >
        <MoreVertical size={18} />
      </button>
      
      {activeMenu === client.id && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
          <div className="absolute right-0 top-8 w-48 py-2 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl animate-reveal duration-100 z-50">
            <button 
              onClick={() => handleEdit(client)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Edit2 size={14} className="text-blue-400" />
              Editar Cliente
            </button>
            <button 
              onClick={() => handleDelete(client)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 size={14} className="text-rose-400" />
              Excluir Cliente
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 animate-reveal max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black cyber-font text-white uppercase tracking-tight">
            Nexus <span className="text-[var(--primary-color)]">CRM</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-1">Sua rede neural de parceiros e negócios</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto">
          {/* Search Client Bar */}
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Procurar cliente por nome..."
              className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--primary-color)] transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter Dropdown / Select */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterOption)}
              className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-[var(--primary-color)] transition-all cursor-pointer appearance-none pr-9 shadow-inner"
            >
              <option value="Todos">Todos os Clientes ({clients.length})</option>
              <option value="Inadimplentes">⚠️ Inadimplentes ({totalOverdueClientsCount})</option>
              <option value="Ativo">Ativos</option>
              <option value="Inativo">Inativos</option>
              <option value="Prospect">Prospecção</option>
            </select>
            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          {/* View Toggle */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button 
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${viewType === 'grid' ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visualização em Grid"
            >
              <LayoutGrid size={17} />
            </button>
            <button 
              onClick={() => setViewType('list')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${viewType === 'list' ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visualização em Lista"
            >
              <List size={17} />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingClient(null);
              setFormData({ name: '', company: '', contact: '', xp: 0, status: 'Ativo' });
              setShowForm(!showForm);
            }}
            className="bg-[var(--primary-color)] hover:brightness-110 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-[0_4px_16px_var(--primary-shadow)] flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <UserPlus size={16} />
            {showForm ? 'Fechar' : 'Novo Cliente'}
          </button>
        </div>
      </div>

      {/* Quick Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setStatusFilter('Todos')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
            statusFilter === 'Todos' 
              ? 'bg-[var(--primary-color)]/20 border-[var(--primary-color)] text-[var(--primary-color)] shadow-[0_0_12px_var(--primary-shadow)]' 
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Todos ({clients.length})
        </button>
        <button
          onClick={() => setStatusFilter('Inadimplentes')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
            statusFilter === 'Inadimplentes'
              ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/40'
          }`}
        >
          <AlertTriangle size={13} className="text-rose-400" />
          Inadimplentes ({totalOverdueClientsCount})
        </button>
        <button
          onClick={() => setStatusFilter('Ativo')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
            statusFilter === 'Ativo'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Ativos
        </button>
        <button
          onClick={() => setStatusFilter('Prospect')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
            statusFilter === 'Prospect'
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Prospecção
        </button>
        <button
          onClick={() => setStatusFilter('Inativo')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
            statusFilter === 'Inativo'
              ? 'bg-slate-700 border-slate-600 text-slate-200'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Inativos
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
          <form 
            onSubmit={handleSubmit} 
            className="w-full max-w-2xl bg-slate-900/98 backdrop-blur-2xl border border-slate-800 p-5 sm:p-8 md:p-10 rounded-3xl shadow-2xl animate-reveal relative max-h-[92dvh] overflow-y-auto custom-scrollbar"
          >
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="absolute top-5 right-5 sm:top-8 sm:right-8 text-slate-500 hover:text-white transition-colors cursor-pointer p-2 hover:bg-slate-800 rounded-xl"
              aria-label="Fechar"
            >
              <X size={22} />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-[var(--primary-color)]/15 rounded-2xl flex items-center justify-center text-[var(--primary-color)] border border-[var(--primary-color)]/30 shadow-inner">
                {editingClient ? <Edit2 size={26} /> : <UserPlus size={26} />}
              </div>
              <div>
                <h3 className="text-xl font-black cyber-font text-white uppercase tracking-tight">
                  {editingClient ? 'Ajustar Módulo Cliente' : 'Integrar Novo Cliente'}
                </h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">
                  {editingClient ? `ID: ${editingClient.id.slice(0, 8)}...` : 'Estabelecer conexão com nova entidade'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Protocolo Nome</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo do contato"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-100 focus:outline-none focus:border-[var(--primary-color)] transition-all placeholder:text-slate-600 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Corporação / Empresa</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Nome da empresa ou projeto (opcional)"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-100 focus:outline-none focus:border-[var(--primary-color)] transition-all placeholder:text-slate-600 shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Frequência de Contato</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="E-mail ou WhatsApp"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-100 focus:outline-none focus:border-[var(--primary-color)] transition-all placeholder:text-slate-600 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Nível de Acesso (Status)</label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-100 focus:outline-none focus:border-[var(--primary-color)] transition-all appearance-none shadow-inner cursor-pointer"
                    >
                      <option value="Ativo">Ativo (Sincronizado)</option>
                      <option value="Inativo">Inativo (Offline)</option>
                      <option value="Prospect">Prospecção (Syncing)</option>
                    </select>
                    <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-800/60 hover:bg-slate-800 text-slate-400 font-black py-3.5 rounded-2xl transition-all border border-slate-700 uppercase text-[10px] tracking-widest cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-[2] bg-[var(--primary-color)] hover:brightness-110 text-white font-black py-3.5 rounded-2xl transition-all shadow-[0_4px_16px_var(--primary-shadow)] uppercase text-[10px] tracking-[0.15em] cursor-pointer"
              >
                {editingClient ? 'Finalizar Protocolo' : 'Completar Integração'}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => {
            const financials = getClientFinancials.get(client.id) || { 
              paidTotal: 0, 
              pendingTotal: 0, 
              activeTasks: 0, 
              pendingInvoices: 0,
              overdueInvoicesCount: 0,
              isOverdue: false
            };

            return (
            <div 
              key={client.id} 
              className={`bg-slate-900/80 backdrop-blur-xl border p-6 rounded-[2rem] transition-all duration-300 group relative overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:-translate-y-1 ${
                financials.isOverdue 
                  ? 'border-rose-500/60 bg-gradient-to-b from-rose-950/25 to-slate-900/90 shadow-[0_0_30px_rgba(244,63,94,0.18)] hover:border-rose-400' 
                  : 'border-slate-800/80 hover:border-[var(--primary-color)]/40 hover:shadow-[0_8px_32px_var(--primary-shadow)]'
              }`}
            >
              {/* Action Menu */}
              <ActionMenu client={client} />

              {/* Inadimplência Signal Badge on Card Header */}
              {financials.isOverdue && (
                <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl text-[9px] font-black uppercase tracking-wider animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                  <AlertTriangle size={13} className="text-rose-400" />
                  Inadimplente ({financials.overdueInvoicesCount} nota{financials.overdueInvoicesCount > 1 ? 's' : ''})
                </div>
              )}

              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black group-hover:scale-105 transition-transform shadow-lg ${
                  financials.isOverdue 
                    ? 'bg-gradient-to-br from-rose-950 to-slate-900 text-rose-400 border border-rose-500/40' 
                    : 'bg-gradient-to-br from-slate-800 to-slate-950 text-[var(--primary-color)] border border-slate-700/60'
                }`}>
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-[var(--primary-color)] transition-colors">{client.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">
                    <Building2 size={12} className="text-slate-500" />
                    {client.company || 'Sem empresa'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <Phone size={13} className="text-slate-500" />
                    <span className="font-medium truncate">{client.contact || 'Sem contato'}</span>
                  </div>
                </div>

                {/* Financial Summary — Pago vs Pendente */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3 shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={12} className="text-[var(--primary-color)]" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Financeiro</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col">
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle2 size={10} className="text-emerald-400" />
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Pago</span>
                      </div>
                      <span className="text-xs md:text-sm font-black text-emerald-400 cyber-font">R$ {financials.paidTotal.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className={`border rounded-xl p-3 flex flex-col ${
                      financials.isOverdue 
                        ? 'bg-rose-500/15 border-rose-500/40' 
                        : financials.pendingTotal > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <div className="flex items-center gap-1 mb-1">
                        {financials.isOverdue ? (
                          <AlertTriangle size={10} className="text-rose-400" />
                        ) : (
                          <Clock size={10} className={financials.pendingTotal > 0 ? 'text-amber-400' : 'text-slate-500'} />
                        )}
                        <span className={`text-[8px] font-black uppercase tracking-widest ${
                          financials.isOverdue ? 'text-rose-300' : financials.pendingTotal > 0 ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          {financials.isOverdue ? 'Em Atraso' : 'Pendente'}
                        </span>
                      </div>
                      <span className={`text-xs md:text-sm font-black cyber-font ${
                        financials.isOverdue ? 'text-rose-300' : financials.pendingTotal > 0 ? 'text-amber-300' : 'text-slate-500'
                      }`}>
                        R$ {financials.pendingTotal.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider px-1">
                    <span className="text-slate-400">{financials.activeTasks} demanda{financials.activeTasks !== 1 ? 's' : ''} ativa{financials.activeTasks !== 1 ? 's' : ''}</span>
                    {financials.pendingInvoices > 0 && (
                      <span className={`px-2 py-0.5 rounded-md ${
                        financials.isOverdue ? 'bg-rose-500/20 text-rose-300 font-black border border-rose-500/30' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {financials.pendingInvoices} nota{financials.pendingInvoices !== 1 ? 's' : ''} pendente{financials.pendingInvoices !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={13} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">XP: <span className="text-white cyber-font">{client.xp || 0}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${
                      financials.isOverdue ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : client.status === 'Inativo' ? 'bg-rose-400' : 'bg-emerald-500'
                    }`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${financials.isOverdue ? 'text-rose-400' : 'text-slate-400'}`}>
                      {financials.isOverdue ? 'Inadimplente' : (client.status || 'Ativo')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => onViewInvoice(client)}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--primary-color)] hover:brightness-125 transition-all group/btn cursor-pointer"
                >
                  Ver Projetos
                  <ChevronRight size={13} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-[2rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Corporação</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Pago</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Pendente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredClients.map(client => {
                const financials = getClientFinancials.get(client.id) || { 
                  paidTotal: 0, 
                  pendingTotal: 0, 
                  activeTasks: 0, 
                  pendingInvoices: 0, 
                  overdueInvoicesCount: 0, 
                  isOverdue: false 
                };
                return (
                <tr 
                  key={client.id} 
                  className={`transition-colors group ${
                    financials.isOverdue ? 'bg-rose-950/20 hover:bg-rose-950/35' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                        financials.isOverdue 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                          : 'bg-slate-800 text-[var(--primary-color)] border border-slate-700'
                      }`}>
                        {client.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-100">{client.name}</span>
                          {financials.isOverdue && (
                            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                              <AlertTriangle size={10} /> Inadimplente
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold cyber-font">XP: {client.xp || 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{client.company || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-emerald-400 cyber-font">R$ {financials.paidTotal.toLocaleString('pt-BR')}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-black cyber-font ${
                      financials.isOverdue ? 'text-rose-400' : financials.pendingTotal > 0 ? 'text-amber-400' : 'text-slate-500'
                    }`}>
                      R$ {financials.pendingTotal.toLocaleString('pt-BR')}
                    </span>
                    {financials.pendingInvoices > 0 && (
                      <div className={`text-[8px] font-bold mt-0.5 ${financials.isOverdue ? 'text-rose-400 font-black' : 'text-amber-400/80'}`}>
                        {financials.pendingInvoices} nota{financials.pendingInvoices !== 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      financials.isOverdue
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : client.status === 'Inativo' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {financials.isOverdue ? 'Inadimplente' : (client.status || 'Ativo')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => onViewInvoice(client)}
                        className="p-1.5 text-slate-400 hover:text-[var(--primary-color)] transition-colors rounded-lg hover:bg-[var(--primary-color)]/10 cursor-pointer"
                        title="Ver Projetos"
                      >
                        <FileText size={15} />
                      </button>
                      <button 
                        onClick={(e) => {
                           e.stopPropagation();
                           setActiveMenu(activeMenu === client.id ? null : client.id);
                        }}
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>
                    {activeMenu === client.id && (
                      <div className="absolute right-6 top-12 w-48 py-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50">
                        <button 
                          onClick={() => handleEdit(client)}
                          className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/5 cursor-pointer"
                        >
                          <Edit2 size={14} className="text-blue-400" />
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(client)}
                          className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 size={14} className="text-rose-400" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredClients.length === 0 && (
        <div className="py-20 bg-slate-900/40 border-2 border-dashed border-slate-800/70 rounded-[3rem] flex flex-col items-center justify-center text-slate-500">
          <Users size={56} className="mb-4 opacity-30 text-[var(--primary-color)]" />
          <p className="text-lg font-black uppercase tracking-widest cyber-font text-slate-300">
            {statusFilter === 'Inadimplentes' ? 'Nenhum Cliente Inadimplente' : searchTerm ? 'Nenhum Cliente Encontrado' : 'Nenhum Cliente Detectado'}
          </p>
          <p className="text-xs font-bold uppercase tracking-tight mt-1 text-slate-500">
            {statusFilter === 'Inadimplentes' 
              ? 'Todos os seus clientes estão em dia com os pagamentos das notas!' 
              : searchTerm 
                ? `Nenhum resultado corresponde à busca "${searchTerm}"` 
                : 'Inicie a sincronização de rede adicionando um cliente'}
          </p>
        </div>
      )}

      {deletingClient && (
        <ConfirmModal
          title="Excluir Cliente"
          message={`Tem certeza que deseja desvincular ${deletingClient.name} do sistema? Esta ação é irreversível e removerá todos os dados associados.`}
          onConfirm={() => {
            onDeleteClient(deletingClient.id);
            setDeletingClient(null);
          }}
          onCancel={() => setDeletingClient(null)}
          isDanger={true}
          confirmLabel="Desvincular"
        />
      )}
    </div>
  );
};

export default ClientManagement;
