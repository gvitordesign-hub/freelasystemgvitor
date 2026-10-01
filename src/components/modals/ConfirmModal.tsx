import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmModalProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDanger?: boolean;
    isLoading?: boolean;
    errorMessage?: string | null;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
    isDanger = true,
    isLoading = false,
    errorMessage = null
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Lock body scroll while modal is open
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    // Close on Escape key when not loading
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel, isLoading]);

    if (!mounted) return null;

    const modalContent = (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onCancel();
                }
            }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
        >
            <div className="bg-slate-900 border border-slate-800/90 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative my-auto max-h-[92vh] flex flex-col">
                {!isLoading && (
                    <button
                        onClick={onCancel}
                        className="absolute top-5 right-5 text-slate-500 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer z-10"
                        aria-label="Fechar modal"
                    >
                        <X size={18} />
                    </button>
                )}

                <div className="p-6 sm:p-8 text-center space-y-5 overflow-y-auto custom-scrollbar">
                    <div className={`mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center ${isDanger ? 'bg-rose-500/20 text-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.25)]' : 'bg-blue-500/20 text-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.25)]'}`}>
                        <AlertTriangle size={34} className="animate-pulse" />
                    </div>

                    <div className="space-y-2">
                        <h3 id="confirm-modal-title" className="text-xl sm:text-2xl font-bold cyber-font text-white uppercase tracking-tight">{title}</h3>
                        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{message}</p>
                    </div>

                    {errorMessage && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs text-left animate-in fade-in">
                            <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5">Falha na Operação</p>
                            <p>{errorMessage}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 px-5 py-3.5 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white transition-all border border-slate-700/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-5 py-3.5 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all border flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${isDanger
                                    ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-500 shadow-[0_4px_16px_rgba(244,63,94,0.35)] active:scale-95'
                                    : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-[0_4px_16px_rgba(59,130,246,0.35)] active:scale-95'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Processando...</span>
                                </>
                            ) : (
                                confirmLabel
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ConfirmModal;
