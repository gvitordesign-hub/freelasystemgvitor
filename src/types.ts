
export type Status = 'Pendente' | 'Em Andamento' | 'Concluído';
export type DayOfWeek = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo';
export type TransactionType = 'Entrada' | 'Saída';
export type ThemeColor = 'purple' | 'emerald' | 'cyan' | 'rose';
export type AssetType = 'image' | 'video';

export interface Reminder {
  id: string;
  text: string;
  type: 'finance' | 'task';
  completed: boolean;
  linkedTaskId?: string;
  date?: string;
  time?: string;
  alertBefore?: number; // minutos
}

export interface Service {
  id: string;
  name: string;
  description: string;
  baseValue: number;
}

export interface BudgetItem {
  id: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitValue: number;
}

export interface Budget {
  id: string;
  clientId: string;
  items: BudgetItem[];
  discount: number;
  discountType: 'percent' | 'fixed';
  downPayment: number;
  validityDays: number;
  terms: string;
  createdAt: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
}

export interface Invoice {
  id: string;
  clientId: string;
  title: string;
  createdAt: string;
  status: 'Pago' | 'Pendente';
  notes?: string;
}

export interface Album {
  id: string;
  title: string;
  category: string;
  coverImage: string;
  assets: PortfolioAsset[];
  createdAt: string;
}

export interface PortfolioAsset {
  id: string;
  type: AssetType;
  url: string;
  description: string;
  videoProvider?: 'youtube' | 'vimeo';
}

export interface Client {
  id: string;
  name: string;
  company: string;
  contact?: string;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  clientId: string;
  invoiceId?: string;
  value: number;
  day: DayOfWeek;
  date: string;
  status: Status;
  category: string;
  briefing?: string;
  addToPortfolio?: boolean;
}

export interface Transaction {
  id: string;
  description: string;
  value: number;
  type: TransactionType;
  date: string;
  status: 'Pago' | 'Pendente';
  category: string;
  taskId?: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface UserStats {
  xp: number;
  level: number;
  weeklyGoal: number;
  monthlyGoal: number;
  annualGoal: number;
  taskGoal: number;
  clientGoal: number;
  streak: number;
  lastActive: string;
  lastBriefingDate?: string; // Data do último briefing matinal
  pixKey?: string;
  objectives?: string;
  themeColor: ThemeColor;
  bio?: string;
  name?: string;
  whatsapp?: string;
  portfolioLogo?: string;
  portfolioFavicon?: string;
  behanceLink?: string;
  instagramLink?: string;
  portfolioCategories?: string[];
  socialLinks?: SocialLink[];
}

export interface AppState {
  clients: Client[];
  tasks: Task[];
  transactions: Transaction[];
  stats: UserStats;
  albums: Album[];
  services: Service[];
  budgets: Budget[];
  invoices: Invoice[];
  reminders: Reminder[];
}
