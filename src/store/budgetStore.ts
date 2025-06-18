// src/store/budgetStore.ts
import { create } from 'zustand';
import { Budget } from '../types';

interface BudgetFilters {
  status?: 'active' | 'expired' | 'future';
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  categoryId?: string;
  isExceeded?: boolean;
  nearLimit?: boolean;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  activeBudgetsCount: number;
  budgetsExceeded: number;
  budgetsNearLimit: number;
}

interface Alert {
  budgetId: string;
  budgetName: string;
  type: 'exceeded' | 'near_limit' | 'expired';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

interface BudgetStore {
  // Estado
  budgets: Budget[];
  filteredBudgets: Budget[];
  selectedBudget: Budget | null;
  filters: BudgetFilters;
  summary: BudgetSummary | null;
  isLoading: boolean;
  error: string | null;
  
  // Alertas
  alerts: Alert[];
  
  // Ações
  setBudgets: (budgets: Budget[]) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  removeBudget: (id: string) => void;
  toggleBudgetStatus: (id: string) => void;
  
  // Filtros
  setFilters: (filters: Partial<BudgetFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  
  // Seleção
  selectBudget: (budget: Budget | null) => void;
  
  // Cálculos
  calculateSummary: () => void;
  updateBudgetProgress: (budgetId: string, spent: number) => void;
  
  // Alertas
  generateAlerts: () => void;
  dismissAlert: (budgetId: string) => void;
  
  // Estados
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utilitários
  getBudgetsByCategory: (categoryId: string) => Budget[];
  getBudgetsByStatus: (status: 'active' | 'expired' | 'future') => Budget[];
  getExceededBudgets: () => Budget[];
  getBudgetsNearLimit: (threshold?: number) => Budget[];
  getBudgetProgress: (budgetId: string) => {
    percentage: number;
    remaining: number;
    isExceeded: boolean;
    daysRemaining: number;
  } | null;
  
  // Reset
  reset: () => void;
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  // Estado inicial
  budgets: [],
  filteredBudgets: [],
  selectedBudget: null,
  filters: {},
  summary: null,
  isLoading: false,
  error: null,
  alerts: [],

  // Ações principais
  setBudgets: (budgets) => {
    set({ budgets });
    get().applyFilters();
    get().calculateSummary();
    get().generateAlerts();
  },

  addBudget: (budget) => {
    const { budgets } = get();
    const newBudgets = [...budgets, budget];
    
    set({ budgets: newBudgets });
    get().applyFilters();
    get().calculateSummary();
    get().generateAlerts();
  },

  updateBudget: (id, updates) => {
    const { budgets } = get();
    const updatedBudgets = budgets.map(b => 
      b._id === id ? { ...b, ...updates } : b
    );
    
    set({ budgets: updatedBudgets });
    get().applyFilters();
    get().calculateSummary();
    get().generateAlerts();
    
    // Atualizar orçamento selecionado se for o mesmo
    const { selectedBudget } = get();
    if (selectedBudget && selectedBudget._id === id) {
      set({ selectedBudget: { ...selectedBudget, ...updates } });
    }
  },

  removeBudget: (id) => {
    const { budgets, alerts } = get();
    const updatedBudgets = budgets.filter(b => b._id !== id);
    const updatedAlerts = alerts.filter(a => a.budgetId !== id);
    
    set({ 
      budgets: updatedBudgets,
      alerts: updatedAlerts,
    });
    get().applyFilters();
    get().calculateSummary();
    
    // Limpar seleção se for o orçamento removido
    const { selectedBudget } = get();
    if (selectedBudget && selectedBudget._id === id) {
      set({ selectedBudget: null });
    }
  },

  toggleBudgetStatus: (id) => {
    const { budgets } = get();
    const updatedBudgets = budgets.map(b => 
      b._id === id ? { ...b, isActive: !b.isActive } : b
    );
    
    set({ budgets: updatedBudgets });
    get().applyFilters();
    get().calculateSummary();
    get().generateAlerts();
  },

  // Filtros
  setFilters: (newFilters) => {
    const { filters } = get();
    const updatedFilters = { ...filters, ...newFilters };
    set({ filters: updatedFilters });
    get().applyFilters();
  },

  clearFilters: () => {
    set({ filters: {} });
    get().applyFilters();
  },

  applyFilters: () => {
    const { budgets, filters } = get();
    let filtered = [...budgets];
    const now = new Date();

    // Filtro por status
    if (filters.status) {
      filtered = filtered.filter(b => {
        const endDate = new Date(b.endDate);
        const startDate = new Date(b.startDate);
        
        switch (filters.status) {
          case 'active':
            return b.isActive && startDate <= now && endDate >= now;
          case 'expired':
            return endDate < now;
          case 'future':
            return startDate > now;
          default:
            return true;
        }
      });
    }

    // Filtro por período
    if (filters.period) {
      filtered = filtered.filter(b => b.period === filters.period);
    }

    // Filtro por categoria
    if (filters.categoryId) {
      filtered = filtered.filter(b => b.categoryId === filters.categoryId);
    }

    // Filtro por excedidos
    if (filters.isExceeded) {
      filtered = filtered.filter(b => b.isExceeded);
    }

    // Filtro por próximos do limite
    if (filters.nearLimit) {
      filtered = filtered.filter(b => {
        const threshold = b.alertThreshold || 80;
        return b.spentPercentage >= threshold && !b.isExceeded;
      });
    }

    // Ordenar por data de criação (mais recente primeiro)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    set({ filteredBudgets: filtered });
  },

  // Seleção
  selectBudget: (budget) => {
    set({ selectedBudget: budget });
  },

  // Cálculos
  calculateSummary: () => {
    const { budgets } = get();
    const now = new Date();
    
    // Filtrar orçamentos ativos
    const activeBudgets = budgets.filter(b => {
      const endDate = new Date(b.endDate);
      const startDate = new Date(b.startDate);
      return b.isActive && startDate <= now && endDate >= now;
    });

    const totalBudget = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    
    const budgetsExceeded = activeBudgets.filter(b => b.isExceeded).length;
    const budgetsNearLimit = activeBudgets.filter(b => {
      const threshold = b.alertThreshold || 80;
      return b.spentPercentage >= threshold && !b.isExceeded;
    }).length;

    const summary: BudgetSummary = {
      totalBudget,
      totalSpent,
      totalRemaining,
      overallPercentage,
      activeBudgetsCount: activeBudgets.length,
      budgetsExceeded,
      budgetsNearLimit,
    };

    set({ summary });
  },

  updateBudgetProgress: (budgetId, spent) => {
    const { budgets } = get();
    const updatedBudgets = budgets.map(b => {
      if (b._id === budgetId) {
        const spentPercentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
        const remaining = Math.max(0, b.amount - spent);
        const isExceeded = spent > b.amount;
        
        return {
          ...b,
          spent,
          spentPercentage,
          remaining,
          isExceeded,
        };
      }
      return b;
    });
    
    set({ budgets: updatedBudgets });
    get().applyFilters();
    get().calculateSummary();
    get().generateAlerts();
  },

  // Alertas
  generateAlerts: () => {
    const { budgets } = get();
    const now = new Date();
    const alerts: Alert[] = [];

    budgets.forEach(budget => {
      const endDate = new Date(budget.endDate);
      const startDate = new Date(budget.startDate);
      const isActive = budget.isActive && startDate <= now && endDate >= now;
      
      if (!isActive) return;

      // Alerta para orçamentos excedidos
      if (budget.isExceeded) {
        alerts.push({
          budgetId: budget._id,
          budgetName: budget.name,
          type: 'exceeded',
          message: `Orçamento "${budget.name}" foi excedido em ${budget.spentPercentage - 100}%`,
          severity: 'high',
        });
      }
      // Alerta para orçamentos próximos do limite
      else if (budget.spentPercentage >= (budget.alertThreshold || 80)) {
        alerts.push({
          budgetId: budget._id,
          budgetName: budget.name,
          type: 'near_limit',
          message: `Orçamento "${budget.name}" está ${budget.spentPercentage}% usado`,
          severity: budget.spentPercentage >= 95 ? 'high' : 'medium',
        });
      }

      // Alerta para orçamentos que expiram em breve
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
        alerts.push({
          budgetId: budget._id,
          budgetName: budget.name,
          type: 'expired',
          message: `Orçamento "${budget.name}" expira em ${daysUntilExpiry} dias`,
          severity: 'medium',
        });
      }
    });

    set({ alerts });
  },

