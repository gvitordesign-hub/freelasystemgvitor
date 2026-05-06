
import React, { useState, useMemo } from 'react';
import { AlertTriangle, X, ChevronRight, Bell } from 'lucide-react';
import { Client, Invoice } from '../types';

interface OverdueAlertProps {
  clients: Client[];
  invoices: Invoice[];
  overdueAlertDays: number;
  onNavigateToClient: (client: Client) => void;
}

const OverdueAlert: React.FC<OverdueAlertProps> = ({
  clients,
  invoices,
  overdueAlertDays,
  onNavigateToClient
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const overdueClients = useMemo(() => {
    const now = new Date();
    const thresholdMs = overdueAlertDays * 24 * 60 * 60 * 1000;

    // Find invoices that are Pendente and older than overdueAlertDays
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status !== 'Pendente') return false;
      const created = new Date(inv.createdAt);
      return (now.getTime() - created.getTime()) >= thresholdMs;
    });

    // Map to clients with their overdue invoice info
    const clientMap = new Map<string, { client: Client; invoices: Invoice[]; maxDays: number }>();

    overdueInvoices.forEach(inv => {
      const client = clients.find(c => c.id === inv.clientId);
      if (!client) return;

      const daysOverdue = Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));

      if (clientMap.has(client.id)) {
        const existing = clientMap.get(client.id)!;
        existing.invoices.push(inv);
        existing.maxDays = Math.max(existing.maxDays, daysOverdue);
      } else {
        clientMap.set(client.id, { client, invoices: [inv], maxDays: daysOverdue });
      }
    });

    return Array.from(clientMap.values()).sort((a, b) => b.maxDays - a.maxDays);
  }, [clients, invoices, overdueAlertDays]);

  if (overdueClients.length === 0 || dismissed) return null;

  const visibleClients = expanded ? overdueClients : overdueClients.slice(0, 2);

  return (
    <div className="mx-4 md:mx-8 mb-6 animate-in slide-in-from-top-2 duration-500">
      <div className="bg-rose-950/40 border border-rose-500/30 rounded-[2rem] overflow-hidden shadow-[0_0_30px_rgba(244,63,94,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <Bell size={18} className="text-rose-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-300 uppercase tracking-widest">
                Alerta de Inadimplência
              </h3>
              <p className="text-[10px] text-rose-500/70 font-bold uppercase tracking-tight mt-0.5">
                {overdueClients.length} cliente{overdueClients.length > 1 ? 's' : ''} com nota{overdueClients.length > 1 ? 's' : ''} há mais de {overdueAlertDays} dias sem pagamento
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-rose-500/50 hover:text-rose-400 transition-colors p-1"
            title="Fechar alerta"
          >
            <X size={18} />
          </button>
        </div>

        {/* Client List */}
        <div className="p-4 space-y-2">
          {visibleClients.map(({ client, invoices: clientInvoices, maxDays }) => (
            <button
              key={client.id}
              onClick={() => onNavigateToClient(client)}
              className="w-full flex items-center justify-between p-4 bg-rose-950/30 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/30 rounded-2xl transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-rose-400">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{client.name}</p>
                  <p className="text-[10px] text-rose-400/70 font-bold uppercase tracking-wider">
                    {clientInvoices.length} nota{clientInvoices.length > 1 ? 's' : ''} pendente{clientInvoices.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl uppercase tracking-widest">
                  {maxDays}d em atraso
                </span>
                <ChevronRight size={16} className="text-rose-500/50 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}

          {overdueClients.length > 2 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-center py-3 text-[10px] font-black text-rose-500/60 hover:text-rose-400 uppercase tracking-widest transition-colors"
            >
              {expanded ? 'Ver menos' : `Ver mais ${overdueClients.length - 2} cliente(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverdueAlert;
