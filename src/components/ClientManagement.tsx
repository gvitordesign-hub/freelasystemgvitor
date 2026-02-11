
import React, { useState } from 'react';
import { Plus, Building2, Phone, UserPlus, MoreVertical, Users, FileText, Mail } from 'lucide-react';
import { Client } from '../types';

interface ClientManagementProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onViewInvoice: (client: Client) => void;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ clients, onAddClient, onViewInvoice }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', company: '', contact: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddClient(formData);
    setFormData({ name: '', company: '', contact: '' });
    setShowForm(false);
  };

  return (
    <div className="p-6 animate-reveal">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold cyber-font text-white uppercase tracking-tighter">Frella CRM</h1>
          <p className="text-slate-400">Gerencie sua rede de contatos e empresas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 neon-shadow-purple"
        >
          <UserPlus size={20} />
          {showForm ? 'Cancelar' : 'Novo Cliente'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-slate-900 border border-purple-500/30 p-6 rounded-2xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus size={18} className="text-purple-400" />
            Cadastro de Novo Cliente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nome Completo</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João Silva"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Empresa</label>
              <input
                required
                type="text"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                placeholder="Ex: Tech Corp"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Contato (Opcional)</label>
              <input
                type="text"
                value={formData.contact}
                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                placeholder="Ex: joao@frella.com ou (11) 9999-9999"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-2.5 rounded-lg transition-all">
              Salvar Cliente
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <div key={client.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/40 transition-all group relative">
            <div className="absolute top-4 right-4 text-slate-600 hover:text-slate-400 cursor-pointer">
              <MoreVertical size={18} />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl font-bold text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                {client.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">{client.name}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                  <Building2 size={12} />
                  {client.company}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <div className="p-2 bg-slate-800 rounded-lg"><Phone size={14} /></div>
                {client.contact || 'Sem contato salvo'}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Status: Ativo</span>
              <button
                onClick={() => onViewInvoice(client)}
                className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
              >
                <FileText size={14} />
                Ver Projetos
              </button>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full py-20 bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500">
            <Users size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum cliente cadastrado no Frella</p>
            <p className="text-sm">Comece adicionando um novo cliente no botão acima</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientManagement;
