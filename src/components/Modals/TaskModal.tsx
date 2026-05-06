
import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar as CalendarIcon, DollarSign, UserPlus, ChevronLeft, FileText, PlusCircle } from 'lucide-react';
import { Client, DayOfWeek, Task, Invoice } from '../../types';

interface TaskModalProps {
  clients: Client[];
  invoices: Invoice[];
  editingTask?: Task | null;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => void;
  onUpdate?: (taskId: string, task: Omit<Task, 'id'>) => void;
  onQuickAddClient: (client: Omit<Client, 'id'>) => string;
  onQuickAddInvoice: (invoice: Omit<Invoice, 'id'>) => string;
}

const TaskModal: React.FC<TaskModalProps> = ({ clients, invoices, editingTask, onClose, onSubmit, onUpdate, onQuickAddClient, onQuickAddInvoice }) => {
  const isEditMode = !!editingTask;
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [isAddingNewInvoice, setIsAddingNewInvoice] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', company: '' });
  const [newInvoiceTitle, setNewInvoiceTitle] = useState('');

  const [formData, setFormData] = useState({
    title: editingTask?.title || '',
    clientId: editingTask?.clientId || clients[0]?.id || '',
    invoiceId: editingTask?.invoiceId || '',
    value: editingTask?.value?.toString() || '',
    date: editingTask?.date ? (editingTask.date.includes('T') ? editingTask.date.split('T')[0] : editingTask.date) : new Date().toLocaleDateString('en-CA'),
    category: editingTask?.category || 'Design',
    briefing: editingTask?.briefing || '',
    status: editingTask?.status || 'Pendente'
  });

  // Clear invoice area when toggling to add new client
  useEffect(() => {
    if (isAddingNewClient) {
      setFormData(prev => ({ ...prev, invoiceId: '' }));
      setIsAddingNewInvoice(false);
      setNewInvoiceTitle('');
    }
  }, [isAddingNewClient]);

  const categories = ['Design', 'Desenvolvimento', 'Marketing', 'Redação', 'Consultoria', 'Social Media', 'Edição Video'];

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => inv.clientId === formData.clientId);
  }, [invoices, formData.clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalClientId = formData.clientId;
    let finalInvoiceId = formData.invoiceId;

    if (isAddingNewClient) {
      if (!newClientData.name) return alert('Preencha ao menos o nome do cliente.');
      finalClientId = await onQuickAddClient(newClientData);
    }

    if (isAddingNewInvoice && newInvoiceTitle) {
      finalInvoiceId = await onQuickAddInvoice({
        clientId: finalClientId,
        title: newInvoiceTitle,
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
      date: formData.date, // Save raw YYYY-MM-DD string
      status: formData.status as any,
      category: formData.category,
      briefing: formData.briefing || undefined,
      position: editingTask?.position || 0
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
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold cyber-font text-white uppercase tracking-tighter">{isEditMode ? 'Editar Demanda' : 'Nova Demanda Frella'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">O que precisa ser feito?</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Refatoração de UI Home"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:border-[var(--primary-color)] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Cliente</label>
                <button type="button" onClick={() => {
                  setIsAddingNewClient(!isAddingNewClient);
                  // Reset new client form when toggling
                  if (!isAddingNewClient) {
                    setNewClientData({ name: '', company: '' });
                  }
                }} className="text-[9px] font-bold text-[var(--primary-color)]">
                  {isAddingNewClient ? 'Lista' : 'Novo'}
                </button>
              </div>
              {isAddingNewClient ? (
                <div className="space-y-2">
                  <input required={isAddingNewClient} placeholder="Nome" value={newClientData.name} onChange={e => setNewClientData({ ...newClientData, name: e.target.value })} className="w-full bg-slate-900 text-xs p-2 rounded-lg border border-slate-700" />
                  <input placeholder="Empresa (opcional)" value={newClientData.company} onChange={e => setNewClientData({ ...newClientData, company: e.target.value })} className="w-full bg-slate-900 text-xs p-2 rounded-lg border border-slate-700" />
                </div>
              ) : (
                <select
                  required
                  value={formData.clientId}
                  onChange={e => {
                    setFormData({ ...formData, clientId: e.target.value, invoiceId: '' });
                    setIsAddingNewInvoice(false);
                    setNewInvoiceTitle('');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="" disabled>Selecionar...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Vincular Nota</label>
                <button type="button" onClick={() => setIsAddingNewInvoice(!isAddingNewInvoice)} className="text-[9px] font-bold text-emerald-500">
                  {isAddingNewInvoice ? 'Lista' : 'Nova'}
                </button>
              </div>
              {isAddingNewInvoice ? (
                <input required={isAddingNewInvoice} placeholder="Título da Nota" value={newInvoiceTitle} onChange={e => setNewInvoiceTitle(e.target.value)} className="w-full bg-slate-900 text-xs p-2 rounded-lg border border-slate-700" />
              ) : (
                <select
                  value={formData.invoiceId}
                  onChange={e => setFormData({ ...formData, invoiceId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="">Nenhuma (Avulsa)</option>
                  {filteredInvoices.map(inv => <option key={inv.id} value={inv.id}>{inv.title}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Categoria</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-xs outline-none focus:border-[var(--primary-color)]"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Data Alvo</label>
              <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-xs [color-scheme:dark]" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Valor (R$)</label>
            <input required type="number" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-xs" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Status do Projeto</label>
            <div className="flex gap-2">
              {(['Pendente', 'Em Andamento', 'Concluído'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: s })}
                  className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${formData.status === s
                    ? s === 'Concluído' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                      s === 'Em Andamento' ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
                        'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Briefing / Descrição</label>
            <textarea
              value={formData.briefing}
              onChange={e => setFormData({ ...formData, briefing: e.target.value })}
              placeholder="Descreva os detalhes, requisitos, ou observações importantes sobre esta demanda..."
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:border-[var(--primary-color)] outline-none resize-none placeholder:text-slate-600"
            />
          </div>

          <button type="submit" className="w-full bg-[var(--primary-color)] hover:brightness-110 text-white font-black py-4 rounded-2xl transition-all neon-shadow-primary uppercase tracking-widest text-xs">
            {isEditMode ? 'Salvar Alterações' : 'Confirmar Protocolo'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
