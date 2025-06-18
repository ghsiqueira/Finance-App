// src/services/storage/transactions.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../../types';

export interface TransactionCache {
  transactions: Transaction[];
  lastUpdate: number;
  totalCount: number;
  filters?: any;
}

export interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  averageTransaction: number;
  lastCalculated: number;
}

export interface QuickTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId?: string;
  paymentMethod: string;
  createdAt: string;
  useCount: number;
}

class TransactionStorage {
  private readonly KEYS = {
    TRANSACTION_CACHE: 'transaction_cache',
    TRANSACTION_STATS: 'transaction_stats',
    QUICK_TRANSACTIONS: 'quick_transactions',
    RECENT_DESCRIPTIONS: 'recent_descriptions',
    FAVORITE_TRANSACTIONS: 'favorite_transactions',
    TRANSACTION_DRAFTS: 'transaction_drafts',
    MONTHLY_CACHE: 'monthly_transaction_cache',
  } as const;

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_QUICK_TRANSACTIONS = 10;
  private readonly MAX_RECENT_DESCRIPTIONS = 20;

  // Cache de transações
  async cacheTransactions(
    transactions: Transaction[], 
    filters?: any,
    totalCount?: number
  ): Promise<void> {
    try {
      const cache: TransactionCache = {
        transactions,
        lastUpdate: Date.now(),
        totalCount: totalCount || transactions.length,
        filters,
      };

      await AsyncStorage.setItem(this.KEYS.TRANSACTION_CACHE, JSON.stringify(cache));
      
      // Atualizar estatísticas
      await this.updateTransactionStats(transactions);
      
      console.log(`💾 ${transactions.length} transações cacheadas`);
    } catch (error) {
      console.error('Erro ao cachear transações:', error);
    }
  }

  async getCachedTransactions(filters?: any): Promise<Transaction[] | null> {
    try {
      const cacheString = await AsyncStorage.getItem(this.KEYS.TRANSACTION_CACHE);
      if (!cacheString) return null;

      const cache: TransactionCache = JSON.parse(cacheString);
      
      // Verificar se cache expirou
      if (Date.now() - cache.lastUpdate > this.CACHE_DURATION) {
        return null;
      }

      // Verificar se filtros batem
      if (filters && JSON.stringify(filters) !== JSON.stringify(cache.filters)) {
        return null;
      }

      return cache.transactions;
    } catch (error) {
      console.error('Erro ao recuperar transações do cache:', error);
      return null;
    }
  }

