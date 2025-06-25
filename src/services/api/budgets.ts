import { apiClient } from './client';
import { ApiResponse, Budget, BudgetForm } from '../../types';

export interface BudgetFilters {
  status?: 'active' | 'expired' | 'future';
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  includeInactive?: boolean;
}

// ✅ CORRIGIDO: Interface BudgetSummary sem aninhamento
export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  activeBudgetsCount: number;
  budgetsExceeded: number;
  budgetsNearLimit: number;
}

// Interface para resposta detalhada com dados extras
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

// ✅ CORRIGIDO: Interface BudgetFormData extendida para o serviço
interface BudgetFormData extends BudgetForm {
  startDate: Date;
  endDate: Date;
  alertThreshold: number;
  notes?: string;
  color: string;
}

// ✅ NOVO: Interface para updates de budget
interface BudgetUpdate {
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

  async createBudget(data: BudgetFormData): Promise<ApiResponse<{ budget: Budget }>> {
    const payload = {
      ...data,
      amount: parseFloat(data.amount),
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
    };
    
    return apiClient.post('/budgets', payload);
  },

  async updateBudget(id: string, data: Partial<BudgetFormData>): Promise<ApiResponse<{ budget: Budget }>> {
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

  // ✅ CORRIGIDO: Agora retorna BudgetSummary diretamente
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
    const percentage = budget.amount > 0 ? 
      Math.round((budget.spent / budget.amount) * 100) : 0;
    const remaining = Math.max(0, budget.amount - budget.spent);
    const isExceeded = budget.spent > budget.amount;
    // ✅ CORRIGIDO: Type casting para acessar alertSent
    const budgetWithAlert = budget as any;
    const shouldAlert = percentage >= (budget.alertThreshold || 80) && !budgetWithAlert.alertSent;

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

    const budget = data.budget;
    // ✅ CORRIGIDO: Type casting para acessar propriedades extras
    const budgetWithExtras = budget as any;
    
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    return this.createBudget({
      name: `${budget.name} (cópia)`,
      amount: budget.amount.toString(),
      categoryId: budget.categoryId,
      period: budget.period,
      startDate: nextMonth,
      endDate: endOfNextMonth,
      alertThreshold: budget.alertThreshold,
      notes: budgetWithExtras.notes || '',
      color: budgetWithExtras.color || '#6366f1',
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

    // ✅ CORRIGIDO: Usando interface BudgetUpdate
    const updateData: BudgetUpdate = { alertSent: false };
    return apiClient.put(`/budgets/${id}`, updateData);
  },

  // ✅ NOVO: Método para obter resumo detalhado (com dados extras)
  async getBudgetSummaryDetailed(): Promise<ApiResponse<BudgetSummaryResponse>> {
    return apiClient.get('/budgets/summary/detailed');
  },

  // ✅ NOVO: Método para calcular resumo localmente
  calculateSummaryFromBudgets(budgets: Budget[]): BudgetSummary {
    const activeBudgets = budgets.filter(b => b.isActive);
    
    const totalBudget = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    const overallPercentage = totalBudget > 0 ? 
      Math.round((totalSpent / totalBudget) * 100) : 0;
    
    const budgetsExceeded = activeBudgets.filter(b => b.isExceeded).length;
    const budgetsNearLimit = activeBudgets.filter(b => {
      const threshold = b.alertThreshold || 80;
      return b.spentPercentage >= threshold && !b.isExceeded;
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

  // ✅ CORRIGIDO: Método para validar orçamento
  async validateBudget(data: Partial<BudgetFormData>): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Nome é obrigatório');
    }

    if (!data.amount || parseFloat(data.amount) <= 0) {
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

  // ✅ NOVO: Método para obter estatísticas de gastos por categoria
  async getCategorySpendingStats(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<ApiResponse<{
    categories: Array<{
      categoryId: string;
      categoryName: string;
      budgeted: number;
      spent: number;
      remaining: number;
      percentage: number;
      isExceeded: boolean;
    }>;
  }>> {
    return apiClient.get(`/budgets/stats/categories?period=${period}`);
  },

  // ✅ NOVO: Método para exportar dados de orçamentos
  async exportBudgets(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await apiClient.get(`/budgets/export?format=${format}`, {
      responseType: 'blob',
    });
    
    return response.data;
  },
};