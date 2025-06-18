import { Transaction, Budget, Goal } from '../types';

export const calculations = {
  calculateBalance: (transactions: Transaction[]): number => {
    return transactions.reduce((balance, transaction) => {
      return transaction.type === 'income' 
        ? balance + transaction.amount 
        : balance - transaction.amount;
    }, 0);
  },

  calculateTotalByType: (transactions: Transaction[], type: 'income' | 'expense'): number => {
    return transactions
      .filter(t => t.type === type)
      .reduce((total, t) => total + t.amount, 0);
  },

  calculateAverageTransaction: (transactions: Transaction[]): number => {
    if (transactions.length === 0) return 0;
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    return total / transactions.length;
  },

  calculateBudgetProgress: (budget: Budget): {
    percentage: number;
    remaining: number;
    isExceeded: boolean;
    daysRemaining: number;
    dailyAverage: number;
    projectedTotal: number;
  } => {
    const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
    const remaining = Math.max(0, budget.amount - budget.spent);
    const isExceeded = budget.spent > budget.amount;
    
    const now = new Date();
    const endDate = new Date(budget.endDate);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const startDate = new Date(budget.startDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.max(1, totalDays - daysRemaining);
    
    const dailyAverage = budget.spent / daysPassed;
    const projectedTotal = dailyAverage * totalDays;

    return {
      percentage: Math.round(percentage),
      remaining,
      isExceeded,
      daysRemaining,
      dailyAverage,
      projectedTotal,
    };
  },

  calculateBudgetHealth: (budgets: Budget[]): {
    totalBudget: number;
    totalSpent: number;
    averageUsage: number;
    exceededCount: number;
    nearLimitCount: number;
  } => {
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const averageUsage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    const exceededCount = budgets.filter(b => b.spent > b.amount).length;
    const nearLimitCount = budgets.filter(b => {
      const usage = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
      return usage >= (b.alertThreshold || 80) && usage < 100;
    }).length;

    return {
      totalBudget,
      totalSpent,
      averageUsage: Math.round(averageUsage),
      exceededCount,
      nearLimitCount,
    };
  },

  calculateGoalProgress: (goal: Goal): {
    percentage: number;
    remaining: number;
    daysRemaining: number;
    dailySavingsNeeded: number;
    monthlySavingsNeeded: number;
    isOnTrack: boolean;
    projectedCompletionDate: Date | null;
  } => {
    const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    
    const now = new Date();
    const targetDate = new Date(goal.targetDate);
    const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const dailySavingsNeeded = daysRemaining > 0 ? remaining / daysRemaining : 0;
    const monthlySavingsNeeded = dailySavingsNeeded * 30;
    
    const startDate = new Date(goal.startDate || goal.createdAt);
    const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.max(1, totalDays - daysRemaining);
    const expectedProgress = (daysPassed / totalDays) * 100;
    const isOnTrack = percentage >= expectedProgress * 0.8; 

    let projectedCompletionDate: Date | null = null;
    if (goal.contributions && goal.contributions.length > 0) {
      const recentContributions = goal.contributions.slice(-3); 
      const averageContribution = recentContributions.reduce((sum, c) => sum + c.amount, 0) / recentContributions.length;
      
      if (averageContribution > 0) {
        const contributionsNeeded = Math.ceil(remaining / averageContribution);
        projectedCompletionDate = new Date(now.getTime() + (contributionsNeeded * 30 * 24 * 60 * 60 * 1000)); 
      }
    }

    return {
      percentage: Math.round(percentage),
      remaining,
      daysRemaining,
      dailySavingsNeeded,
      monthlySavingsNeeded,
      isOnTrack,
      projectedCompletionDate,
    };
  },

  calculateCategoryDistribution: (transactions: Transaction[]): Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
    count: number;
  }> => {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const categoryStats = new Map();

    transactions.forEach(transaction => {
      const categoryId = transaction.categoryId || 'uncategorized';
      const categoryName = transaction.category?.name || 'Sem categoria';
      
      if (!categoryStats.has(categoryId)) {
        categoryStats.set(categoryId, {
          categoryId,
          categoryName,
          amount: 0,
          count: 0,
        });
      }
      
      const stats = categoryStats.get(categoryId);
      stats.amount += transaction.amount;
      stats.count += 1;
    });

    return Array.from(categoryStats.values()).map(stat => ({
      ...stat,
      percentage: total > 0 ? Math.round((stat.amount / total) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);
  },

  calculateMonthlyTrends: (transactions: Transaction[], months: number = 6): Array<{
    month: string;
    year: number;
    income: number;
    expense: number;
    balance: number;
    transactionCount: number;
  }> => {
    const trends = new Map();
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!trends.has(monthKey)) {
        trends.set(monthKey, {
          month: date.toLocaleDateString('pt-BR', { month: 'short' }),
          year: date.getFullYear(),
          income: 0,
          expense: 0,
          transactionCount: 0,
        });
      }
      
      const trend = trends.get(monthKey);
      if (transaction.type === 'income') {
        trend.income += transaction.amount;
      } else {
        trend.expense += transaction.amount;
      }
      trend.transactionCount += 1;
    });

    return Array.from(trends.values()).map(trend => ({
      ...trend,
      balance: trend.income - trend.expense,
    })).sort((a, b) => {
      const dateA = new Date(a.year, parseInt(a.month) - 1);
      const dateB = new Date(b.year, parseInt(b.month) - 1);
      return dateA.getTime() - dateB.getTime();
    }).slice(-months);
  },

  calculateSavingsRate: (income: number, expenses: number): number => {
    if (income <= 0) return 0;
    return Math.round(((income - expenses) / income) * 100);
  },

  calculateExpenseRatio: (expenses: number, income: number): number => {
    if (income <= 0) return 0;
    return Math.round((expenses / income) * 100);
  },

  projectFutureBalance: (
    currentBalance: number,
    monthlyIncome: number,
    monthlyExpenses: number,
    months: number
  ): number => {
    const monthlyNet = monthlyIncome - monthlyExpenses;
    return currentBalance + (monthlyNet * months);
  },

  calculateEmergencyFundGoal: (monthlyExpenses: number, months: number = 6): number => {
    return monthlyExpenses * months;
  },

  calculateCompoundInterest: (
    principal: number,
    rate: number,
    time: number,
    compoundingFrequency: number = 12
  ): number => {
    return principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * time);
  },

  calculateGrowthRate: (oldValue: number, newValue: number): number => {
    if (oldValue === 0) return 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  },
};