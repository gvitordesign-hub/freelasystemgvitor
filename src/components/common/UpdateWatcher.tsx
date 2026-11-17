import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Atualização automática do app (site, Android e Windows abrem o mesmo site).
 *
 * "Assinatura" = lista dos arquivos /assets/*.js|css que o index.html carrega (o nome muda a cada build).
 * De tempos em tempos baixamos o index.html com cache: 'no-store' e comparamos com a assinatura da tela aberta.
 * Se mudou: recarrega sozinho quando a pessoa não está no meio de nada; senão mostra um aviso com "Atualizar".
 */
const CHECK_EVERY_MS = 10 * 60 * 1000;   // a cada 10 min com o app aberto
const MIN_GAP_MS = 60 * 1000;            // no máximo 1 conferência por minuto
const RELOAD_GUARD_MS = 30 * 1000;       // trava anti-laço de recarregamentos
const GUARD_KEY = 'gv_update_reload_at';

const extractAssets = (pairs: Array<string | null>): string =>
  [...new Set(pairs.filter((u): u is string => !!u && u.includes('/assets/')))].sort().join('|');

const currentSignature = (): string =>
  extractAssets([...document.querySelectorAll('script[src],link[href]')].map(el => el.getAttribute('src') || el.getAttribute('href')));

const signatureFromHtml = (html: string): string => {
  const re = /(?:src|href)=["']([^"']*\/assets\/[^"']+)["']/g;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) found.push(m[1]);
  return extractAssets(found);
};

/** Tem formulário/modal aberto ou campo em foco? Nesse caso não recarrega sozinho (ninguém perde o que digita). */
const isBusy = (): boolean => {
  const a = document.activeElement as HTMLElement | null;
  if (a && (['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName) || a.isContentEditable)) return true;
  return !!document.querySelector('div.fixed.inset-0, [role="dialog"]');
};

const readGuard = (): number => { try { return Number(sessionStorage.getItem(GUARD_KEY)) || 0; } catch { return 0; } };
const writeGuard = () => { try { sessionStorage.setItem(GUARD_KEY, String(Date.now())); } catch { /* ignore */ } };

const UpdateWatcher: React.FC = () => {
  const [available, setAvailable] = useState(false);
  const lastCheck = useRef(0);
  const running = useRef(false);
  const baseline = useRef<string>('');

  const check = useCallback(async (force = false) => {
    if (running.current) return;
    const now = Date.now();
    if (!force && now - lastCheck.current < MIN_GAP_MS) return;
    if (!baseline.current) return; // sem assets (ex.: servidor de desenvolvimento): nada a comparar
    running.current = true;
    lastCheck.current = now;
    try {
      const res = await fetch(`/?_v=${now}`, { cache: 'no-store', headers: { Accept: 'text/html' } });
      if (!res.ok) return;
      const next = signatureFromHtml(await res.text());
      if (!next || next === baseline.current) return;

      if (isBusy()) { setAvailable(true); return; }
      if (now - readGuard() < RELOAD_GUARD_MS) { setAvailable(true); return; }
      writeGuard();
      window.location.reload();
    } catch {
      // sem internet: tenta na próxima
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    baseline.current = currentSignature();
    if (!baseline.current) return;

    const first = window.setTimeout(() => check(true), 4000);              // ao abrir
    const interval = window.setInterval(() => check(), CHECK_EVERY_MS);   // de tempos em tempos
    const onVisible = () => { if (document.visibilityState === 'visible') check(); }; // voltou ao app
    const onOnline = () => check();                                        // internet voltou
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onOnline);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onOnline);
    };
  }, [check]);

  if (!available) return null;

  return (
    <div
      role="status"
      className="fixed z-[310] top-16 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 flex items-center gap-3 rounded-2xl border border-purple-500/40 bg-slate-900/95 backdrop-blur-xl px-4 py-3 shadow-2xl"
    >
      <RefreshCw size={18} className="text-purple-400 shrink-0" />
      <p className="text-sm text-slate-100 leading-snug flex-1">Saiu uma versão nova do app.</p>
      <button
        onClick={() => { writeGuard(); window.location.reload(); }}
        className="min-h-[40px] px-4 rounded-xl bg-white text-slate-950 text-sm font-bold cursor-pointer active:scale-95"
      >
        Atualizar
      </button>
    </div>
  );
};

export default UpdateWatcher;
