import { useAuthStore } from '../store/authStore';
import { authService } from '../services/api/auth';
import { useState } from 'react';

export const useAuth = () => {
  const { user, token, isAuthenticated, setAuth, updateUser, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      if (response.success && response.data) {
        await setAuth(response.data.user, response.data.token);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao fazer login' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    try {
      const response = await authService.register(userData);
      return { success: response.success, message: response.message };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao criar conta' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const validateToken = async () => {
    if (!token) return false;
    
    try {
      const response = await authService.getProfile();
      if (response.success && response.data) {
        await updateUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      await logout();
      return false;
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    validateToken,
  };
};
