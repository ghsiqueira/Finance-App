import { apiClient } from './config'; // Usar config ao invés de client
import { Budget, BudgetForm } from '../../types';

export interface BudgetFilters {
  status?: 'active' | 'expired' | 'future';
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  includeInactive?: boolean;
  includeCategory?: boolean;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  activeBudgetsCount: number;
  budgetsExceeded: number;
  budgetsNearLimit: number;
}

export interface BudgetSummaryResponse {
  summary: BudgetSummary;
  activeBudgets: Budget[];
  recentTransactions: any[];
}

export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  category: any;
  spent: number;
  limit: number;
  percentage: number;
  isExceeded: boolean;
}

// Corrigir interface BudgetFormData
export interface BudgetFormData {
  name: string;
  amount: number; // Mudou de string para number
  categoryId: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  alertThreshold: number;
  notes?: string;
  color?: string; // Tornar opcional
}

export interface BudgetUpdate {
  name?: string;
  amount?: number;
  categoryId?: string;
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate?: string;
  endDate?: string;
  alertThreshold?: number;
  notes?: string;
  color?: string;
  alertSent?: boolean;
  isActive?: boolean;
}

// Interface para orçamentos disponíveis para transação
export interface AvailableBudget {
  _id: string;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  spentPercentage: number;
  category: {
    _id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export const budgetService = {
  async getBudgets(filters: BudgetFilters = {}): Promise<{ data: { budgets: Budget[] } }> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/budgets?${params.toString()}`);
    
    // Transformar dados para incluir propriedades calculadas
    const budgets = response.budgets?.map((budget: any) => ({
      ...budget,
      spentPercentage: budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0,
      remaining: budget.amount - budget.spent,
      status: budget.status || calculateBudgetStatus(budget),
      daysRemaining: calculateDaysRemaining(budget.endDate),
      dailyBudget: calculateDailyBudget(budget),
    })) || [];

    return { data: { budgets } };
  },

  async getBudget(id: string): Promise<{ data: { budget: Budget; transactions: any[]; dailySpending: Record<string, number> } }> {
    const response = await apiClient.get(`/budgets/${id}`);
    
    const budget = {
      ...response.budget,
      spentPercentage: response.budget.amount > 0 ? (response.budget.spent / response.budget.amount) * 100 : 0,
      remaining: response.budget.amount - response.budget.spent,
      status: response.budget.status || calculateBudgetStatus(response.budget),
      daysRemaining: calculateDaysRemaining(response.budget.endDate),
      dailyBudget: calculateDailyBudget(response.budget),
    };

    return { 
      data: { 
        budget, 
        transactions: response.transactions || [],
        dailySpending: response.dailySpending || {}
      } 
    };
  },

  async createBudget(data: BudgetFormData): Promise<{ data: { budget: Budget } }> {
    const payload = {
      ...data,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
      color: data.color || '#6366f1', // Valor padrão para cor
    };
    
    return apiClient.post('/budgets', payload);
  },

  async updateBudget(id: string, data: Partial<BudgetFormData>): Promise<{ data: { budget: Budget } }> {
    const payload = {
      ...data,
      ...(data.startDate && { startDate: data.startDate.toISOString() }),
      ...(data.endDate && { endDate: data.endDate.toISOString() }),
    };
    
    return apiClient.put(`/budgets/${id}`, payload);
  },

  async deleteBudget(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/budgets/${id}`);
  },

  async toggleBudget(id: string): Promise<{ data: { budget: Budget } }> {
    return apiClient.post(`/budgets/${id}/toggle`);
  },

  async renewBudget(id: string): Promise<{ data: { budget: Budget } }> {
    return apiClient.post(`/budgets/${id}/renew`);
  },

  async getBudgetSummary(): Promise<{ data: BudgetSummary }> {
    return apiClient.get('/budgets/summary');
  },

  async getBudgetAlerts(): Promise<{ data: { alerts: BudgetAlert[] } }> {
    return apiClient.get('/budgets/alerts');
  },

  async getActiveBudgets(): Promise<{ data: { budgets: Budget[] } }> {
    return this.getBudgets({ status: 'active' });
  },

  async getExpiredBudgets(): Promise<{ data: { budgets: Budget[] } }> {
    return this.getBudgets({ status: 'expired' });
  },

