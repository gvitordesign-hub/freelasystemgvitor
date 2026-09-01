import React, { useState } from 'react';
import { X, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { TransactionType } from '../../types';

interface TransactionModalProps {
    onClose: () => void;
    onSubmit: (tx: { description: string; value: number; type: TransactionType; category: string; date: string; status: 'Pago' | 'Pendente' }) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        description: '',
        value: '',
        type: 'Saída' as TransactionType,
        category: 'Geral',
        status: 'Pago' as 'Pago' | 'Pendente'
    });

    const categories = ['Geral', 'Marketing', 'Software/SaaS', 'Equipamento', 'Aluguel', 'Educação', 'Freelancer', 'Outros'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            value: parseFloat(formData.value) || 0,
            date: new Date().toISOString()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg max-h-[92dvh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${formData.type === 'Saída' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {formData.type === 'Saída' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold cyber-font text-white uppercase tracking-tight">
                            {formData.type === 'Saída' ? 'Nova Despesa' : 'Novo Recebimento'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-xl cursor-pointer" aria-label="Fechar">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest text-left">O que foi gasto?</label>
                        <input
                            required
                            type="text"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ex: Assinatura Adobe, Servidor..."
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-white text-xs focus:border-[var(--primary-color)] outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest text-left">Valor (R$)</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white text-xs focus:border-[var(--primary-color)] outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest text-left">Categoria</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:border-[var(--primary-color)] outline-none text-xs cursor-pointer"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest text-left">Tipo de Lançamento</label>
                        <div className="flex gap-2">
                            {(['Saída', 'Entrada'] as TransactionType[]).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type })}
                                    className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border cursor-pointer touch-target ${formData.type === type
                                        ? type === 'Saída' ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-md' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest text-left">Status do Pagamento</label>
                        <div className="flex gap-2">
                            {(['Pago', 'Pendente'] as const).map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status })}
                                    className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border cursor-pointer touch-target ${formData.status === status
                                        ? 'bg-[var(--primary-color)]/20 border-[var(--primary-color)] text-[var(--primary-color)] shadow-md'
                                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-white hover:bg-slate-200 text-slate-950 font-black py-3.5 sm:py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs mt-2 cursor-pointer shadow-lg">
                        Confirmar Lançamento
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TransactionModal;
