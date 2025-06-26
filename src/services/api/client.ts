// src/services/api/client.ts - Versão sem ciclo de dependência
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
// Remover imports que causam ciclo de dependência
// import { useAuthStore } from '../../store/authStore';
// import { useOfflineStore } from '../../store/offlineStore';

const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api';
    } else if (Platform.OS === 'ios') {
      return 'http://localhost:3000/api';
    }
  }
  return process.env.API_BASE_URL || 'https://sua-api-producao.com/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log(`🔗 API Base URL: ${API_BASE_URL} (Platform: ${Platform.OS})`);

interface PendingRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  timestamp: number;
  type: 'transaction' | 'budget' | 'goal' | 'other';
}

class ApiClient {
  private baseURL: string;
  private isOnline: boolean = true;
  private pendingRequests: PendingRequest[] = [];

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.setupNetworkListener();
    console.log(`📡 ApiClient inicializado com URL: ${this.baseURL}`);
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log(`📶 Status da rede: ${this.isOnline ? 'Online' : 'Offline'}`);

      if (!wasOnline && this.isOnline) {
        this.syncPendingRequests();
      }
    });
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // Usar a mesma chave que o authStore usa
      const token = await AsyncStorage.getItem('auth_token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'FinanceApp/1.0',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return headers;
    } catch (error) {
      console.warn('⚠️ Erro ao obter headers de auth:', error);
      return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'FinanceApp/1.0',
      };
    }
  }

  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options: {
      timeout?: number;
      retries?: number;
      skipAuth?: boolean;
    } = {}
  ): Promise<T> {
    const {
      timeout = 30000,
      retries = 2,
      skipAuth = false
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔄 [${requestId}] ${method} ${url}`);
    if (data && __DEV__) {
      console.log(`📤 [${requestId}] Request data:`, data);
    }

    try {
      const headers = skipAuth ? 
        {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FinanceApp/1.0',
        } : 
        await this.getAuthHeaders();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📥 [${requestId}] Response ${response.status}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          
          // Log da resposta de erro para debug
          console.error(`❌ [${requestId}] Error Response:`, errorData);
        } catch (e) {
          // Se não conseguir parsear o JSON, usar o status HTTP
        }

        // Tratar erro 401 (Unauthorized) - Token expirado
        if (response.status === 401) {
          console.log('🚪 Token expirado, limpando AsyncStorage...');
          await AsyncStorage.multiRemove(['auth_token', 'user_data']);
          throw new Error('Sessão expirada. Faça login novamente.');
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      console.log(`📥 [${requestId}] Success Response:`, result);

      return result;

    } catch (error: any) {
      console.error(`❌ [${requestId}] Request failed:`, error.message);

      if (error.name === 'AbortError') {
        throw new Error('Timeout: Requisição demorou muito para responder');
      }

      if (!navigator.onLine) {
        throw new Error('Sem conexão com a internet');
      }

      throw error;
    }
  }

  // Métodos convenientes para diferentes tipos de requisição
  async get<T = any>(endpoint: string, options = {}): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T = any>(endpoint: string, data?: any, options = {}): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T = any>(endpoint: string, data?: any, options = {}): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async delete<T = any>(endpoint: string, options = {}): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // Método para sincronizar requisições pendentes (quando voltar online)
  private async syncPendingRequests() {
    if (this.pendingRequests.length === 0) return;

    console.log(`🔄 Sincronizando ${this.pendingRequests.length} requisições pendentes...`);

    const requestsToSync = [...this.pendingRequests];
    this.pendingRequests = [];

    for (const request of requestsToSync) {
      try {
        await this.request(
          request.method as any,
          request.url,
          request.data,
          { retries: 1 }
        );
        console.log(`✅ Requisição ${request.id} sincronizada`);
      } catch (error) {
        console.error(`❌ Falha ao sincronizar requisição ${request.id}:`, error);
        // Recolocar na fila se ainda estivermos online
        if (this.isOnline) {
          this.pendingRequests.push(request);
        }
      }
    }

    console.log('✅ Sincronização concluída');
  }

  // Método para adicionar requisição à fila offline
  private addToPendingRequests(
    method: string,
    url: string,
    data?: any,
    type: PendingRequest['type'] = 'other'
  ) {
    const request: PendingRequest = {
      id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method,
      url,
      data,
      timestamp: Date.now(),
      type,
    };

    this.pendingRequests.push(request);
    console.log(`📥 Requisição adicionada à fila offline: ${request.id}`);
  }

  // Verificar status da rede
  isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  // Obter requisições pendentes
  getPendingRequests(): PendingRequest[] {
    return [...this.pendingRequests];
  }

  // Limpar requisições pendentes
  clearPendingRequests(): void {
    this.pendingRequests = [];
    console.log('🗑️ Fila de requisições pendentes limpa');
  }
}

export const apiClient = new ApiClient();