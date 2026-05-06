
import React from 'react';
import { Target, Palette, Bookmark, Save, Trash2, Sliders, Bell } from 'lucide-react';
import { UserStats, ThemeColor } from '../types';

interface SettingsViewProps {
  stats: UserStats;
  onUpdateStats: (stats: Partial<UserStats>) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ stats, onUpdateStats }) => {
  const colors: ThemeColor[] = ['purple', 'emerald', 'cyan', 'rose'];

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
