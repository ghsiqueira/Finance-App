// src/services/api/auth.ts - Service de Autenticação Corrigido
import { apiClient } from './config';

// 🔥 Interfaces
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
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

class AuthService {
  // 🔥 Login
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    if (!credentials.email?.trim()) {
      throw new Error('Email é obrigatório');
    }
    if (!credentials.password?.trim()) {
      throw new Error('Senha é obrigatória');
    }

    console.log('🔐 Fazendo login para:', credentials.email);

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      
      // Salvar token automaticamente
      if (response.token) {
        await apiClient.setAuthToken(response.token);
        console.log('✅ Token salvo com sucesso');
      }

      return response;
    } catch (error: any) {
      console.error('❌ Erro no login:', error.message);
      throw error;
    }
  }

  // 🔥 Registro
  async register(data: RegisterData): Promise<{ user: Partial<User> }> {
    if (!data.name?.trim()) {
      throw new Error('Nome é obrigatório');
    }
    if (!data.email?.trim()) {
      throw new Error('Email é obrigatório');
    }
    if (!data.password || data.password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    console.log('📝 Registrando usuário:', data.email);

    return apiClient.post('/auth/register', data);
  }

  // 🔥 Verificar email
  async verifyEmail(token: string): Promise<{ message: string }> {
    if (!token?.trim()) {
      throw new Error('Token de verificação é obrigatório');
    }

    return apiClient.post('/auth/verify-email', { token });
  }

  // 🔥 Esqueci minha senha
  async forgotPassword(data: ForgotPasswordData): Promise<{ message: string }> {
    if (!data.email?.trim()) {
      throw new Error('Email é obrigatório');
    }

    return apiClient.post('/auth/forgot-password', data);
  }

  // 🔥 Redefinir senha
  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    if (!data.token?.trim()) {
      throw new Error('Token de redefinição é obrigatório');
    }
    if (!data.password || data.password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    return apiClient.post('/auth/reset-password', data);
  }

  // 🔥 Obter dados do usuário atual
  async getCurrentUser(): Promise<{ user: User }> {
    return apiClient.get('/auth/me');
  }

  // 🔥 Logout
  async logout(): Promise<void> {
    try {
      // Chamar endpoint de logout (opcional)
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignore erros do logout no backend
      console.warn('⚠️ Erro no logout do backend (ignorado):', error);
    } finally {
      // Sempre limpar dados locais
      await apiClient.clearAuthToken();
      console.log('🚪 Logout realizado localmente');
    }
  }

  // 🔥 Verificar se está autenticado
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      await apiClient.clearAuthToken();
      return false;
    }
  }

  // 🔥 Testar conexão com o backend
  async testConnection(): Promise<{ success: boolean; message: string }> {
    return apiClient.testConnection();
  }

  // 🔥 Refresh do token (se necessário no futuro)
  async refreshToken(): Promise<{ token: string }> {
    const response = await apiClient.post<{ token: string }>('/auth/refresh');
    
    if (response.token) {
      await apiClient.setAuthToken(response.token);
    }
    
    return response;
  }

  // 🔥 Reenviar email de verificação
  async resendVerificationEmail(): Promise<{ message: string }> {
    return apiClient.post('/auth/resend-verification');
  }

  // 🔥 Alterar senha (quando já logado)
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    if (!data.currentPassword?.trim()) {
      throw new Error('Senha atual é obrigatória');
    }
    if (!data.newPassword || data.newPassword.length < 6) {
      throw new Error('Nova senha deve ter pelo menos 6 caracteres');
    }

    return apiClient.put('/auth/change-password', data);
  }
}

export const authService = new AuthService();