  async getBudgetsByPeriod(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<{ data: { budgets: Budget[] } }> {
    return this.getBudgets({ period });
  },

  async hasBudgetForCategory(categoryId: string): Promise<boolean> {
    try {
      const response = await this.getActiveBudgets();
      const budgets = response.data?.budgets || [];
      
      return budgets.some(budget => budget.categoryId === categoryId);
    } catch (error) {
      return false;
    }
  },

  calculateBudgetProgress(budget: Budget): {
    percentage: number;
    remaining: number;
    isExceeded: boolean;
    shouldAlert: boolean;
  } {
    const percentage = budget.amount > 0 ? 
      Math.round((budget.spent / budget.amount) * 100) : 0;
    const remaining = Math.max(0, budget.amount - budget.spent);
    const isExceeded = budget.spent > budget.amount;
    const shouldAlert = percentage >= (budget.alertThreshold || 80) && !budget.alertSent;

    return {
      percentage,
      remaining,
      isExceeded,
      shouldAlert,
    };
  },

  async duplicateBudget(id: string): Promise<{ data: { budget: Budget } }> {
    const { data } = await this.getBudget(id);
    
    if (!data?.budget) {
      throw new Error('Orçamento não encontrado');
    }

    const budget = data.budget;
    
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    return this.createBudget({
      name: `${budget.name} (cópia)`,
      amount: budget.amount,
      categoryId: budget.categoryId,
      period: budget.period,
      startDate: nextMonth,
      endDate: endOfNextMonth,
      alertThreshold: budget.alertThreshold,
      notes: budget.notes || '',
      color: budget.color || '#6366f1',
    });
  },

  async getBudgetPerformance(id: string): Promise<{
    averageDailySpending: number;
    projectedTotal: number;
    daysRemaining: number;
    recommendedDailyLimit: number;
  }> {
    const { data } = await this.getBudget(id);
    
    if (!data?.budget) {
      throw new Error('Orçamento não encontrado');
    }

    const budget = data.budget;
    const now = new Date();
    const startDate = new Date(budget.startDate);
    const endDate = new Date(budget.endDate);
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - daysPassed);
    
    const averageDailySpending = daysPassed > 0 ? budget.spent / daysPassed : 0;
    const projectedTotal = averageDailySpending * totalDays;
    const remainingBudget = budget.amount - budget.spent;
    const recommendedDailyLimit = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

    return {
      averageDailySpending,
      projectedTotal,
      daysRemaining,
      recommendedDailyLimit: Math.max(0, recommendedDailyLimit),
    };
  },

  async resetBudgetAlerts(id: string): Promise<{ data: { budget: Budget } }> {
    const updateData: BudgetUpdate = { alertSent: false };
    return apiClient.put(`/budgets/${id}`, updateData);
  },

  async getBudgetSummaryDetailed(): Promise<{ data: BudgetSummaryResponse }> {
    return apiClient.get('/budgets/summary/detailed');
  },

  calculateSummaryFromBudgets(budgets: Budget[]): BudgetSummary {
    const activeBudgets = budgets.filter(b => b.isActive);
    
    const totalBudget = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    const overallPercentage = totalBudget > 0 ? 
      Math.round((totalSpent / totalBudget) * 100) : 0;
    
    // Usar propriedades calculadas do Budget ao invés de isExceeded
    const budgetsExceeded = activeBudgets.filter(b => b.status === 'exceeded').length;
    const budgetsNearLimit = activeBudgets.filter(b => {
      const threshold = b.alertThreshold || 80;
      return b.spentPercentage >= threshold && b.status !== 'exceeded';
    }).length;

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      overallPercentage,
      activeBudgetsCount: activeBudgets.length,
      budgetsExceeded,
      budgetsNearLimit,
    };
  },

  async validateBudget(data: Partial<BudgetFormData>): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Nome é obrigatório');
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('Valor deve ser maior que zero');
    }

    if (!data.categoryId) {
      errors.push('Categoria é obrigatória');
    }

    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      
      if (start >= end) {
        errors.push('Data de fim deve ser posterior à data de início');
      }
    }

    // Verificar se já existe orçamento para a categoria no período
    if (data.categoryId && data.startDate && data.endDate) {
      try {
        const hasExisting = await this.hasBudgetForCategory(data.categoryId);
        if (hasExisting) {
          errors.push('Já existe um orçamento ativo para esta categoria');
        }
      } catch (error) {
        // Ignorar erro de verificação
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  async getCategorySpendingStats(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<{ data: {
    categories: Array<{
      categoryId: string;
      categoryName: string;
      budgeted: number;
      spent: number;
      remaining: number;
      percentage: number;
      isExceeded: boolean;
    }>;
  } }> {
    return apiClient.get(`/budgets/stats/categories?period=${period}`);
  },

  async exportBudgets(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await apiClient.get(`/budgets/export?format=${format}`);
    return response;
  },

  async getActiveBudgetsForTransaction(type: 'income' | 'expense' = 'expense'): Promise<{ data: { budgets: AvailableBudget[] } }> {
    const params = new URLSearchParams();
    params.append('status', 'active');
    params.append('type', type);
    params.append('includeSpent', 'true');
    
    return apiClient.get(`/budgets/available-for-transaction?${params.toString()}`);
  },

  async getBudgetsByCategory(categoryId: string, includeInactive: boolean = false): Promise<{ data: { budgets: AvailableBudget[] } }> {
    const params = new URLSearchParams();
    params.append('categoryId', categoryId);
    if (includeInactive) params.append('includeInactive', 'true');
    
    return apiClient.get(`/budgets/by-category?${params.toString()}`);
  },

  async simulateTransactionImpact(budgetId: string, amount: number): Promise<{ data: {
    currentSpent: number;
    newSpent: number;
    remaining: number;
    newPercentage: number;
    wouldExceed: boolean;
    newStatus: 'safe' | 'warning' | 'critical' | 'exceeded';
  } }> {
    return apiClient.post(`/budgets/${budgetId}/simulate-impact`, { amount });
  },
};

// Funções auxiliares para cálculos
function calculateBudgetStatus(budget: any): 'safe' | 'warning' | 'critical' | 'exceeded' {
  const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 80) return 'critical';
  if (percentage >= 60) return 'warning';
  return 'safe';
}

function calculateDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function calculateDailyBudget(budget: any): number {
  const remaining = budget.amount - budget.spent;
  const daysRemaining = calculateDaysRemaining(budget.endDate);
  return remaining / Math.max(daysRemaining, 1);
}