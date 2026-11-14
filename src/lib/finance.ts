// =================================================================
// Fonte única de verdade para os números financeiros.
//
// Regras:
// * Valor da nota  = valor personalizado ?? soma das demandas da nota.
// * Recebido       = soma das ENTRADAS PAGAS ligadas à nota (pela nota ou
//                    por uma demanda da nota) — inclui abatimentos.
// * Restante       = valor da nota - recebido (nunca negativo).
// * A receber      = restante das notas pendentes
//                    + entradas pendentes que NÃO pertencem a nota
//                      (demanda avulsa ou lançamento manual).
//   Entradas pendentes de demandas dentro de nota são ignoradas: quem
//   cobra é a nota (evita somar o valor cheio das demandas quando a
//   nota tem valor personalizado).
// * Cliente de um lançamento = cliente da demanda ?? da nota ?? o
//   cliente escolhido no lançamento manual. Nunca por texto/descrição.
// =================================================================
import { Client, Invoice, Task, Transaction } from '@/types';

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v) || 0;

export interface InvoiceSummary {
  total: number;
  received: number;
  remaining: number;
  /** parte do recebido que veio de abatimentos */
  abated: number;
}

export interface FinanceIndex {
  taskById: Map<string, Task>;
  invoiceById: Map<string, Invoice>;
  tasksByInvoice: Map<string, Task[]>;
  /** lançamentos de entrada agrupados pela nota a que pertencem */
  entradasByInvoice: Map<string, Transaction[]>;
}

/** Nota à qual o lançamento pertence (direto ou via demanda). */
export const invoiceIdOfTx = (tx: Transaction, taskById: Map<string, Task>): string | undefined =>
  tx.invoiceId || (tx.taskId ? taskById.get(tx.taskId)?.invoiceId : undefined) || undefined;

export const buildFinanceIndex = (tasks: Task[], invoices: Invoice[], transactions: Transaction[]): FinanceIndex => {
  const taskById = new Map(tasks.map(t => [t.id, t]));
  const invoiceById = new Map(invoices.map(i => [i.id, i]));
  const tasksByInvoice = new Map<string, Task[]>();
  tasks.forEach(t => {
    if (!t.invoiceId) return;
    const list = tasksByInvoice.get(t.invoiceId) || [];
    list.push(t);
    tasksByInvoice.set(t.invoiceId, list);
  });
  const entradasByInvoice = new Map<string, Transaction[]>();
  transactions.forEach(tx => {
    if (tx.type !== 'Entrada') return;
    const invId = invoiceIdOfTx(tx, taskById);
    if (!invId) return;
    const list = entradasByInvoice.get(invId) || [];
    list.push(tx);
    entradasByInvoice.set(invId, list);
  });
  return { taskById, invoiceById, tasksByInvoice, entradasByInvoice };
};

export const invoiceSummary = (inv: Invoice, idx: FinanceIndex): InvoiceSummary => {
  const invTasks = idx.tasksByInvoice.get(inv.id) || [];
  const calc = invTasks.reduce((s, t) => s + num(t.value), 0);
  const total = inv.customValue !== undefined && inv.customValue !== null ? num(inv.customValue) : calc;
  const paid = (idx.entradasByInvoice.get(inv.id) || []).filter(t => t.status === 'Pago');
  const received = round2(paid.reduce((s, t) => s + num(t.value), 0));
  const abated = round2(paid.filter(t => t.abatement).reduce((s, t) => s + num(t.value), 0));
  return { total: round2(total), received, remaining: round2(Math.max(total - received, 0)), abated };
};

/** Cliente dono do lançamento (demanda → nota → escolhido no lançamento). */
export const clientIdOfTx = (tx: Transaction, idx: FinanceIndex): string | undefined => {
  const task = tx.taskId ? idx.taskById.get(tx.taskId) : undefined;
  if (task?.clientId) return task.clientId;
  const inv = tx.invoiceId ? idx.invoiceById.get(tx.invoiceId) : undefined;
  if (inv?.clientId) return inv.clientId;
  return tx.clientId || undefined;
};

/** Entrada pendente que é previsão real (não pertence a nota — a nota já é a cobrança). */
export const isStandaloneForecast = (tx: Transaction, idx: FinanceIndex) =>
  tx.type === 'Entrada' && tx.status === 'Pendente' && !invoiceIdOfTx(tx, idx.taskById);

export interface ClientFinancials {
  paid: number;          // dinheiro que entrou no caixa
  pending: number;       // ainda a receber
  pendingInvoices: number; // notas com saldo a receber
  oldestOpenInvoice?: Invoice;
}

export const clientFinancials = (
  client: Client,
  invoices: Invoice[],
  transactions: Transaction[],
  idx: FinanceIndex
): ClientFinancials => {
  let paid = 0;
  let pending = 0;
  transactions.forEach(tx => {
    if (tx.type !== 'Entrada' || clientIdOfTx(tx, idx) !== client.id) return;
    if (tx.status === 'Pago') paid += num(tx.value);
    else if (isStandaloneForecast(tx, idx)) pending += num(tx.value);
  });
  let pendingInvoices = 0;
  let oldestOpenInvoice: Invoice | undefined;
  invoices.forEach(inv => {
    if (inv.clientId !== client.id || inv.status !== 'Pendente') return;
    const s = invoiceSummary(inv, idx);
    if (s.remaining <= 0.009) return;
    pending += s.remaining;
    pendingInvoices++;
    if (!oldestOpenInvoice || inv.createdAt < oldestOpenInvoice.createdAt) oldestOpenInvoice = inv;
  });
  return { paid: round2(paid), pending: round2(pending), pendingInvoices, oldestOpenInvoice };
};

export interface Receivables {
  total: number;
  fromInvoices: number;
  standalone: number;
  openInvoices: number;
}

/** Tudo o que ainda falta receber, de qualquer mês. */
export const receivables = (invoices: Invoice[], transactions: Transaction[], idx: FinanceIndex): Receivables => {
  let fromInvoices = 0;
  let openInvoices = 0;
  invoices.forEach(inv => {
    if (inv.status !== 'Pendente') return;
    const r = invoiceSummary(inv, idx).remaining;
    if (r > 0.009) { fromInvoices += r; openInvoices++; }
  });
  const standalone = transactions
    .filter(tx => isStandaloneForecast(tx, idx))
    .reduce((s, tx) => s + num(tx.value), 0);
  return { total: round2(fromInvoices + standalone), fromInvoices: round2(fromInvoices), standalone: round2(standalone), openInvoices };
};
