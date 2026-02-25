
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../layouts/AuthLayout';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const { login, isLoading } = useAuth();
    const navigate = useNavigate();

    const getErrorMessage = (err: any) => {
        if (typeof err === 'string') return err;
        if (err?.message) {
            if (err.message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
            if (err.message.includes('Email not confirmed')) return 'Por favor, confirme seu e-mail para entrar.';
            return err.message;
        }
        return 'Falha na autenticação. Tente novamente.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Preencha todos os campos para continuar.');
            return;
        }

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    return (
        <AuthLayout
            title="Bem-vindo de volta"
            subtitle="Acesse sua conta para gerenciar seus projetos."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email ou Usuário</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Senha</label>
                        <a href="#" className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors">Esqueceu a senha?</a>
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div
                    className="flex items-center gap-2 ml-1 cursor-pointer group"
                    onClick={() => setRememberMe(!rememberMe)}
                >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-purple-500 border-purple-500' : 'border-slate-700 bg-slate-800/50 group-hover:border-purple-500/50'}`}>
                        {rememberMe && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                    <span className="text-xs text-slate-400 select-none group-hover:text-slate-300 transition-colors">Lembrar acesso</span>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide text-xs"
                >
                    {isLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <>
                            ENTRAR <ArrowRight size={18} />
                        </>
                    )}
                </button>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#0f1115] px-2 text-slate-500">Acesso Rápido</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button type="button" className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all group">
                        <div className="w-4 h-4 bg-white rounded-sm"></div>
                        <span className="text-xs font-medium text-slate-300 group-hover:text-white">Google</span>
                    </button>
                    <button type="button" className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all group">
                        <div className="w-4 h-4 bg-[#0077b5] rounded-sm flex items-center justify-center text-[10px] font-bold text-white">in</div>
                        <span className="text-xs font-medium text-slate-300 group-hover:text-white">LinkedIn</span>
                    </button>
                </div>
            </form>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-500">
                    Não tem uma conta? <Link to="/register" className="text-purple-400 font-bold hover:text-purple-300 transition-colors">Solicitar acesso</Link>
                </p>
            </div>
        </AuthLayout>
    );
};

export default Login;