  dismissAlert: (budgetId) => {
    const { alerts } = get();
    const updatedAlerts = alerts.filter(a => a.budgetId !== budgetId);
    set({ alerts: updatedAlerts });
  },

  // Estados
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Utilitários
  getBudgetsByCategory: (categoryId) => {
    const { filteredBudgets } = get();
    return filteredBudgets.filter(b => b.categoryId === categoryId);
  },

  getBudgetsByStatus: (status) => {
    const { budgets } = get();
    const now = new Date();
    
    return budgets.filter(b => {
      const endDate = new Date(b.endDate);
      const startDate = new Date(b.startDate);
      
      switch (status) {
        case 'active':
          return b.isActive && startDate <= now && endDate >= now;
        case 'expired':
          return endDate < now;
        case 'future':
          return startDate > now;
        default:
          return true;
      }
    });
  },

  getExceededBudgets: () => {
    const { filteredBudgets } = get();
    return filteredBudgets.filter(b => b.isExceeded);
  },

  getBudgetsNearLimit: (threshold = 80) => {
    const { filteredBudgets } = get();
    return filteredBudgets.filter(b => 
      b.spentPercentage >= threshold && !b.isExceeded
    );
  },

  getBudgetProgress: (budgetId) => {
    const { budgets } = get();
    const budget = budgets.find(b => b._id === budgetId);
    
    if (!budget) return null;

    const now = new Date();
    const endDate = new Date(budget.endDate);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      percentage: budget.spentPercentage,
      remaining: budget.remaining,
      isExceeded: budget.isExceeded,
      daysRemaining,
    };
  },

  // Reset
  reset: () => {
    set({
      budgets: [],
      filteredBudgets: [],
      selectedBudget: null,
      filters: {},
      summary: null,
      isLoading: false,
      error: null,
      alerts: [],
    });
  },
}));