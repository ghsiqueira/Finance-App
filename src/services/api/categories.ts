// src/services/api/categories.ts
import { apiClient } from './client';
import { ApiResponse, Category } from '../../types';

export interface CategoryFilters {
  type?: 'expense' | 'income' | 'both';
  includeInactive?: boolean;
}

export interface CategoryForm {
  name: string;
  icon?: string;
  color?: string;
  type?: 'expense' | 'income' | 'both';
  description?: string;
}

export interface CategoryStats {
  stats: Array<{
    categoryId: string;
    category: Category;
    total: number;
    count: number;
    percentage: number;
  }>;
  summary: {
    totalAmount: number;
    categoriesCount: number;
    transactionsCount: number;
  };
}

export const categoryService = {
  // Listar categorias
  async getCategories(filters: CategoryFilters = {}): Promise<ApiResponse<{ categories: Category[] }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return apiClient.get(`/categories?${params.toString()}`);
  },

  // Buscar categoria por ID
  async getCategory(id: string): Promise<ApiResponse<{ 
    category: Category; 
    stats: { income: { total: number; count: number }; expense: { total: number; count: number } }; 
  }>> {
    return apiClient.get(`/categories/${id}`);
  },

  // Criar categoria
  async createCategory(data: CategoryForm): Promise<ApiResponse<{ category: Category }>> {
    return apiClient.post('/categories', data);
  },

  // Atualizar categoria
  async updateCategory(id: string, data: Partial<CategoryForm>): Promise<ApiResponse<{ category: Category }>> {
    return apiClient.put(`/categories/${id}`, data);
  },

  // Deletar categoria
  async deleteCategory(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/categories/${id}`);
  },

  // Restaurar categoria
  async restoreCategory(id: string): Promise<ApiResponse<{ category: Category }>> {
    return apiClient.post(`/categories/${id}/restore`);
  },

  // Obter estatísticas das categorias
  async getCategoryStats(
    startDate?: string, 
    endDate?: string, 
    type?: 'income' | 'expense'
  ): Promise<ApiResponse<CategoryStats>> {
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (type) params.append('type', type);
    
    return apiClient.get(`/categories/stats?${params.toString()}`);
  },

  // Recriar categorias padrão
  async resetDefaultCategories(): Promise<ApiResponse<{ categories: Category[] }>> {
    return apiClient.post('/categories/reset-defaults');
  },

  // Buscar categorias offline-first
  async getCategoriesOfflineFirst(filters: CategoryFilters = {}): Promise<Category[]> {
    const cacheKey = `categories_${JSON.stringify(filters)}`;
    
    return apiClient.offlineFirst(
      cacheKey,
      async () => {
        const response = await this.getCategories(filters);
        return response.data?.categories || [];
      }
    );
  },

  // Buscar categorias por tipo
  async getCategoriesByType(type: 'income' | 'expense'): Promise<ApiResponse<{ categories: Category[] }>> {
    return this.getCategories({ type });
  },

  // Verificar se categoria está sendo usada
  async isCategoryInUse(id: string): Promise<boolean> {
    try {
      const { data } = await this.getCategory(id);
      const stats = data?.stats;
      
      if (!stats) return false;
      
      return (stats.income.count + stats.expense.count) > 0;
    } catch (error) {
      return false;
    }
  },

  // Duplicar categoria
  async duplicateCategory(id: string): Promise<ApiResponse<{ category: Category }>> {
    const { data } = await this.getCategory(id);
    
    if (!data?.category) {
      throw new Error('Categoria não encontrada');
    }

    const { _id, isDefault, ...categoryData } = data.category;
    
    return this.createCategory({
      name: `${categoryData.name} (cópia)`,
      icon: categoryData.icon,
      color: categoryData.color,
      type: categoryData.type,
      description: categoryData.description,
    });
  },

  // Obter categorias mais utilizadas
  async getMostUsedCategories(limit: number = 5): Promise<ApiResponse<Category[]>> {
    const statsResponse = await this.getCategoryStats();
    
    if (!statsResponse.success || !statsResponse.data) {
      return { success: false, message: 'Erro ao buscar estatísticas', data: [] };
    }

    const mostUsed = statsResponse.data.stats
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(stat => stat.category);

    return {
      success: true,
      message: 'Categorias mais utilizadas obtidas com sucesso',
      data: mostUsed,
    };
  },

  // Buscar categorias sem uso
  async getUnusedCategories(): Promise<ApiResponse<Category[]>> {
    const statsResponse = await this.getCategoryStats();
    
    if (!statsResponse.success || !statsResponse.data) {
      return { success: false, message: 'Erro ao buscar estatísticas', data: [] };
    }

    const unused = statsResponse.data.stats
      .filter(stat => stat.count === 0)
      .map(stat => stat.category);

    return {
      success: true,
      message: 'Categorias não utilizadas obtidas com sucesso',
      data: unused,
    };
  },
};