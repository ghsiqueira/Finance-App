import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Budget, Goal } from '../../types';

export interface OfflineRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  type: 'transaction' | 'budget' | 'goal' | 'category' | 'user' | 'other';
  priority: 'low' | 'medium' | 'high';
}

export interface OfflineData<T = any> {
  id: string;
  data: T;
  type: string;
  timestamp: number;
  synced: boolean;
  lastModified: number;
}

class OfflineStorage {
  private readonly KEYS = {
    OFFLINE_REQUESTS: 'offline_requests',
    OFFLINE_TRANSACTIONS: 'offline_transactions',
    OFFLINE_BUDGETS: 'offline_budgets',
    OFFLINE_GOALS: 'offline_goals',
    OFFLINE_CATEGORIES: 'offline_categories',
    OFFLINE_METADATA: 'offline_metadata',
    SYNC_QUEUE: 'sync_queue',
  } as const;

  private readonly MAX_QUEUE_SIZE = 100;
  private readonly MAX_RETRY_COUNT = 3;

  async addOfflineRequest(request: Omit<OfflineRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const newRequest: OfflineRequest = {
        ...request,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: request.maxRetries || this.MAX_RETRY_COUNT,
      };

      const requests = await this.getOfflineRequests();
      requests.push(newRequest);

      if (requests.length > this.MAX_QUEUE_SIZE) {
        requests.splice(0, requests.length - this.MAX_QUEUE_SIZE);
      }

      await AsyncStorage.setItem(this.KEYS.OFFLINE_REQUESTS, JSON.stringify(requests));
      console.log(`📥 Requisição offline adicionada: ${request.method} ${request.url}`);
    } catch (error) {
      console.error('Erro ao adicionar requisição offline:', error);
    }
  }

  async getOfflineRequests(): Promise<OfflineRequest[]> {
    try {
      const requestsString = await AsyncStorage.getItem(this.KEYS.OFFLINE_REQUESTS);
      return requestsString ? JSON.parse(requestsString) : [];
    } catch (error) {
      console.error('Erro ao recuperar requisições offline:', error);
      return [];
    }
  }

  async removeOfflineRequest(id: string): Promise<void> {
    try {
      const requests = await this.getOfflineRequests();
      const updatedRequests = requests.filter(req => req.id !== id);
      await AsyncStorage.setItem(this.KEYS.OFFLINE_REQUESTS, JSON.stringify(updatedRequests));
    } catch (error) {
      console.error('Erro ao remover requisição offline:', error);
    }
  }

  async updateOfflineRequest(id: string, updates: Partial<OfflineRequest>): Promise<void> {
    try {
      const requests = await this.getOfflineRequests();
      const updatedRequests = requests.map(req => 
        req.id === id ? { ...req, ...updates } : req
      );
      await AsyncStorage.setItem(this.KEYS.OFFLINE_REQUESTS, JSON.stringify(updatedRequests));
    } catch (error) {
      console.error('Erro ao atualizar requisição offline:', error);
    }
  }

  async clearOfflineRequests(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.OFFLINE_REQUESTS);
      console.log('🧹 Requisições offline limpas');
    } catch (error) {
      console.error('Erro ao limpar requisições offline:', error);
    }
  }

  async saveOfflineTransaction(transaction: Transaction): Promise<void> {
    try {
      const transactions = await this.getOfflineTransactions();
      const offlineData: OfflineData<Transaction> = {
        id: transaction._id,
        data: transaction,
        type: 'transaction',
        timestamp: Date.now(),
        synced: false,
        lastModified: Date.now(),
      };

      const existingIndex = transactions.findIndex(t => t.id === transaction._id);
      if (existingIndex >= 0) {
        transactions[existingIndex] = offlineData;
      } else {
        transactions.push(offlineData);
      }

      await AsyncStorage.setItem(this.KEYS.OFFLINE_TRANSACTIONS, JSON.stringify(transactions));
      console.log(`💾 Transação salva offline: ${transaction.description}`);
    } catch (error) {
      console.error('Erro ao salvar transação offline:', error);
    }
  }

  async getOfflineTransactions(): Promise<OfflineData<Transaction>[]> {
    try {
      const transactionsString = await AsyncStorage.getItem(this.KEYS.OFFLINE_TRANSACTIONS);
      return transactionsString ? JSON.parse(transactionsString) : [];
    } catch (error) {
      console.error('Erro ao recuperar transações offline:', error);
      return [];
    }
  }

  async removeOfflineTransaction(id: string): Promise<void> {
    try {
      const transactions = await this.getOfflineTransactions();
      const updatedTransactions = transactions.filter(t => t.id !== id);
      await AsyncStorage.setItem(this.KEYS.OFFLINE_TRANSACTIONS, JSON.stringify(updatedTransactions));
    } catch (error) {
      console.error('Erro ao remover transação offline:', error);
    }
  }

  async markTransactionAsSynced(id: string): Promise<void> {
    try {
      const transactions = await this.getOfflineTransactions();
      const updatedTransactions = transactions.map(t => 
        t.id === id ? { ...t, synced: true, lastModified: Date.now() } : t
      );
      await AsyncStorage.setItem(this.KEYS.OFFLINE_TRANSACTIONS, JSON.stringify(updatedTransactions));
    } catch (error) {
      console.error('Erro ao marcar transação como sincronizada:', error);
    }
  }

  async saveOfflineBudget(budget: Budget): Promise<void> {
    try {
      const budgets = await this.getOfflineBudgets();
      const offlineData: OfflineData<Budget> = {
        id: budget._id,
        data: budget,
        type: 'budget',
        timestamp: Date.now(),
        synced: false,
        lastModified: Date.now(),
      };

      const existingIndex = budgets.findIndex(b => b.id === budget._id);
      if (existingIndex >= 0) {
        budgets[existingIndex] = offlineData;
      } else {
        budgets.push(offlineData);
      }

      await AsyncStorage.setItem(this.KEYS.OFFLINE_BUDGETS, JSON.stringify(budgets));
      console.log(`💾 Orçamento salvo offline: ${budget.name}`);
    } catch (error) {
      console.error('Erro ao salvar orçamento offline:', error);
    }
  }

  async getOfflineBudgets(): Promise<OfflineData<Budget>[]> {
    try {
      const budgetsString = await AsyncStorage.getItem(this.KEYS.OFFLINE_BUDGETS);
      return budgetsString ? JSON.parse(budgetsString) : [];
    } catch (error) {
      console.error('Erro ao recuperar orçamentos offline:', error);
      return [];
    }
  }

  async removeOfflineBudget(id: string): Promise<void> {
    try {
      const budgets = await this.getOfflineBudgets();
      const updatedBudgets = budgets.filter(b => b.id !== id);
      await AsyncStorage.setItem(this.KEYS.OFFLINE_BUDGETS, JSON.stringify(updatedBudgets));
    } catch (error) {
      console.error('Erro ao remover orçamento offline:', error);
    }
  }

  async saveOfflineGoal(goal: Goal): Promise<void> {
    try {
      const goals = await this.getOfflineGoals();
      const offlineData: OfflineData<Goal> = {
        id: goal._id,
        data: goal,
        type: 'goal',
        timestamp: Date.now(),
        synced: false,
        lastModified: Date.now(),
      };

      const existingIndex = goals.findIndex(g => g.id === goal._id);
      if (existingIndex >= 0) {
        goals[existingIndex] = offlineData;
      } else {
        goals.push(offlineData);
      }

      await AsyncStorage.setItem(this.KEYS.OFFLINE_GOALS, JSON.stringify(goals));
      console.log(`💾 Meta salva offline: ${goal.title}`);
    } catch (error) {
      console.error('Erro ao salvar meta offline:', error);
    }
  }

  async getOfflineGoals(): Promise<OfflineData<Goal>[]> {
    try {
      const goalsString = await AsyncStorage.getItem(this.KEYS.OFFLINE_GOALS);
      return goalsString ? JSON.parse(goalsString) : [];
    } catch (error) {
      console.error('Erro ao recuperar metas offline:', error);
      return [];
    }
  }

  async removeOfflineGoal(id: string): Promise<void> {
    try {
      const goals = await this.getOfflineGoals();
      const updatedGoals = goals.filter(g => g.id !== id);
      await AsyncStorage.setItem(this.KEYS.OFFLINE_GOALS, JSON.stringify(updatedGoals));
    } catch (error) {
      console.error('Erro ao remover meta offline:', error);
    }
  }

  async getAllOfflineData(): Promise<{
    requests: OfflineRequest[];
    transactions: OfflineData<Transaction>[];
    budgets: OfflineData<Budget>[];
    goals: OfflineData<Goal>[];
  }> {
    const [requests, transactions, budgets, goals] = await Promise.all([
      this.getOfflineRequests(),
      this.getOfflineTransactions(),
      this.getOfflineBudgets(),
      this.getOfflineGoals(),
    ]);

    return { requests, transactions, budgets, goals };
  }

  async getUnsyncedData(): Promise<{
    transactions: OfflineData<Transaction>[];
    budgets: OfflineData<Budget>[];
    goals: OfflineData<Goal>[];
  }> {
    const [transactions, budgets, goals] = await Promise.all([
      this.getOfflineTransactions(),
      this.getOfflineBudgets(),
      this.getOfflineGoals(),
    ]);

    return {
      transactions: transactions.filter(t => !t.synced),
      budgets: budgets.filter(b => !b.synced),
      goals: goals.filter(g => !g.synced),
    };
  }

  async clearAllOfflineData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.KEYS.OFFLINE_REQUESTS,
        this.KEYS.OFFLINE_TRANSACTIONS,
        this.KEYS.OFFLINE_BUDGETS,
        this.KEYS.OFFLINE_GOALS,
        this.KEYS.OFFLINE_CATEGORIES,
        this.KEYS.SYNC_QUEUE,
      ]);
      console.log('🧹 Todos os dados offline foram limpos');
    } catch (error) {
      console.error('Erro ao limpar dados offline:', error);
    }
  }

  async getOfflineMetadata(): Promise<{
    totalRequests: number;
    totalTransactions: number;
    totalBudgets: number;
    totalGoals: number;
    unsyncedCount: number;
    lastSync: string | null;
    storageSize: number;
  }> {
    try {
      const [requests, transactions, budgets, goals] = await Promise.all([
        this.getOfflineRequests(),
        this.getOfflineTransactions(),
        this.getOfflineBudgets(),
        this.getOfflineGoals(),
      ]);

      const unsyncedCount = [
        ...transactions.filter(t => !t.synced),
        ...budgets.filter(b => !b.synced),
        ...goals.filter(g => !g.synced),
      ].length;

      const estimatedSize = JSON.stringify({
        requests,
        transactions,
        budgets,
        goals,
      }).length;

      const lastSyncString = await AsyncStorage.getItem('last_offline_sync');

      return {
        totalRequests: requests.length,
        totalTransactions: transactions.length,
        totalBudgets: budgets.length,
        totalGoals: goals.length,
        unsyncedCount,
        lastSync: lastSyncString,
        storageSize: estimatedSize,
      };
    } catch (error) {
      console.error('Erro ao obter metadata offline:', error);
      return {
        totalRequests: 0,
        totalTransactions: 0,
        totalBudgets: 0,
        totalGoals: 0,
        unsyncedCount: 0,
        lastSync: null,
        storageSize: 0,
      };
    }
  }

  async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem('last_offline_sync', new Date().toISOString());
    } catch (error) {
      console.error('Erro ao atualizar último sync:', error);
    }
  }

  async addToSyncQueue(item: {
    type: 'transaction' | 'budget' | 'goal';
    id: string;
    action: 'create' | 'update' | 'delete';
    priority: 'low' | 'medium' | 'high';
    data?: any;
  }): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const syncItem = {
        ...item,
        timestamp: Date.now(),
        queueId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      queue.push(syncItem);
      
      queue.sort((a, b) => {
        const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
        
        if (aPriority !== bPriority) {
            return bPriority - aPriority; 
        }
        return a.timestamp - b.timestamp; 
      });
      await AsyncStorage.setItem(this.KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Erro ao adicionar à queue de sync:', error);
    }
  }

  async getSyncQueue(): Promise<any[]> {
    try {
      const queueString = await AsyncStorage.getItem(this.KEYS.SYNC_QUEUE);
      return queueString ? JSON.parse(queueString) : [];
    } catch (error) {
      console.error('Erro ao recuperar queue de sync:', error);
      return [];
    }
  }

  async removeFromSyncQueue(queueId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const updatedQueue = queue.filter(item => item.queueId !== queueId);
      await AsyncStorage.setItem(this.KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));
    } catch (error) {
      console.error('Erro ao remover da queue de sync:', error);
    }
  }

  async clearSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.SYNC_QUEUE);
      console.log('🧹 Queue de sincronização limpa');
    } catch (error) {
      console.error('Erro ao limpar queue de sync:', error);
    }
  }

  async createOfflineBackup(): Promise<any> {
    try {
      const allData = await this.getAllOfflineData();
      const metadata = await this.getOfflineMetadata();
      
      return {
        version: '1.0',
        timestamp: Date.now(),
        metadata,
        data: allData,
      };
    } catch (error) {
      console.error('Erro ao criar backup offline:', error);
      throw error;
    }
  }

  async restoreOfflineBackup(backup: any): Promise<void> {
    try {
      if (!backup.data) {
        throw new Error('Backup offline inválido');
      }

      const { requests, transactions, budgets, goals } = backup.data;

      await AsyncStorage.multiSet([
        [this.KEYS.OFFLINE_REQUESTS, JSON.stringify(requests || [])],
        [this.KEYS.OFFLINE_TRANSACTIONS, JSON.stringify(transactions || [])],
        [this.KEYS.OFFLINE_BUDGETS, JSON.stringify(budgets || [])],
        [this.KEYS.OFFLINE_GOALS, JSON.stringify(goals || [])],
      ]);

      console.log('✅ Backup offline restaurado com sucesso');
    } catch (error) {
      console.error('Erro ao restaurar backup offline:', error);
      throw error;
    }
  }

  async cleanupOldData(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      const requests = await this.getOfflineRequests();
      const activeRequests = requests.filter(req => (now - req.timestamp) < maxAge);
      if (activeRequests.length !== requests.length) {
        await AsyncStorage.setItem(this.KEYS.OFFLINE_REQUESTS, JSON.stringify(activeRequests));
        cleanedCount += requests.length - activeRequests.length;
      }

      const transactions = await this.getOfflineTransactions();
      const activeTransactions = transactions.filter(t => 
        !t.synced || (now - t.lastModified) < maxAge
      );
      if (activeTransactions.length !== transactions.length) {
        await AsyncStorage.setItem(this.KEYS.OFFLINE_TRANSACTIONS, JSON.stringify(activeTransactions));
        cleanedCount += transactions.length - activeTransactions.length;
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Limpeza offline concluída: ${cleanedCount} itens removidos`);
      }
    } catch (error) {
      console.error('Erro na limpeza offline:', error);
    }
  }
}

export const offlineStorage = new OfflineStorage();
export default offlineStorage;