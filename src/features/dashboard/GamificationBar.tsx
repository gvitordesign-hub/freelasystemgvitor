import React, { useState } from 'react';
import { Target, Flame, DollarSign, LogOut, User, ChevronDown, Menu, Loader2, RefreshCw } from 'lucide-react';
import { UserStats } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface GamificationBarProps {
  stats: UserStats;
  currentIncome: number;
  pendingIncome?: number;
  syncStatus?: 'synced' | 'syncing' | 'error';
  onManualSync?: () => void;
  onOpenMobileMenu?: () => void;
  weekLabel?: string;
}

const GamificationBar: React.FC<GamificationBarProps> = ({ 
  stats, 
  currentIncome, 
  pendingIncome = 0,
  syncStatus = 'synced',
  onManualSync,
  onOpenMobileMenu,
  weekLabel
}) => {
  const goal = stats.weeklyGoal || 2000;
  const receivedPercentage = Math.min((currentIncome / goal) * 100, 100);
  const pendingPercentage = Math.min((pendingIncome / goal) * 100, Math.max(0, 100 - receivedPercentage));
  const totalPercentage = Math.min(((currentIncome + pendingIncome) / goal) * 100, 100);
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="h-16 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-2xl px-3 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 w-full shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2.5 sm:gap-4 md:gap-6 flex-1 max-w-2xl min-w-0">
        {/* Mobile Menu Button */}
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer touch-target flex items-center justify-center shrink-0"
            aria-label="Abrir Menu"
          >
            <Menu size={22} />
          </button>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/20 transition-all duration-300 hover:scale-105 shrink-0 bg-gradient-to-br from-emerald-600/80 to-[var(--primary-color)] neon-shadow-primary">
              <span className="font-black cyber-font text-white text-xs sm:text-base drop-shadow-sm">{stats.level}</span>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5 text-left">
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black flex items-center gap-1.5">
                Meta Semanal 
                {weekLabel && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded font-black text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 tracking-wider">
                    {weekLabel}
                  </span>
                )}
              </p>
            </div>
            <p className="text-[11px] md:text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-400">{Math.round(receivedPercentage)}% Recebido</span>
              {pendingIncome > 0 && (
                <span className="text-amber-400 text-[10px] font-bold">
                  (+{Math.round((pendingIncome / goal) * 100)}% Pendente)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1 min-w-0">
          {/* Dual Segmented Progress Bar: Green (Recebido) + Amber (Pendente) */}
          <div className="h-2.5 w-full bg-slate-900/90 rounded-full overflow-hidden border border-slate-800/80 p-0.5 flex relative">
            {receivedPercentage > 0 && (
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] rounded-l-full transition-all duration-700 ease-out shrink-0"
                style={{ width: `${receivedPercentage}%` }}
                title={`Recebido: R$ ${currentIncome.toLocaleString('pt-BR')} (${Math.round(receivedPercentage)}%)`}
              />
            )}
            {pendingPercentage > 0 && (
              <div
                className={`h-full bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-700 ease-out shrink-0 ${
                  receivedPercentage === 0 ? 'rounded-l-full' : ''
                } ${totalPercentage >= 100 ? 'rounded-r-full' : ''}`}
                style={{ width: `${pendingPercentage}%` }}
                title={`Pendente: R$ ${pendingIncome.toLocaleString('pt-BR')} (${Math.round(pendingPercentage)}%)`}
              />
            )}
          </div>
          <div className="flex justify-between items-center text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider cyber-font">
            <div className="flex items-center gap-2 truncate">
              <span className="text-emerald-400 flex items-center gap-1 font-bold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                Recebido: R$ {currentIncome.toLocaleString('pt-BR')}
              </span>
              {pendingIncome > 0 && (
                <span className="text-amber-400 flex items-center gap-1 font-bold truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                  Pendente: R$ {pendingIncome.toLocaleString('pt-BR')}
                </span>
              )}
            </div>
            <span className="text-slate-500 truncate ml-1">Meta: R$ {goal.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3.5 ml-4">
        {/* DB Sync Live Status Badge */}
        {onManualSync && (
          <button
            onClick={onManualSync}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer shadow-sm hover:scale-102 active:scale-95"
            title="Sincronização contínua ativa. Clique para sincronizar agora."
          >
            {syncStatus === 'syncing' ? (
              <>
                <Loader2 size={11} className="animate-spin text-cyan-400" />
                <span className="text-cyan-400 font-mono">Syncing</span>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-rose-400 font-mono">Reconectar</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-emerald-400 font-mono">Ao Vivo</span>
              </>
            )}
          </button>
        )}

        <div className="hidden xs:flex items-center gap-1.5 md:gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)] transition-all hover:bg-amber-500/15">
          <Flame size={14} className="text-amber-400 fill-amber-400/30 animate-pulse" />
          <span className="text-[10px] md:text-xs font-black text-amber-400 cyber-font">{stats.streak}D STREAK</span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all duration-200 group shadow-md"
          >
            <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-slate-700 transition-colors border border-slate-700/60">
              <User size={14} />
            </div>
            <div className="hidden md:flex flex-col items-start text-left">
              <span className="text-[11px] font-bold text-slate-200 leading-tight group-hover:text-white max-w-[110px] truncate">{user?.name || 'Usuário'}</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[8px] font-black text-emerald-400 leading-none uppercase tracking-wider">Online</span>
              </div>
            </div>
            <ChevronDown size={13} className={`text-slate-500 transition-transform duration-200 ${isProfileOpen ? 'rotate-180 text-white' : ''}`} />
          </button>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-reveal origin-top-right">
                <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
                  <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{user?.email}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    Sair da Conta
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamificationBar;
