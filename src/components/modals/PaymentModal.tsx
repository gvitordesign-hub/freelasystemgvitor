
import React from 'react';
import { CheckCircle, XCircle, DollarSign, Award, X } from 'lucide-react';
import { Task } from '../../types';

interface PaymentModalProps {
  task: Task;
  onConfirm: (received: boolean) => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ task, onConfirm, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-emerald-500/50 w-full max-w-md rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden animate-in slide-in-from-bottom-8 duration-300 relative max-h-[92dvh] overflow-y-auto">
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 sm:top-6 sm:right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-xl cursor-pointer"
          title="Fechar"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
        <div className="p-5 sm:p-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border-2 border-emerald-500/40 animate-pulse">
            <CheckCircle className="text-emerald-400" size={36} />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-2 cyber-font text-white">Missão Concluída!</h2>
          <p className="text-slate-400 text-xs sm:text-sm mb-6 sm:mb-8">
            Você finalizou a tarefa <span className="text-slate-200 font-semibold">"{task.title}"</span>.
          </p>

          <div className="bg-slate-800/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-700">
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Confirmação Financeira</p>
            <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold text-emerald-400 mb-2">
              <DollarSign size={22} />
              {task.value.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs sm:text-sm text-slate-300">O valor já foi recebido em sua conta?</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button 
              onClick={() => onConfirm(false)}
              className="flex flex-col items-center justify-center p-3.5 sm:p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 transition-all group cursor-pointer touch-target active:scale-95"
            >
              <XCircle className="text-slate-500 group-hover:text-rose-400 mb-2" size={22} />
              <span className="text-xs font-bold text-slate-400">Ainda não</span>
            </button>
            
            <button 
              onClick={() => onConfirm(true)}
              className="flex flex-col items-center justify-center p-3.5 sm:p-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl border border-emerald-400/30 transition-all group cursor-pointer touch-target active:scale-95 shadow-lg shadow-emerald-950"
            >
              <DollarSign className="text-white mb-2" size={22} />
              <span className="text-xs font-bold text-white">Sim, Recebi!</span>
            </button>
          </div>

          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2 text-purple-400 font-bold">
            <Award size={16} />
            <span className="text-xs sm:text-sm">+50 XP conquistados</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
