// src/types/index.ts - Versão Corrigida
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

// 🔥 CORRIGIDO: MainStackParamList com tipos corretos
export type MainStackParamList = {
  MainTabs: { screen?: keyof MainTabParamList }; 
  
  // Transações
  AddTransaction: {
    type?: 'income' | 'expense';
    initialData?: {
      description: string;
      amount: string;
      categoryId: string;
      notes?: string;
      paymentMethod: string;
    };
  } | undefined;
  EditTransaction: { transactionId: string };
  TransactionDetail: { transactionId: string };
  
  // Orçamentos - CORRIGIDO: Aceita categoryId como parâmetro opcional
  AddBudget: { categoryId?: string } | undefined;
  EditBudget: { budgetId: string };
  BudgetDetail: { budgetId: string };
  
  // Metas
  AddGoal: undefined;
  EditGoal: { goalId: string };
  GoalDetail: { goalId: string };
  
  // Relatórios e Configurações
  Reports: undefined;
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  
  // Gerenciamento
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

// 🔥 NOVO: Tipos para formulários - CORRIGIDO para aceitar null
export interface TransactionFormData {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId?: string | null;
  date: Date;
  notes?: string | null;
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix' | 'other';
  isRecurring: boolean;
  recurringFrequency?: RecurrenceType | null;
  recurringInterval?: string | null;
  recurringEndDate?: Date | null;
  recurringOccurrences?: string | null;
}

export interface BudgetForm {
  name: string;
  amount: string;
  categoryId: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  alertThreshold: number;
  notes?: string;
}

export interface BudgetFormData {
  name: string;
  amount: string;
  categoryId: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  alertThreshold?: string;
  notes?: string;
  color?: string;
  autoRenew: boolean;
}

export interface GoalFormData {
  title: string;
  targetAmount: string;
  targetDate: Date;
  description?: string;
  categoryId?: string;
  priority: 'low' | 'medium' | 'high';
  color?: string;
}

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
  budgetId?: string;
  budget?: Budget;
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
    nextOccurrence?: string;
  };
  parentTransactionId?: string;
  isGeneratedFromRecurring?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  _id: string;
  name: string;
  amount: number;
  spent: number;
  categoryId: string;
  category?: Category;
  userId: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  alertThreshold: number;
  alertSent: boolean;
  isActive: boolean;
  autoRenew: boolean;
  notes?: string;
  color: string;
  
  // Propriedades calculadas
  spentPercentage: number;
  remaining: number;
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
  daysRemaining: number;
  dailyBudget: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  _id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  description?: string;
  categoryId?: string;
  category?: Category;
  userId: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  color: string;
  isCompleted?: boolean;
  progress?: number;
  remainingAmount?: number;
  daysRemaining?: number;
  monthlyTarget?: number;
  contributions?: Array<{
    _id: string;
    amount: number;
    date: string;
    note?: string;
  }>;
  reminders?: Array<{
    _id: string;
    message: string;
    date: string;
    sent: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

// 🔥 Tipos de paginação
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

// 🔥 Tipos de filtros
export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: 'income' | 'expense';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  isRecurring?: boolean;
  includeGenerated?: boolean;
}

export interface BudgetFilters {
  page?: number;
  limit?: number;
  categoryId?: string;
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  isActive?: boolean;
  isExceeded?: boolean;
}

export interface GoalFilters {
  page?: number;
  limit?: number;
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  categoryId?: string;
}

// 🔥 Tipos de estatísticas
export interface TransactionStats {
  summary: {
    income: { total: number; count: number; avgAmount: number };
    expense: { total: number; count: number; avgAmount: number };
    balance: number;
  };
  timeline: Array<{
    _id: any;
    data: Array<{
      type: 'income' | 'expense';
      total: number;
      count: number;
      avgAmount: number;
    }>;
  }>;
  categories: Array<{
    categoryId: string;
    type: 'income' | 'expense';
    category: {
      name: string;
      icon: string;
      color: string;
    };
    total: number;
    count: number;
    avgAmount: number;
    percentage: number;
  }>;
  period: {
    groupBy: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface BudgetStats {
  totalBudget: number;
  totalSpent: number;
  budgetsExceeded: number;
  budgetsNearLimit: number;
  averageSpentPercentage: number;
  budgetsByCategory: Array<{
    categoryId: string;
    category: Category;
    totalBudget: number;
    totalSpent: number;
    percentage: number;
  }>;
}

export interface GoalStats {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  averageProgress: number;
  goalsByPriority: Array<{
    priority: 'low' | 'medium' | 'high';
    count: number;
    totalAmount: number;
  }>;
}

// 🔥 Tipos de resposta da API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  user: Partial<User>;
  message: string;
}

// 🔥 Tipos de tema
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  success: string;
  warning: string;
  destructive: string;
  info: string;
  border: string;
  accent: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
}

// 🔥 Tipos de notificação
export interface NotificationConfig {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  vibrate?: boolean;
  priority?: 'low' | 'normal' | 'high';
  categoryId?: string;
}

export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  spent: number;
  limit: number;
  percentage: number;
  categoryName: string;
}

export interface GoalReminder {
  goalId: string;
  goalTitle: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  daysRemaining: number;
}

// 🔥 Tipos de export/import
export interface ExportData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  exportDate: string;
  version: string;
}

export interface ImportResult {
  imported: {
    transactions: number;
    categories: number;
    budgets: number;
    goals: number;
  };
  errors: string[];
  warnings: string[];
}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}