  async clearTransactionCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.TRANSACTION_CACHE);
      console.log('🧹 Cache de transações limpo');
    } catch (error) {
      console.error('Erro ao limpar cache de transações:', error);
    }
  }

  // Estatísticas de transações
  async updateTransactionStats(transactions: Transaction[]): Promise<void> {
    try {
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const balance = totalIncome - totalExpense;
      const transactionCount = transactions.length;
      const averageTransaction = transactionCount > 0 
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactionCount 
        : 0;

      const stats: TransactionStats = {
        totalIncome,
        totalExpense,
        balance,
        transactionCount,
        averageTransaction,
        lastCalculated: Date.now(),
      };

      await AsyncStorage.setItem(this.KEYS.TRANSACTION_STATS, JSON.stringify(stats));
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
    }
  }

  async getTransactionStats(): Promise<TransactionStats | null> {
    try {
      const statsString = await AsyncStorage.getItem(this.KEYS.TRANSACTION_STATS);
      return statsString ? JSON.parse(statsString) : null;
    } catch (error) {
      console.error('Erro ao recuperar estatísticas:', error);
      return null;
    }
  }

  // Transações rápidas (templates)
  async saveQuickTransaction(transaction: Omit<QuickTransaction, 'id' | 'createdAt' | 'useCount'>): Promise<void> {
    try {
      const quickTransactions = await this.getQuickTransactions();
      
      // Verificar se já existe
      const existing = quickTransactions.find(qt => 
        qt.description === transaction.description &&
        qt.amount === transaction.amount &&
        qt.type === transaction.type
      );

      if (existing) {
        // Incrementar contador de uso
        existing.useCount++;
      } else {
        // Adicionar nova transação rápida
        const newQuickTransaction: QuickTransaction = {
          ...transaction,
          id: `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          useCount: 1,
        };
        quickTransactions.push(newQuickTransaction);
      }

      // Ordenar por uso e manter apenas as mais usadas
      quickTransactions.sort((a, b) => b.useCount - a.useCount);
      const limitedQuickTransactions = quickTransactions.slice(0, this.MAX_QUICK_TRANSACTIONS);

      await AsyncStorage.setItem(this.KEYS.QUICK_TRANSACTIONS, JSON.stringify(limitedQuickTransactions));
    } catch (error) {
      console.error('Erro ao salvar transação rápida:', error);
    }
  }

  async getQuickTransactions(): Promise<QuickTransaction[]> {
    try {
      const quickTransactionsString = await AsyncStorage.getItem(this.KEYS.QUICK_TRANSACTIONS);
      return quickTransactionsString ? JSON.parse(quickTransactionsString) : [];
    } catch (error) {
      console.error('Erro ao recuperar transações rápidas:', error);
      return [];
    }
  }

  async removeQuickTransaction(id: string): Promise<void> {
    try {
      const quickTransactions = await this.getQuickTransactions();
      const updatedQuickTransactions = quickTransactions.filter(qt => qt.id !== id);
      await AsyncStorage.setItem(this.KEYS.QUICK_TRANSACTIONS, JSON.stringify(updatedQuickTransactions));
    } catch (error) {
      console.error('Erro ao remover transação rápida:', error);
    }
  }

  // Descrições recentes
  async addRecentDescription(description: string): Promise<void> {
    try {
      const recentDescriptions = await this.getRecentDescriptions();
      
      // Remover se já existe
      const filteredDescriptions = recentDescriptions.filter(desc => desc !== description);
      
      // Adicionar no início
      filteredDescriptions.unshift(description);
      
      // Limitar quantidade
      const limitedDescriptions = filteredDescriptions.slice(0, this.MAX_RECENT_DESCRIPTIONS);
      
      await AsyncStorage.setItem(this.KEYS.RECENT_DESCRIPTIONS, JSON.stringify(limitedDescriptions));
    } catch (error) {
      console.error('Erro ao adicionar descrição recente:', error);
    }
  }

  async getRecentDescriptions(): Promise<string[]> {
    try {
      const descriptionsString = await AsyncStorage.getItem(this.KEYS.RECENT_DESCRIPTIONS);
      return descriptionsString ? JSON.parse(descriptionsString) : [];
    } catch (error) {
      console.error('Erro ao recuperar descrições recentes:', error);
      return [];
    }
  }

  async clearRecentDescriptions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.RECENT_DESCRIPTIONS);
    } catch (error) {
      console.error('Erro ao limpar descrições recentes:', error);
    }
  }

  // Transações favoritas
  async addFavoriteTransaction(transactionId: string): Promise<void> {
    try {
      const favorites = await this.getFavoriteTransactions();
      if (!favorites.includes(transactionId)) {
        favorites.push(transactionId);
        await AsyncStorage.setItem(this.KEYS.FAVORITE_TRANSACTIONS, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('Erro ao adicionar transação favorita:', error);
    }
  }

  async removeFavoriteTransaction(transactionId: string): Promise<void> {
    try {
      const favorites = await this.getFavoriteTransactions();
      const updatedFavorites = favorites.filter(id => id !== transactionId);
      await AsyncStorage.setItem(this.KEYS.FAVORITE_TRANSACTIONS, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Erro ao remover transação favorita:', error);
    }
  }

  async getFavoriteTransactions(): Promise<string[]> {
    try {
      const favoritesString = await AsyncStorage.getItem(this.KEYS.FAVORITE_TRANSACTIONS);
      return favoritesString ? JSON.parse(favoritesString) : [];
    } catch (error) {
      console.error('Erro ao recuperar transações favoritas:', error);
      return [];
    }
  }

  async isFavoriteTransaction(transactionId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavoriteTransactions();
      return favorites.includes(transactionId);
    } catch (error) {
      return false;
    }
  }

  // Rascunhos de transação
  async saveDraft(draft: Partial<Transaction> & { draftId?: string }): Promise<string> {
    try {
      const drafts = await this.getDrafts();
      const draftId = draft.draftId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const draftData = {
        ...draft,
        draftId,
        savedAt: Date.now(),
      };

      // Atualizar ou adicionar
      const existingIndex = drafts.findIndex(d => d.draftId === draftId);
      if (existingIndex >= 0) {
        drafts[existingIndex] = draftData;
      } else {
        drafts.push(draftData);
      }

      await AsyncStorage.setItem(this.KEYS.TRANSACTION_DRAFTS, JSON.stringify(drafts));
      return draftId;
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      throw error;
    }
  }

  async getDrafts(): Promise<any[]> {
    try {
      const draftsString = await AsyncStorage.getItem(this.KEYS.TRANSACTION_DRAFTS);
      return draftsString ? JSON.parse(draftsString) : [];
    } catch (error) {
      console.error('Erro ao recuperar rascunhos:', error);
      return [];
    }
  }

  async getDraft(draftId: string): Promise<any | null> {
    try {
      const drafts = await this.getDrafts();
      return drafts.find(d => d.draftId === draftId) || null;
    } catch (error) {
      console.error('Erro ao recuperar rascunho:', error);
      return null;
    }
  }

  async removeDraft(draftId: string): Promise<void> {
    try {
      const drafts = await this.getDrafts();
      const updatedDrafts = drafts.filter(d => d.draftId !== draftId);
      await AsyncStorage.setItem(this.KEYS.TRANSACTION_DRAFTS, JSON.stringify(updatedDrafts));
    } catch (error) {
      console.error('Erro ao remover rascunho:', error);
    }
  }

  async clearOldDrafts(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const drafts = await this.getDrafts();
      const now = Date.now();
      const activeDrafts = drafts.filter(d => (now - d.savedAt) < maxAge);
      
      if (activeDrafts.length !== drafts.length) {
        await AsyncStorage.setItem(this.KEYS.TRANSACTION_DRAFTS, JSON.stringify(activeDrafts));
        console.log(`🧹 ${drafts.length - activeDrafts.length} rascunhos antigos removidos`);
      }
    } catch (error) {
      console.error('Erro ao limpar rascunhos antigos:', error);
    }
  }

  // Cache mensal
  async cacheMonthlyTransactions(year: number, month: number, transactions: Transaction[]): Promise<void> {
    try {
      const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
      const monthlyCache = await this.getMonthlyCache();
      
      monthlyCache[cacheKey] = {
        transactions,
        cachedAt: Date.now(),
      };

      await AsyncStorage.setItem(this.KEYS.MONTHLY_CACHE, JSON.stringify(monthlyCache));
    } catch (error) {
      console.error('Erro ao cachear transações mensais:', error);
    }
  }

  async getMonthlyTransactions(year: number, month: number): Promise<Transaction[] | null> {
    try {
      const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
      const monthlyCache = await this.getMonthlyCache();
      
      const cached = monthlyCache[cacheKey];
      if (!cached) return null;

      // Verificar se cache não expirou (1 hora para dados mensais)
      if (Date.now() - cached.cachedAt > 60 * 60 * 1000) {
        return null;
      }

      return cached.transactions;
    } catch (error) {
      console.error('Erro ao recuperar transações mensais:', error);
      return null;
    }
  }

  private async getMonthlyCache(): Promise<Record<string, any>> {
    try {
      const cacheString = await AsyncStorage.getItem(this.KEYS.MONTHLY_CACHE);
      return cacheString ? JSON.parse(cacheString) : {};
    } catch (error) {
      return {};
    }
  }

  async clearMonthlyCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.MONTHLY_CACHE);
    } catch (error) {
      console.error('Erro ao limpar cache mensal:', error);
    }
  }

  // Métodos utilitários
  async getStorageInfo(): Promise<{
    cacheSize: number;
    quickTransactionsCount: number;
    recentDescriptionsCount: number;
    favoritesCount: number;
    draftsCount: number;
    monthlyCacheSize: number;
  }> {
    try {
      const [
        cache,
        quickTransactions,
        recentDescriptions,
        favorites,
        drafts,
        monthlyCache,
      ] = await Promise.all([
        this.getCachedTransactions(),
        this.getQuickTransactions(),
        this.getRecentDescriptions(),
        this.getFavoriteTransactions(),
        this.getDrafts(),
        this.getMonthlyCache(),
      ]);

      return {
        cacheSize: cache?.length || 0,
        quickTransactionsCount: quickTransactions.length,
        recentDescriptionsCount: recentDescriptions.length,
        favoritesCount: favorites.length,
        draftsCount: drafts.length,
        monthlyCacheSize: Object.keys(monthlyCache).length,
      };
    } catch (error) {
      console.error('Erro ao obter informações do storage:', error);
      return {
        cacheSize: 0,
        quickTransactionsCount: 0,
        recentDescriptionsCount: 0,
        favoritesCount: 0,
        draftsCount: 0,
        monthlyCacheSize: 0,
      };
    }
  }

  async clearAllTransactionData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.KEYS.TRANSACTION_CACHE,
        this.KEYS.TRANSACTION_STATS,
        this.KEYS.QUICK_TRANSACTIONS,
        this.KEYS.RECENT_DESCRIPTIONS,
        this.KEYS.FAVORITE_TRANSACTIONS,
        this.KEYS.TRANSACTION_DRAFTS,
        this.KEYS.MONTHLY_CACHE,
      ]);
      console.log('🧹 Todos os dados de transação foram limpos');
    } catch (error) {
      console.error('Erro ao limpar dados de transação:', error);
    }
  }

  // Backup e restore
  async createTransactionBackup(): Promise<any> {
    try {
      const [
        cache,
        stats,
        quickTransactions,
        recentDescriptions,
        favorites,
        drafts,
        monthlyCache,
      ] = await Promise.all([
        AsyncStorage.getItem(this.KEYS.TRANSACTION_CACHE),
        AsyncStorage.getItem(this.KEYS.TRANSACTION_STATS),
        AsyncStorage.getItem(this.KEYS.QUICK_TRANSACTIONS),
        AsyncStorage.getItem(this.KEYS.RECENT_DESCRIPTIONS),
        AsyncStorage.getItem(this.KEYS.FAVORITE_TRANSACTIONS),
        AsyncStorage.getItem(this.KEYS.TRANSACTION_DRAFTS),
        AsyncStorage.getItem(this.KEYS.MONTHLY_CACHE),
      ]);

      return {
        version: '1.0',
        timestamp: Date.now(),
        data: {
          cache: cache ? JSON.parse(cache) : null,
          stats: stats ? JSON.parse(stats) : null,
          quickTransactions: quickTransactions ? JSON.parse(quickTransactions) : [],
          recentDescriptions: recentDescriptions ? JSON.parse(recentDescriptions) : [],
          favorites: favorites ? JSON.parse(favorites) : [],
          drafts: drafts ? JSON.parse(drafts) : [],
          monthlyCache: monthlyCache ? JSON.parse(monthlyCache) : {},
        },
      };
    } catch (error) {
      console.error('Erro ao criar backup de transações:', error);
      throw error;
    }
  }

  async restoreTransactionBackup(backup: any): Promise<void> {
    try {
      if (!backup.data) {
        throw new Error('Backup de transações inválido');
      }

      const { data } = backup;
      const pairs: [string, string][] = [];

      if (data.cache) pairs.push([this.KEYS.TRANSACTION_CACHE, JSON.stringify(data.cache)]);
      if (data.stats) pairs.push([this.KEYS.TRANSACTION_STATS, JSON.stringify(data.stats)]);
      if (data.quickTransactions) pairs.push([this.KEYS.QUICK_TRANSACTIONS, JSON.stringify(data.quickTransactions)]);
      if (data.recentDescriptions) pairs.push([this.KEYS.RECENT_DESCRIPTIONS, JSON.stringify(data.recentDescriptions)]);
      if (data.favorites) pairs.push([this.KEYS.FAVORITE_TRANSACTIONS, JSON.stringify(data.favorites)]);
      if (data.drafts) pairs.push([this.KEYS.TRANSACTION_DRAFTS, JSON.stringify(data.drafts)]);
      if (data.monthlyCache) pairs.push([this.KEYS.MONTHLY_CACHE, JSON.stringify(data.monthlyCache)]);

      if (pairs.length > 0) {
        await AsyncStorage.multiSet(pairs);
        console.log('✅ Backup de transações restaurado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao restaurar backup de transações:', error);
      throw error;
    }
  }

  // Sugestões inteligentes
  async getTransactionSuggestions(
    description: string,
    type?: 'income' | 'expense'
  ): Promise<{
    quickTransactions: QuickTransaction[];
    recentDescriptions: string[];
    similarTransactions: QuickTransaction[];
  }> {
    try {
      const [quickTransactions, recentDescriptions] = await Promise.all([
        this.getQuickTransactions(),
        this.getRecentDescriptions(),
      ]);

      // Filtrar por tipo se especificado
      let filteredQuickTransactions = quickTransactions;
      if (type) {
        filteredQuickTransactions = quickTransactions.filter(qt => qt.type === type);
      }

      // Encontrar transações similares baseadas na descrição
      const similarTransactions = filteredQuickTransactions.filter(qt => 
        qt.description.toLowerCase().includes(description.toLowerCase()) ||
        description.toLowerCase().includes(qt.description.toLowerCase())
      );

      // Filtrar descrições similares
      const similarDescriptions = recentDescriptions.filter(desc =>
        desc.toLowerCase().includes(description.toLowerCase()) ||
        description.toLowerCase().includes(desc.toLowerCase())
      );

      return {
        quickTransactions: filteredQuickTransactions.slice(0, 5),
        recentDescriptions: similarDescriptions.slice(0, 5),
        similarTransactions: similarTransactions.slice(0, 3),
      };
    } catch (error) {
      console.error('Erro ao obter sugestões:', error);
      return {
        quickTransactions: [],
        recentDescriptions: [],
        similarTransactions: [],
      };
    }
  }

  // Analytics e insights
  async getTransactionInsights(): Promise<{
    mostUsedDescriptions: Array<{ description: string; count: number }>;
    favoritePaymentMethods: Array<{ method: string; count: number }>;
    averageAmountByType: { income: number; expense: number };
    topCategories: Array<{ categoryId: string; amount: number; count: number }>;
  }> {
    try {
      const quickTransactions = await this.getQuickTransactions();
      const stats = await this.getTransactionStats();

      // Descrições mais usadas
      const descriptionCounts = new Map<string, number>();
      quickTransactions.forEach(qt => {
        descriptionCounts.set(qt.description, qt.useCount);
      });
      const mostUsedDescriptions = Array.from(descriptionCounts.entries())
        .map(([description, count]) => ({ description, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Métodos de pagamento favoritos
      const paymentMethodCounts = new Map<string, number>();
      quickTransactions.forEach(qt => {
        const current = paymentMethodCounts.get(qt.paymentMethod) || 0;
        paymentMethodCounts.set(qt.paymentMethod, current + qt.useCount);
      });
      const favoritePaymentMethods = Array.from(paymentMethodCounts.entries())
        .map(([method, count]) => ({ method, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Valores médios por tipo
      const incomeTransactions = quickTransactions.filter(qt => qt.type === 'income');
      const expenseTransactions = quickTransactions.filter(qt => qt.type === 'expense');
      
      const averageAmountByType = {
        income: incomeTransactions.length > 0 
          ? incomeTransactions.reduce((sum, qt) => sum + qt.amount, 0) / incomeTransactions.length 
          : 0,
        expense: expenseTransactions.length > 0 
          ? expenseTransactions.reduce((sum, qt) => sum + qt.amount, 0) / expenseTransactions.length 
          : 0,
      };

      // Top categorias
      const categoryCounts = new Map<string, { amount: number; count: number }>();
      quickTransactions.forEach(qt => {
        if (qt.categoryId) {
          const current = categoryCounts.get(qt.categoryId) || { amount: 0, count: 0 };
          categoryCounts.set(qt.categoryId, {
            amount: current.amount + (qt.amount * qt.useCount),
            count: current.count + qt.useCount,
          });
        }
      });
      const topCategories = Array.from(categoryCounts.entries())
        .map(([categoryId, { amount, count }]) => ({ categoryId, amount, count }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        mostUsedDescriptions,
        favoritePaymentMethods,
        averageAmountByType,
        topCategories,
      };
    } catch (error) {
      console.error('Erro ao obter insights:', error);
      return {
        mostUsedDescriptions: [],
        favoritePaymentMethods: [],
        averageAmountByType: { income: 0, expense: 0 },
        topCategories: [],
      };
    }
  }
}

// Instância singleton
export const transactionStorage = new TransactionStorage();
export default transactionStorage;