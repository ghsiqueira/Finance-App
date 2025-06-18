// src/services/api/user.ts
import { apiClient } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse, User, DashboardData } from '../../types';

export interface UpdateProfileData {
  name?: string;
  email?: string;
  currency?: string;
  theme?: 'light' | 'dark';
  avatar?: string;
}

export interface UpdatePreferencesData {
  preferences: {
    language?: string;
    notifications?: {
      email?: boolean;
      budgetAlerts?: boolean;
      goalReminders?: boolean;
    };
  };
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserStats {
  totals: {
    transactions: number;
    categories: number;
    budgets: number;
    goals: number;
    completedGoals: number;
  };
  transactionStats: Array<{
    _id: string;
    total: number;
    count: number;
    avgAmount: number;
  }>;
  paymentMethodStats: Array<{
    _id: string;
    total: number;
    count: number;
  }>;
  accountAge: number;
  memberSince: string;
}

export interface ExportData {
  format?: 'json' | 'csv';
  includeDeleted?: boolean;
}

export const userService = {
  // Buscar perfil do usuário
  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get('/user/profile');
  },

  // Atualizar perfil
  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<{ user: User }>> {
    return apiClient.put('/user/profile', data);
  },

  // Atualizar preferências
  async updatePreferences(data: UpdatePreferencesData): Promise<ApiResponse<{
    preferences: User['preferences'];
  }>> {
    return apiClient.put('/user/preferences', data);
  },

  // Alterar senha
  async changePassword(data: ChangePasswordData): Promise<ApiResponse<null>> {
    return apiClient.post('/user/change-password', data);
  },

  // Buscar dashboard
  async getDashboard(period: string = 'month'): Promise<ApiResponse<DashboardData>> {
    return apiClient.get(`/user/dashboard?period=${period}`);
  },

  // Buscar estatísticas do usuário
  async getStats(): Promise<ApiResponse<UserStats>> {
    return apiClient.get('/user/stats');
  },

  // Deletar conta
  async deleteAccount(confirmPassword: string): Promise<ApiResponse<null>> {
    return apiClient.delete('/user/account', {
      data: { confirmPassword }
    });
  },

  // Exportar dados
  async exportData(options: ExportData = {}): Promise<ApiResponse<any>> {
    return apiClient.post('/user/export', options);
  },

  // Upload de avatar
  async uploadAvatar(formData: FormData): Promise<ApiResponse<{ avatarUrl: string }>> {
    return apiClient.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Remover avatar
  async removeAvatar(): Promise<ApiResponse<null>> {
    return apiClient.delete('/user/avatar');
  },

  // Buscar dashboard offline-first
  async getDashboardOfflineFirst(period: string = 'month'): Promise<DashboardData | null> {
    const cacheKey = `dashboard_${period}`;
    
    try {
      return await apiClient.offlineFirst(
        cacheKey,
        async () => {
          const response = await this.getDashboard(period);
          return response.data || null;
        }
      );
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      return null;
    }
  },

  // Sincronizar dados do usuário
  async syncUserData(): Promise<boolean> {
    try {
      // Tentar buscar dados mais recentes
      const [profileResponse, dashboardResponse] = await Promise.allSettled([
        this.getProfile(),
        this.getDashboard(),
      ]);

      // Verificar se pelo menos uma requisição foi bem-sucedida
      const hasSuccess = [profileResponse, dashboardResponse].some(
        result => result.status === 'fulfilled' && result.value.success
      );

      return hasSuccess;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return false;
    }
  },

  // Verificar se precisa atualizar cache
  async shouldUpdateCache(cacheKey: string, maxAge: number = 5 * 60 * 1000): Promise<boolean> {
    try {
      const cacheTimestamp = await AsyncStorage.getItem(`${cacheKey}_timestamp`);
      
      if (!cacheTimestamp) {
        return true;
      }

      const age = Date.now() - parseInt(cacheTimestamp);
      return age > maxAge;
    } catch (error) {
      return true;
    }
  },

  // Limpar cache do usuário
  async clearUserCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('cache_dashboard') || 
        key.startsWith('cache_profile') ||
        key.startsWith('cache_stats')
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  },
};