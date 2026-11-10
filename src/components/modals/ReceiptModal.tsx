import React, { useState } from 'react';
import { X, DollarSign, Calendar } from 'lucide-react';
import { getLocalDateString, formatDateBR } from '@/utils/dateUtils';

export const PAYMENT_METHODS = ['PIX', 'Transferência', 'Dinheiro', 'Cartão', 'Boleto', 'Outro'];

export interface ReceiptResult {
  date: string; // YYYY-MM-DD (data local)
  method: string;
}

interface ReceiptModalProps {
  title: string;        // ex.: nome da nota ou da tarefa
  amount: number;
  /** o que será lançado, para a prévia (ex.: "2 lançamentos") */
  detail?: string;
  confirmLabel?: string;
  onConfirm: (result: ReceiptResult) => void;
  onClose: () => void;
}

/** Único ponto de "Registrar recebimento": data, forma de pagamento e prévia do lançamento no caixa. */
const ReceiptModal: React.FC<ReceiptModalProps> = ({ title, amount, detail, confirmLabel = 'Registrar recebimento', onConfirm, onClose }) => {
  const today = getLocalDateString();
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState('PIX');
  const [busy, setBusy] = useState(false);

  const brl = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Registrar recebimento</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1 tabular-nums flex items-center gap-1">
              <DollarSign size={24} className="shrink-0" />{brl.replace('R$', '').trim()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-slate-400 mb-1.5">Data do recebimento</span>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-400 mb-1.5">Forma de pagamento</span>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 cursor-pointer"
              >
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>

          <p className="text-sm text-slate-300 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
            Vai lançar <strong className="text-emerald-400 tabular-nums">{brl}</strong> no caixa em{' '}
            <strong>{date ? formatDateBR(date) : '—'}</strong> via {method}.
            {detail && <span className="block text-xs text-slate-500 mt-1">{detail}</span>}
          </p>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer">
              Cancelar
            </button>
            <button
              disabled={!date || busy}
              onClick={() => { setBusy(true); onConfirm({ date, method }); }}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold cursor-pointer"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
