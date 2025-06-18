import { create } from 'zustand';
import { Category } from '../types';

interface CategoryFilters {
  type?: 'expense' | 'income' | 'both';
  isActive?: boolean;
  isDefault?: boolean;
  search?: string;
}

interface CategoryStats {
  categoryId: string;
  category: Category;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  lastUsed?: string;
  usagePercentage: number;
}

interface CategoryUsage {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  useCount: number;
  totalAmount: number;
  lastUsed: string;
}

interface CategoryStore {
  categories: Category[];
  filteredCategories: Category[];
  selectedCategory: Category | null;
  filters: CategoryFilters;
  isLoading: boolean;
  error: string | null;
  categoryStats: CategoryStats[];
  mostUsedCategories: CategoryUsage[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  toggleCategoryStatus: (id: string) => void;
  setFilters: (filters: Partial<CategoryFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  selectCategory: (category: Category | null) => void;
  getIncomeCategories: () => Category[];
  getExpenseCategories: () => Category[];
  getBothTypeCategories: () => Category[];
  getActiveCategories: () => Category[];
  getDefaultCategories: () => Category[];
  searchCategories: (query: string) => Category[];
  getSuggestedCategories: (type: 'income' | 'expense') => Category[];
  getCategoryByName: (name: string) => Category | null;
  setCategoryStats: (stats: CategoryStats[]) => void;
  updateCategoryUsage: (categoryId: string, amount: number) => void;
  getMostUsedCategories: (limit?: number) => CategoryUsage[];
  getLeastUsedCategories: (limit?: number) => CategoryUsage[];
  getAvailableColors: () => string[];
  getAvailableIcons: () => string[];
  getRandomColor: () => string;
  getRandomIcon: () => string;
  isCategoryNameUnique: (name: string, excludeId?: string) => boolean;
  validateCategory: (category: Partial<Category>) => { isValid: boolean; errors: string[] };
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getCategoryColor: (categoryId: string) => string;
  getCategoryIcon: (categoryId: string) => string;
  getCategoryName: (categoryId: string) => string;
  sortCategoriesByName: () => void;
  sortCategoriesByUsage: () => void;
  sortCategoriesByType: () => void;
  reset: () => void;
}

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
  '#DDA0DD', '#FFB6C1', '#A8A8A8', '#00B894', '#6C5CE7',
  '#FD79A8', '#74B9FF', '#E17055', '#00CEC9', '#6C5CE7'
];

const DEFAULT_ICONS = [
  'restaurant', 'car', 'home', 'medical', 'school', 'game-controller',
  'shirt', 'card', 'phone-portrait', 'fitness', 'airplane', 'book',
  'musical-notes', 'gift', 'heart', 'star', 'camera', 'umbrella',
  'cash', 'briefcase', 'trending-up', 'add-circle'
];

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  filteredCategories: [],
  selectedCategory: null,
  filters: {},
  isLoading: false,
  error: null,
  categoryStats: [],
  mostUsedCategories: [],

  setCategories: (categories) => {
    set({ categories });
    get().applyFilters();
  },

  addCategory: (category) => {
    const { categories } = get();
    const newCategories = [...categories, category];
    set({ categories: newCategories });
    get().applyFilters();
  },

  updateCategory: (id, updates) => {
    const { categories } = get();
    const updatedCategories = categories.map(c => 
      c._id === id ? { ...c, ...updates } : c
    );
    set({ categories: updatedCategories });
    get().applyFilters();
    const { selectedCategory } = get();
    if (selectedCategory && selectedCategory._id === id) {
      set({ selectedCategory: { ...selectedCategory, ...updates } });
    }
  },

  removeCategory: (id) => {
    const { categories } = get();
    const updatedCategories = categories.filter(c => c._id !== id);
    set({ categories: updatedCategories });
    get().applyFilters();
    const { selectedCategory } = get();
    if (selectedCategory && selectedCategory._id === id) {
      set({ selectedCategory: null });
    }
  },

