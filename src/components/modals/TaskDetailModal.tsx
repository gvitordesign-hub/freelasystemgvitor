
import React from 'react';
import { X, Calendar, DollarSign, User, FileText, Pencil, Trash2, Briefcase, Sparkles, Zap } from 'lucide-react';
import { Task, Client } from '../../types';

interface TaskDetailModalProps {
    task: Task;
    client: Client | undefined;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, client, onClose, onEdit, onDelete }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header with Project Badge */}
                <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-gradient-to-br from-[var(--primary-color)]/20 via-transparent to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--primary-color)]/20 flex items-center justify-center shadow-[0_0_20px_var(--primary-shadow)] border border-[var(--primary-color)]/20">
                            <Sparkles className="text-[var(--primary-color)] animate-pulse" size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black bg-[var(--primary-color)] text-slate-950 px-2 py-0.5 rounded uppercase tracking-[0.2em]">{task.category}</span>
                                <span className="text-[10px] font-black border border-slate-800 text-slate-500 px-2 py-0.5 rounded uppercase tracking-[0.2em]">Protocolo {task.id.slice(0, 4)}</span>
                            </div>
                            <h2 className="text-2xl font-black cyber-font text-white uppercase tracking-tight">Especificações do Projeto</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-all p-3 hover:bg-slate-800 rounded-2xl group">
                        <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
                    {/* Main Demand Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <FileText size={16} className="text-[var(--primary-color)]" />
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Demanda Principal</label>
                        </div>
                        <h3 className="text-3xl font-black text-white leading-tight italic">{task.title}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 relative group transition-all hover:border-[var(--primary-color)]/30">
                            <div className="flex items-center gap-2 mb-4 text-emerald-400">
                                <DollarSign size={18} />
                                <label className="text-[10px] font-black uppercase tracking-[0.2em]">Preço do Projeto</label>
                            </div>
                            <p className="text-4xl font-black text-white tracking-tight">
                                <span className="text-emerald-400 text-lg mr-1 italic">R$</span>
                                {task.value.toLocaleString('pt-BR')}
                            </p>
                        </div>

                        <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 transition-all hover:border-blue-500/30">
                            <div className="flex items-center gap-2 mb-4 text-blue-400">
                                <User size={18} />
                                <label className="text-[10px] font-black uppercase tracking-[0.2em]">Cliente Associado</label>
                            </div>
                            <p className="text-xl font-bold text-white mb-1">{client?.name || 'Agente Externo'}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest"><Calendar size={10} /> {task.day}</div>
                                <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{new Date(task.date).toLocaleDateString('pt-BR')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Briefing */}
                    <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-slate-800 space-y-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-color)]/5 blur-[60px] group-hover:bg-[var(--primary-color)]/10 transition-all"></div>
                        <div className="flex items-center gap-2 text-[var(--primary-color)]">
                            <Zap size={18} />
                            <label className="text-[10px] font-black uppercase tracking-[0.3em]">Briefing & Detalhamento</label>
                        </div>
                        <div className="relative z-10">
                            <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap font-medium">
                                {task.briefing || 'Nenhuma especificação adicional fornecida para este protocolo.'}
                            </p>
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="flex items-center justify-between p-6 bg-slate-800/20 rounded-3xl border border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${task.status === 'Concluído' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                                task.status === 'Em Andamento' ? 'bg-slate-500' :
                                    'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                }`}></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status de Operação:</span>
                            <span className={`text-xs font-black uppercase tracking-widest ${task.status === 'Concluído' ? 'text-emerald-400' :
                                task.status === 'Em Andamento' ? 'text-slate-400' :
                                    'text-red-400'
                                }`}>{task.status}</span>
                        </div>
                        {task.addToPortfolio && (
                            <div className="flex items-center gap-2 text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                                <Briefcase size={12} />
                                <span className="text-[8px] font-black uppercase">Portfólio</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Controls */}
                <div className="p-8 border-t border-slate-800 bg-slate-900/50 flex gap-4">
                    <button
                        onClick={onEdit}
                        className="flex-[2] h-16 flex items-center justify-center gap-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-blue-500/20 hover:scale-[1.02] active:scale-95"
                    >
                        <Pencil size={18} />
                        Editar Protocolo
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex-1 h-16 flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-red-500/20 hover:scale-[1.02] active:scale-95"
                    >
                        <Trash2 size={18} />
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
