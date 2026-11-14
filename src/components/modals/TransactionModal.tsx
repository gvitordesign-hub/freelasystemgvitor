import React, { useState } from 'react';
import { X, DollarSign, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { Client, Transaction, TransactionType } from '../../types';
import { getLocalDateString } from '../../utils/dateUtils';

export interface TransactionFormValues {
    description: string;
    value: number;
    type: TransactionType;
    category: string;
    date: string;
    status: 'Pago' | 'Pendente';
    clientId?: string | null;
}

interface TransactionModalProps {
    onClose: () => void;
    onSubmit: (tx: TransactionFormValues) => void;
    /** Quando informado, o modal edita este lançamento em vez de criar um novo. */
    initial?: Transaction;
    /** para vincular um lançamento manual a um cliente */
    clients?: Client[];
}

const CATEGORIES = ['Geral', 'Marketing', 'Software/SaaS', 'Equipamento', 'Aluguel', 'Educação', 'Freelancer', 'Serviço', 'Outros'];

const TransactionModal: React.FC<TransactionModalProps> = ({ onClose, onSubmit, initial, clients = [] }) => {
    const isEditing = !!initial;
    // Entrada vinculada a uma nota: o valor é definido pela nota
    const valueLockedByInvoice = !!initial?.invoiceId && initial.type === 'Entrada';
    // Cliente vem da demanda/nota quando houver; só lançamento manual escolhe
    const clientSelectable = !initial?.taskId && !initial?.invoiceId;

    const [formData, setFormData] = useState({
        description: initial?.description ?? '',
        value: initial ? String(initial.value) : '',
        type: (initial?.type ?? 'Saída') as TransactionType,
        category: initial?.category ?? 'Geral',
        status: (initial?.status ?? 'Pago') as 'Pago' | 'Pendente',
        date: initial?.date ? initial.date.split('T')[0] : getLocalDateString(),
        clientId: initial?.clientId ?? ''
    });

    const categories = CATEGORIES.includes(formData.category) ? CATEGORIES : [formData.category, ...CATEGORIES];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            value: parseFloat(formData.value) || 0,
            clientId: clientSelectable ? (formData.clientId || null) : undefined
        });
        onClose();
    };

    const title = isEditing
        ? 'Editar lançamento'
        : formData.type === 'Saída' ? 'Nova despesa' : 'Novo recebimento';

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg max-h-[92dvh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${formData.type === 'Saída' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {formData.type === 'Saída' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-xl cursor-pointer" aria-label="Fechar">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar">
                    {valueLockedByInvoice && (
                        <div className="flex gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <span>Este lançamento pertence a uma nota. O valor e o status são controlados pela nota; para alterá-los, edite a nota do cliente.</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 text-left">Descrição</label>
                        <input
                            required
                            type="text"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ex: Assinatura Adobe, Servidor..."
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:border-[var(--primary-color)] outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 text-left">Valor (R$)</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    disabled={valueLockedByInvoice}
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white text-sm focus:border-[var(--primary-color)] outline-none disabled:opacity-50"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 text-left">Data</label>
                            <input
                                required
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:border-[var(--primary-color)] outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 text-left">Categoria</label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:border-[var(--primary-color)] outline-none text-sm cursor-pointer"
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {clientSelectable && clients.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 text-left">Cliente (opcional)</label>
                            <select
                                value={formData.clientId || ''}
                                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:border-[var(--primary-color)] outline-none text-sm cursor-pointer"
                            >
                                <option value="">Sem cliente (geral)</option>
                                {[...clients].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}
                            </select>
                            <span className="block text-[11px] text-slate-500 mt-1">Entra no "Recebido" do cliente.</span>
                        </div>
                    )}

                    {!isEditing && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 text-left">Tipo de lançamento</label>
                            <div className="flex gap-2">
                                {(['Saída', 'Entrada'] as TransactionType[]).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type })}
                                        className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer touch-target ${formData.type === type
                                            ? type === 'Saída' ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-md' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!valueLockedByInvoice && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 text-left">Status do pagamento</label>
                            <div className="flex gap-2">
                                {(['Pago', 'Pendente'] as const).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status })}
                                        className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer touch-target ${formData.status === status
                                            ? 'bg-[var(--primary-color)]/20 border-[var(--primary-color)] text-[var(--primary-color)] shadow-md'
                                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="w-full bg-white hover:bg-slate-200 text-slate-950 font-bold py-3.5 sm:py-4 rounded-2xl transition-all active:scale-95 text-sm mt-2 cursor-pointer shadow-lg">
                        {isEditing ? 'Salvar alterações' : 'Confirmar lançamento'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TransactionModal;
