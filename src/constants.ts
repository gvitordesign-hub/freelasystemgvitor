
import { DayOfWeek, Status, ThemeColor } from './types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'
];

export const STATUS_LIST: Status[] = ['Pendente', 'Em Andamento', 'Concluído'];

export const XP_PER_TASK = 50;
export const XP_PER_CLIENT = 20;
export const XP_PER_WEEKLY_GOAL = 500;
export const XP_PER_LEVEL = 1000;
export const XP_DAILY_BRIEFING = 10;

export const INITIAL_STATE = {
  clients: [],
  tasks: [],
  transactions: [],
  albums: [],
  services: [
    { id: '1', name: 'Logotipo Profissional', description: 'Criação de marca com manual básico', baseValue: 800 },
    { id: '2', name: 'Social Media (Pack 12)', description: 'Artes para feed e stories', baseValue: 1200 },
    { id: '3', name: 'Landing Page High-Convert', description: 'Design e desenvolvimento React', baseValue: 2500 }
  ],
  budgets: [],
  invoices: [],
  reminders: [],
  stats: {
    xp: 0,
    level: 1,
    weeklyGoal: 2000,
    monthlyGoal: 8000,
    annualGoal: 100000,
    taskGoal: 10,
    clientGoal: 5,
    streak: 0,
    lastActive: new Date().toISOString(),
    themeColor: 'purple' as ThemeColor,
    objectives: '',
    name: 'G-Vitor Admin',
    bio: 'Desenvolvedor & Designer Freelancer',
    whatsapp: '5511999999999',
    portfolioCategories: ['Social Media', 'Motion Design', 'Identidade Visual', 'Web Design'],
    socialLinks: [
      { id: '1', platform: 'Instagram', url: '' },
      { id: '2', platform: 'Behance', url: '' }
    ]
  }
};
