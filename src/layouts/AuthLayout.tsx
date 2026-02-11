
import React, { ReactNode } from 'react';
import { LayoutDashboard } from 'lucide-react';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-emerald-500/5 rounded-full blur-[80px]" />
            </div>

            <div className="w-full max-w-md relative z-10 animate-reveal">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.5)]">
                            <LayoutDashboard size={22} className="text-white" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-2xl font-black tracking-tighter text-white leading-none">NEXUS<span className="text-purple-500">OS</span></span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">{title}</h1>
                    <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 p-6 md:p-8 rounded-[2rem] shadow-2xl relative group hover:border-purple-500/20 transition-all duration-300">
                    {children}
                </div>

                <div className="mt-8 flex justify-center gap-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    <span className="hover:text-purple-400 transition-colors cursor-pointer">Nexus OS v2.5.0</span>
                    <span className="hover:text-purple-400 transition-colors cursor-pointer">Privacy</span>
                    <span className="hover:text-purple-400 transition-colors cursor-pointer">Terms</span>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
