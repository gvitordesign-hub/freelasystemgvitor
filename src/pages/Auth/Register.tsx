import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../layouts/AuthLayout';
import { User, Mail, Lock, Info, ArrowRight, Loader2, CheckCircle2, ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { calculatePasswordStrength, StrengthResult } from '../../utils/passwordStrength';

const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<StrengthResult | null>(null);
    const { register, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (password) {
            setPasswordStrength(calculatePasswordStrength(password));
        } else {
            setPasswordStrength(null);
        }
    }, [password]);

    const getErrorMessage = (err: any) => {
        if (typeof err === 'string') return err;
        if (err?.message) {
            if (err.message.includes('User already registered')) return 'Este e-mail já está cadastrado.';
            if (err.message.includes('Password should be')) return 'A senha não atende aos requisitos de segurança.';
            if (err.message.includes('invalid format')) return 'Formato de e-mail inválido.';
            return err.message;
        }
        return 'Falha no cadastro. Tente novamente.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (email !== confirmEmail) {
            setError('Os e-mails não coincidem.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 8) {
            setError('A senha deve ter no mínimo 8 caracteres.');
            return;
        }

        if (!agreedToTerms) {
            setError('Você precisa concordar com os termos para continuar.');
            return;
        }

        try {
            await register(name, email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    return (
        <AuthLayout
            title="Criar sua conta"
            subtitle="Junte-se à revolução do Smart Budgeting"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 animate-shake">
                        <ShieldAlert size={16} />
                        {error}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Como deseja ser chamado?"
                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail Profissional</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar E-mail</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                        <input
                            type="email"
                            value={confirmEmail}
                            onChange={(e) => setConfirmEmail(e.target.value)}
                            placeholder="Confirme seu e-mail"
                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {/* Password Strength Indicator */}
                    {password && passwordStrength && (
                        <div className="mt-2 space-y-1.5 px-1">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-slate-500 flex items-center gap-1">
                                    {passwordStrength.label === 'Forte' ? <ShieldCheck size={12} className="text-green-500" /> : <Shield size={12} />}
                                    Segurança: <span className={passwordStrength.label === 'Forte' ? 'text-green-500' : passwordStrength.label === 'Média' ? 'text-yellow-500' : 'text-red-500'}>{passwordStrength.label}</span>
                                </span>
                                <span className="text-slate-600">{Math.round((passwordStrength.score / 4) * 100)}%</span>
                            </div>
                            <div className="h-1 w-full bg-slate-800/50 rounded-full overflow-hidden flex gap-0.5">
                                {[1, 2, 3, 4].map((step) => (
                                    <div
                                        key={step}
                                        className={`h-full flex-1 transition-all duration-500 ${step <= passwordStrength.score ? passwordStrength.color : 'bg-slate-800'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    {password !== confirmPassword && confirmPassword.length > 0 && (
                        <p className="text-[9px] text-red-500 mt-1 ml-1 flex items-center gap-1">
                            <ShieldAlert size={10} /> As senhas não coincidem
                        </p>
                    )}
                    <p className="text-[9px] text-slate-500 mt-1 ml-1 flex items-center gap-1"><Info size={10} /> Mínimo de 8 caracteres com letras e números</p>
                </div>

                <div
                    className="flex items-start gap-2 ml-1 pt-2 cursor-pointer group"
                    onClick={() => setAgreedToTerms(!agreedToTerms)}
                >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all mt-0.5 ${agreedToTerms ? 'bg-purple-500 border-purple-500' : 'border-slate-700 bg-slate-800/50 group-hover:border-purple-500/50'}`}>
                        {agreedToTerms && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                    <span className="text-[10px] text-slate-400 select-none leading-tight">Eu concordo com os <a href="#" className="text-purple-400 hover:underline">Termos de Serviço</a> e <a href="#" className="text-purple-400 hover:underline">Políticas</a>.</span>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide text-xs"
                >
                    {isLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <>
                            CRIAR CONTA <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-500">
                    Já possui uma conta? <Link to="/login" className="text-purple-400 font-bold hover:text-purple-300 transition-colors">Fazer Login</Link>
                </p>
            </div>
        </AuthLayout>
    );
};

export default Register;
