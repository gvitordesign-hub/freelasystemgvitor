import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, RotateCcw } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  retry?: () => void;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string, retry?: () => void) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Acesso fora de componentes (substitui alert() nativo em handlers simples)
let globalApi: ToastApi | null = null;
export const notify: ToastApi = {
  success: (m) => (globalApi ? globalApi.success(m) : console.info(m)),
  error: (m, retry) => (globalApi ? globalApi.error(m, retry) : console.error(m)),
  info: (m) => (globalApi ? globalApi.info(m) : console.info(m))
};

const DURATION: Record<ToastKind, number> = { success: 3500, info: 4000, error: 8000 };

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string, retry?: () => void) => {
    const id = nextId.current++;
    setToasts(prev => [...prev.slice(-3), { id, kind, message, retry }]);
    setTimeout(() => dismiss(id), DURATION[kind]);
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push('success', m),
    error: (m, retry) => push('error', m, retry),
    info: (m) => push('info', m)
  }), [push]);

  const styles: Record<ToastKind, { box: string; icon: React.ReactNode }> = {
    success: { box: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100', icon: <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> },
    error: { box: 'border-rose-500/40 bg-rose-950/90 text-rose-100', icon: <AlertTriangle size={18} className="text-rose-400 shrink-0" /> },
    info: { box: 'border-slate-600 bg-slate-900/95 text-slate-100', icon: <Info size={18} className="text-cyan-400 shrink-0" /> }
  };

  globalApi = api;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed z-[300] bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl animate-reveal ${styles[t.kind].box}`}
          >
            {styles[t.kind].icon}
            <p className="text-sm leading-snug flex-1">{t.message}</p>
            {t.retry && (
              <button
                onClick={() => { t.retry?.(); dismiss(t.id); }}
                className="text-xs font-bold underline underline-offset-2 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw size={12} /> Tentar de novo
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="opacity-60 hover:opacity-100 cursor-pointer shrink-0">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
};

/** Converte erros do Supabase/JS em mensagem legível. */
export const errorMessage = (e: unknown, fallback = 'Não foi possível salvar.'): string => {
  const msg = (e as any)?.message;
  if (typeof msg === 'string' && msg) {
    if ((e as any)?.code === '23505') return 'Este lançamento já existe (registro duplicado evitado).';
    return `${fallback} (${msg})`;
  }
  return fallback;
};
