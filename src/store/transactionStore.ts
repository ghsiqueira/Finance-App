// src/store/transactionStore.ts
import { create } from 'zustand';
import { Transaction } from '../types';
import { transactionStorage } from '../services/storage/transactions';

interface TransactionFilters {
  type?: 'income' | 'expense';
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  paymentMethod?: string;
}

interface TransactionStore {
  // Estado
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  selectedTransaction: Transaction | null;
  filters: TransactionFilters;
  isLoading: boolean;
  error: string | null;
  
  // Paginação
  currentPage: number;
  hasNextPage: boolean;
  totalItems: number;
  
  // Cache e favoritos
  favoriteTransactions: string[];
  recentDescriptions: string[];
  
  // Ações
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  
  // Filtros
  setFilters: (filters: Partial<TransactionFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  
  // Seleção
  selectTransaction: (transaction: Transaction | null) => void;
  
  // Favoritos
  toggleFavorite: (transactionId: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
  
  // Descrições recentes
  addRecentDescription: (description: string) => Promise<void>;
  loadRecentDescriptions: () => Promise<void>;
  
  // Estados
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utilitários
  getTransactionsByCategory: (categoryId: string) => Transaction[];
  getTransactionsByType: (type: 'income' | 'expense') => Transaction[];
  getTransactionsByDateRange: (startDate: Date, endDate: Date) => Transaction[];
  calculateTotals: () => { income: number; expense: number; balance: number };
  
  // Reset
  reset: () => void;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  // Estado inicial
  transactions: [],
  filteredTransactions: [],
  selectedTransaction: null,
  filters: {},
  isLoading: false,
  error: null,
  
  currentPage: 1,
  hasNextPage: false,
  totalItems: 0,
  
  favoriteTransactions: [],
  recentDescriptions: [],

  // Ações principais
  setTransactions: (transactions) => {
    set({ transactions });
    get().applyFilters();
  },

  addTransaction: async (transaction) => {
    const { transactions } = get();
    const newTransactions = [transaction, ...transactions];
    
    set({ transactions: newTransactions });
    get().applyFilters();
    
    // Salvar descrição recente
    await get().addRecentDescription(transaction.description);
  },

  updateTransaction: async (id, updates) => {
    const { transactions } = get();
    const updatedTransactions = transactions.map(t => 
      t._id === id ? { ...t, ...updates } : t
    );
    
    set({ transactions: updatedTransactions });
    get().applyFilters();
    
    // Atualizar transação selecionada se for a mesma
    const { selectedTransaction } = get();
    if (selectedTransaction && selectedTransaction._id === id) {
      set({ selectedTransaction: { ...selectedTransaction, ...updates } });
    }
  },

  removeTransaction: async (id) => {
    const { transactions, favoriteTransactions } = get();
    const updatedTransactions = transactions.filter(t => t._id !== id);
    const updatedFavorites = favoriteTransactions.filter(fId => fId !== id);
    
    set({ 
      transactions: updatedTransactions,
      favoriteTransactions: updatedFavorites,
    });
    get().applyFilters();
    
    // Limpar seleção se for a transação removida
    const { selectedTransaction } = get();
    if (selectedTransaction && selectedTransaction._id === id) {
      set({ selectedTransaction: null });
    }
    
    // Remover dos favoritos se necessário
    if (favoriteTransactions.includes(id)) {
      await transactionStorage.removeFavoriteTransaction(id);
    }
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
    const { transactions, filters } = get();
    let filtered = [...transactions];

    // Filtro por tipo
    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Filtro por categoria
    if (filters.categoryId) {
      filtered = filtered.filter(t => t.categoryId === filters.categoryId);
    }

    // Filtro por data
    if (filters.startDate) {
      filtered = filtered.filter(t => new Date(t.date) >= filters.startDate!);
    }
    if (filters.endDate) {
      filtered = filtered.filter(t => new Date(t.date) <= filters.endDate!);
    }

    // Filtro por busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        t.notes?.toLowerCase().includes(searchLower) ||
        t.category?.name.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por método de pagamento
    if (filters.paymentMethod) {
      filtered = filtered.filter(t => t.paymentMethod === filters.paymentMethod);
    }

    // Ordenar por data (mais recente primeiro)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    set({ filteredTransactions: filtered });
  },

  // Seleção
  selectTransaction: (transaction) => {
    set({ selectedTransaction: transaction });
  },

  // Favoritos
  toggleFavorite: async (transactionId) => {
    const { favoriteTransactions } = get();
    const isFavorite = favoriteTransactions.includes(transactionId);
    
    if (isFavorite) {
      const updatedFavorites = favoriteTransactions.filter(id => id !== transactionId);
      set({ favoriteTransactions: updatedFavorites });
      await transactionStorage.removeFavoriteTransaction(transactionId);
    } else {
      const updatedFavorites = [...favoriteTransactions, transactionId];
      set({ favoriteTransactions: updatedFavorites });
      await transactionStorage.addFavoriteTransaction(transactionId);
    }
  },

  loadFavorites: async () => {
    try {
      const favorites = await transactionStorage.getFavoriteTransactions();
      set({ favoriteTransactions: favorites });
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  },

  // Descrições recentes
  addRecentDescription: async (description) => {
    if (!description.trim()) return;
    
    try {
      await transactionStorage.addRecentDescription(description.trim());
      const recentDescriptions = await transactionStorage.getRecentDescriptions();
      set({ recentDescriptions });
    } catch (error) {
      console.error('Erro ao adicionar descrição recente:', error);
    }
  },

  loadRecentDescriptions: async () => {
    try {
      const recentDescriptions = await transactionStorage.getRecentDescriptions();
      set({ recentDescriptions });
    } catch (error) {
      console.error('Erro ao carregar descrições recentes:', error);
    }
  },

  // Estados
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Utilitários
  getTransactionsByCategory: (categoryId) => {
    const { filteredTransactions } = get();
    return filteredTransactions.filter(t => t.categoryId === categoryId);
  },

  getTransactionsByType: (type) => {
    const { filteredTransactions } = get();
    return filteredTransactions.filter(t => t.type === type);
  },

  getTransactionsByDateRange: (startDate, endDate) => {
    const { filteredTransactions } = get();
    return filteredTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  },

  calculateTotals: () => {
    const { filteredTransactions } = get();
    
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      income,
      expense,
      balance: income - expense,
    };
  },

  // Reset
  reset: () => {
    set({
      transactions: [],
      filteredTransactions: [],
      selectedTransaction: null,
      filters: {},
      isLoading: false,
      error: null,
      currentPage: 1,
      hasNextPage: false,
      totalItems: 0,
      favoriteTransactions: [],
      recentDescriptions: [],
    });
  },
}));