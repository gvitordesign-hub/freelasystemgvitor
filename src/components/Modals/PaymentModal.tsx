
import React from 'react';
import { CheckCircle, XCircle, DollarSign, Award } from 'lucide-react';
import { Task } from '../../types';

interface PaymentModalProps {
  task: Task;
  onConfirm: (received: boolean) => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ task, onConfirm, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-emerald-500/50 w-full max-w-md rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-500/40 animate-pulse">
            <CheckCircle className="text-emerald-400" size={40} />
          </div>
          
          <h2 className="text-2xl font-bold mb-2 cyber-font text-white">Missão Concluída!</h2>
          <p className="text-slate-400 mb-8">
            Você finalizou a tarefa <span className="text-slate-200 font-semibold">"{task.title}"</span>.
          </p>

          <div className="bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-700">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Confirmação Financeira</p>
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-emerald-400 mb-2">
              <DollarSign size={24} />
              {task.value.toLocaleString()}
            </div>
            <p className="text-sm text-slate-300">O valor já foi recebido em sua conta?</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => onConfirm(false)}
              className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 transition-all group"
            >
              <XCircle className="text-slate-500 group-hover:text-rose-400 mb-2" size={24} />
              <span className="text-xs font-bold text-slate-400">Ainda não</span>
            </button>
            
            <button 
              onClick={() => onConfirm(true)}
              className="flex flex-col items-center justify-center p-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl border border-emerald-400/30 transition-all group"
            >
              <DollarSign className="text-white mb-2" size={24} />
              <span className="text-xs font-bold text-white">Sim, Recebi!</span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-purple-400 font-bold">
            <Award size={18} />
            <span className="text-sm">+50 XP conquistados</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