  toggleCategoryStatus: (id) => {
    const { categories } = get();
    const updatedCategories = categories.map(c => 
      c._id === id ? { ...c, isActive: !c.isActive } : c
    );
    set({ categories: updatedCategories });
    get().applyFilters();
  },

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
    const { categories, filters } = get();
    let filtered = [...categories];
    if (filters.type && filters.type !== 'both') {
      filtered = filtered.filter(c => c.type === filters.type || c.type === 'both');
    }
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(c => c.isActive === filters.isActive);
    }
    if (filters.isDefault !== undefined) {
      filtered = filtered.filter(c => c.isDefault === filters.isDefault);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      );
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    set({ filteredCategories: filtered });
  },

  selectCategory: (category) => {
    set({ selectedCategory: category });
  },

  getIncomeCategories: () => {
    const { categories } = get();
    return categories.filter(c => c.type === 'income' || c.type === 'both');
  },

  getExpenseCategories: () => {
    const { categories } = get();
    return categories.filter(c => c.type === 'expense' || c.type === 'both');
  },

  getBothTypeCategories: () => {
    const { categories } = get();
    return categories.filter(c => c.type === 'both');
  },

  getActiveCategories: () => {
    const { categories } = get();
    return categories.filter(c => c.isActive);
  },

  getDefaultCategories: () => {
    const { categories } = get();
    return categories.filter(c => c.isDefault);
  },

  searchCategories: (query) => {
    const { categories } = get();
    const queryLower = query.toLowerCase();
    return categories.filter(c =>
      c.name.toLowerCase().includes(queryLower) ||
      c.description?.toLowerCase().includes(queryLower)
    ).slice(0, 10);
  },

  getSuggestedCategories: (type) => {
    const { categories, mostUsedCategories } = get();
    const categoriesOfType = categories.filter(c => 
      c.type === type || c.type === 'both'
    );
    const sorted = categoriesOfType.sort((a, b) => {
      const aUsage = mostUsedCategories.find(u => u.categoryId === a._id);
      const bUsage = mostUsedCategories.find(u => u.categoryId === b._id);
      const aCount = aUsage?.useCount || 0;
      const bCount = bUsage?.useCount || 0;
      return bCount - aCount;
    });
    return sorted.slice(0, 5);
  },

  getCategoryByName: (name) => {
    const { categories } = get();
    return categories.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
  },

  setCategoryStats: (stats) => {
    set({ categoryStats: stats });
    const mostUsed = stats
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, 10)
      .map(stat => ({
        categoryId: stat.categoryId,
        name: stat.category.name,
        color: stat.category.color,
        icon: stat.category.icon,
        useCount: stat.transactionCount,
        totalAmount: stat.totalAmount,
        lastUsed: stat.lastUsed || '',
      }));
    set({ mostUsedCategories: mostUsed });
  },

  updateCategoryUsage: (categoryId, amount) => {
    const { mostUsedCategories } = get();
    const existingIndex = mostUsedCategories.findIndex(u => u.categoryId === categoryId);
    if (existingIndex >= 0) {
      const updated = [...mostUsedCategories];
      updated[existingIndex] = {
        ...updated[existingIndex],
        useCount: updated[existingIndex].useCount + 1,
        totalAmount: updated[existingIndex].totalAmount + amount,
        lastUsed: new Date().toISOString(),
      };
      set({ mostUsedCategories: updated });
    }
  },

  getMostUsedCategories: (limit = 5) => {
    const { mostUsedCategories } = get();
    return mostUsedCategories
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit);
  },

  getLeastUsedCategories: (limit = 5) => {
    const { mostUsedCategories } = get();
    return mostUsedCategories
      .sort((a, b) => a.useCount - b.useCount)
      .slice(0, limit);
  },

  getAvailableColors: () => DEFAULT_COLORS,

  getAvailableIcons: () => DEFAULT_ICONS,

  getRandomColor: () => {
    const { categories } = get();
    const usedColors = categories.map(c => c.color);
    const availableColors = DEFAULT_COLORS.filter(c => !usedColors.includes(c));
    if (availableColors.length > 0) {
      return availableColors[Math.floor(Math.random() * availableColors.length)];
    }
    return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  },

  getRandomIcon: () => {
    return DEFAULT_ICONS[Math.floor(Math.random() * DEFAULT_ICONS.length)];
  },

  isCategoryNameUnique: (name, excludeId) => {
    const { categories } = get();
    return !categories.some(c => 
      c.name.toLowerCase() === name.toLowerCase() && c._id !== excludeId
    );
  },

  validateCategory: (category) => {
    const errors: string[] = [];
    if (!category.name?.trim()) {
      errors.push('Nome é obrigatório');
    } else if (category.name.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    } else if (category.name.trim().length > 30) {
      errors.push('Nome deve ter no máximo 30 caracteres');
    }
    if (category.name && !get().isCategoryNameUnique(category.name, category._id)) {
      errors.push('Já existe uma categoria com este nome');
    }
    if (category.description && category.description.length > 100) {
      errors.push('Descrição deve ter no máximo 100 caracteres');
    }
    if (category.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(category.color)) {
      errors.push('Cor deve estar no formato hexadecimal válido');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  getCategoryColor: (categoryId) => {
    const { categories } = get();
    const category = categories.find(c => c._id === categoryId);
    return category?.color || '#A8A8A8';
  },

  getCategoryIcon: (categoryId) => {
    const { categories } = get();
    const category = categories.find(c => c._id === categoryId);
    return category?.icon || 'help-circle-outline';
  },

  getCategoryName: (categoryId) => {
    const { categories } = get();
    const category = categories.find(c => c._id === categoryId);
    return category?.name || 'Categoria não encontrada';
  },

  sortCategoriesByName: () => {
    const { categories } = get();
    const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
    set({ categories: sorted });
    get().applyFilters();
  },

  sortCategoriesByUsage: () => {
    const { categories, mostUsedCategories } = get();
    const sorted = [...categories].sort((a, b) => {
      const aUsage = mostUsedCategories.find(u => u.categoryId === a._id);
      const bUsage = mostUsedCategories.find(u => u.categoryId === b._id);
      const aCount = aUsage?.useCount || 0;
      const bCount = bUsage?.useCount || 0;
      return bCount - aCount;
    });
    set({ categories: sorted });
    get().applyFilters();
  },

  sortCategoriesByType: () => {
    const { categories } = get();
    const sorted = [...categories].sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      const typeOrder = { income: 0, expense: 1, both: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
    set({ categories: sorted });
    get().applyFilters();
  },

  reset: () => {
    set({
      categories: [],
      filteredCategories: [],
      selectedCategory: null,
      filters: {},
      isLoading: false,
      error: null,
      categoryStats: [],
      mostUsedCategories: [],
    });
  },
}));
