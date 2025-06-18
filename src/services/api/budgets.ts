import { apiClient } from './client';
import { ApiResponse, Budget, BudgetForm } from '../../types';

export interface BudgetFilters {
  status?: 'active' | 'expired' | 'future';
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  includeInactive?: boolean;
}

export interface BudgetSummary {
  summary: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    overallPercentage: number;
    activeBudgetsCount: number;
    budgetsExceeded: number;
    budgetsNearLimit: number;
  };
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

export const budgetService = {
  async getBudgets(filters: BudgetFilters = {}): Promise<ApiResponse<{ budgets: Budget[] }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return apiClient.get(`/budgets?${params.toString()}`);
  },

  async getBudget(id: string): Promise<ApiResponse<{
    budget: Budget;
    transactions: any[];
    dailySpending: Record<string, number>;
  }>> {
    return apiClient.get(`/budgets/${id}`);
  },

  async createBudget(data: BudgetForm): Promise<ApiResponse<{ budget: Budget }>> {
    const payload = {
      ...data,
      amount: parseFloat(data.amount),
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
    };
    
    return apiClient.post('/budgets', payload);
  },

  async updateBudget(id: string, data: Partial<BudgetForm>): Promise<ApiResponse<{ budget: Budget }>> {
    const payload = {
      ...data,
      ...(data.amount && { amount: parseFloat(data.amount) }),
      ...(data.startDate && { startDate: data.startDate.toISOString() }),
      ...(data.endDate && { endDate: data.endDate.toISOString() }),
    };
    
    return apiClient.put(`/budgets/${id}`, payload);
  },

  async deleteBudget(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/budgets/${id}`);
  },

  async toggleBudget(id: string): Promise<ApiResponse<{ budget: Budget }>> {
    return apiClient.post(`/budgets/${id}/toggle`);
  },

  async renewBudget(id: string): Promise<ApiResponse<{ budget: Budget }>> {
    return apiClient.post(`/budgets/${id}/renew`);
  },

  async getBudgetSummary(): Promise<ApiResponse<BudgetSummary>> {
    return apiClient.get('/budgets/summary');
  },

  async getBudgetAlerts(): Promise<ApiResponse<{ alerts: BudgetAlert[] }>> {
    return apiClient.get('/budgets/alerts');
  },

  async getBudgetsOfflineFirst(filters: BudgetFilters = {}): Promise<Budget[]> {
    const cacheKey = `budgets_${JSON.stringify(filters)}`;
    
    return apiClient.offlineFirst(
      cacheKey,
      async () => {
        const response = await this.getBudgets(filters);
        return response.data?.budgets || [];
      }
    );
  },

  async getActiveBudgets(): Promise<ApiResponse<{ budgets: Budget[] }>> {
    return this.getBudgets({ status: 'active' });
  },

  async getExpiredBudgets(): Promise<ApiResponse<{ budgets: Budget[] }>> {
    return this.getBudgets({ status: 'expired' });
  },

  async getBudgetsByPeriod(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<ApiResponse<{ budgets: Budget[] }>> {
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
    const percentage = budget.amount > 0 ? Math.round((budget.spent / budget.amount) * 100) : 0;
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

  async duplicateBudget(id: string): Promise<ApiResponse<{ budget: Budget }>> {
    const { data } = await this.getBudget(id);
    
    if (!data?.budget) {
      throw new Error('Orçamento não encontrado');
    }

    const { _id, spent, alertSent, createdAt, updatedAt, ...budgetData } = data.budget;
    
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    return this.createBudget({
      name: `${budgetData.name} (cópia)`,
      amount: budgetData.amount.toString(),
      categoryId: budgetData.categoryId,
      period: budgetData.period,
      startDate: nextMonth,
      endDate: endOfNextMonth,
      alertThreshold: budgetData.alertThreshold,
      notes: budgetData.notes,
      color: budgetData.color,
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

  async resetBudgetAlerts(id: string): Promise<ApiResponse<{ budget: Budget }>> {
    const response = await this.getBudget(id);
    
    if (!response.data?.budget) {
      throw new Error('Orçamento não encontrado');
    }

    return this.updateBudget(id, { alertSent: false } as any);
  },
};