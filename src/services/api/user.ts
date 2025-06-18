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
  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get('/user/profile');
  },

  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<{ user: User }>> {
    return apiClient.put('/user/profile', data);
  },

  async updatePreferences(data: UpdatePreferencesData): Promise<ApiResponse<{
    preferences: User['preferences'];
  }>> {
    return apiClient.put('/user/preferences', data);
  },

  async changePassword(data: ChangePasswordData): Promise<ApiResponse<null>> {
    return apiClient.post('/user/change-password', data);
  },

  async getDashboard(period: string = 'month'): Promise<ApiResponse<DashboardData>> {
    return apiClient.get(`/user/dashboard?period=${period}`);
  },

  async getStats(): Promise<ApiResponse<UserStats>> {
    return apiClient.get('/user/stats');
  },

  async deleteAccount(confirmPassword: string): Promise<ApiResponse<null>> {
    return apiClient.delete('/user/account', {
      data: { confirmPassword }
    });
  },

  async exportData(options: ExportData = {}): Promise<ApiResponse<any>> {
    return apiClient.post('/user/export', options);
  },

  async uploadAvatar(formData: FormData): Promise<ApiResponse<{ avatarUrl: string }>> {
    return apiClient.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async removeAvatar(): Promise<ApiResponse<null>> {
    return apiClient.delete('/user/avatar');
  },

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

  async syncUserData(): Promise<boolean> {
    try {
      const [profileResponse, dashboardResponse] = await Promise.allSettled([
        this.getProfile(),
        this.getDashboard(),
      ]);

      const hasSuccess = [profileResponse, dashboardResponse].some(
        result => result.status === 'fulfilled' && result.value.success
      );

      return hasSuccess;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return false;
    }
  },

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