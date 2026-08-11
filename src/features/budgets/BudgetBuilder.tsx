
import React, { useState, useMemo } from 'react';
import {
  Plus, Trash2, FileText, CheckCircle,
  Calculator, User, Package,
  Wand2, MessageCircle, UserPlus, ChevronLeft,
  Calendar, CreditCard, Save, Pencil, X
} from 'lucide-react';
import { Client, Service, Budget, BudgetItem, UserStats, Task, Transaction, DayOfWeek } from '../../types';

interface BudgetBuilderProps {
  clients: Client[];
  services: Service[];
  stats: UserStats;
  onApprove: (budget: Budget, tasks: Omit<Task, 'id'>[], transaction: Omit<Transaction, 'id'>) => void;
  onSaveCatalog: (service: Omit<Service, 'id'>) => void;
  onUpdateCatalog: (id: string, service: Omit<Service, 'id'>) => void;
  onDeleteCatalog: (id: string) => void;
  onQuickAddClient: (client: Omit<Client, 'id'>) => string;
  onUpdateStats: (stats: Partial<UserStats>) => void;
}

const BudgetBuilder: React.FC<BudgetBuilderProps> = ({
  clients, services, stats, onApprove, onSaveCatalog,
  onUpdateCatalog, onDeleteCatalog, onQuickAddClient, onUpdateStats
}) => {
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', company: '', contact: '' });

  const [activeBudget, setActiveBudget] = useState<Omit<Budget, 'id'>>({
    clientId: clients[0]?.id || '',
    items: [],
    discount: 0,
    discountType: 'percent',
    downPayment: 50,
    validityDays: 7,
    terms: 'O prazo de entrega inicia após o envio do briefing e pagamento do sinal.',
    createdAt: new Date().toISOString(),
    status: 'Draft'
  });

  const [copied, setCopied] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const selectedClient = useMemo(() => {
    if (isAddingNewClient) return { name: newClientData.name || 'Novo Cliente', company: newClientData.company || 'Nova Empresa' };
    return clients.find(c => c.id === activeBudget.clientId);
  }, [clients, activeBudget.clientId, isAddingNewClient, newClientData]);

  const subtotal = useMemo(() => {
    return activeBudget.items.reduce((acc, item) => acc + (item.unitValue * item.quantity), 0);
  }, [activeBudget.items]);

  const discountValue = activeBudget.discountType === 'percent'
    ? (subtotal * activeBudget.discount) / 100
    : activeBudget.discount;

  const total = subtotal - discountValue;
  const downPaymentValue = (total * activeBudget.downPayment) / 100;

  const addItem = (service?: Service) => {
    const newItem: BudgetItem = {
      id: Math.random().toString(36).substr(2, 9),
      serviceId: service?.id,
      description: service?.name || '',
      quantity: 1,
      unitValue: service?.baseValue || 0
    };
    setActiveBudget(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (id: string, updates: Partial<BudgetItem>) => {
    setActiveBudget(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const removeItem = (id: string) => {
    setActiveBudget(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const isItemInCatalog = (description: string) => {
    return services.some(s => s.name.toLowerCase() === description.toLowerCase());
  };

  const handleSaveToCatalog = (item: BudgetItem) => {
    if (!item.description.trim()) return alert('Dê um nome ao serviço primeiro.');
    if (item.unitValue <= 0) return alert('Defina um valor base para o serviço.');

    onSaveCatalog({
      name: item.description,
      description: 'Serviço salvo via construtor de orçamento',
      baseValue: item.unitValue
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateStats({ portfolioLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateWhatsAppText = () => {
    const itemsText = activeBudget.items.map(item =>
      `• ${item.quantity}x *${item.description}* - R$ ${(item.unitValue * item.quantity).toLocaleString('pt-BR')}`
    ).join('\n');

    const text = `
*PROPOSTA COMERCIAL - ${selectedClient?.company || selectedClient?.name}* 🚀

Olá ${selectedClient?.name}, segue o detalhamento do seu projeto:

${itemsText}

💰 *VALOR TOTAL:* R$ ${total.toLocaleString('pt-BR')}
${activeBudget.discount > 0 ? `📉 _Desconto aplicado: R$ ${discountValue.toLocaleString('pt-BR')}_` : ''}

💳 *CONDIÇÕES:*
• Entrada (Sinal): R$ ${downPaymentValue.toLocaleString('pt-BR')} (${activeBudget.downPayment}%)
• Saldo na entrega: R$ ${(total - downPaymentValue).toLocaleString('pt-BR')}

📌 *DADOS PARA PAGAMENTO (PIX):*
• Chave: ${stats.pixKey || 'Solicitar ao profissional'}

📅 *VALIDADE:* ${activeBudget.validityDays} dias
📝 *TERMOS:* ${activeBudget.terms}

Qualquer dúvida, estou à disposição!
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    onUpdateCatalog(editingService.id, {
      name: editingService.name,
      description: editingService.description,
      baseValue: editingService.baseValue
    });
    setEditingService(null);
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço do catálogo?')) {
      onDeleteCatalog(id);
    }
  };

  const handleApprove = () => {
    if (activeBudget.items.length === 0) return alert('Adicione itens ao orçamento.');

    let finalClientId = activeBudget.clientId;

    if (isAddingNewClient) {
      if (!newClientData.name || !newClientData.company) {
        return alert('Preencha os dados do novo cliente.');
      }
      finalClientId = onQuickAddClient(newClientData);
    }

    if (!finalClientId) return alert('Selecione um cliente.');

    activeBudget.items.forEach(item => {
      if (!isItemInCatalog(item.description) && item.description.trim() !== '' && item.unitValue > 0) {
        onSaveCatalog({
          name: item.description,
          description: 'Serviço memorizado via Orçamento',
          baseValue: item.unitValue
        });
      }
    });

    const tasks: Omit<Task, 'id'>[] = activeBudget.items.map(item => ({
      title: item.description,
      clientId: finalClientId,
      value: item.unitValue * item.quantity,
      day: 'Segunda' as DayOfWeek,
      date: new Date().toISOString(),
      status: 'Pendente',
      category: 'Serviço'
    }));

    const transaction: Omit<Transaction, 'id'> = {
      description: `Projeto: ${selectedClient?.company || selectedClient?.name}`,
      value: total,
      type: 'Entrada',
      date: new Date().toISOString(),
      status: 'Pendente',
      category: 'Serviço'
    };

    onApprove({ ...activeBudget, clientId: finalClientId, id: Math.random().toString(36).substr(2, 9) }, tasks, transaction);
  };

  return (
    <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32 animate-reveal">
      {/* Coluna de Edição */}
      <div className="lg:col-span-7 space-y-6 print:hidden">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold cyber-font text-white flex items-center gap-2">
              <Calculator className="text-[var(--primary-color)]" size={20} />
              Frella Smart Budget
            </h2>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              Frella System v2.5
            </span>
          </div>

          {/* Seleção de Cliente / Novo Cliente */}
          <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <User size={12} /> Cliente da Proposta
              </label>
              <button
                onClick={() => setIsAddingNewClient(!isAddingNewClient)}
                className="text-[10px] font-bold text-[var(--primary-color)] flex items-center gap-1 hover:brightness-125 transition-all uppercase"
              >
                {isAddingNewClient ? (
                  <><ChevronLeft size={10} /> Voltar para Lista</>
                ) : (
                  <><UserPlus size={10} /> Cadastrar Novo Cliente</>
                )}
              </button>
            </div>

            {isAddingNewClient ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-right-4">
                <input
                  type="text"
                  placeholder="Nome do Contato"
                  value={newClientData.name}
                  onChange={e => setNewClientData({ ...newClientData, name: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--primary-color)] outline-none"
                />
                <input
                  type="text"
                  placeholder="Empresa"
                  value={newClientData.company}
                  onChange={e => setNewClientData({ ...newClientData, company: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--primary-color)] outline-none"
                />
                <input
                  type="text"
                  placeholder="WhatsApp"
                  value={newClientData.contact}
                  onChange={e => setNewClientData({ ...newClientData, contact: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:border-[var(--primary-color)] outline-none"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={activeBudget.clientId}
                  onChange={e => setActiveBudget({ ...activeBudget, clientId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-[var(--primary-color)] transition-all"
                >
                  <option value="" disabled>Selecione um cliente cadastrado...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                </select>
                <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
                  <button
                    onClick={() => setActiveBudget({ ...activeBudget, discountType: 'percent' })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${activeBudget.discountType === 'percent' ? 'bg-[var(--primary-color)] text-white' : 'text-slate-500'}`}
                  >%</button>
                  <button
                    onClick={() => setActiveBudget({ ...activeBudget, discountType: 'fixed' })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${activeBudget.discountType === 'fixed' ? 'bg-[var(--primary-color)] text-white' : 'text-slate-500'}`}
                  >R$</button>
                </div>
              </div>
            )}
          </div>

          {/* Itens do Orçamento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Escopo da Proposta</h3>
              <button
                onClick={() => addItem()}
                className="flex items-center gap-2 text-[10px] font-bold text-[var(--primary-color)] hover:brightness-125 transition-all"
              >
                <Plus size={14} /> Novo Item Avulso
              </button>
            </div>

            <div className="space-y-3">
              {activeBudget.items.map((item, idx) => {
                const alreadySaved = isItemInCatalog(item.description);
                return (
                  <div key={item.id} className="bg-slate-800/40 border border-slate-700 p-4 rounded-2xl group animate-in slide-in-from-left-4" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5">
                        <input
                          value={item.description}
                          onChange={e => updateItem(item.id, { description: e.target.value })}
                          placeholder="Descrição do serviço..."
                          className="w-full bg-transparent border-none text-white text-sm outline-none placeholder:text-slate-600 font-medium"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1 text-center text-xs text-slate-300 font-bold"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-black">
                          R$ <input
                            type="number"
                            value={item.unitValue}
                            onChange={e => updateItem(item.id, { unitValue: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-transparent border-none outline-none text-right"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        {!alreadySaved && item.description.trim() && (
                          <button
                            onClick={() => handleSaveToCatalog(item)}
                            title="Salvar no catálogo de serviços"
                            className="text-emerald-500/50 hover:text-emerald-500 transition-colors p-1"
                          >
                            <Save size={16} />
                          </button>
                        )}
                        <button onClick={() => removeItem(item.id)} className="text-rose-500/50 hover:text-rose-500 transition-colors p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Seletor do Catálogo Rápido */}
              <div className="bg-slate-900 border-2 border-dashed border-slate-800 p-4 rounded-2xl flex flex-wrap gap-2 relative">
                <div className="flex justify-between items-center w-full mb-1">
                  <span className="text-[9px] font-black text-slate-600 uppercase">Puxar do seu Catálogo de Serviços:</span>
                </div>
                {services.length > 0 ? services.map(s => (
                  <div key={s.id} className="group relative flex items-center">
                    <button
                      onClick={() => addItem(s)}
                      className="pl-3 pr-8 py-1.5 bg-slate-800 hover:bg-[var(--primary-color)]/20 hover:text-[var(--primary-color)] rounded-lg text-[10px] font-bold text-slate-400 border border-slate-700 transition-all flex items-center gap-2"
                    >
                      <Package size={12} /> {s.name}
                    </button>
                    <div className="absolute right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingService(s); }}
                        className="p-1 text-blue-400 hover:bg-blue-500/10 rounded"
                        title="Editar Serviço"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteService(s.id); }}
                        className="p-1 text-rose-400 hover:bg-rose-500/10 rounded"
                        title="Excluir do Catálogo"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                )) : (
                  <span className="text-[10px] text-slate-600 italic">Nenhum serviço salvo ainda. Use o botão de salvar nos itens avulsos.</span>
                )}
              </div>
            </div>
          </div>

          {/* Edit Service Modal */}
          {editingService && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <h2 className="text-lg font-bold cyber-font text-white uppercase tracking-tighter">Editar Serviço do Catálogo</h2>
                  <button onClick={() => setEditingService(null)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleUpdateService} className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nome do Serviço</label>
                    <input
                      required
                      type="text"
                      value={editingService.name}
                      onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-[var(--primary-color)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Valor Base (R$)</label>
                    <input
                      required
                      type="number"
                      value={editingService.baseValue}
                      onChange={e => setEditingService({ ...editingService, baseValue: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-[var(--primary-color)]"
                    />
                  </div>
                  <button type="submit" className="w-full bg-[var(--primary-color)] hover:brightness-110 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-[10px]">
                    Salvar Alterações
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Ajustes Financeiros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Configurações Gerais</label>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-black mb-1 block">Desconto Especial</label>
                  <input
                    type="number"
                    value={activeBudget.discount}
                    onChange={e => setActiveBudget({ ...activeBudget, discount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-black mb-1 block">Validade (Dias)</label>
                  <input
                    type="number"
                    value={activeBudget.validityDays}
                    onChange={e => setActiveBudget({ ...activeBudget, validityDays: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-black mb-1 block">Chave PIX p/ WhatsApp/PDF</label>
                  <input
                    type="text"
                    value={stats.pixKey || ''}
                    onChange={e => onUpdateStats({ pixKey: e.target.value })}
                    placeholder="Sua chave PIX..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-[var(--primary-color)]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                <CreditCard size={12} /> Entrada / Sinal (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0" max="100" step="10"
                  value={activeBudget.downPayment}
                  onChange={e => setActiveBudget({ ...activeBudget, downPayment: parseInt(e.target.value) })}
                  className="flex-1 h-1 bg-slate-800 rounded-full accent-[var(--primary-color)]"
                />
                <span className="text-sm font-bold text-white min-w-[40px]">{activeBudget.downPayment}%</span>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-[9px] text-slate-500 uppercase font-black block">Branding da Proposta</label>
                  <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Sugestão: 200x200px (PNG)</span>
                </div>
                <div className="flex flex-col gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden relative group">
                      {stats.portfolioLogo ? (
                        <>
                          <img src={stats.portfolioLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Package size={24} className="text-slate-600" />
                          </div>
                        </>
                      ) : (
                        <Package size={32} className="text-slate-600" />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 w-full">
                    <input
                      type="file"
                      id="logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                    <label
                      htmlFor="logo-upload"
                      className="flex-1 text-center cursor-pointer px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Pencil size={12} /> Alterar Marca
                    </label>
                    {stats.portfolioLogo && (
                      <button
                        onClick={() => onUpdateStats({ portfolioLogo: '' })}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest flex items-center gap-2"
                      >
                        <Trash2 size={12} /> Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Termos e Condições</label>
            <textarea
              value={activeBudget.terms}
              onChange={e => setActiveBudget({ ...activeBudget, terms: e.target.value })}
              className="w-full h-24 bg-slate-800/40 border border-slate-700 rounded-xl p-4 text-slate-300 text-xs focus:border-[var(--primary-color)] outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={generateWhatsAppText}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all neon-shadow-primary uppercase text-xs tracking-widest"
          >
            {copied ? <CheckCircle size={18} /> : <MessageCircle size={18} />}
            {copied ? 'Copiado!' : 'Copiar p/ WhatsApp'}
          </button>
          <button
            onClick={handleApprove}
            className="flex-1 bg-[var(--primary-color)] hover:brightness-110 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all neon-shadow-primary uppercase text-xs tracking-widest"
          >
            <Wand2 size={18} /> Aprovar Projeto
          </button>
        </div>
      </div>

      {/* Preview Column (Simulando PDF) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="sticky top-24">
          <div className="bg-white text-slate-900 p-8 md:p-12 rounded-[2rem] shadow-2xl min-h-[700px] flex flex-col print:shadow-none print:p-0 print:m-0 print:min-h-0 print:rounded-none">
            {/* PDF Header */}
            <div className="flex justify-between items-start mb-12">
              <div className="space-y-1">
                <h1 className="text-2xl font-black cyber-font uppercase tracking-tighter text-[var(--primary-color)]">PROPOSTA</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">#{activeBudget.createdAt.split('T')[0].replace(/-/g, '')}</p>
              </div>
              <div className="h-9 flex items-center justify-end">
                {stats.portfolioLogo ? (
                  <img src={stats.portfolioLogo} className="h-full max-w-[140px] object-contain" alt="Logo" />
                ) : (
                  <div className="text-xl font-black cyber-font text-slate-900 uppercase">FRELLA<span className="text-[var(--primary-color)]">SYSTEM</span></div>
                )}
              </div>
            </div>

            {/* PDF Body */}
            <div className="space-y-8 flex-1">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Para</h4>
                  <p className="text-sm font-bold">{selectedClient?.name}</p>
                  <p className="text-xs text-slate-500">{selectedClient?.company}</p>
                </div>
                <div className="text-right">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">De</h4>
                  <p className="text-sm font-bold">{stats.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Validade: {activeBudget.validityDays} Dias</p>
                </div>
              </div>

              <div className="space-y-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                      <th className="py-3">Serviço / Item</th>
                      <th className="py-3 text-center">Qtd</th>
                      <th className="py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeBudget.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-4">
                          <p className="text-sm font-bold text-slate-800">{item.description}</p>
                        </td>
                        <td className="py-4 text-center text-xs text-slate-500">{item.quantity}</td>
                        <td className="py-4 text-right text-sm font-bold text-slate-900">R$ {(item.unitValue * item.quantity).toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="pt-8 space-y-3">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toLocaleString('pt-BR')}</span>
                </div>
                {activeBudget.discount > 0 && (
                  <div className="flex justify-between text-xs text-rose-500 font-bold">
                    <span>Desconto Aplicado</span>
                    <span>- R$ {discountValue.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black border-t-2 border-slate-900 pt-4 text-slate-900">
                  <span className="uppercase">Total Proposto</span>
                  <span>R$ {total.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl space-y-3">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Condições de Pagamento</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Entrada ({activeBudget.downPayment}%)</p>
                    <p className="text-sm font-bold text-emerald-600">R$ {downPaymentValue.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Saldo Final</p>
                    <p className="text-sm font-bold text-slate-700">R$ {(total - downPaymentValue).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 leading-relaxed italic">
                <span className="font-bold text-slate-500 uppercase tracking-tighter block mb-1">Notas Finais:</span>
                {activeBudget.terms}
              </div>
            </div>

            {/* PDF Footer */}
            <div className="pt-12 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Frella Smart Budget Module</div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Chave PIX p/ Pagamento</p>
                <p className="text-[10px] font-bold text-slate-800">{stats.pixKey || 'Solicitar ao profissional'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="w-full mt-6 bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all print:hidden uppercase text-xs tracking-widest border border-slate-700"
          >
            <FileText size={18} /> Exportar Proposta PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetBuilder;
