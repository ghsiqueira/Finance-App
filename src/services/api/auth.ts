// src/services/api/auth.ts - VERSÃO CORRIGIDA
import { ApiResponse, User, LoginForm, RegisterForm } from '../../types';

const API_BASE_URL = 'http://localhost:3000/api';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
}

// Cliente HTTP simplificado com logs detalhados
const makeRequest = async <T>(
  endpoint: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`🔄 [API] ${options.method} ${url}`);
  if (options.body) {
    console.log('📤 [API] Request body:', options.body);
  }

  try {
    const config: RequestInit = {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.body && options.method !== 'GET') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();
    
    console.log(`📥 [API] Response ${response.status}:`, data);

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error: any) {
    console.error(`❌ [API] Error in ${options.method} ${url}:`, error);
    
    // Verificar se é erro de rede
    if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
      throw new Error('Erro de conexão. Verifique se o backend está rodando na porta 3000.');
    }
    
    // Verificar se é erro de timeout
    if (error.name === 'AbortError') {
      throw new Error('Timeout na requisição. Tente novamente.');
    }
    
    throw error;
  }
};

export const authService = {
  // Login com logs detalhados
  async login(credentials: LoginForm): Promise<ApiResponse<LoginResponse>> {
    try {
      console.log('🔐 Iniciando login para:', credentials.email);
      
      const response = await makeRequest<ApiResponse<LoginResponse>>('/auth/login', {
        method: 'POST',
        body: credentials,
      });

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

  // Registro com validação melhorada
  async register(userData: RegisterForm): Promise<ApiResponse<RegisterResponse>> {
    try {
      console.log('📝 Iniciando registro para:', userData.email);
      
      // Validação local antes de enviar
      if (!userData.name || !userData.email || !userData.password || !userData.confirmPassword) {
        throw new Error('Todos os campos são obrigatórios');
      }

      if (userData.password !== userData.confirmPassword) {
        throw new Error('As senhas não conferem');
      }

      if (userData.password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      // Remover confirmPassword antes de enviar
      const { confirmPassword, ...dataToSend } = userData;
      
      const response = await makeRequest<ApiResponse<RegisterResponse>>('/auth/register', {
        method: 'POST',
        body: dataToSend,
      });

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

  // Esqueci a senha
  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    try {
      return await makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao enviar email de recuperação',
      };
    }
  },

  // Reset de senha
  async resetPassword(token: string, password: string): Promise<ApiResponse<null>> {
    try {
      return await makeRequest('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao redefinir senha',
      };
    }
  },

  // Verificar email
  async verifyEmail(token: string): Promise<ApiResponse<null>> {
    try {
      return await makeRequest('/auth/verify-email', {
        method: 'POST',
        body: { token },
      });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao verificar email',
      };
    }
  },

  // Reenviar verificação
  async resendVerification(email: string): Promise<ApiResponse<null>> {
    try {
      return await makeRequest('/auth/resend-verification', {
        method: 'POST',
        body: { email },
      });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao reenviar verificação',
      };
    }
  },

  // Buscar perfil atual
  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    try {
      // Buscar token do AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      return await makeRequest('/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao buscar perfil',
      };
    }
  },

  // Logout
  async logout(): Promise<ApiResponse<null>> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('token');
      
      if (token) {
        await makeRequest('/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      return { success: true, message: 'Logout realizado com sucesso' };
    } catch (error: any) {
      // Mesmo se der erro no backend, limpar dados locais
      return { success: true, message: 'Logout realizado com sucesso' };
    }
  },

  // Verificar se token é válido
  async validateToken(): Promise<boolean> {
    try {
      const response = await this.getProfile();
      return response.success;
    } catch (error) {
      return false;
    }
  },

  // Teste de conectividade
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/../health`);
      if (response.ok) {
        return { success: true, message: 'Conexão com backend estabelecida' };
      } else {
        return { success: false, message: 'Backend respondeu com erro' };
      }
    } catch (error: any) {
      return { 
        success: false, 
        message: `Erro de conexão: ${error.message}. Verifique se o backend está rodando.` 
      };
    }
  },
};