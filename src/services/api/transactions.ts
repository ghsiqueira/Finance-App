// src/services/api/transactions.ts - Service de Transações Corrigido
import { apiClient } from './config';

// 🔥 Interfaces
export interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId?: string;
  category?: {
    _id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
  };
  userId: string;
  date: string;
  notes?: string;
  tags: string[];
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix' | 'other';
  status: 'completed' | 'pending' | 'cancelled';
  isRecurring?: boolean;
  recurringConfig?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
    remainingOccurrences?: number;
  };
  parentTransactionId?: string;
  isGeneratedFromRecurring?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsResponse {
  items: Transaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CreateTransactionData {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId?: string;
  date?: string;
  notes?: string;
  tags?: string[];
  paymentMethod?: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix' | 'other';
  isRecurring?: boolean;
  recurringConfig?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
    remainingOccurrences?: number;
  };
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {}

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

class TransactionService {
  // 🔥 Buscar transações com filtros
  async getTransactions(filters: TransactionFilters = {}): Promise<TransactionsResponse> {
    const params = new URLSearchParams();
    
    // Adicionar parâmetros de filtro
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.type) params.append('type', filters.type);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.isRecurring !== undefined) params.append('isRecurring', filters.isRecurring.toString());
    if (filters.includeGenerated !== undefined) params.append('includeGenerated', filters.includeGenerated.toString());

    const queryString = params.toString();
    const url = `/transactions${queryString ? `?${queryString}` : ''}`;

    console.log('📡 Fazendo requisição para transações...');
    console.log('🔧 URL completa:', url);
    console.log('📊 Filtros aplicados:', filters);

    try {
      const data = await apiClient.get<TransactionsResponse>(url);
      
      console.log('📊 Dados atualizados:', {
        transactions: data.items?.length || 0,
        pagination: data.pagination,
        isLoading: false,
        error: undefined
      });

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar transações:', error.message);
      throw error;
    }
  }

  // 🔥 Buscar transação por ID
  async getTransaction(id: string): Promise<{ transaction: Transaction; childTransactions?: Transaction[] }> {
    return apiClient.get(`/transactions/${id}`);
  }

  // 🔥 Criar nova transação
  async createTransaction(data: CreateTransactionData): Promise<{ transaction: Transaction }> {
    // Validar dados obrigatórios
    if (!data.description?.trim()) {
      throw new Error('Descrição é obrigatória');
    }
    if (!data.amount || data.amount <= 0) {
      throw new Error('Valor deve ser maior que zero');
    }
    if (!data.type || !['income', 'expense'].includes(data.type)) {
      throw new Error('Tipo deve ser receita ou gasto');
    }

    const payload = {
      ...data,
      date: data.date || new Date().toISOString(),
      paymentMethod: data.paymentMethod || 'cash',
      tags: data.tags || [],
    };

    console.log('💳 Criando transação:', payload);

    return apiClient.post('/transactions', payload);
  }

  // 🔥 Atualizar transação
  async updateTransaction(id: string, data: UpdateTransactionData): Promise<{ transaction: Transaction }> {
    if (!id) {
      throw new Error('ID da transação é obrigatório');
    }

    console.log('✏️ Atualizando transação:', { id, data });

    return apiClient.put(`/transactions/${id}`, data);
  }

  // 🔥 Deletar transação
  async deleteTransaction(id: string, deleteChildren = false): Promise<{ deletedCount: number }> {
    if (!id) {
      throw new Error('ID da transação é obrigatório');
    }

    const params = deleteChildren ? '?deleteChildren=true' : '';
    
    console.log('🗑️ Deletando transação:', { id, deleteChildren });

    return apiClient.delete(`/transactions/${id}${params}`);
  }

  // 🔥 Obter estatísticas
  async getStats(filters: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
  } = {}): Promise<TransactionStats> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.groupBy) params.append('groupBy', filters.groupBy);

    const queryString = params.toString();
    const url = `/transactions/stats${queryString ? `?${queryString}` : ''}`;

    return apiClient.get(url);
  }

  // 🔥 Criar múltiplas transações (importação)
  async createBulkTransactions(transactions: CreateTransactionData[]): Promise<{
    count: number;
    transactions: Transaction[];
  }> {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('Lista de transações é obrigatória');
    }

    if (transactions.length > 100) {
      throw new Error('Máximo 100 transações por vez');
    }

    return apiClient.post('/transactions/bulk', { transactions });
  }

  // 🔥 Processar transações recorrentes
  async processRecurringTransactions(): Promise<{
    count: number;
    transactions: Transaction[];
  }> {
    return apiClient.post('/transactions/process-recurring');
  }

  // 🔥 Obter estatísticas de recorrência
  async getRecurringStats(): Promise<{
    totalRecurring: number;
    byFrequency: Array<{
      _id: string;
      count: number;
      totalAmount: number;
    }>;
  }> {
    return apiClient.get('/transactions/recurring/stats');
  }

  // 🔥 Duplicar transação
  async duplicateTransaction(id: string, data?: Partial<CreateTransactionData>): Promise<{ transaction: Transaction }> {
    const original = await this.getTransaction(id);
    
    const duplicateData: CreateTransactionData = {
      description: data?.description || `${original.transaction.description} (cópia)`,
      amount: data?.amount || original.transaction.amount,
      type: data?.type || original.transaction.type,
      categoryId: data?.categoryId || original.transaction.categoryId,
      notes: data?.notes || original.transaction.notes,
      tags: data?.tags || original.transaction.tags,
      paymentMethod: data?.paymentMethod || original.transaction.paymentMethod,
      date: data?.date || new Date().toISOString(),
    };

    return this.createTransaction(duplicateData);
  }
}

export const transactionService = new TransactionService();