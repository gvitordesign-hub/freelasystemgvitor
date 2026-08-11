
import React, { useState, useMemo, useEffect } from 'react';
// Fix: Added missing MessageCircle import
import { X, Copy, Check, DollarSign, FileText, Share2, CreditCard, PenLine, ChevronRight, Archive, CheckCircle2, LayoutPanelLeft, ListFilter, MessageCircle, Trash2 } from 'lucide-react';
import { Client, Task, Invoice } from '../../types';

interface ProjectNoteModalProps {
   client: Client;
   tasks: Task[];
   invoices: Invoice[];
   pixKey: string;
   onUpdateInvoice: (invoice: Invoice) => void;
   onDeleteInvoice: (id: string) => void;
   onUpdatePix: (pix: string) => void;
   onClose: () => void;
}

const ProjectNoteModal: React.FC<ProjectNoteModalProps> = ({ client, tasks, invoices, pixKey, onUpdateInvoice, onDeleteInvoice, onUpdatePix, onClose }) => {
   const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
   const [copied, setCopied] = useState(false);
   const [localPix, setLocalPix] = useState(pixKey);
   const [editingPix, setEditingPix] = useState(false);
   const [editingTotal, setEditingTotal] = useState(false);
   const [localTotal, setLocalTotal] = useState('');

   const clientInvoices = useMemo(() => invoices.filter(i => i.clientId === client.id), [invoices, client.id]);

   const currentInvoice = useMemo(() =>
      selectedInvoiceId ? clientInvoices.find(i => i.id === selectedInvoiceId) : null
      , [clientInvoices, selectedInvoiceId]);

   const invoiceTasks = useMemo(() =>
      tasks.filter(t => t.invoiceId === selectedInvoiceId)
      , [tasks, selectedInvoiceId]);

   const unassignedTasks = useMemo(() =>
      tasks.filter(t => !t.invoiceId && t.clientId === client.id)
      , [tasks, client.id]);

   // Reset editing state when switching between invoices
   useEffect(() => {
      setEditingTotal(false);
   }, [selectedInvoiceId]);

   useEffect(() => {
      if (editingTotal) return; // Prevent overwriting while the user is actively editing

      if (currentInvoice) {
         const calculatedTotal = invoiceTasks.reduce((a, c) => a + c.value, 0);
         const totalVal = currentInvoice.customValue !== undefined && currentInvoice.customValue !== null
            ? currentInvoice.customValue
            : calculatedTotal;
         setLocalTotal(totalVal.toString());
      } else {
         setLocalTotal('');
      }
   }, [selectedInvoiceId, currentInvoice, invoiceTasks, editingTotal]);

   const handleSaveTotal = () => {
      if (!currentInvoice) return;
      const parsed = parseFloat(localTotal);
      const calculatedTotal = invoiceTasks.reduce((a, c) => a + c.value, 0);

      if (isNaN(parsed) || parsed === calculatedTotal || localTotal.trim() === '') {
         onUpdateInvoice({ ...currentInvoice, customValue: null });
      } else {
         onUpdateInvoice({ ...currentInvoice, customValue: parsed });
      }
      setEditingTotal(false);
   };

   const handleExportAll = () => {
      const allText = clientInvoices.map(inv => {
         const invTasks = tasks.filter(t => t.invoiceId === inv.id && t.status === 'Concluído');
         const total = inv.customValue !== undefined && inv.customValue !== null
            ? inv.customValue
            : invTasks.reduce((a, c) => a + c.value, 0);
         return `--- NOTA: ${inv.title} ---\n${invTasks.map(t => `• ${t.title}: R$ ${t.value.toLocaleString()}`).join('\n')}\nTotal: R$ ${total.toLocaleString()}`;
      }).join('\n\n');

      const header = `*MASTER REPORT - ${client.company.toUpperCase()}*\n`;
      const pix = `\n\n*CHAVE PIX:* ${localPix}`;

      navigator.clipboard.writeText(header + allText + pix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
   };

   const handleExportSingle = () => {
      if (!currentInvoice) return;
      const invTasks = invoiceTasks.filter(t => t.status === 'Concluído');
      const total = currentInvoice.customValue !== undefined && currentInvoice.customValue !== null
         ? currentInvoice.customValue
         : invTasks.reduce((a, c) => a + c.value, 0);

      const text = `
*NOTA DE SERVIÇO: ${currentInvoice.title.toUpperCase()}*
Cliente: ${client.company}

*DEMANDAS:*
${invTasks.map(t => `• ${t.title}: R$ ${t.value.toLocaleString()}`).join('\n')}

*TOTAL:* R$ ${total.toLocaleString()}
*CHAVE PIX:* ${localPix}
${currentInvoice.notes ? `\n*OBS:* ${currentInvoice.notes}` : ''}
    `.trim();

      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
   };

   const handleDeleteInvoice = () => {
      if (!currentInvoice) return;
      if (confirm(`Deseja realmente excluir a nota "${currentInvoice.title}"? As demandas vinculadas serão mantidas como avulsas.`)) {
         onDeleteInvoice(currentInvoice.id);
         setSelectedInvoiceId(null);
      }
   };

   const handleMarkAsPaid = () => {
      if (!currentInvoice) return;
      onUpdateInvoice({ ...currentInvoice, status: 'Pago' });
   };

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
         <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95">

            {/* Sidebar: Lista de Notas */}
            <div className="w-full md:w-80 bg-slate-950/50 border-r border-slate-800 p-6 flex flex-col gap-6">
               <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Faturamento Frella</h3>
                  <button onClick={onClose} className="md:hidden text-slate-500"><X size={20} /></button>
               </div>

               <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                  <button
                     onClick={() => setSelectedInvoiceId(null)}
                     className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 ${!selectedInvoiceId ? 'bg-[var(--primary-color)]/20 border-[var(--primary-color)]/40 text-white' : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600'}`}
                  >
                     <Archive size={16} />
                     <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-tighter">Resumo Master</span>
                        <span className="text-[9px] opacity-60">Todas as notas ativas</span>
                     </div>
                  </button>

                  <div className="pt-4 space-y-2">
                     <p className="text-[9px] font-black text-slate-600 uppercase mb-2">Notas Individuais</p>
                     {clientInvoices.map(inv => (
                        <button
                           key={inv.id}
                           onClick={() => setSelectedInvoiceId(inv.id)}
                           className={`w-full text-left p-4 rounded-2xl border transition-all group ${selectedInvoiceId === inv.id ? 'bg-slate-800 border-[var(--primary-color)] text-white' : 'bg-slate-900/50 border-slate-800/50 text-slate-500 hover:bg-slate-800'}`}
                        >
                           <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-bold truncate max-w-[120px]">{inv.title}</span>
                              {inv.status === 'Pago' ? <CheckCircle2 size={12} className="text-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                           </div>
                           <span className="text-[9px] uppercase tracking-tighter">{new Date(inv.createdAt).toLocaleDateString()}</span>
                        </button>
                     ))}
                  </div>
               </div>

               <div className="pt-4 border-t border-slate-800">
                  <button
                     onClick={handleExportAll}
                     className="w-full bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                     <Share2 size={14} /> Exportar Todas (Master)
                  </button>
               </div>
            </div>

            {/* Content: Detalhe da Nota */}
            <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
               {/* Pix Floating Header */}
               <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-[var(--primary-color)]/10 rounded-xl flex items-center justify-center">
                        {selectedInvoiceId ? <FileText className="text-[var(--primary-color)]" size={18} /> : <LayoutPanelLeft className="text-[var(--primary-color)]" size={18} />}
                     </div>
                     <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">{selectedInvoiceId ? currentInvoice?.title : 'Visão Geral do Cliente'}</h2>
                        <p className="text-[10px] text-slate-500 uppercase font-black">{client.company}</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-3">
                     <div className="bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-2 group cursor-pointer" onClick={() => setEditingPix(true)}>
                        <CreditCard size={12} className="text-amber-400" />
                        {editingPix ? (
                           <input
                              autoFocus
                              value={localPix}
                              onChange={e => setLocalPix(e.target.value)}
                              onBlur={() => { onUpdatePix(localPix); setEditingPix(false); }}
                              className="bg-transparent border-none outline-none text-[10px] text-white w-24"
                           />
                        ) : (
                           <span className="text-[10px] font-mono text-slate-400">{localPix || 'Sem Pix'}</span>
                        )}
                     </div>
                     <button onClick={onClose} className="p-2 text-slate-600 hover:text-white lg:block hidden"><X size={20} /></button>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {!selectedInvoiceId ? (
                     /* Master View */
                     <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-800">
                              <h4 className="text-[9px] font-black text-slate-500 uppercase mb-4 tracking-widest">Resumo Financeiro</h4>
                              <p className="text-4xl font-black text-white cyber-font">R$ {tasks.filter(t => t.clientId === client.id && t.status === 'Concluído').reduce((a, c) => a + c.value, 0).toLocaleString()}</p>
                              <p className="text-[10px] text-slate-500 mt-2 font-bold">VALOR ACUMULADO CONCLUÍDO</p>
                           </div>
                           <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-800">
                              <h4 className="text-[9px] font-black text-slate-500 uppercase mb-4 tracking-widest">Status das Notas</h4>
                              <div className="flex items-center gap-4">
                                 <div className="flex flex-col">
                                    <span className="text-xl font-bold text-emerald-400">{clientInvoices.filter(i => i.status === 'Pago').length}</span>
                                    <span className="text-[9px] font-black uppercase text-slate-600">Pagas</span>
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-xl font-bold text-amber-500">{clientInvoices.filter(i => i.status === 'Pendente').length}</span>
                                    <span className="text-[9px] font-black uppercase text-slate-600">Pendentes</span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div>
                           <h4 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                              <ListFilter size={12} /> Demandas Sem Nota (Avulsas)
                           </h4>
                           <div className="space-y-2">
                              {unassignedTasks.map(t => (
                                 <div key={t.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center group hover:border-slate-700">
                                    <span className="text-xs font-bold text-slate-300">{t.title}</span>
                                    <span className="text-xs font-black text-emerald-500">R$ {t.value.toLocaleString()}</span>
                                 </div>
                              ))}
                              {unassignedTasks.length === 0 && <p className="text-xs italic text-slate-600">Todas as demandas já estão vinculadas a notas específicas.</p>}
                           </div>
                        </div>
                     </div>
                  ) : (
                     /* Individual Invoice View */
                     <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="flex justify-between items-end">
                           <div>
                              <span className="text-[10px] font-black text-[var(--primary-color)] uppercase tracking-widest mb-1 block">Detalhamento da Nota</span>
                              <h3 className="text-3xl font-black text-white">{currentInvoice?.title}</h3>
                           </div>
                           <div className="text-right flex flex-col items-end gap-2">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Total da Nota</span>
                              {editingTotal ? (
                                 <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-emerald-400 cyber-font">R$</span>
                                    <input
                                       autoFocus
                                       type="number"
                                       step="any"
                                       value={localTotal}
                                       onChange={e => setLocalTotal(e.target.value)}
                                       onBlur={handleSaveTotal}
                                       onKeyDown={e => {
                                          if (e.key === 'Enter') handleSaveTotal();
                                          if (e.key === 'Escape') {
                                             setEditingTotal(false);
                                             if (currentInvoice) {
                                                setLocalTotal((currentInvoice.customValue ?? invoiceTasks.reduce((a, c) => a + c.value, 0)).toString());
                                             }
                                          }
                                       }}
                                       className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xl font-black text-emerald-400 cyber-font w-28 outline-none focus:border-emerald-500"
                                    />
                                 </div>
                              ) : (
                                 <div 
                                    onClick={() => setEditingTotal(true)}
                                    className="flex items-center gap-2 group cursor-pointer hover:bg-slate-850 px-2 py-1 rounded-xl transition-all border border-transparent hover:border-slate-800"
                                    title="Clique para editar o total"
                                 >
                                    <p className="text-2xl font-black text-emerald-400 cyber-font">
                                       R$ {Number(localTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </p>
                                    <PenLine size={14} className="text-slate-500 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                                 </div>
                              )}
                              {currentInvoice && currentInvoice.customValue !== undefined && currentInvoice.customValue !== null && (
                                 <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wider">Valor Personalizado</span>
                              )}
                              <div className="flex gap-2">
                                 {currentInvoice?.status === 'Pendente' && (
                                    <button
                                       onClick={handleMarkAsPaid}
                                       className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold uppercase transition-all"
                                    >
                                       <Check size={12} /> Marcar como Pago
                                    </button>
                                 )}
                                 <button
                                    onClick={handleDeleteInvoice}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold uppercase transition-all"
                                 >
                                    <Trash2 size={12} /> Excluir Nota
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-3">
                           {invoiceTasks.map(t => (
                              <div key={t.id} className="p-5 bg-slate-800/40 border border-slate-700 rounded-[1.5rem] flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${t.status === 'Concluído' ? 'border-emerald-500 text-emerald-500' : 'border-slate-700 text-slate-700'}`}>
                                       {t.status === 'Concluído' ? <Check size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
                                    </div>
                                    <div>
                                       <p className="text-xs font-bold text-slate-200">{t.title}</p>
                                       <p className="text-[9px] font-black uppercase text-slate-600 tracking-tighter">{t.category}</p>
                                    </div>
                                 </div>
                                 <span className="text-sm font-black text-white">R$ {t.value.toLocaleString()}</span>
                              </div>
                           ))}
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-2"><PenLine size={12} /> Observações Específicas</label>
                           <textarea
                              value={currentInvoice?.notes || ''}
                              onChange={e => onUpdateInvoice({ ...currentInvoice!, notes: e.target.value })}
                              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 outline-none focus:border-[var(--primary-color)] transition-all resize-none"
                              placeholder="Ex: Pagamento 50/50, descontos aplicados..."
                           />
                        </div>

                        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <button
                              onClick={handleExportSingle}
                              className="bg-white hover:bg-slate-200 text-slate-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 text-xs uppercase tracking-widest"
                           >
                              {copied ? <CheckCircle2 size={18} /> : <MessageCircle size={18} />}
                              {copied ? 'Copiado!' : 'Copiado para WhatsApp'}
                           </button>
                           <button
                              onClick={() => window.print()}
                              className="bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl border border-slate-700 flex items-center justify-center gap-3 transition-all text-xs uppercase tracking-widest"
                           >
                              <FileText size={18} /> Gerar PDF Individual
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default ProjectNoteModal;
