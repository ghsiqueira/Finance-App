// src/types/budget.ts - TIPOS ESPECÍFICOS PARA BUDGET

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type BudgetStatus = 'safe' | 'warning' | 'critical' | 'exceeded';

export interface CategoryReference {
  _id: string;
  name: string;
  icon: string;
  color: string;
  type?: 'income' | 'expense';
}

export interface BudgetBase {
  _id: string;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  spentPercentage: number;
  period: BudgetPeriod;
  startDate: string | Date;
  endDate: string | Date;
  alertThreshold: number;
  notes?: string;
  isActive: boolean;
  autoRenew?: boolean;
  status?: BudgetStatus;
  daysRemaining?: number;
  dailyBudget?: number;
  userId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Budget com categoria como string (ID) - usado em forms
export interface BudgetWithCategoryId extends BudgetBase {
  categoryId: string;
}

// Budget com categoria populada - usado em listagens
export interface BudgetWithCategory extends BudgetBase {
  categoryId: CategoryReference;
  category?: CategoryReference; // Alias para compatibilidade
}

// Union type que aceita ambos os formatos
export type Budget = BudgetWithCategoryId | BudgetWithCategory;

// Helper para verificar se budget tem categoria populada
export function hasCategoryPopulated(budget: Budget): budget is BudgetWithCategory {
  return typeof budget.categoryId === 'object' && budget.categoryId !== null;
}

// Helper para extrair ID da categoria
export function getCategoryId(budget: Budget): string {
  if (hasCategoryPopulated(budget)) {
    return budget.categoryId._id;
  }
  return budget.categoryId as string;
}

// Helper para extrair dados da categoria
export function getCategoryData(budget: Budget): CategoryReference | null {
  if (hasCategoryPopulated(budget)) {
    return budget.categoryId;
  }
  return null;
}

// Tipos para formulários
export interface BudgetFormData {
  name: string;
  amount: string; // String para formatação no input
  categoryId: string;
  period: BudgetPeriod | 'custom'; // Adiciona 'custom' para UI
  startDate: Date;
  endDate: Date;
  alertThreshold: string; // String para input
  notes: string;
  isActive: boolean;
  autoRenew: boolean;
}

// Tipos para API
export interface BudgetCreateData {
  name: string;
  amount: number;
  categoryId: string;
  period: BudgetPeriod;
  startDate: string; // ISO string
  endDate: string; // ISO string
  alertThreshold: number;
  notes?: string;
  isActive?: boolean;
  autoRenew?: boolean;
}

export interface BudgetUpdateData {
  name?: string;
  amount?: number;
  categoryId?: string;
  period?: BudgetPeriod;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  alertThreshold?: number;
  notes?: string;
  isActive?: boolean;
  autoRenew?: boolean;
}

// Tipos para estatísticas
export interface BudgetStats {
  spent: number;
  amount: number;
  remaining: number;
  percentage: number;
  status: 'good' | 'warning' | 'critical' | 'over';
  daysRemaining: number;
  dailyAverage: number;
  projectedSpending: number;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  activeBudgetsCount: number;
  pausedBudgetsCount: number;
  budgetsExceeded: number;
  budgetsNearLimit: number;
}

export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  category: CategoryReference;
  spent: number;
  limit: number;
  percentage: number;
  threshold: number;
  severity: 'medium' | 'high' | 'critical';
  isExceeded: boolean;
}

export interface BudgetFilters {
  status?: 'active' | 'expired' | 'future' | 'inactive' | 'paused';
  period?: BudgetPeriod;
  category?: string;
  includeInactive?: boolean;
  includeCategory?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Tipos para performance
export interface BudgetPerformance {
  averageDailySpending: number;
  projectedTotal: number;
  daysRemaining: number;
  recommendedDailyLimit: number;
}

// Tipos para simulação de impacto
export interface TransactionImpact {
  currentSpent: number;
  newSpent: number;
  currentPercentage: number;
  newPercentage: number;
  wouldExceed: boolean;
  wouldTriggerAlert: boolean;
}