
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
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${active ? 'bg-[var(--primary-color)]/15 text-[var(--primary-color)] border border-[var(--primary-color)]/20 shadow-[0_0_10px_var(--primary-shadow)]' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}>
    <div className="shrink-0">{icon}</div>
    {!collapsed && <span className="font-bold text-xs whitespace-nowrap uppercase tracking-[0.1em]">{label}</span>}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ activeTab, isSidebarOpen, isMobileMenuOpen, userEmail, onNavigate, onToggleSidebar, onCloseMobile }) => {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex ${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col print:hidden`}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--primary-color)] rounded-lg flex items-center justify-center neon-shadow-primary shrink-0 transition-colors">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="text-xl font-black cyber-font tracking-tighter text-white leading-none">FRELLA</span>
              <span className="text-[10px] font-black tracking-[0.3em] text-[var(--primary-color)] mt-0.5 opacity-80">SYSTEM</span>
            </div>
          )}
        </div>
        {isMobileMenuOpen && <button onClick={onCloseMobile} className="lg:hidden text-slate-500 hover:text-white"><X size={20} /></button>}

        {/* Desktop Toggle Button - Visible when SIDEBAR OPEN */}
        {isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all items-center justify-center ml-2"
            title="Recolher Menu"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Desktop Toggle Button - Visible when SIDEBAR CLOSED (Below Logo) */}
      {!isSidebarOpen && (
        <div className="px-4 mb-2 hidden lg:flex justify-center animate-fade-in">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center justify-center"
            title="Expandir Menu"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      <nav className="flex-1 px-4 space-y-2 mt-4">
        <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} collapsed={!isSidebarOpen} onClick={() => onNavigate('dashboard')} />
        <NavItem icon={<Trophy size={20} />} label="Agenda" active={activeTab === 'kanban'} collapsed={!isSidebarOpen} onClick={() => onNavigate('kanban')} />
        <NavItem icon={<DollarSign size={20} />} label="Fluxo" active={activeTab === 'finance'} collapsed={!isSidebarOpen} onClick={() => onNavigate('finance')} />
        <NavItem icon={<Calculator size={20} />} label="Propostas" active={activeTab === 'budgets'} collapsed={!isSidebarOpen} onClick={() => onNavigate('budgets')} />
        <NavItem icon={<Users size={20} />} label="Frella CRM" active={activeTab === 'clients'} collapsed={!isSidebarOpen} onClick={() => onNavigate('clients')} />
        <NavItem icon={<Settings size={20} />} label="Protocolos" active={activeTab === 'settings'} collapsed={!isSidebarOpen} onClick={() => onNavigate('settings')} />
      </nav>

      {isSidebarOpen && userEmail && (
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Acesso Verificado</p>
            <p className="text-[10px] font-bold text-purple-400 truncate tracking-tight">{userEmail}</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
