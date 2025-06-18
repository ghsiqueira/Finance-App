import { ApiResponse, Budget, Goal } from '../../types';

interface MockUser {
  _id: string;
  name: string;
  email: string;
  currency?: string;
  theme?: 'light' | 'dark';
  isEmailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MockCategory {
  _id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  userId: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MockTransaction {
  _id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId?: string;
  category?: any;
  date: string;
  notes?: string;
  paymentMethod: string;
  tags: string[];
  status: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

const mockUser: MockUser = {
  _id: 'mock-user-id',
  name: 'Gabriel Silva',
  email: 'gabriel@email.com',
  currency: 'BRL',
  theme: 'light',
  isEmailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCategories: MockCategory[] = [
  {
    _id: 'cat-1',
    name: 'Alimentação',
    icon: 'restaurant',
    color: '#FF6B6B',
    type: 'expense',
    userId: 'mock-user-id',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'cat-2',
    name: 'Transporte',
    icon: 'car',
    color: '#4ECDC4',
    type: 'expense',
    userId: 'mock-user-id',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'cat-3',
    name: 'Salário',
    icon: 'cash',
    color: '#45B7D1',
    type: 'income',
    userId: 'mock-user-id',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let mockTransactions: MockTransaction[] = [];
let mockBudgets: any[] = [];
let mockGoals: any[] = [];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiService = {
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<any>> {
    await delay(1000);
    
    if (credentials.email === 'test@test.com' && credentials.password === 'test123') {
      return {
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: mockUser,
          token: 'mock-jwt-token',
        },
      };
    }
    
    return {
      success: false,
      message: 'Email ou senha incorretos',
      data: null,
    };
  },

  async register(userData: any): Promise<ApiResponse<any>> {
    await delay(1500);
    
    const newUser: MockUser = {
      _id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      currency: 'BRL',
      theme: 'light',
      isEmailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return {
      success: true,
      message: 'Conta criada com sucesso! Verifique seu email.',
      data: { user: newUser },
    };
  },

  async getProfile(): Promise<ApiResponse<any>> {
    await delay(500);
    
    return {
      success: true,
      message: 'Perfil obtido com sucesso',
      data: { user: mockUser },
    };
  },

  async getTransactions(params: any = {}): Promise<ApiResponse<any>> {
    await delay(800);
    
    return {
      success: true,
      message: 'Transações obtidas com sucesso',
      data: {
        items: mockTransactions,
        pagination: {
          page: 1,
          limit: 20,
          totalItems: mockTransactions.length,
          totalPages: 1,
        },
      },
    };
  },

  async createTransaction(data: any): Promise<ApiResponse<any>> {
    await delay(1000);
    
    const newTransaction: MockTransaction = {
      _id: `transaction-${Date.now()}`,
      description: data.description,
      amount: parseFloat(data.amount),
      type: data.type,
      categoryId: data.categoryId,
      date: data.date instanceof Date ? data.date.toISOString() : data.date,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      userId: mockUser._id,
      tags: [],
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockTransactions.unshift(newTransaction);
    
    return {
      success: true,
      message: 'Transação criada com sucesso',
      data: { transaction: newTransaction },
    };
  },

  async getCategories(params: any = {}): Promise<ApiResponse<any>> {
    await delay(500);
    
    let filteredCategories = mockCategories;
    
    if (params.type && params.type !== 'both') {
      filteredCategories = mockCategories.filter(cat => 
        cat.type === params.type || cat.type === 'both'
      );
    }
    
    return {
      success: true,
      message: 'Categorias obtidas com sucesso',
      data: { categories: filteredCategories },
    };
  },

  async getDashboard(period: string = 'month'): Promise<ApiResponse<any>> {
    await delay(1000);
    
    const totalIncome = mockTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpense = mockTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      success: true,
      message: 'Dashboard obtido com sucesso',
      data: {
        balance: totalIncome - totalExpense,
        income: totalIncome,
        expense: totalExpense,
        transactions: mockTransactions.slice(0, 5),
        budgets: mockBudgets.slice(0, 3),
        goals: mockGoals.slice(0, 3),
        categories: mockCategories,
      },
    };
  },

  async getBudgets(): Promise<ApiResponse<{ budgets: Budget[] }>> {
    await delay(600);
    
    return {
      success: true,
      message: 'Orçamentos obtidos com sucesso',
      data: { budgets: mockBudgets },
    };
  },

  async getBudgetSummary(): Promise<ApiResponse<any>> {
    await delay(500);
    
    return {
      success: true,
      message: 'Resumo de orçamentos obtido com sucesso',
      data: {
        summary: {
          totalBudget: 5000,
          totalSpent: 3200,
          overallPercentage: 64,
          activeBudgetsCount: mockBudgets.length,
          budgetsExceeded: 0,
          budgetsNearLimit: 1,
        },
      },
    };
  },

  async getGoals(): Promise<ApiResponse<{ goals: Goal[] }>> {
    await delay(600);
    
    return {
      success: true,
      message: 'Metas obtidas com sucesso',
      data: { goals: mockGoals },
    };
  },

  async getGoalSummary(): Promise<ApiResponse<any>> {
    await delay(500);
    
    return {
      success: true,
      message: 'Resumo de metas obtido com sucesso',
      data: {
        summary: {
          total: mockGoals.length,
          active: mockGoals.filter(g => !g.isCompleted).length,
          completed: mockGoals.filter(g => g.isCompleted).length,
          totalTargetAmount: mockGoals.reduce((sum, g) => sum + g.targetAmount, 0),
          totalCurrentAmount: mockGoals.reduce((sum, g) => sum + g.currentAmount, 0),
          totalProgress: 65,
        },
      },
    };
  },

  async getStats(): Promise<ApiResponse<any>> {
    await delay(400);
    
    return {
      success: true,
      message: 'Estatísticas obtidas com sucesso',
      data: {
        totals: {
          transactions: mockTransactions.length,
          budgets: mockBudgets.length,
          goals: mockGoals.length,
        },
        accountAge: 30,
      },
    };
  },
};

export const shouldUseMock = () => {
  return __DEV__ && false;
};