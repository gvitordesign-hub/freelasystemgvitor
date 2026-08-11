
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Check } from 'lucide-react';

interface WelcomeModalProps {
    onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [greeting, setGreeting] = useState('');
    const [protocol, setProtocol] = useState('');

    useEffect(() => {
        const date = new Date();
        const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false };
        const hour = parseInt(date.toLocaleString('pt-BR', options));

        if (hour >= 5 && hour < 12) {
            setGreeting('BOM DIA');
            setProtocol('MORNING PROTOCOL');
        } else if (hour >= 12 && hour < 18) {
            setGreeting('BOA TARDE');
            setProtocol('AFTERNOON PROTOCOL');
        } else {
            setGreeting('BOA NOITE');
            setProtocol('NIGHT PROTOCOL');
        }
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700/50 w-full max-w-2xl rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300 relative">

                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--primary-color)] via-purple-500 to-[var(--primary-color)]"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--primary-color)]/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>

                <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center relative z-10">

                    <div className="flex items-center gap-3 mb-6 animate-reveal">
                        <div className="w-12 h-1.5 bg-[var(--primary-color)] rounded-full shadow-[0_0_15px_var(--primary-color)]"></div>
                        <span className="text-xs font-black tracking-[0.3em] text-slate-400 uppercase">
                            {protocol} V2.5
                        </span>
                        <div className="w-12 h-1.5 bg-[var(--primary-color)] rounded-full shadow-[0_0_15px_var(--primary-color)]"></div>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black cyber-font italic tracking-tighter text-white mb-4 animate-reveal delay-100 leading-tight">
                        {greeting}, <br />
                        <span className="text-[var(--primary-color)] neon-text">{user?.name?.toUpperCase() || 'G-VITOR'}</span>
                    </h1>

                    <div className="flex items-center gap-2 text-slate-500 mt-4 mb-10 animate-reveal delay-200">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                        <span className="text-[10px] md:text-xs font-black tracking-[0.3em] uppercase">
                            OPERACIONAL FRELLA INICIADO
                        </span>
                    </div>

                    <button
                        onClick={onClose}
                        className="group relative px-8 py-4 bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 border border-[var(--primary-color)]/30 hover:border-[var(--primary-color)] text-[var(--primary-color)] rounded-2xl flex items-center gap-3 transition-all duration-300 animate-reveal delay-300"
                    >
                        <span className="font-black uppercase tracking-widest text-xs">Iniciar Sistema</span>
                        <div className="w-6 h-6 bg-[var(--primary-color)] rounded-lg flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform">
                            <Check size={14} strokeWidth={4} />
                        </div>
                    </button>

                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
