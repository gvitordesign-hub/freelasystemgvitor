
import React from 'react';
import { Target, Palette, Bookmark, Save, Trash2, Sliders, Bell, Calendar, Plus, RefreshCw } from 'lucide-react';
import { UserStats, ThemeColor, Client, Task, Holiday } from '../types';
import FreelancerCalculator from './FreelancerCalculator';

interface SettingsViewProps {
  stats: UserStats;
  onUpdateStats: (stats: Partial<UserStats>) => void;
  clients?: Client[];
  onAddTask?: (task: Omit<Task, 'id'>) => Promise<void>;
  holidays?: Holiday[];
  onAddHoliday?: (holiday: Omit<Holiday, 'id'>) => Promise<void>;
  onDeleteHoliday?: (id: string) => Promise<void>;
  onSyncHolidays?: (holidays: Omit<Holiday, 'id'>[]) => Promise<void>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ stats, onUpdateStats, clients, onAddTask, holidays, onAddHoliday, onDeleteHoliday, onSyncHolidays }) => {
  const [newHolidayDate, setNewHolidayDate] = React.useState('');
  const [newHolidayDesc, setNewHolidayDesc] = React.useState('');
  const [isSyncing, setIsSyncing] = React.useState(false);
  const colors: ThemeColor[] = ['purple', 'emerald', 'cyan', 'rose'];

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
