import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Plus, Trash2, ChevronRight, ChevronLeft, Zap, DollarSign, Clock, Target, Play } from 'lucide-react';

interface MaintenanceCost {
  id: string;
  name: string;
  value: number;
}

interface FinancialData {
  desiredIncome: number;
  hoursPerDay: number;
  daysPerWeek: number;
  vacationWeeks: number;
  maintenanceCosts: MaintenanceCost[];
}

const defaultData: FinancialData = {
  desiredIncome: 5000,
  hoursPerDay: 6,
  daysPerWeek: 5,
  vacationWeeks: 4,
  maintenanceCosts: [
    { id: '1', name: 'Internet', value: 120 },
    { id: '2', name: 'Software (Adobe/Figma)', value: 150 },
    { id: '3', name: 'MEI / Impostos', value: 75 },
    { id: '4', name: 'Upgrade Equipamento (Provisão)', value: 140 }
  ]
};

import { UserStats, Client } from '../types';

interface FreelancerCalculatorProps {
  stats?: UserStats;
  onUpdateStats?: (stats: Partial<UserStats>) => void;
  clients?: Client[];
  onAddTask?: (task: any) => Promise<void>;
}

const FreelancerCalculator: React.FC<FreelancerCalculatorProps> = ({ stats, onUpdateStats, clients, onAddTask }) => {
  const [step, setStep] = useState(1);
  const [goalsApplied, setGoalsApplied] = useState(false);
  const [data, setData] = useState<FinancialData>(() => {
    const saved = localStorage.getItem('nexus_financial_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultData;
      }
    }
    return defaultData;
  });

  const [newCostName, setNewCostName] = useState('');
  const [newCostValue, setNewCostValue] = useState('');
  const [simulatorHours, setSimulatorHours] = useState<number>(10);
  const [bgProjectTitle, setBgProjectTitle] = useState('');
  const [bgClientId, setBgClientId] = useState('');
  const [bgProjectCreated, setBgProjectCreated] = useState(false);

  useEffect(() => {
    localStorage.setItem('nexus_financial_data', JSON.stringify(data));
  }, [data]);

  const updateData = (updates: Partial<FinancialData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const addMaintenanceCost = () => {
    if (!newCostName || !newCostValue) return;
    const newCost: MaintenanceCost = {
      id: Math.random().toString(36).substring(2, 9),
      name: newCostName,
      value: parseFloat(newCostValue)
    };
    updateData({ maintenanceCosts: [...data.maintenanceCosts, newCost] });
    setNewCostName('');
    setNewCostValue('');
  };

  const removeMaintenanceCost = (id: string) => {
    updateData({ maintenanceCosts: data.maintenanceCosts.filter(c => c.id !== id) });
  };

  // Calculations
  const totalCosts = useMemo(() => {
    return data.maintenanceCosts.reduce((acc, curr) => acc + curr.value, 0);
  }, [data.maintenanceCosts]);

  const monthlyCapacity = useMemo(() => {
    // Weeks per month considering vacation: (52 - vacationWeeks) / 12
    const activeWeeksPerMonth = (52 - (data.vacationWeeks || 0)) / 12;
    return (data.hoursPerDay || 0) * (data.daysPerWeek || 0) * activeWeeksPerMonth;
  }, [data.hoursPerDay, data.daysPerWeek, data.vacationWeeks]);

  const hourlyRate = useMemo(() => {
    if (monthlyCapacity === 0) return 0;
    // Hora Técnica: ((Salário_Alvo + Custos_Totais) / Capacidade_Mensal) * 1.0833
    return (((data.desiredIncome || 0) + totalCosts) / monthlyCapacity) * 1.0833;
  }, [data.desiredIncome, totalCosts, monthlyCapacity]);

  const simulatedValue = useMemo(() => {
    return hourlyRate * (simulatorHours || 0);
  }, [hourlyRate, simulatorHours]);

  const monthlyGoalValue = useMemo(() => {
    return Math.round((data.desiredIncome || 0) + totalCosts);
  }, [data.desiredIncome, totalCosts]);

  const weeklyGoalValue = useMemo(() => {
    return Math.round(monthlyGoalValue / 4.33);
  }, [monthlyGoalValue]);

  const annualGoalValue = useMemo(() => {
    return Math.round(monthlyGoalValue * 12);
  }, [monthlyGoalValue]);

  const handleApplyGoals = () => {
    if (onUpdateStats) {
      onUpdateStats({
        weeklyGoal: weeklyGoalValue,
        monthlyGoal: monthlyGoalValue,
        annualGoal: annualGoalValue
      });
      setGoalsApplied(true);
      setTimeout(() => setGoalsApplied(false), 3000);
    }
  };

  const handleCreateBgProject = async () => {
    if (!bgProjectTitle) return alert('Por favor, digite o nome do projeto.');
    if (onAddTask) {
      try {
        await onAddTask({
          title: bgProjectTitle,
          clientId: bgClientId || (clients && clients[0]?.id) || '',
          value: simulatedValue,
          day: 'Segunda', // Default day
          date: new Date().toISOString().split('T')[0], // Today's date YYYY-MM-DD
          status: 'Pendente',
          category: 'Design',
          position: 0
        });
        setBgProjectCreated(true);
        setBgProjectTitle('');
        setTimeout(() => setBgProjectCreated(false), 3000);
      } catch (e) {
        console.error('Error creating background task:', e);
      }
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl shadow-emerald-500/10">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-purple-500" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 p-8 md:p-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Calculator size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white cyber-font uppercase tracking-tighter">Financial Engine</h2>
            <p className="text-sm text-slate-400">Descubra sua hora técnica real</p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 -z-10" />
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                step === i
                  ? 'bg-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110'
                  : step > i
                  ? 'bg-emerald-500/50 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {i}
            </div>
          ))}
        </div>

        <div className="min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                  <Target size={20} /> Etapa 1: Configuração do Player
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pró-labore Desejado (Mês)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                      <input
                        type="number"
                        value={data.desiredIncome || ''}
                        onChange={e => updateData({ desiredIncome: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Horas Produtivas / Dia</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Clock size={16}/></span>
                      <input
                        type="number"
                        value={data.hoursPerDay || ''}
                        onChange={e => updateData({ hoursPerDay: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dias Úteis / Semana</label>
                    <input
                      type="number"
                      value={data.daysPerWeek || ''}
                      onChange={e => updateData({ daysPerWeek: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Semanas de Férias / Ano</label>
                    <input
                      type="number"
                      value={data.vacationWeeks || ''}
                      onChange={e => updateData({ vacationWeeks: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] outline-none transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-purple-400 flex items-center gap-2">
                    <DollarSign size={20} /> Etapa 2: Custos de Manutenção
                  </h3>
                  <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30">
                    Total: R$ {totalCosts.toFixed(2)}
                  </span>
                </div>
                
                <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-4 space-y-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Ex: Internet, Software, MEI..."
                      value={newCostName}
                      onChange={e => setNewCostName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                    />
                    <div className="relative w-full md:w-40 shrink-0">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                      <input
                        type="number"
                        placeholder="Valor/Mês"
                        value={newCostValue}
                        onChange={e => setNewCostValue(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={addMaintenanceCost}
                      className="bg-purple-500 hover:bg-purple-400 text-white p-3 rounded-xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95 shrink-0"
                    >
                      <Plus size={24} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {data.maintenanceCosts.length === 0 ? (
                      <p className="text-center text-slate-500 py-4 text-sm">Nenhum custo adicionado ainda.</p>
                    ) : (
                      data.maintenanceCosts.map((cost) => (
                        <motion.div
                          key={cost.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-between items-center bg-slate-900 border border-slate-700 p-3 rounded-xl group hover:border-slate-600 transition-colors"
                        >
                          <span className="text-slate-300 font-medium">{cost.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-slate-400 font-bold">R$ {cost.value.toFixed(2)}</span>
                            <button
                              onClick={() => removeMaintenanceCost(cost.id)}
                              className="text-slate-600 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6 flex flex-col items-center justify-center py-4"
              >
                <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2 mb-4">
                  <Zap size={20} /> Etapa 3: Level Up
                </h3>
                
                <div className="bg-slate-800/40 backdrop-blur-md border border-emerald-500/30 p-8 rounded-[2rem] shadow-[0_0_40px_rgba(16,185,129,0.15)] text-center w-full max-w-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Sua Hora Técnica</p>
                  <div className="text-5xl font-black text-white cyber-font mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    <span className="text-emerald-400 text-2xl mr-1">R$</span>
                    {hourlyRate.toFixed(2)}
                    <span className="text-slate-500 text-xl ml-1">/h</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-left space-y-2 relative z-10">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Capacidade Mensal:</span>
                      <span className="font-bold text-emerald-400">{Math.round(monthlyCapacity)}h</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Custos Totais:</span>
                      <span className="font-bold text-rose-400">R$ {totalCosts.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Faturamento Alvo:</span>
                      <span className="font-bold text-blue-400">R$ {(data.desiredIncome + totalCosts).toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-6 leading-relaxed">
                    Para bater sua meta de <strong>R$ {data.desiredIncome.toFixed(2)}</strong> livre e pagar as contas, 
                    você precisa faturar <strong>{Math.round(monthlyCapacity)} horas</strong> este mês.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold text-[var(--primary-color)] flex items-center gap-2">
                  <Play size={20} /> Etapa 4: Boss Battle (Simulador)
                </h3>

                <div className="bg-slate-800/30 border border-white/5 p-6 rounded-3xl space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                      Estimativa de horas do projeto
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="200"
                        value={simulatorHours}
                        onChange={e => setSimulatorHours(parseInt(e.target.value))}
                        className="flex-1 accent-[var(--primary-color)]"
                      />
                      <div className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center text-white font-bold text-lg">
                        {simulatorHours}h
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center p-6 bg-slate-900/80 border border-[var(--primary-color)]/30 rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--primary-color)]/10 to-transparent animate-pulse-slow" />
                    
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Valor Sugerido para o Job</p>
                    <motion.div 
                      key={simulatedValue}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl md:text-5xl font-black text-white cyber-font relative z-10"
                    >
                      <span className="text-[var(--primary-color)] mr-2">R$</span>
                      {simulatedValue.toFixed(2)}
                    </motion.div>
                  </div>

                  {/* Cálculo de Projeto em Segundo Plano (Kanban) */}
                  {onAddTask && (
                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl space-y-4 relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calculator size={14} className="text-purple-400" />
                        Registrar Projeto como Demanda no Kanban
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Nome do Projeto (ex: Nova Landing Page)"
                          value={bgProjectTitle}
                          onChange={e => setBgProjectTitle(e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-[var(--primary-color)] outline-none w-full"
                        />
                        
                        <select
                          value={bgClientId}
                          onChange={e => setBgClientId(e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[var(--primary-color)] outline-none w-full"
                        >
                          <option value="">Selecionar Cliente...</option>
                          {clients?.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateBgProject}
                        className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                          bgProjectCreated
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : 'bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)] text-[var(--primary-color)] hover:text-white border-[var(--primary-color)]/30 hover:border-[var(--primary-color)]'
                        }`}
                      >
                        <Plus size={12} />
                        {bgProjectCreated ? 'Demanda Gerada no Kanban!' : 'Gerar Demanda no Kanban (Segundo Plano)'}
                      </button>
                    </div>
                  )}

                  {/* Metas Propostas baseadas nos cálculos */}
                  <div className="mt-6 pt-6 border-t border-slate-800/80 text-left relative z-10 space-y-3 w-full">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">🎯 Objetivos de Metas Calculados</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                        <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-tight">Semanal</span>
                        <span className="text-xs font-black text-white">R$ {weeklyGoalValue.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                        <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-tight">Mensal</span>
                        <span className="text-xs font-black text-emerald-400 font-mono">R$ {monthlyGoalValue.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                        <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-tight">Anual</span>
                        <span className="text-xs font-black text-blue-400">R$ {annualGoalValue.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyGoals}
                      className={`w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                        goalsApplied
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : 'bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)] text-[var(--primary-color)] hover:text-white border-[var(--primary-color)]/30 hover:border-[var(--primary-color)] hover:shadow-[0_0_15px_rgba(var(--primary-color),0.3)]'
                      }`}
                    >
                      <Target size={12} />
                      {goalsApplied ? 'Metas Aplicadas no Sistema!' : 'Definir como Metas do Sistema'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              step === 1 
                ? 'opacity-0 cursor-default' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ChevronLeft size={18} /> Anterior
          </button>
          
          <button
            onClick={nextStep}
            disabled={step === 4}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              step === 4 
                ? 'opacity-0 cursor-default' 
                : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]'
            }`}
          >
            Próximo <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FreelancerCalculator;
