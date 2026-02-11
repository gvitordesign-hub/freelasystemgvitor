

import React, { useState, useEffect } from 'react';
import { DollarSign, ListTodo, ShieldCheck, ArrowRight, X, Plus, TrendingDown } from 'lucide-react';
import { Task, Transaction } from '../../types';

interface BriefingModalProps {
   userName: string;
   criticalTasks: Task[];
   pendingTransactions: Transaction[];
   onStart: () => void;
   onQuickAddDemand: () => void;
   onQuickAddExpense: () => void;
   onSkip?: () => void;
}

const BriefingModal: React.FC<BriefingModalProps> = ({ userName, criticalTasks, pendingTransactions, onStart, onQuickAddDemand, onQuickAddExpense, onSkip }) => {

   useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
         if (e.key === 'Escape' && onSkip) {
            onSkip();
         }
      };

      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
   }, [onSkip]);

   const totalPending = pendingTransactions.reduce((acc, curr) => acc + curr.value, 0);

   return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-500">
         <div className="bg-slate-900/40 border border-slate-800 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 relative">
            {/* Decorative Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--primary-color) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <div className="p-6 md:p-10 relative z-10 space-y-6 md:space-y-8">
               {onSkip && (
                  <button
                     onClick={onSkip}
                     className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all group"
                     title="Pular Briefing (ESC)"
                  >
                     <X size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
               )}
               <div className="space-y-2">
                  <div className="flex items-center gap-3">
                     <div className="w-8 md:w-12 h-1 bg-[var(--primary-color)] rounded-full animate-pulse" />
                     <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] md:tracking-[0.5em]">Morning Protocol v2.5</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-white cyber-font uppercase tracking-tighter leading-none mb-2">
                     BOM DIA, <span className="text-[var(--primary-color)]">{userName.split(' ')[0]}</span>
                  </h1>
                  <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-[0.4em] flex items-center gap-2">
                     <span className="w-8 h-px bg-slate-800"></span>
                     OPERACIONAL FRELLA INICIADO
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 group hover:border-[var(--primary-color)]/30 transition-all">
                     <div className="w-12 h-12 bg-[var(--primary-color)]/10 rounded-2xl flex items-center justify-center text-[var(--primary-color)]">
                        <ListTodo size={24} />
                     </div>
                     <div>
                        <p className="text-lg font-black text-white">{criticalTasks.length}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Demandas Críticas</p>
                     </div>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 group hover:border-emerald-500/30 transition-all">
                     <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                        <DollarSign size={24} />
                     </div>
                     <div>
                        <p className="text-lg font-black text-white">R$ {totalPending.toLocaleString()}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contas Pendentes</p>
                     </div>
                  </div>
               </div>

               {/* Quick Actions Grid */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Quick Demand Addition Section */}
                  <div className="bg-slate-950/40 border border-slate-800/60 p-5 rounded-[2.5rem] flex flex-col items-center justify-between gap-4 group hover:border-[var(--primary-color)]/20 transition-all border-dashed">
                     <div className="flex items-center gap-4 w-full">
                        <div className="w-10 h-10 bg-[var(--primary-color)]/5 rounded-xl flex items-center justify-center text-[var(--primary-color)] border border-[var(--primary-color)]/10">
                           <Plus size={20} />
                        </div>
                        <div>
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Demanda Rápida</h3>
                           <p className="text-[9px] text-slate-600 font-bold uppercase">Lançar protocolo</p>
                        </div>
                     </div>
                     <button
                        onClick={onQuickAddDemand}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700"
                     >
                        Adicionar Demanda
                     </button>
                  </div>

                  {/* Quick Expense Addition Section */}
                  <div className="bg-slate-950/40 border border-slate-800/60 p-5 rounded-[2.5rem] flex flex-col items-center justify-between gap-4 group hover:border-rose-500/20 transition-all border-dashed">
                     <div className="flex items-center gap-4 w-full">
                        <div className="w-10 h-10 bg-rose-500/5 rounded-xl flex items-center justify-center text-rose-400 border border-rose-500/10">
                           <TrendingDown size={20} />
                        </div>
                        <div>
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Despesa Rápida</h3>
                           <p className="text-[9px] text-slate-600 font-bold uppercase">Lançar saída</p>
                        </div>
                     </div>
                     <button
                        onClick={onQuickAddExpense}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700"
                     >
                        Adicionar Despesa
                     </button>
                  </div>
               </div>


               <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2 md:pt-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase">
                     <ShieldCheck size={16} /> Protocolos Ativos
                  </div>
                  <button
                     onClick={() => onStart()}
                     className="w-full sm:w-auto bg-white text-slate-950 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                     Acessar Frella <ArrowRight size={18} />
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default BriefingModal;
