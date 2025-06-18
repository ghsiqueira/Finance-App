import { apiClient } from './client';
import { ApiResponse, Goal, GoalForm } from '../../types';

export interface GoalFilters {
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  includeCompleted?: boolean;
}

export interface GoalSummary {
  summary: {
    total: number;
    active: number;
    completed: number;
    paused: number;
    cancelled: number;
    totalTargetAmount: number;
    totalCurrentAmount: number;
    totalProgress: number;
  };
  upcomingGoals: Goal[];
  recentlyCompleted: Goal[];
}

export interface ContributionData {
  amount: number;
  note?: string;
}

export interface ReminderData {
  message: string;
  date: Date;
}

export const goalService = {
  async getGoals(filters: GoalFilters = {}): Promise<ApiResponse<{ goals: Goal[] }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return apiClient.get(`/goals?${params.toString()}`);
  },

  async getGoal(id: string): Promise<ApiResponse<{
    goal: Goal;
    contributionStats: {
      total: number;
      automatic: number;
      manual: number;
      averageAmount: number;
      lastContribution: any;
    };
  }>> {
    return apiClient.get(`/goals/${id}`);
  },

  async createGoal(data: GoalForm): Promise<ApiResponse<{ goal: Goal }>> {
    const payload = {
      ...data,
      targetAmount: parseFloat(data.targetAmount),
      targetDate: data.targetDate.toISOString(),
    };
    
    return apiClient.post('/goals', payload);
  },

  async updateGoal(id: string, data: Partial<GoalForm>): Promise<ApiResponse<{ goal: Goal }>> {
    const payload = {
      ...data,
      ...(data.targetAmount && { targetAmount: parseFloat(data.targetAmount) }),
      ...(data.targetDate && { targetDate: data.targetDate.toISOString() }),
    };
    
    return apiClient.put(`/goals/${id}`, payload);
  },

  async deleteGoal(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/goals/${id}`);
  },

  async addContribution(id: string, data: ContributionData): Promise<ApiResponse<{ goal: Goal }>> {
    return apiClient.post(`/goals/${id}/contribute`, data);
  },

  async removeContribution(id: string, contributionId: string): Promise<ApiResponse<{ goal: Goal }>> {
    return apiClient.delete(`/goals/${id}/contributions/${contributionId}`);
  },

  async addReminder(id: string, data: ReminderData): Promise<ApiResponse<{ goal: Goal }>> {
    const payload = {
      ...data,
      date: data.date.toISOString(),
    };
    
    return apiClient.post(`/goals/${id}/reminders`, payload);
  },

  async removeReminder(id: string, reminderId: string): Promise<ApiResponse<{ goal: Goal }>> {
    return apiClient.delete(`/goals/${id}/reminders/${reminderId}`);
  },

  async updateGoalStatus(id: string, status: 'active' | 'completed' | 'paused' | 'cancelled'): Promise<ApiResponse<{ goal: Goal }>> {
    return apiClient.post(`/goals/${id}/status`, { status });
  },

  async getGoalSummary(): Promise<ApiResponse<GoalSummary>> {
    return apiClient.get('/goals/summary');
  },

  async getGoalsOfflineFirst(filters: GoalFilters = {}): Promise<Goal[]> {
    const cacheKey = `goals_${JSON.stringify(filters)}`;
    
    return apiClient.offlineFirst(
      cacheKey,
      async () => {
        const response = await this.getGoals(filters);
        return response.data?.goals || [];
      }
    );
  },

  async getActiveGoals(): Promise<ApiResponse<{ goals: Goal[] }>> {
    return this.getGoals({ status: 'active' });
  },

  async getCompletedGoals(): Promise<ApiResponse<{ goals: Goal[] }>> {
    return this.getGoals({ status: 'completed' });
  },

  async getGoalsByPriority(priority: 'low' | 'medium' | 'high'): Promise<ApiResponse<{ goals: Goal[] }>> {
    return this.getGoals({ priority });
  },

  async getUpcomingGoals(days: number = 30): Promise<Goal[]> {
    try {
      const response = await this.getActiveGoals();
      const goals = response.data?.goals || [];
      
      return goals.filter(goal => goal.daysRemaining <= days && goal.daysRemaining > 0);
    } catch (error) {
      return [];
    }
  },

  calculateGoalStats(goal: Goal): {
    progressPercentage: number;
    remainingAmount: number;
    daysRemaining: number;
    dailySavingsNeeded: number;
    monthlySavingsNeeded: number;
    isOnTrack: boolean;
  } {
    const progressPercentage = goal.targetAmount > 0 
      ? Math.round((goal.currentAmount / goal.targetAmount) * 100) 
      : 0;
    
    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    
    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
    const dailySavingsNeeded = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;
    
    const monthsRemaining = daysRemaining / 30;
    const monthlySavingsNeeded = monthsRemaining > 0 ? remainingAmount / monthsRemaining : remainingAmount;
    
    const totalDays = Math.ceil((targetDate.getTime() - new Date(goal.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = totalDays - daysRemaining;
    const expectedProgress = daysPassed / totalDays;
    const actualProgress = progressPercentage / 100;
    const isOnTrack = actualProgress >= (expectedProgress * 0.8);

    return {
      progressPercentage,
      remainingAmount,
      daysRemaining,
      dailySavingsNeeded: Math.max(0, dailySavingsNeeded),
      monthlySavingsNeeded: Math.max(0, monthlySavingsNeeded),
      isOnTrack,
    };
  },

  async duplicateGoal(id: string): Promise<ApiResponse<{ goal: Goal }>> {
    const { data } = await this.getGoal(id);
    
    if (!data?.goal) {
      throw new Error('Meta não encontrada');
    }

    const { _id, currentAmount, contributions, reminders, completedAt, createdAt, updatedAt, ...goalData } = data.goal;
    
    const originalTargetDate = new Date(goalData.targetDate);
    const today = new Date();
    const newTargetDate = new Date(today.getTime() + (originalTargetDate.getTime() - new Date(goalData.startDate).getTime()));

    return this.createGoal({
      title: `${goalData.title} (cópia)`,
      description: goalData.description,
      targetAmount: goalData.targetAmount.toString(),
      targetDate: newTargetDate,
      categoryId: goalData.categoryId,
      priority: goalData.priority,
      color: goalData.color,
    });
  },

  async getContributionHistory(id: string): Promise<ApiResponse<any[]>> {
    const { data } = await this.getGoal(id);
    
    if (!data?.goal) {
      throw new Error('Meta não encontrada');
    }

    return {
      success: true,
      message: 'Histórico obtido com sucesso',
      data: data.goal.contributions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  },

  async getCompletionProjection(id: string): Promise<{
    projectedCompletionDate: Date | null;
    monthsToComplete: number;
    averageMonthlyContribution: number;
    isAchievable: boolean;
  }> {
    const { data } = await this.getGoal(id);
    
    if (!data?.goal) {
      throw new Error('Meta não encontrada');
    }

    const goal = data.goal;
    const contributions = goal.contributions;
    
    if (contributions.length === 0) {
      return {
        projectedCompletionDate: null,
        monthsToComplete: 0,
        averageMonthlyContribution: 0,
        isAchievable: false,
      };
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentContributions = contributions.filter(
      c => new Date(c.date) >= threeMonthsAgo
    );
    
    const totalRecentContributions = recentContributions.reduce((sum, c) => sum + c.amount, 0);
    const monthsWithContributions = Math.max(1, recentContributions.length > 0 ? 3 : 1);
    const averageMonthlyContribution = totalRecentContributions / monthsWithContributions;
    
    const remainingAmount = goal.targetAmount - goal.currentAmount;
    const monthsToComplete = averageMonthlyContribution > 0 
      ? Math.ceil(remainingAmount / averageMonthlyContribution)
      : 0;
    
    const projectedCompletionDate = averageMonthlyContribution > 0
      ? new Date(Date.now() + (monthsToComplete * 30 * 24 * 60 * 60 * 1000))
      : null;
    
    const targetDate = new Date(goal.targetDate);
    const isAchievable = projectedCompletionDate ? projectedCompletionDate <= targetDate : false;

    return {
      projectedCompletionDate,
      monthsToComplete,
      averageMonthlyContribution,
      isAchievable,
    };
  },

  async completeGoal(id: string): Promise<ApiResponse<{ goal: Goal }>> {
    return this.updateGoalStatus(id, 'completed');
  },

  async pauseGoal(id: string): Promise<ApiResponse<{ goal: Goal }>> {
    return this.updateGoalStatus(id, 'paused');
  },

  async reactivateGoal(id: string): Promise<ApiResponse<{ goal: Goal }>> {
    return this.updateGoalStatus(id, 'active');
  },
};