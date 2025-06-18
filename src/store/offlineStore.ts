// src/store/offlineStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Transaction, Budget, Goal } from '../types';

interface PendingRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  timestamp: number;
  type: 'transaction' | 'budget' | 'goal' | 'other';
}

interface OfflineStore {
  isOnline: boolean;
  pendingRequests: PendingRequest[];
  offlineTransactions: Transaction[];
  offlineBudgets: Budget[];
  offlineGoals: Goal[];
  
  // Network status
  setOnlineStatus: (status: boolean) => void;
  
  // Pending requests
  addPendingRequest: (request: Omit<PendingRequest, 'id' | 'timestamp'>) => Promise<void>;
  getPendingRequests: () => Promise<PendingRequest[]>;
  clearPendingRequests: () => Promise<void>;
  removePendingRequest: (id: string) => Promise<void>;
  
  // Offline data
  saveOfflineTransaction: (transaction: Transaction) => Promise<void>;
  getOfflineTransactions: () => Promise<Transaction[]>;
  removeOfflineTransaction: (id: string) => Promise<void>;
  clearOfflineTransactions: () => Promise<void>;
  
  saveOfflineBudget: (budget: Budget) => Promise<void>;
  getOfflineBudgets: () => Promise<Budget[]>;
  removeOfflineBudget: (id: string) => Promise<void>;
  
  saveOfflineGoal: (goal: Goal) => Promise<void>;
  getOfflineGoals: () => Promise<Goal[]>;
  removeOfflineGoal: (id: string) => Promise<void>;
  
  // Initialization
  initializeOfflineData: () => Promise<void>;
  
  // Sync
  syncAllData: () => Promise<void>;
}

