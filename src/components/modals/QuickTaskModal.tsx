import React, { useState } from 'react';
import { X, Zap, Calendar as CalendarIcon, User, PlusCircle } from 'lucide-react';
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

  const [formData, setFormData] = useState({
    title: '',
    clientId: clients.length > 0 ? clients[0].id : '',
    date: new Date().toLocaleDateString('en-CA'),
    briefing: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Informe o que precisa ser feito.');
      return;
    }

    // Check for holiday
    const isHoliday = holidays?.some(h => h.date === formData.date);
    if (isHoliday) {
      const holidayName = holidays?.find(h => h.date === formData.date)?.description || 'Feriado';
      alert(`Impossível agendar: "${formData.date}" foi configurado como feriado/folga (${holidayName}).`);
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
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-800">
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
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-white placeholder:text-slate-600 outline-none text-sm font-medium transition-all"
            />
          </div>

          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 space-y-3">
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
                className="text-[9px] font-bold text-amber-400 hover:underline flex items-center gap-1"
              >
                <PlusCircle size={12} />
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
              <select
                required
                value={formData.clientId}
                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
              >
                {clients.length === 0 && <option value="" disabled>Nenhum cliente cadastrado</option>}
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest flex items-center gap-1.5">
              <CalendarIcon size={12} className="text-amber-400" />
              Data Alvo
            </label>
            <input 
              required 
              type="date" 
              value={formData.date} 
              onChange={e => setFormData({ ...formData, date: e.target.value })} 
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-white text-xs [color-scheme:dark] outline-none" 
            />
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
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-white text-xs outline-none resize-none placeholder:text-slate-600"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] uppercase tracking-widest text-xs flex items-center justify-center gap-2"
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
