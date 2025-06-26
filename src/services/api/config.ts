// src/services/api/config.ts - Configuração da API com Tipos Corrigidos
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 🔥 URL base para Android Emulator
const getBaseURL = () => {
  if (__DEV__) {
    // Desenvolvimento - Android Emulator
    return Platform.OS === 'android' 
      ? 'http://10.0.2.2:3000/api'  // Android Emulator
      : 'http://localhost:3000/api'; // iOS Simulator (caso precise no futuro)
  }
  // Produção - substitua pela sua URL de produção
  return 'https://sua-api-producao.com/api';
};

// 🔥 Interface para resposta padrão da API
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

// 🔥 Interface para metadados de requisição
interface RequestMetadata {
  requestId: string;
}

// 🔥 Estender tipo do axios para incluir metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: RequestMetadata;
  }
  interface InternalAxiosRequestConfig {
    metadata?: RequestMetadata;
  }
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: getBaseURL(),
      timeout: 15000, // 15 segundos
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 🔥 REQUEST INTERCEPTOR - Adicionar token automaticamente
    this.client.interceptors.request.use(
      async (config) => {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Adicionar ID único para tracking
        config.metadata = { requestId };
        
        console.log(`🔄 [${requestId}] ${config.method?.toUpperCase()} ${config.url}`);
        
        // Adicionar token se disponível
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.warn('⚠️ Erro ao obter token do storage:', error);
        }

        return config;
      },
      (error) => {
        console.error('❌ Erro no request interceptor:', error);
        return Promise.reject(error);
      }
    );

    // 🔥 RESPONSE INTERCEPTOR - Tratamento de erros e logging
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const requestId = response.config.metadata?.requestId || 'unknown';
        
        console.log(
          `📥 [${requestId}] Response ${response.status}:`,
          response.data
        );

        return response;
      },
      async (error) => {
        const requestId = error.config?.metadata?.requestId || 'unknown';
        const status = error.response?.status;
        const data = error.response?.data;

        console.error(
          `❌ [${requestId}] Error in ${error.config?.method?.toUpperCase()} ${error.config?.url}:`,
          data?.message || error.message
        );

        // 🔥 Tratamento específico de erros
        if (status === 401) {
          // Token expirado ou inválido
          await this.handleUnauthorized();
          return Promise.reject(new Error('Sessão expirada. Faça login novamente.'));
        }

        if (status === 403) {
          return Promise.reject(new Error('Acesso negado.'));
        }

        if (status === 404) {
          return Promise.reject(new Error('Recurso não encontrado.'));
        }

        if (status === 422) {
          const errors = data?.errors || [{ message: 'Dados inválidos' }];
          return Promise.reject(new Error(errors[0]?.message || 'Dados inválidos'));
        }

        if (status >= 500) {
          return Promise.reject(new Error('Erro interno do servidor. Tente novamente.'));
        }

        // Erro de rede ou timeout
        if (!error.response) {
          return Promise.reject(new Error('Erro de conexão. Verifique sua internet.'));
        }

        return Promise.reject(new Error(data?.message || 'Erro inesperado'));
      }
    );
  }

  // 🔥 Lidar com erro 401 - Logout automático
  private async handleUnauthorized() {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      console.log('🚪 Usuário deslogado automaticamente devido ao erro 401');
      
      // Aqui você pode adicionar navegação para tela de login
      // Ex: navigationRef.reset({ index: 0, routes: [{ name: 'Auth' }] });
    } catch (error) {
      console.error('❌ Erro ao fazer logout automático:', error);
    }
  }

  // 🔥 Método para requisições GET
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro na requisição');
    }
    
    return response.data.data as T;
  }

  // 🔥 Método para requisições POST
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro na requisição');
    }
    
    return response.data.data as T;
  }

  // 🔥 Método para requisições PUT
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro na requisição');
    }
    
    return response.data.data as T;
  }

  // 🔥 Método para requisições DELETE
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro na requisição');
    }
    
    return response.data.data as T;
  }

  // 🔥 Método para testar conexão
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return {
        success: true,
        message: response.data?.message || 'Conectado'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro de conexão'
      };
    }
  }

  // 🔥 Método para configurar token manualmente
  async setAuthToken(token: string) {
    await AsyncStorage.setItem('auth_token', token);
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
  }

  // 🔥 Método para limpar token
  async clearAuthToken() {
    await AsyncStorage.removeItem('auth_token');
    delete this.client.defaults.headers.Authorization;
  }
}

// 🔥 Instância singleton
export const apiClient = new ApiClient();

// 🔥 Types para exportar
export type { ApiResponse };

// 🔥 Utility para debugging
export const logApiRequest = (method: string, url: string, data?: any) => {
  if (__DEV__) {
    console.log(`📡 API ${method.toUpperCase()}: ${url}`, data ? { data } : '');
  }
};