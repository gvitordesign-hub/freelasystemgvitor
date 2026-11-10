import React, { useMemo, useState } from 'react';
import { Database, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { db, getLegacyLocalData, clearLegacyLocalData } from '@/lib/database';

/**
 * Envia ao Supabase os valores que, por falta de colunas no banco, ficaram apenas
 * no localStorage deste navegador (valor editado das notas e entregáveis das demandas).
 * Só aparece se houver algo a enviar.
 */
const LocalDataMigration: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const [version, setVersion] = useState(0);
  const legacy = useMemo(() => getLegacyLocalData(), [version]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const customEntries = Object.entries(legacy.customValues).filter(([, v]) => v !== null && v !== undefined);
  const deliverableEntries = Object.entries(legacy.deliverables).filter(([, v]) => Array.isArray(v) && v.length > 0);
  const total = customEntries.length + deliverableEntries.length;

  if (total === 0 && status !== 'done') return null;

  const run = async () => {
    setStatus('running');
    let ok = 0;
    let skipped = 0;
    try {
      const [invoices, tasks] = await Promise.all([db.invoices.list(), db.tasks.list()]);
      const invoiceById = new Map(invoices.map(i => [i.id, i]));
      const taskById = new Map(tasks.map(t => [t.id, t]));

      for (const [invoiceId, value] of customEntries) {
        const inv = invoiceById.get(invoiceId);
        if (!inv) { skipped++; continue; }
        // Não sobrescreve um valor que já esteja no banco
        if (inv.customValue === null || inv.customValue === undefined) {
          await db.invoices.update(invoiceId, { customValue: Number(value) });
        }
        ok++;
      }

      for (const [taskId, deliverables] of deliverableEntries) {
        const task = taskById.get(taskId);
        if (!task) { skipped++; continue; }
        await db.tasks.update(taskId, { deliverables });
        ok++;
      }

      clearLegacyLocalData();
      setVersion(v => v + 1);
      setMessage(`${ok} item(ns) enviados ao banco${skipped ? `, ${skipped} ignorado(s) (registro não existe mais)` : ''}.`);
      setStatus('done');
      onDone?.();
    } catch (e: any) {
      console.error('Local data migration failed:', e);
      setMessage(e?.message || 'Falha ao enviar os dados.');
      setStatus('error');
    }
  };

  return (
    <section className="bg-amber-500/5 border border-amber-500/30 p-6 rounded-3xl space-y-4 lg:col-span-2">
      <div className="flex items-start gap-3">
        <Database className="text-amber-400 shrink-0 mt-0.5" size={20} />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white">Dados salvos só neste navegador</h3>
          {status === 'done' ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} /> {message}</p>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              Encontrei {customEntries.length} valor(es) editado(s) de nota e {deliverableEntries.length} lista(s) de entregáveis que existem
              apenas neste aparelho. Envie para o banco para que apareçam em todos os dispositivos.
            </p>
          )}
          {status === 'error' && (
            <p className="text-xs text-rose-400 flex items-center gap-1.5"><AlertTriangle size={14} /> {message}</p>
          )}
        </div>
      </div>
      {status !== 'done' && (
        <button
          onClick={run}
          disabled={status === 'running'}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          {status === 'running' && <Loader2 size={14} className="animate-spin" />}
          Enviar dados locais para o banco
        </button>
      )}
    </section>
  );
};

export default LocalDataMigration;
