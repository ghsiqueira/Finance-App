import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Budgets: undefined;
  Goals: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: { screen?: keyof MainTabParamList }; // 🔥 Corrigido: permitir parâmetros
  AddTransaction: { type?: 'income' | 'expense' };
  EditTransaction: { transactionId: string };
  AddBudget: undefined;
  EditBudget: { budgetId: string };
  AddGoal: undefined;
  EditGoal: { goalId: string };
  Reports: undefined;
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  TransactionDetail: { transactionId: string };
  BudgetDetail: { budgetId: string };
  GoalDetail: { goalId: string };
  CategoryManagement: undefined;
};

export type AuthStackScreenProps<Screen extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, Screen>;

export type MainTabScreenProps<Screen extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, Screen>,
    NativeStackScreenProps<MainStackParamList>
  >;

export type MainStackScreenProps<Screen extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, Screen>;

// 🔥 NOVO: Tipo para recorrência
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface User {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  theme: 'light' | 'dark';
  currency: string;
  preferences: {
    language: string;
    notifications: {
      email: boolean;
      budgetAlerts: boolean;
      goalReminders: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  userId: string;
  isDefault: boolean;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 🔥 ATUALIZADO: Interface Transaction com campos de recorrência
export interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId?: string;
  category?: Category;
  budgetId?: string;         // 🔥 NOVO: Link para orçamento
  budget?: Budget;           // Dados do orçamento
  userId: string;
  date: string;
  notes?: string;
  tags: string[];
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix' | 'other';
  status: 'completed' | 'pending' | 'cancelled';
  isDeleted?: boolean;
  // Campos de recorrência
  isRecurring?: boolean;
  recurringConfig?: {
    frequency: RecurrenceType;
    interval: number;
    endDate?: string;
    remainingOccurrences?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  _id: string;
  name: string;              // "Orçamento Alimentação"
  categoryId: string;        // ID da categoria escolhida
  category?: Category;       // Dados da categoria
  amount: number;            // R$ 1000
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;         // Início do período
  endDate: string;           // Fim do período
  
  // 🔥 CAMPOS DE TRACKING
  spent: number;             // Quanto já gastou
  remaining: number;         // Quanto sobra
  spentPercentage: number;   // % do orçamento usado
  isExceeded: boolean;       // Se estourou
  daysRemaining: number;     // Dias até fim período
  dailyBudget: number;       // Quanto pode gastar por dia
  projectedTotal: number;    // Projeção fim do período
  
  // 🚨 ALERTAS
  alertThreshold: number;    // % para alerta (ex: 80%)
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
  
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  _id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  userId: string;
  targetDate: string;
  startDate: string;
  categoryId?: string;
  category?: Category;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  icon: string;
  color: string;
  progressPercentage: number;
  remainingAmount: number;
  isCompleted: boolean;
  daysRemaining: number;
  dailySavingsNeeded: number;
  monthlySavingsNeeded: number;
  contributions: Contribution[];
  reminders: Reminder[];
  completedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Contribution {
  _id: string;
  amount: number;
  date: string;
  note?: string;
  isAutomatic: boolean;
}

export interface Reminder {
  _id: string;
  message: string;
  date: string;
  sent: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  message: string;
  success: boolean;
  data: {
    items: T[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface DashboardData {
  period: string;
  startDate: string;
  endDate: string;
  financialStats: {
    income: number;
    expense: number;
    balance: number;
    incomeCount: number;
    expenseCount: number;
    totalTransactions: number;
  };
  activeBudgets: Budget[];
  activeGoals: Goal[];
  recentTransactions: Transaction[];
  categorySpending: CategorySpending[];
  monthlyEvolution: MonthlyEvolution[];
  alerts: Alert[];
  summary: {
    totalBudgets: number;
    totalGoals: number;
    completedGoals: number;
    alertsCount: number;
  };
}

export interface CategorySpending {
  _id: string;
  category: Category;
  total: number;
  count: number;
}

export interface MonthlyEvolution {
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number;
}

export interface Alert {
  type: 'budget_exceeded' | 'budget_warning' | 'goal_deadline';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  data: any;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// 🔥 ATUALIZADO: Interface TransactionForm com campos de recorrência
export interface TransactionForm {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId?: string;
  date: Date;
  notes?: string;
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix' | 'other';
  // 🔥 NOVO: Campos de recorrência
  isRecurring?: boolean;
  recurringConfig?: {
    frequency: RecurrenceType;
    interval: number;
    endDate?: Date;
    remainingOccurrences?: number;
  };
}

export interface BudgetStatus {
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
  color: string;
  icon: string;
  message: string;
}

// 🔥 NOVO: Resumo de orçamentos para dashboard
export interface BudgetSummary {
  total: number;
  active: number;
  warning: number;
  critical: number;
  exceeded: number;
  totalSpent: number;
  totalBudget: number;
  overallPercentage: number;
}

export interface BudgetForm {
  name: string;
  amount: string;
  categoryId: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  alertThreshold: number;
  notes?: string;
}

export interface GoalForm {
  title: string;
  description?: string;
  targetAmount: string;
  targetDate: Date;
  categoryId?: string;
  priority: 'low' | 'medium' | 'high';
  color: string;
}

export interface Props {
  navigation: any; 
}