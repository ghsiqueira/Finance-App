import { apiClient } from './client';
import { ApiResponse, User, LoginForm, RegisterForm } from '../../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
}

export const authService = {
  async login(credentials: LoginForm): Promise<ApiResponse<LoginResponse>> {
    try {
      console.log('🔐 Iniciando login para:', credentials.email);
      
      const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials);

      console.log('✅ Login bem-sucedido');
      return response;
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      return {
        success: false,
        message: error.message || 'Erro desconhecido no login',
      };
    }
  },

  async register(userData: RegisterForm): Promise<ApiResponse<RegisterResponse>> {
    try {
      console.log('📝 Iniciando registro para:', userData.email);
      
      if (!userData.name || !userData.email || !userData.password || !userData.confirmPassword) {
        throw new Error('Todos os campos são obrigatórios');
      }

      if (userData.password !== userData.confirmPassword) {
        throw new Error('As senhas não conferem');
      }

      if (userData.password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      const { confirmPassword, ...dataToSend } = userData;
      
      const response = await apiClient.post<ApiResponse<RegisterResponse>>('/auth/register', dataToSend);

      console.log('✅ Registro bem-sucedido');
      return response;
    } catch (error: any) {
      console.error('❌ Erro no registro:', error);
      return {
        success: false,
        message: error.message || 'Erro desconhecido no registro',
      };
    }
  },

  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    try {
      return await apiClient.post('/auth/forgot-password', { email });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao enviar email de recuperação',
      };
    }
  },

  async resetPassword(token: string, password: string): Promise<ApiResponse<null>> {
    try {
      return await apiClient.post('/auth/reset-password', { token, password });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao redefinir senha',
      };
    }
  },

  async verifyEmail(token: string): Promise<ApiResponse<null>> {
    try {
      return await apiClient.post('/auth/verify-email', { token });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao verificar email',
      };
    }
  },

  async resendVerification(email: string): Promise<ApiResponse<null>> {
    try {
      return await apiClient.post('/auth/resend-verification', { email });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao reenviar verificação',
      };
    }
  },

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    try {
      return await apiClient.get('/auth/me');
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao buscar perfil',
      };
    }
  },

  async logout(): Promise<ApiResponse<null>> {
    try {
      await apiClient.post('/auth/logout');
      return { success: true, message: 'Logout realizado com sucesso' };
    } catch (error: any) {
      return { success: true, message: 'Logout realizado com sucesso' };
    }
  },

  async validateToken(): Promise<boolean> {
    try {
      const response = await this.getProfile();
      return response.success;
    } catch (error) {
      return false;
    }
  },

  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔍 Testando conexão com backend...');
      
      const result = await apiClient.testConnection();
      
      if (result.success) {
        console.log('✅ Conexão estabelecida:', result.message);
        return result;
      } else {
        console.log('❌ Falha na conexão:', result.message);
        return result;
      }
    } catch (error: any) {
      console.error('❌ Erro no teste de conexão:', error);
      return { 
        success: false, 
        message: `Erro de conexão: ${error.message}. Verifique se o backend está rodando.` 
      };
    }
  },
};