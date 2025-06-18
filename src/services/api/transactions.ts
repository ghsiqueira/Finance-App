import { apiClient } from './client';
import { ApiResponse, PaginatedResponse, Transaction, TransactionForm } from '../../types';

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: 'income' | 'expense';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface TransactionStats {
  summary: {
    income: number;
    expense: number;
    balance: number;
    incomeCount: number;
    expenseCount: number;
    totalTransactions: number;
  };
  categoryStats: Array<{
    categoryId: string;
    category: any;
    total: number;
    count: number;
  }>;
  recentTransactions: Transaction[];
}

export interface BulkTransactionData {
  transactions: Omit<Transaction, '_id' | 'userId' | 'createdAt' | 'updatedAt'>[];
}

export const transactionService = {
  async getTransactions(filters: TransactionFilters = {}): Promise<PaginatedResponse<Transaction>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return apiClient.get(`/transactions?${params.toString()}`);
  },

  async getTransaction(id: string): Promise<ApiResponse<{ transaction: Transaction }>> {
    return apiClient.get(`/transactions/${id}`);
  },

  async createTransaction(data: TransactionForm): Promise<ApiResponse<{ transaction: Transaction }>> {
    const payload = {
      ...data,
      amount: parseFloat(data.amount),
      date: data.date.toISOString(),
    };
    
    return apiClient.post('/transactions', payload);
  },

  async updateTransaction(
    id: string, 
    data: Partial<TransactionForm>
  ): Promise<ApiResponse<{ transaction: Transaction }>> {
    const payload = {
      ...data,
      ...(data.amount && { amount: parseFloat(data.amount) }),
      ...(data.date && { date: data.date.toISOString() }),
    };
    
    return apiClient.put(`/transactions/${id}`, payload);
  },

  async deleteTransaction(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/transactions/${id}`);
  },

  async restoreTransaction(id: string): Promise<ApiResponse<{ transaction: Transaction }>> {
    return apiClient.post(`/transactions/${id}/restore`);
  },

  async getStats(startDate?: string, endDate?: string): Promise<ApiResponse<TransactionStats>> {
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return apiClient.get(`/transactions/stats?${params.toString()}`);
  },

  async createBulkTransactions(data: BulkTransactionData): Promise<ApiResponse<{
    count: number;
    transactions: Transaction[];
  }>> {
    return apiClient.post('/transactions/bulk', data);
  },

  async getTransactionsOfflineFirst(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const cacheKey = `transactions_${JSON.stringify(filters)}`;
    
    return apiClient.offlineFirst(
      cacheKey,
      async () => {
        const response = await this.getTransactions(filters);
        return response.data?.items || [];
      }
    );
  },

  async exportTransactions(format: 'json' | 'csv' = 'json', filters: TransactionFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    params.append('format', format);
    
    return apiClient.get(`/transactions/export?${params.toString()}`, {
      responseType: 'blob'
    });
  },

  async duplicateTransaction(id: string): Promise<ApiResponse<{ transaction: Transaction }>> {
    const { data } = await this.getTransaction(id);
    
    if (!data?.transaction) {
      throw new Error('Transação não encontrada');
    }

    const { _id, createdAt, updatedAt, ...transactionData } = data.transaction;
    
    return this.createTransaction({
      description: `${transactionData.description} (cópia)`,
      amount: transactionData.amount.toString(),
      type: transactionData.type,
      categoryId: transactionData.categoryId,
      date: new Date(),
      notes: transactionData.notes,
      paymentMethod: transactionData.paymentMethod,
    });
  },

  async getTransactionsByCategory(
    categoryId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<ApiResponse<Transaction[]>> {
    const filters: TransactionFilters = { categoryId };
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    const response = await this.getTransactions(filters);
    return {
      success: response.success,
      data: response.data?.items || [],
      message: response.message || '',
    };
  },

  async getRecentTransactions(limit: number = 10): Promise<ApiResponse<Transaction[]>> {
    const response = await this.getTransactions({ limit });
    return {
      success: response.success,
      data: response.data?.items || [],
      message: response.message || '',
    };
  },
};