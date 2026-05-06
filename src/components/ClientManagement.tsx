
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
  CheckCircle2
} from 'lucide-react';
import { Client, Transaction, Task, Invoice } from '../types';
import ConfirmModal from './Modals/ConfirmModal';

interface ClientManagementProps {
  clients: Client[];
  transactions: Transaction[];
  tasks: Task[];
  invoices: Invoice[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (id: string, updated: Partial<Client>) => void;
  onDeleteClient: (id: string) => void;
  onViewInvoice: (client: Client) => void;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ 
  clients, 
  transactions,
  tasks,
  invoices,
  onAddClient, 
  onUpdateClient, 
  onDeleteClient, 
  onViewInvoice 
}) => {
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: '', company: '', contact: '', xp: 0, status: 'Ativo' });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Compute per-client financial summary
  const getClientFinancials = useMemo(() => {
    const financials = new Map<string, { paidTotal: number; pendingTotal: number; activeTasks: number; pendingInvoices: number }>();
    
    clients.forEach(client => {
      const clientTasks = tasks.filter(t => t.clientId === client.id);
      const clientTaskIds = new Set(clientTasks.map(t => t.id));
      const clientTransactions = transactions.filter(t => t.taskId && clientTaskIds.has(t.taskId) && t.type === 'Entrada');
      const clientInvoices = invoices.filter(i => i.clientId === client.id);
      
      const paidTotal = clientTransactions
        .filter(t => t.status === 'Pago')
        .reduce((sum, t) => sum + t.value, 0);
      
      const pendingTotal = clientTransactions
        .filter(t => t.status === 'Pendente')
        .reduce((sum, t) => sum + t.value, 0);

      // Also count task values that are pending (not concluded and no paid transaction)
      const taskPending = clientTasks
        .filter(t => t.status !== 'Concluído')
        .reduce((sum, t) => sum + t.value, 0);
      
      const activeTasks = clientTasks.filter(t => t.status !== 'Concluído').length;
      const pendingInvoices = clientInvoices.filter(i => i.status === 'Pendente').length;
      
      financials.set(client.id, {
        paidTotal,
        pendingTotal: pendingTotal || taskPending,
        activeTasks,
        pendingInvoices
      });
    });
    
    return financials;
  }, [clients, transactions, tasks, invoices]);

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
        className="text-slate-500 hover:text-white transition-colors p-1"
      >
        <MoreVertical size={18} />
      </button>
      
      {activeMenu === client.id && (
        <>
          <div className="fixed inset-0" onClick={() => setActiveMenu(null)} />
          <div className="absolute right-0 top-8 w-48 py-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-in zoom-in-95 duration-100 z-50">
            <button 
              onClick={() => handleEdit(client)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              <Edit2 size={14} className="text-blue-400" />
              Editar Cliente
            </button>
            <button 
              onClick={() => handleDelete(client)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} className="text-red-500" />
              Excluir Cliente
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 animate-reveal">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black cyber-font text-white uppercase tracking-tighter">
            Nexus <span className="text-[var(--primary-color)] neon-shadow-primary">CRM</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-1">Sua rede neural de parceiros e negócios</p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* View Toggle */}
          <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800/50">
            <button 
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-shadow)]' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visualização em Grid"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewType('list')}
              className={`p-2 rounded-lg transition-all ${viewType === 'list' ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-shadow)]' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visualização em Lista"
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingClient(null);
              setFormData({ name: '', company: '', contact: '', xp: 0, status: 'Ativo' });
              setShowForm(!showForm);
            }}
            className="bg-[var(--primary-color)] hover:brightness-110 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center gap-2 neon-shadow-primary"
          >
            <UserPlus size={16} />
            {showForm ? 'Fechar' : 'Novo Cliente'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <form 
            onSubmit={handleSubmit} 
            className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 relative"
          >
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 bg-[var(--primary-color)]/10 rounded-[1.5rem] flex items-center justify-center text-[var(--primary-color)] border border-[var(--primary-color)]/20 shadow-inner">
                {editingClient ? <Edit2 size={32} /> : <UserPlus size={32} />}
              </div>
              <div>
                <h3 className="text-2xl font-black cyber-font text-white uppercase tracking-tighter">
                  {editingClient ? 'Ajustar Módulo Cliente' : 'Integrar Novo Cliente'}
                </h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                  {editingClient ? `ID Sincronizado: ${editingClient.id.slice(0, 8)}...` : 'Estabelecer conexão com nova entidade'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Protocolo Nome</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo do contato"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-slate-200 focus:outline-none focus:border-[var(--primary-color)] transition-all placeholder:text-slate-700 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Corporação / Empresa</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Nome da empresa ou projeto (opcional)"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-slate-200 focus:outline-none focus:border-[var(--primary-color)] transition-all placeholder:text-slate-700 shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Frequência de Contato</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="E-mail ou WhatsApp"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-slate-200 focus:outline-none focus:border-[var(--primary-color)] transition-all placeholder:text-slate-700 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nível de Acesso (Status)</label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-slate-200 focus:outline-none focus:border-[var(--primary-color)] transition-all appearance-none shadow-inner cursor-pointer"
                    >
                      <option value="Ativo">Ativo (Sincronizado)</option>
                      <option value="Inativo">Inativo (Offline)</option>
                      <option value="Prospect">Prospecção (Syncing)</option>
                    </select>
                    <ChevronRight size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex gap-4">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-800/50 hover:bg-slate-800 text-slate-400 font-black py-4 rounded-2xl transition-all border border-slate-700 uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-[2] bg-[var(--primary-color)] hover:brightness-110 text-white font-black py-4 rounded-2xl transition-all shadow-lg neon-shadow-primary uppercase text-[10px] tracking-[0.2em]"
              >
                {editingClient ? 'Finalizar Protocolo de Ajuste' : 'Completar Integração de Dados'}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {clients.map(client => {
            const financials = getClientFinancials.get(client.id) || { paidTotal: 0, pendingTotal: 0, activeTasks: 0, pendingInvoices: 0 };
            return (
            <div key={client.id} className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] hover:border-[var(--primary-color)]/30 transition-all group relative overflow-hidden">
              {/* Action Menu */}
              <ActionMenu client={client} />

              <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl flex items-center justify-center text-xl font-black text-[var(--primary-color)] group-hover:scale-110 transition-transform shadow-xl">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-[var(--primary-color)] transition-colors">{client.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                    <Building2 size={12} className="text-slate-600" />
                    {client.company || 'Sem empresa'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <Phone size={14} className="text-slate-600" />
                    <span className="font-medium">{client.contact || 'Sem contato'}</span>
                  </div>
                </div>

                {/* 💰 Financial Summary — Pago vs Pendente */}
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={12} className="text-[var(--primary-color)]" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Financeiro</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 size={10} className="text-emerald-400" />
                        <span className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest">Pago</span>
                      </div>
                      <span className="text-sm font-black text-emerald-400">R$ {financials.paidTotal.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className={`border rounded-xl p-3 flex flex-col ${financials.pendingTotal > 0 ? 'bg-amber-500/5 border-amber-500/10' : 'bg-slate-800/30 border-slate-700/30'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock size={10} className={financials.pendingTotal > 0 ? 'text-amber-400' : 'text-slate-600'} />
                        <span className={`text-[8px] font-black uppercase tracking-widest ${financials.pendingTotal > 0 ? 'text-amber-500/70' : 'text-slate-600'}`}>Pendente</span>
                      </div>
                      <span className={`text-sm font-black ${financials.pendingTotal > 0 ? 'text-amber-400' : 'text-slate-600'}`}>R$ {financials.pendingTotal.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider px-1">
                    <span className="text-slate-600">{financials.activeTasks} demanda{financials.activeTasks !== 1 ? 's' : ''} ativa{financials.activeTasks !== 1 ? 's' : ''}</span>
                    {financials.pendingInvoices > 0 && (
                      <span className="text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-md">{financials.pendingInvoices} nota{financials.pendingInvoices !== 1 ? 's' : ''} pendente{financials.pendingInvoices !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">XP: <span className="text-white">{client.xp || 0}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${client.status === 'Inativo' ? 'bg-red-500' : 'bg-emerald-500'} neon-shadow-emerald`} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{client.status || 'Ativo'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => onViewInvoice(client)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary-color)] hover:brightness-125 transition-all group/btn"
                >
                  Ver Projetos
                  <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/30">
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identidade</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Corporação</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Pago</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Pendente</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {clients.map(client => {
                const financials = getClientFinancials.get(client.id) || { paidTotal: 0, pendingTotal: 0, activeTasks: 0, pendingInvoices: 0 };
                return (
                <tr key={client.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-black text-[var(--primary-color)]">
                        {client.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-100">{client.name}</span>
                        <span className="text-[9px] text-slate-600 font-bold">XP: {client.xp || 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{client.company || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-emerald-400">R$ {financials.paidTotal.toLocaleString('pt-BR')}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-black ${financials.pendingTotal > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                      R$ {financials.pendingTotal.toLocaleString('pt-BR')}
                    </span>
                    {financials.pendingInvoices > 0 && (
                      <div className="text-[8px] font-bold text-amber-500/70 mt-0.5">{financials.pendingInvoices} nota{financials.pendingInvoices !== 1 ? 's' : ''}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${client.status === 'Inativo' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {client.status || 'Ativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => onViewInvoice(client)}
                        className="p-1.5 text-slate-500 hover:text-[var(--primary-color)] transition-colors rounded-lg hover:bg-[var(--primary-color)]/10"
                        title="Ver Projetos"
                      >
                        <FileText size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                           e.stopPropagation();
                           setActiveMenu(activeMenu === client.id ? null : client.id);
                        }}
                        className="text-slate-500 hover:text-white p-1.5"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                    {activeMenu === client.id && (
                      <div className="absolute right-6 top-12 w-48 py-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50">
                        <button 
                          onClick={() => handleEdit(client)}
                          className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                        >
                          <Edit2 size={14} className="text-blue-400" />
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(client)}
                          className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 size={14} className="text-red-500" />
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

      {clients.length === 0 && (
        <div className="py-20 bg-slate-900/40 border-2 border-dashed border-slate-800/50 rounded-[3rem] flex flex-col items-center justify-center text-slate-600">
          <Users size={64} className="mb-6 opacity-20 text-[var(--primary-color)]" />
          <p className="text-xl font-black uppercase tracking-widest cyber-font">Nenhum Client Detectado</p>
          <p className="text-xs font-bold uppercase tracking-tighter mt-2">Inicie a sincronização de rede adicionando um cliente</p>
        </div>
      )}

      {deletingClient && (
        <ConfirmModal
          title="Excluir Client"
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
