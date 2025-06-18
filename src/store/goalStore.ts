// src/store/goalStore.ts
import { create } from 'zustand';
import { Goal, Contribution } from '../types';

interface GoalFilters {
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  categoryId?: string;
  deadlineWarning?: boolean; // Metas próximas do prazo
}

interface GoalSummary {
  total: number;
  active: number;
  completed: number;
  paused: number;
  cancelled: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  totalProgress: number;
}

interface GoalStore {
  // Estado
  goals: Goal[];
  filteredGoals: Goal[];
  selectedGoal: Goal | null;
  filters: GoalFilters;
  summary: GoalSummary | null;
  isLoading: boolean;
  error: string | null;
  
  // Lembretes e alertas
  upcomingDeadlines: Goal[];
  completedGoalsThisMonth: Goal[];
  
  // Ações
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  
  // Status de metas
  completeGoal: (id: string) => void;
  pauseGoal: (id: string) => void;
  activateGoal: (id: string) => void;
  cancelGoal: (id: string) => void;
  
  // Contribuições
  addContribution: (goalId: string, contribution: Omit<Contribution, '_id'>) => void;
  removeContribution: (goalId: string, contributionId: string) => void;
  
  // Filtros
  setFilters: (filters: Partial<GoalFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  
  // Seleção
  selectGoal: (goal: Goal | null) => void;
  
  // Cálculos
  calculateSummary: () => void;
  updateGoalProgress: (goalId: string, currentAmount: number) => void;
  calculateGoalProjection: (goalId: string) => {
    projectedCompletionDate: Date | null;
    monthsToComplete: number;
    isOnTrack: boolean;
  } | null;
  
  // Utilitários
  getGoalsByPriority: (priority: 'low' | 'medium' | 'high') => Goal[];
  getGoalsByStatus: (status: 'active' | 'completed' | 'paused' | 'cancelled') => Goal[];
  getGoalsByCategory: (categoryId: string) => Goal[];
  getGoalsNearDeadline: (days?: number) => Goal[];
  getCompletedGoalsInPeriod: (startDate: Date, endDate: Date) => Goal[];
  
  // Alertas
  generateDeadlineAlerts: () => void;
  
  // Estados
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Reset
  reset: () => void;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  // Estado inicial
  goals: [],
  filteredGoals: [],
  selectedGoal: null,
  filters: {},
  summary: null,
  isLoading: false,
  error: null,
  upcomingDeadlines: [],
  completedGoalsThisMonth: [],

  // Ações principais
  setGoals: (goals) => {
    set({ goals });
    get().applyFilters();
    get().calculateSummary();
    get().generateDeadlineAlerts();
  },

  addGoal: (goal) => {
    const { goals } = get();
    const newGoals = [...goals, goal];
    
    set({ goals: newGoals });
    get().applyFilters();
    get().calculateSummary();
    get().generateDeadlineAlerts();
  },

  updateGoal: (id, updates) => {
    const { goals } = get();
    const updatedGoals = goals.map(g => 
      g._id === id ? { ...g, ...updates } : g
    );
    
    set({ goals: updatedGoals });
    get().applyFilters();
    get().calculateSummary();
    get().generateDeadlineAlerts();
    
    // Atualizar meta selecionada se for a mesma
    const { selectedGoal } = get();
    if (selectedGoal && selectedGoal._id === id) {
      set({ selectedGoal: { ...selectedGoal, ...updates } });
    }
  },

  removeGoal: (id) => {
    const { goals } = get();
    const updatedGoals = goals.filter(g => g._id !== id);
    
    set({ goals: updatedGoals });
    get().applyFilters();
    get().calculateSummary();
    get().generateDeadlineAlerts();
    
    // Limpar seleção se for a meta removida
    const { selectedGoal } = get();
    if (selectedGoal && selectedGoal._id === id) {
      set({ selectedGoal: null });
    }
  },

  // Status de metas
  completeGoal: (id) => {
    const updates = {
      status: 'completed' as const,
      isCompleted: true,
      completedAt: new Date().toISOString(),
      progressPercentage: 100,
    };
    get().updateGoal(id, updates);
  },

  pauseGoal: (id) => {
    const updates = { status: 'paused' as const };
    get().updateGoal(id, updates);
  },

  activateGoal: (id) => {
    const updates = { status: 'active' as const };
    get().updateGoal(id, updates);
  },

  cancelGoal: (id) => {
    const updates = { status: 'cancelled' as const };
    get().updateGoal(id, updates);
  },

  // Contribuições
  addContribution: (goalId, contribution) => {
    const { goals } = get();
    const updatedGoals = goals.map(g => {
      if (g._id === goalId) {
        const newContribution: Contribution = {
          ...contribution,
          _id: `contrib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        
        const newContributions = [...g.contributions, newContribution];
        const newCurrentAmount = g.currentAmount + contribution.amount;
        const progressPercentage = g.targetAmount > 0 ? Math.round((newCurrentAmount / g.targetAmount) * 100) : 0;
        const remainingAmount = Math.max(0, g.targetAmount - newCurrentAmount);
        const isCompleted = newCurrentAmount >= g.targetAmount;
        
        return {
          ...g,
          contributions: newContributions,
          currentAmount: newCurrentAmount,
          progressPercentage,
          remainingAmount,
          isCompleted,
          ...(isCompleted && !g.completedAt ? { 
            completedAt: new Date().toISOString(),
            status: 'completed' as const
          } : {}),
        };
      }
      return g;
    });
    
    set({ goals: updatedGoals });
    get().applyFilters();
    get().calculateSummary();
  },

  removeContribution: (goalId, contributionId) => {
    const { goals } = get();
    const updatedGoals = goals.map(g => {
      if (g._id === goalId) {
        const contributionToRemove = g.contributions.find(c => c._id === contributionId);
        if (!contributionToRemove) return g;
        
        const newContributions = g.contributions.filter(c => c._id !== contributionId);
        const newCurrentAmount = Math.max(0, g.currentAmount - contributionToRemove.amount);
        const progressPercentage = g.targetAmount > 0 ? Math.round((newCurrentAmount / g.targetAmount) * 100) : 0;
        const remainingAmount = Math.max(0, g.targetAmount - newCurrentAmount);
        const isCompleted = newCurrentAmount >= g.targetAmount;
        
        return {
          ...g,
          contributions: newContributions,
          currentAmount: newCurrentAmount,
          progressPercentage,
          remainingAmount,
          isCompleted,
          ...(g.isCompleted && !isCompleted ? { 
            completedAt: undefined,
            status: 'active' as const
          } : {}),
        };
      }
      return g;
    });
    
    set({ goals: updatedGoals });
    get().applyFilters();
    get().calculateSummary();
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
    const { goals, filters } = get();
    let filtered = [...goals];

    // Filtro por status
    if (filters.status) {
      filtered = filtered.filter(g => g.status === filters.status);
    }

    // Filtro por prioridade
    if (filters.priority) {
      filtered = filtered.filter(g => g.priority === filters.priority);
    }

    // Filtro por categoria
    if (filters.categoryId) {
      filtered = filtered.filter(g => g.categoryId === filters.categoryId);
    }

    // Filtro por prazo próximo
    if (filters.deadlineWarning) {
      const now = new Date();
      const warningDays = 30; // 30 dias
      filtered = filtered.filter(g => {
        const targetDate = new Date(g.targetDate);
        const daysUntilDeadline = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDeadline <= warningDays && daysUntilDeadline > 0 && !g.isCompleted;
      });
    }

    // Ordenar por prioridade e data de criação
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Prioridade maior primeiro
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    set({ filteredGoals: filtered });
  },

  // Seleção
  selectGoal: (goal) => {
    set({ selectedGoal: goal });
  },

  // Cálculos
  calculateSummary: () => {
    const { goals } = get();
    
    const total = goals.length;
    const active = goals.filter(g => g.status === 'active').length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const paused = goals.filter(g => g.status === 'paused').length;
    const cancelled = goals.filter(g => g.status === 'cancelled').length;
    
    const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrentAmount = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalProgress = totalTargetAmount > 0 ? Math.round((totalCurrentAmount / totalTargetAmount) * 100) : 0;

    const summary: GoalSummary = {
      total,
      active,
      completed,
      paused,
      cancelled,
      totalTargetAmount,
      totalCurrentAmount,
      totalProgress,
    };

    set({ summary });
  },

  updateGoalProgress: (goalId, currentAmount) => {
    const { goals } = get();
    const updatedGoals = goals.map(g => {
      if (g._id === goalId) {
        const progressPercentage = g.targetAmount > 0 ? Math.round((currentAmount / g.targetAmount) * 100) : 0;
        const remainingAmount = Math.max(0, g.targetAmount - currentAmount);
        const isCompleted = currentAmount >= g.targetAmount;
        
        return {
          ...g,
          currentAmount,
          progressPercentage,
          remainingAmount,
          isCompleted,
          ...(isCompleted && !g.completedAt ? { 
            completedAt: new Date().toISOString(),
            status: 'completed' as const
          } : {}),
        };
      }
      return g;
    });
    
    set({ goals: updatedGoals });
    get().applyFilters();
    get().calculateSummary();
  },

  calculateGoalProjection: (goalId) => {
    const { goals } = get();
    const goal = goals.find(g => g._id === goalId);
    
    if (!goal || goal.contributions.length === 0) return null;

    // Calcular média das últimas 3 contribuições
    const recentContributions = goal.contributions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
    
    const averageContribution = recentContributions.reduce((sum, c) => sum + c.amount, 0) / recentContributions.length;
    
    if (averageContribution <= 0) return null;

    const remainingAmount = goal.remainingAmount;
    const monthsToComplete = Math.ceil(remainingAmount / averageContribution);
    
    const projectedCompletionDate = new Date();
    projectedCompletionDate.setMonth(projectedCompletionDate.getMonth() + monthsToComplete);
    
    const targetDate = new Date(goal.targetDate);
    const isOnTrack = projectedCompletionDate <= targetDate;

    return {
      projectedCompletionDate,
      monthsToComplete,
      isOnTrack,
    };
  },

  // Utilitários
  getGoalsByPriority: (priority) => {
    const { filteredGoals } = get();
    return filteredGoals.filter(g => g.priority === priority);
  },

  getGoalsByStatus: (status) => {
    const { goals } = get();
    return goals.filter(g => g.status === status);
  },

  getGoalsByCategory: (categoryId) => {
    const { filteredGoals } = get();
    return filteredGoals.filter(g => g.categoryId === categoryId);
  },

  getGoalsNearDeadline: (days = 30) => {
    const { goals } = get();
    const now = new Date();
    
    return goals.filter(g => {
      if (g.isCompleted) return false;
      
      const targetDate = new Date(g.targetDate);
      const daysUntilDeadline = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDeadline <= days && daysUntilDeadline > 0;
    });
  },

  getCompletedGoalsInPeriod: (startDate, endDate) => {
    const { goals } = get();
    
    return goals.filter(g => {
      if (!g.isCompleted || !g.completedAt) return false;
      
      const completedDate = new Date(g.completedAt);
      return completedDate >= startDate && completedDate <= endDate;
    });
  },

  // Alertas
  generateDeadlineAlerts: () => {
    const upcomingDeadlines = get().getGoalsNearDeadline(30);
    
    // Metas concluídas este mês
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const completedGoalsThisMonth = get().getCompletedGoalsInPeriod(startOfMonth, endOfMonth);

    set({ 
      upcomingDeadlines,
      completedGoalsThisMonth,
    });
  },

  // Estados
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Reset
  reset: () => {
    set({
      goals: [],
      filteredGoals: [],
      selectedGoal: null,
      filters: {},
      summary: null,
      isLoading: false,
      error: null,
      upcomingDeadlines: [],
      completedGoalsThisMonth: [],
    });
  },
}));