import React, { useState } from 'react';
import { Target, Flame, DollarSign, LogOut, User, ChevronDown } from 'lucide-react';
import { UserStats } from '../types';
import { useAuth } from '../context/AuthContext';

interface GamificationBarProps {
  stats: UserStats;
  currentIncome: number;
}

const GamificationBar: React.FC<GamificationBarProps> = ({ stats, currentIncome }) => {
  const goal = stats.weeklyGoal || 2000;
  const progressPercentage = Math.min((currentIncome / goal) * 100, 100);
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 w-full shrink-0">
      <div className="flex items-center gap-3 md:gap-6 flex-1 max-w-2xl">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--primary-color)] flex items-center justify-center neon-shadow-primary border-2 border-white/10 transition-colors shrink-0">
              <span className="font-bold cyber-font text-white text-sm md:text-base">{stats.level}</span>
            </div>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Progresso</p>
            <p className="text-[10px] md:text-xs font-bold text-[var(--primary-color)] transition-colors">Semana Ativa</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <div className="h-1.5 md:h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary-color)] transition-all duration-1000 ease-out shadow-[0_0_10px_var(--primary-color)]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-tight">
            <span className="text-slate-300">R$ {currentIncome.toLocaleString('pt-BR')}</span>
            <span className="hidden xs:inline">Meta: R$ {goal.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 ml-4">
        <div className="hidden xs:flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Flame size={12} className="text-amber-500" />
          <span className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-tighter">{stats.streak}D</span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-all group"
          >
            <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-slate-600 transition-colors">
              <User size={14} />
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-300 leading-none group-hover:text-white max-w-[100px] truncate">{user?.name || 'Usuário'}</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[8px] font-bold text-emerald-500 leading-none uppercase tracking-wider">Online</span>
              </div>
            </div>
            <ChevronDown size={12} className={`text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-scale-up origin-top-right">
                <div className="p-3 border-b border-slate-800">
                  <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
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