export const useOfflineStore = create<OfflineStore>((set, get) => ({
  isOnline: true,
  pendingRequests: [],
  offlineTransactions: [],
  offlineBudgets: [],
  offlineGoals: [],

  setOnlineStatus: (status) => {
    set({ isOnline: status });
    
    // Se voltou online, tentar sincronizar
    if (status) {
      get().syncAllData();
    }
  },

  addPendingRequest: async (request) => {
    const newRequest: PendingRequest = {
      ...request,
      id: `pending_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
    };

    try {
      const currentRequests = get().pendingRequests;
      const updatedRequests = [...currentRequests, newRequest];
      
      await AsyncStorage.setItem('pendingRequests', JSON.stringify(updatedRequests));
      set({ pendingRequests: updatedRequests });
    } catch (error) {
      console.error('Erro ao salvar request pendente:', error);
    }
  },

  getPendingRequests: async () => {
    try {
      const stored = await AsyncStorage.getItem('pendingRequests');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erro ao buscar requests pendentes:', error);
      return [];
    }
  },

  clearPendingRequests: async () => {
    try {
      await AsyncStorage.removeItem('pendingRequests');
      set({ pendingRequests: [] });
    } catch (error) {
      console.error('Erro ao limpar requests pendentes:', error);
    }
  },

  removePendingRequest: async (id) => {
    try {
      const currentRequests = get().pendingRequests;
      const updatedRequests = currentRequests.filter(req => req.id !== id);
      
      await AsyncStorage.setItem('pendingRequests', JSON.stringify(updatedRequests));
      set({ pendingRequests: updatedRequests });
    } catch (error) {
      console.error('Erro ao remover request pendente:', error);
    }
  },

  saveOfflineTransaction: async (transaction) => {
    try {
      const currentTransactions = get().offlineTransactions;
      const updatedTransactions = [...currentTransactions, transaction];
      
      await AsyncStorage.setItem('offlineTransactions', JSON.stringify(updatedTransactions));
      set({ offlineTransactions: updatedTransactions });
    } catch (error) {
      console.error('Erro ao salvar transação offline:', error);
    }
  },

  getOfflineTransactions: async () => {
    try {
      const stored = await AsyncStorage.getItem('offlineTransactions');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erro ao buscar transações offline:', error);
      return [];
    }
  },

  removeOfflineTransaction: async (id) => {
    try {
      const currentTransactions = get().offlineTransactions;
      const updatedTransactions = currentTransactions.filter(t => t._id !== id);
      
      await AsyncStorage.setItem('offlineTransactions', JSON.stringify(updatedTransactions));
      set({ offlineTransactions: updatedTransactions });
    } catch (error) {
      console.error('Erro ao remover transação offline:', error);
    }
  },

  clearOfflineTransactions: async () => {
    try {
      await AsyncStorage.removeItem('offlineTransactions');
      set({ offlineTransactions: [] });
    } catch (error) {
      console.error('Erro ao limpar transações offline:', error);
    }
  },

  saveOfflineBudget: async (budget) => {
    try {
      const currentBudgets = get().offlineBudgets;
      const updatedBudgets = [...currentBudgets, budget];
      
      await AsyncStorage.setItem('offlineBudgets', JSON.stringify(updatedBudgets));
      set({ offlineBudgets: updatedBudgets });
    } catch (error) {
      console.error('Erro ao salvar orçamento offline:', error);
    }
  },

  getOfflineBudgets: async () => {
    try {
      const stored = await AsyncStorage.getItem('offlineBudgets');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erro ao buscar orçamentos offline:', error);
      return [];
    }
  },

  removeOfflineBudget: async (id) => {
    try {
      const currentBudgets = get().offlineBudgets;
      const updatedBudgets = currentBudgets.filter(b => b._id !== id);
      
      await AsyncStorage.setItem('offlineBudgets', JSON.stringify(updatedBudgets));
      set({ offlineBudgets: updatedBudgets });
    } catch (error) {
      console.error('Erro ao remover orçamento offline:', error);
    }
  },

  saveOfflineGoal: async (goal) => {
    try {
      const currentGoals = get().offlineGoals;
      const updatedGoals = [...currentGoals, goal];
      
      await AsyncStorage.setItem('offlineGoals', JSON.stringify(updatedGoals));
      set({ offlineGoals: updatedGoals });
    } catch (error) {
      console.error('Erro ao salvar meta offline:', error);
    }
  },

  getOfflineGoals: async () => {
    try {
      const stored = await AsyncStorage.getItem('offlineGoals');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erro ao buscar metas offline:', error);
      return [];
    }
  },

  removeOfflineGoal: async (id) => {
    try {
      const currentGoals = get().offlineGoals;
      const updatedGoals = currentGoals.filter(g => g._id !== id);
      
      await AsyncStorage.setItem('offlineGoals', JSON.stringify(updatedGoals));
      set({ offlineGoals: updatedGoals });
    } catch (error) {
      console.error('Erro ao remover meta offline:', error);
    }
  },

  initializeOfflineData: async () => {
    try {
      const [pendingRequests, offlineTransactions, offlineBudgets, offlineGoals] = await Promise.all([
        get().getPendingRequests(),
        get().getOfflineTransactions(),
        get().getOfflineBudgets(),
        get().getOfflineGoals(),
      ]);

      set({
        pendingRequests,
        offlineTransactions,
        offlineBudgets,
        offlineGoals,
      });

      // Configurar listener de rede
      const unsubscribe = NetInfo.addEventListener(state => {
        get().setOnlineStatus(state.isConnected ?? false);
      });

      // Retorna função para limpar o listener se necessário
      // mas não retorna nada para o tipo Promise<void>
    } catch (error) {
      console.error('Erro ao inicializar dados offline:', error);
    }
  },

  syncAllData: async () => {
    if (!get().isOnline) {
      console.log('Offline - não é possível sincronizar');
      return;
    }

    try {
      console.log('Iniciando sincronização...');
      
      // Sincronizar requests pendentes
      const pendingRequests = await get().getPendingRequests();
      
      for (const request of pendingRequests) {
        try {
          // Aqui você faria o request real para a API
          console.log('Sincronizando request:', request);
          // await apiClient.request(request);
          await get().removePendingRequest(request.id);
        } catch (error) {
          console.error('Erro ao sincronizar request:', error);
        }
      }

      console.log('✅ Sincronização concluída');
    } catch (error) {
      console.error('Erro na sincronização:', error);
    }
  },
}));