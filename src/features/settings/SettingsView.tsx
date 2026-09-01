
import React, { useState } from 'react';
import { Target, Palette, Bookmark, Save, Trash2, Sliders, Bell, Calendar, Plus, RefreshCw, Package, Sparkles, DollarSign, Pencil, X, Check, Search, Tag, Layers } from 'lucide-react';
import { UserStats, ThemeColor, Client, Task, Holiday, Service } from '@/types';
import FreelancerCalculator from '@/features/settings/FreelancerCalculator';

interface SettingsViewProps {
  stats: UserStats;
  onUpdateStats: (stats: Partial<UserStats>) => void;
  clients?: Client[];
  onAddTask?: (task: Omit<Task, 'id'>) => Promise<void>;
  holidays?: Holiday[];
  onAddHoliday?: (holiday: Omit<Holiday, 'id'>) => Promise<void>;
  onDeleteHoliday?: (id: string) => Promise<void>;
  onSyncHolidays?: (holidays: Omit<Holiday, 'id'>[]) => Promise<void>;
  services?: Service[];
  onAddService?: (service: Omit<Service, 'id'>) => Promise<any>;
  onUpdateService?: (id: string, service: Omit<Service, 'id'>) => Promise<any>;
  onDeleteService?: (id: string) => Promise<any>;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  stats,
  onUpdateStats,
  clients,
  onAddTask,
  holidays,
  onAddHoliday,
  onDeleteHoliday,
  onSyncHolidays,
  services = [],
  onAddService,
  onUpdateService,
  onDeleteService
}) => {
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayDesc, setNewHolidayDesc] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const colors: ThemeColor[] = ['purple', 'emerald', 'cyan', 'rose'];

  // Cardápio de Serviços State
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    category: 'Design',
    baseValue: '',
    description: ''
  });

  const handleSyncGeneralCalendar = async () => {
    if (!onSyncHolidays) return;
    setIsSyncing(true);
    try {
      const currentYear = new Date().getFullYear();
      const yearsToFetch = [currentYear, currentYear + 1];
      const allFetchedHolidays: { date: string; name: string }[] = [];

      for (const year of yearsToFetch) {
        try {
          const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
          if (response.ok) {
            const data = await response.json();
            allFetchedHolidays.push(...data);
          }
        } catch (e) {
          console.error(`Failed to fetch holidays for year ${year}:`, e);
        }
      }

      if (allFetchedHolidays.length === 0) {
        alert('Não foi possível obter os feriados nacionais do Calendário Geral no momento. Verifique sua conexão.');
        return;
      }

      // Filter out duplicates that already exist in state
      const existingDates = new Set(holidays?.map(h => h.date) || []);
      const newHolidays = allFetchedHolidays
        .map(h => ({
          date: h.date,
          description: h.name
        }))
        .filter(h => !existingDates.has(h.date));

      if (newHolidays.length === 0) {
        alert('Tudo em ordem! Todos os feriados nacionais do Calendário Geral já estão sincronizados no seu sistema.');
      } else {
        await onSyncHolidays(newHolidays);
        alert(`Sincronizado com sucesso! ${newHolidays.length} feriados nacionais foram importados e vinculados à sua agenda.`);
      }
    } catch (error) {
      console.error('Error syncing general calendar:', error);
      alert('Ocorreu um erro ao tentar sincronizar os feriados. Tente novamente mais tarde.');
    } finally {
      setIsSyncing(false);
    }
  };

  const clearData = () => {
    if (confirm('AVISO: Esta versão agora utiliza sincronização em nuvem. Para resetar seus dados, você precisaria limpá-los manualmente no banco de dados ou solicitar suporte. Deseja apenas recarregar o sistema?')) {
      window.location.reload();
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 pb-20 animate-reveal">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold cyber-font text-white uppercase tracking-tighter">Configurações</h1>
          <p className="text-slate-400">Personalize os protocolos do seu sistema</p>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
          <Sliders className="text-[var(--primary-color)]" size={20} />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">v2.5 Estável</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Metas Financeiras */}
        <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <Target className="text-emerald-400" size={20} />
            Metas Financeiras (R$)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Semanal</label>
              <input
                type="number"
                value={stats.weeklyGoal}
                onChange={e => onUpdateStats({ weeklyGoal: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Mensal</label>
              <input
                type="number"
                value={stats.monthlyGoal}
                onChange={e => onUpdateStats({ monthlyGoal: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Anual</label>
              <input
                type="number"
                value={stats.annualGoal || 100000}
                onChange={e => onUpdateStats({ annualGoal: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Metas de Volume */}
        <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <Bookmark className="text-amber-400" size={20} />
            Metas de Produtividade
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Demandas/Semana</label>
              <input
                type="number"
                value={stats.taskGoal}
                onChange={e => onUpdateStats({ taskGoal: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Novos Clientes/Mês</label>
              <input
                type="number"
                value={stats.clientGoal}
                onChange={e => onUpdateStats({ clientGoal: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Estética */}
        <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <Palette className="text-[var(--primary-color)]" size={20} />
            Interface Visual (Acento Neon)
          </h3>
          <div className="flex flex-wrap gap-4">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => onUpdateStats({ themeColor: color })}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all ${stats.themeColor === color
                  ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10'
                  : 'border-slate-800 bg-slate-800/20 hover:border-slate-700'
                  }`}
              >
                <div className={`w-6 h-6 rounded-full shadow-lg ${color === 'purple' ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]' :
                  color === 'emerald' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' :
                    color === 'cyan' ? 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                  }`} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  {color === 'purple' ? 'Púrpura' :
                    color === 'emerald' ? 'Esmeralda' :
                      color === 'cyan' ? 'Ciano' : 'Rosa'}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Objetivos */}
        <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <Save className="text-blue-400" size={20} />
            Objetivos Gerais & Brainstorming
          </h3>
          <textarea
            value={stats.objectives || ''}
            onChange={e => onUpdateStats({ objectives: e.target.value })}
            placeholder="Escreva seus focos, prazos críticos ou grandes metas para o período aqui..."
            className="w-full h-48 bg-slate-800/40 border border-slate-700 rounded-2xl p-6 text-slate-300 focus:border-[var(--primary-color)] outline-none transition-all resize-none"
          />
        </section>

        {/* Alerta de Inadimplência */}
        <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6 lg:col-span-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <Bell className="text-rose-400" size={20} />
              Alerta de Inadimplência
            </h3>
            <p className="text-xs text-slate-500 mt-1">Receba avisos no dashboard quando um cliente tiver notas não pagas há mais de X dias.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[15, 20, 30, 60].map(days => (
              <button
                key={days}
                onClick={() => onUpdateStats({ overdueAlertDays: days })}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all ${
                  (stats.overdueAlertDays ?? 30) === days
                    ? 'border-rose-500 bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                    : 'border-slate-700 bg-slate-800/30 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <span className={`text-lg font-black ${ (stats.overdueAlertDays ?? 30) === days ? 'text-rose-300' : 'text-slate-400'}`}>{days}</span>
                dias
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            Configuração atual: alertar após <span className="text-rose-500">{stats.overdueAlertDays ?? 30} dias</span> sem pagamento
          </p>
        </section>

        {/* Gestão de Feriados (Dias Bloqueados) */}
        <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <Calendar className="text-purple-400" size={20} />
                Gestão de Feriados (Dias Bloqueados)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Cadastre feriados e dias de folga. O sistema impedirá que você agende demandas nesses dias e os destacará na sua agenda geral.
              </p>
            </div>
            {onSyncHolidays && (
              <button
                onClick={handleSyncGeneralCalendar}
                disabled={isSyncing}
                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center gap-2 active:scale-95 transition-all self-start sm:self-auto shrink-0 shadow-lg shadow-purple-500/5 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Sincronizando...' : 'Vincular Calendário Geral'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-950/30 p-5 rounded-2xl border border-slate-800/60">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Data do Feriado</label>
              <input
                type="date"
                value={newHolidayDate}
                onChange={e => setNewHolidayDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-[var(--primary-color)] [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descrição / Nome</label>
              <input
                type="text"
                placeholder="Ex: Ano Novo, Folga..."
                value={newHolidayDesc}
                onChange={e => setNewHolidayDesc(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-[var(--primary-color)]"
              />
            </div>
            <button
              onClick={() => {
                if (!newHolidayDate || !newHolidayDesc) {
                  alert('Por favor, preencha a data e a descrição do feriado.');
                  return;
                }
                if (onAddHoliday) {
                  onAddHoliday({ date: newHolidayDate, description: newHolidayDesc });
                  setNewHolidayDate('');
                  setNewHolidayDesc('');
                }
              }}
              className="bg-[var(--primary-color)] hover:brightness-110 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[var(--primary-shadow)]"
            >
              <Plus size={14} />
              Adicionar Dia
            </button>
          </div>

          {holidays && holidays.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {holidays.map(h => {
                const [year, month, day] = h.date.split('-');
                const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                const formattedDate = dateObj.toLocaleDateString('pt-BR');
                const weekDay = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                const formattedWeekDay = weekDay.charAt(0).toUpperCase() + weekDay.slice(1).split('-')[0];

                return (
                  <div key={h.id} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-800 rounded-2xl group hover:border-[var(--primary-color)]/30 transition-all">
                    <div>
                      <p className="text-xs font-bold text-slate-200">{h.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">{formattedDate} ({formattedWeekDay})</p>
                    </div>
                    <button
                      onClick={() => onDeleteHoliday && onDeleteHoliday(h.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Excluir feriado"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-600 text-xs italic border border-dashed border-slate-800 rounded-2xl">
              Nenhum feriado ou dia de folga cadastrado no momento.
            </div>
          )}
        </section>

        {/* Cardápio de Entregáveis / Serviços */}
        <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <Package className="text-[var(--primary-color)]" size={20} />
                Cardápio de Entregáveis & Serviços
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Cadastre seus serviços e valores padrão (ex: Motion Design R$100, Capa de CD R$100). Eles aparecerão para inserção com 1 clique na criação de Projetos.
              </p>
            </div>
            {!isAddingService && (
              <button
                onClick={() => {
                  setEditingServiceId(null);
                  setServiceFormData({ name: '', category: 'Design', baseValue: '', description: '' });
                  setIsAddingService(true);
                }}
                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[var(--primary-color)]/20 hover:bg-[var(--primary-color)]/30 border border-[var(--primary-color)]/40 text-[var(--primary-color)] flex items-center justify-center gap-2 active:scale-95 transition-all self-start sm:self-auto shrink-0 shadow-lg"
              >
                <Plus size={14} />
                Novo Serviço no Cardápio
              </button>
            )}
          </div>

          {/* Formulário de Adicionar / Editar Serviço */}
          {isAddingService && (
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-[var(--primary-color)]/30 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold cyber-font text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-[var(--primary-color)]" />
                  {editingServiceId ? 'Editar Serviço do Cardápio' : 'Cadastrar Novo Serviço'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingService(false);
                    setEditingServiceId(null);
                  }}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Nome do Serviço / Entregável *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Motion Design, Capa de CD, Banner Youtube..."
                    value={serviceFormData.name}
                    onChange={e => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-[var(--primary-color)]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Valor Padrão (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="100.00"
                      value={serviceFormData.baseValue}
                      onChange={e => setServiceFormData({ ...serviceFormData, baseValue: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-xs outline-none focus:border-[var(--primary-color)] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={serviceFormData.category}
                    onChange={e => setServiceFormData({ ...serviceFormData, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-[var(--primary-color)]"
                  >
                    <option value="Design">Design</option>
                    <option value="Motion">Motion Design</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Identidade Visual">Identidade Visual</option>
                    <option value="Edição Video">Edição de Vídeo</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Desenvolvimento">Desenvolvimento</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Descrição ou Observação (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Formato vertical 1080x1920 com trilha sonora inclusa"
                    value={serviceFormData.description}
                    onChange={e => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-[var(--primary-color)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingService(false);
                    setEditingServiceId(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!serviceFormData.name.trim()) {
                      alert('Por favor, informe o nome do serviço.');
                      return;
                    }
                    const val = parseFloat(serviceFormData.baseValue);
                    if (isNaN(val) || val < 0) {
                      alert('Por favor, informe um valor padrão válido.');
                      return;
                    }

                    if (editingServiceId && onUpdateService) {
                      await onUpdateService(editingServiceId, {
                        name: serviceFormData.name.trim(),
                        description: serviceFormData.description.trim() || `${serviceFormData.category} - Padrão`,
                        baseValue: val
                      });
                    } else if (onAddService) {
                      await onAddService({
                        name: serviceFormData.name.trim(),
                        description: serviceFormData.description.trim() || `${serviceFormData.category} - Padrão`,
                        baseValue: val
                      });
                    }

                    setIsAddingService(false);
                    setEditingServiceId(null);
                    setServiceFormData({ name: '', category: 'Design', baseValue: '', description: '' });
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[var(--primary-color)] text-white hover:brightness-110 shadow-lg shadow-[var(--primary-shadow)] flex items-center gap-2"
                >
                  <Check size={14} />
                  {editingServiceId ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                </button>
              </div>
            </div>
          )}

          {/* Barra de Filtro e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Buscar serviço no cardápio..."
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-xs outline-none focus:border-[var(--primary-color)] placeholder:text-slate-500"
              />
              {serviceSearch && (
                <button onClick={() => setServiceSearch('')} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {['Todos', 'Motion', 'Design', 'Social Media', 'Edição Video'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    selectedCategory === cat
                      ? 'bg-[var(--primary-color)] text-white shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Serviços Cadastrados */}
          {(() => {
            const filtered = services.filter(s => {
              const matchesSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                (s.description && s.description.toLowerCase().includes(serviceSearch.toLowerCase()));
              const matchesCategory = selectedCategory === 'Todos' ||
                s.name.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                (s.description && s.description.toLowerCase().includes(selectedCategory.toLowerCase()));
              return matchesSearch && matchesCategory;
            });

            if (filtered.length === 0) {
              return (
                <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-3 bg-slate-950/20">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto text-slate-500">
                    <Package size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Nenhum serviço encontrado no cardápio</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Cadastre seus serviços mais comuns para acelerar a criação de projetos.</p>
                  </div>
                  {!isAddingService && (
                    <button
                      onClick={() => {
                        setEditingServiceId(null);
                        setServiceFormData({ name: '', category: 'Design', baseValue: '', description: '' });
                        setIsAddingService(true);
                      }}
                      className="text-xs font-bold text-[var(--primary-color)] hover:underline inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> Cadastrar primeiro serviço
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filtered.map(service => (
                  <div
                    key={service.id}
                    className="p-4 bg-slate-800/40 border border-slate-800/80 hover:border-[var(--primary-color)]/40 rounded-2xl flex flex-col justify-between gap-3 group transition-all relative overflow-hidden"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-black text-white group-hover:text-[var(--primary-color)] transition-colors leading-snug">
                          {service.name}
                        </h4>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => {
                              setEditingServiceId(service.id);
                              setServiceFormData({
                                name: service.name,
                                category: 'Design',
                                baseValue: service.baseValue.toString(),
                                description: service.description || ''
                              });
                              setIsAddingService(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
                            title="Editar serviço"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Tem certeza que deseja excluir "${service.name}" do cardápio?`)) {
                                if (onDeleteService) await onDeleteService(service.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Excluir serviço"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {service.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1">
                          {service.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                        <Tag size={10} /> Valor Base
                      </span>
                      <span className="text-xs font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        {service.baseValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* Financial Engine (Calculadora) */}
        <section className="lg:col-span-2">
          <FreelancerCalculator stats={stats} onUpdateStats={onUpdateStats} clients={clients} onAddTask={onAddTask} />
        </section>

        {/* Perigo */}
        <section className="lg:col-span-2 pt-8 flex justify-center">
          <button
            onClick={clearData}
            className="flex items-center gap-2 text-rose-500/50 hover:text-rose-500 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <Trash2 size={14} />
            Formatar Dados (Reset Total)
          </button>
        </section>
      </div>
    </div>
  );
};

// Exporting SettingsView as default to fix the import error in App.tsx
export default SettingsView;
