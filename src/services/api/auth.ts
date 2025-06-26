// src/services/api/auth.ts - Service de Autenticação Corrigido
import { apiClient } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interfaces atualizadas
export interface User {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  theme: 'light' | 'dark';
  currency: string;
  preferences: {
    language: string;
    notifications: {
      email: boolean;
      budgetAlerts: boolean;
      goalReminders: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string; // Opcional, usado apenas no frontend
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

class AuthService {
  // Teste de conexão
  async testConnection(): Promise<ApiResponse> {
    try {
      console.log('🔍 Testando conexão com servidor...');
      const response = await apiClient.get<{status: string; version: string}>('/auth/test-connection');
      
      return {
        success: true,
        message: 'Conexão estabelecida com sucesso',
        data: response
      };
    } catch (error: any) {
      console.error('❌ Erro na conexão:', error);
      return {
        success: false,
        message: error.message || 'Erro de conexão',
        data: error
      };
    }
  }

  // Login
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Validações básicas
      if (!credentials.email?.trim()) {
        throw new Error('Email é obrigatório');
      }
      if (!credentials.password?.trim()) {
        throw new Error('Senha é obrigatória');
      }

      console.log('🔐 Fazendo login para:', credentials.email);

      const response = await apiClient.post<{token: string; user: User}>('/auth/login', credentials);
      
      // O apiClient já valida o success na resposta, então se chegou aqui é porque foi bem-sucedido
      if (!response.token || !response.user) {
        throw new Error('Resposta inválida do servidor');
      }

      // Salvar token automaticamente
      await apiClient.setAuthToken(response.token);
      console.log('✅ Token salvo com sucesso');

      return {
        success: true,
        message: 'Login realizado com sucesso',
        token: response.token,
        user: response.user
      };

    } catch (error: any) {
      console.error('❌ Erro no login:', error.message);
      
      // Limpar token em caso de erro
      await apiClient.clearAuthToken();
      
      throw new Error(error.message || 'Erro interno no login');
    }
  }

  // Registro
  async register(data: RegisterData): Promise<RegisterResponse> {
    try {
      // Validações básicas
      if (!data.name?.trim()) {
        throw new Error('Nome é obrigatório');
      }
      if (!data.email?.trim()) {
        throw new Error('Email é obrigatório');
      }
      if (!data.password?.trim()) {
        throw new Error('Senha é obrigatória');
      }
      if (data.password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }

      // Validar confirmação de senha (apenas no frontend)
      if (data.confirmPassword && data.password !== data.confirmPassword) {
        throw new Error('As senhas não conferem');
      }

      console.log('📝 Registrando usuário:', data.email);

      // Remover confirmPassword antes de enviar para o backend
      const { confirmPassword, ...registerPayload } = data;

      const response = await apiClient.post<{user: User}>('/auth/register', registerPayload);
      
      // O apiClient já valida o success na resposta, então se chegou aqui é porque foi bem-sucedido
      console.log('✅ Registro bem-sucedido');

      return {
        success: true,
        message: 'Usuário criado com sucesso! Verifique seu email para ativar a conta.',
        data: response
      };

    } catch (error: any) {
      console.error('❌ Erro no registro:', error.message);
      throw new Error(error.message || 'Erro interno no registro');
    }
  }

  // Esqueci a senha
  async forgotPassword(email: string): Promise<ApiResponse> {
    try {
      if (!email?.trim()) {
        throw new Error('Email é obrigatório');
      }

      const response = await apiClient.post<{message: string}>('/auth/forgot-password', { email });
      
      return {
        success: true,
        message: response.message || 'Se o email existir, você receberá instruções para redefinir sua senha.'
      };

    } catch (error: any) {
      console.error('❌ Erro no forgot password:', error.message);
      throw new Error(error.message || 'Erro interno');
    }
  }

  // Redefinir senha
  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    try {
      if (!token?.trim()) {
        throw new Error('Token é obrigatório');
      }
      if (!password?.trim()) {
        throw new Error('Senha é obrigatória');
      }
      if (password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }

      const response = await apiClient.post<{message: string}>('/auth/reset-password', {
        token,
        password
      });
      
      return {
        success: true,
        message: response.message || 'Senha redefinida com sucesso!'
      };

    } catch (error: any) {
      console.error('❌ Erro no reset password:', error.message);
      throw new Error(error.message || 'Erro interno');
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Tentar fazer logout no servidor
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.log('⚠️ Erro no logout do servidor (não crítico)');
    } finally {
      // Sempre limpar token local
      await apiClient.clearAuthToken();
      console.log('✅ Logout local realizado');
    }
  }

  // Verificar perfil
  async getProfile(): Promise<User> {
    try {
      const response = await apiClient.get<{user: User}>('/auth/me');
      
      return response.user;

    } catch (error: any) {
      console.error('❌ Erro ao buscar perfil:', error.message);
      throw new Error(error.message || 'Erro interno');
    }
  }

  // Verificar se está autenticado
  async isAuthenticated(): Promise<boolean> {
    try {
      // Verificar se tem token no AsyncStorage
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return false;

      // Tentar buscar perfil para validar token
      await this.getProfile();
      return true;

    } catch (error) {
      console.log('⚠️ Token inválido, limpando...');
      await apiClient.clearAuthToken();
      return false;
    }
  }
}

export const authService = new AuthService();