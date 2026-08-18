import React from 'react';
import { LayoutDashboard, Users, DollarSign, Trophy, Settings, X, ChevronLeft, ChevronRight, Calculator } from 'lucide-react';
import { DashboardTab } from './types';

interface SidebarProps {
  activeTab: DashboardTab;
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  userEmail?: string;
  onNavigate: (tab: DashboardTab) => void;
  onToggleSidebar: () => void;
  onCloseMobile: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all duration-200 group relative ${
      active
        ? 'bg-gradient-to-r from-[var(--primary-color)]/20 to-[var(--primary-color)]/5 text-white border border-[var(--primary-color)]/35 shadow-[0_4px_20px_var(--primary-shadow)]'
        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 hover:border-slate-700/60 border border-transparent'
    }`}
  >
    {active && (
      <span className="absolute left-0 top-2 bottom-2 w-1 bg-[var(--primary-color)] rounded-r-full shadow-[0_0_8px_var(--primary-color)]" />
    )}
    <div className={`shrink-0 transition-transform duration-200 ${active ? 'text-[var(--primary-color)] scale-105' : 'group-hover:text-slate-200 group-hover:scale-105'}`}>
      {icon}
    </div>
    {!collapsed && (
      <span className={`font-bold text-xs whitespace-nowrap uppercase tracking-[0.12em] transition-colors ${active ? 'text-slate-100' : 'text-slate-400 group-hover:text-slate-200'}`}>
        {label}
      </span>
    )}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ activeTab, isSidebarOpen, isMobileMenuOpen, userEmail, onNavigate, onToggleSidebar, onCloseMobile }) => {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex ${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-950/90 backdrop-blur-2xl border-r border-slate-800/80 transition-all duration-300 flex flex-col print:hidden shadow-[4px_0_24px_rgba(0,0,0,0.4)]`}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-color)]/80 rounded-xl flex items-center justify-center neon-shadow-primary shrink-0 transition-all duration-300 hover:scale-105">
            <LayoutDashboard size={18} className="text-white drop-shadow-sm" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="text-xl font-black cyber-font tracking-tighter text-white leading-none">FRELLA</span>
              <span className="text-[10px] font-black tracking-[0.3em] text-[var(--primary-color)] mt-0.5 opacity-90">SYSTEM</span>
            </div>
          )}
        </div>
        {isMobileMenuOpen && (
          <button onClick={onCloseMobile} className="lg:hidden p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        )}

        {/* Desktop Toggle Button - Visible when SIDEBAR OPEN */}
        {isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-white transition-all items-center justify-center ml-2 hover:scale-105"
            title="Recolher Menu"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Desktop Toggle Button - Visible when SIDEBAR CLOSED (Below Logo) */}
      {!isSidebarOpen && (
        <div className="px-4 mb-2 hidden lg:flex justify-center animate-reveal">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-white transition-all flex items-center justify-center hover:scale-105"
            title="Expandir Menu"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <nav className="flex-1 px-3 space-y-1.5 mt-3 custom-scrollbar overflow-y-auto">
        <NavItem icon={<LayoutDashboard size={19} />} label="Dashboard" active={activeTab === 'dashboard'} collapsed={!isSidebarOpen} onClick={() => onNavigate('dashboard')} />
        <NavItem icon={<Trophy size={19} />} label="Agenda" active={activeTab === 'kanban'} collapsed={!isSidebarOpen} onClick={() => onNavigate('kanban')} />
        <NavItem icon={<DollarSign size={19} />} label="Fluxo" active={activeTab === 'finance'} collapsed={!isSidebarOpen} onClick={() => onNavigate('finance')} />
        <NavItem icon={<Calculator size={19} />} label="Propostas" active={activeTab === 'budgets'} collapsed={!isSidebarOpen} onClick={() => onNavigate('budgets')} />
        <NavItem icon={<Users size={19} />} label="Frella CRM" active={activeTab === 'clients'} collapsed={!isSidebarOpen} onClick={() => onNavigate('clients')} />
        <NavItem icon={<Settings size={19} />} label="Protocolos" active={activeTab === 'settings'} collapsed={!isSidebarOpen} onClick={() => onNavigate('settings')} />
      </nav>

      {isSidebarOpen && userEmail && (
        <div className="p-4 border-t border-slate-800/80">
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 shadow-inner">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Acesso Verificado
            </p>
            <p className="text-[10px] font-bold text-slate-300 truncate tracking-tight font-mono">{userEmail}</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
