// src/services/api/client.ts - VERSÃO COMPLETA CORRIGIDA
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../../store/authStore';
import { useOfflineStore } from '../../store/offlineStore';

// Configuração base da API
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Interface para requisições pendentes
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
  }

  // Configurar listener de rede
  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log(`📶 Status da rede: ${this.isOnline ? 'Online' : 'Offline'}`);

      // Se voltou online, sincronizar dados pendentes
      if (!wasOnline && this.isOnline) {
        this.syncPendingRequests();
      }
    });
  }

  // Obter headers de autenticação
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
      };
    }
  }

  // Método principal de requisição
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
    const requestId = `req_${Date.now()}_${Math.random()}`;
    
    console.log(`🔄 [${requestId}] ${method} ${url}`);
    if (data && __DEV__) {
      console.log(`📤 [${requestId}] Request body:`, data);
    }

    try {
      const headers = skipAuth ? {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      } : await this.getAuthHeaders();

      const config: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout ? AbortSignal.timeout(timeout) : undefined,
      };

      if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);
      
      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      
      console.log(`📥 [${requestId}] Response ${response.status}:`, 
        __DEV__ ? responseData : { status: response.status });

      // Verificar se é erro de autenticação
      if (response.status === 401 && !skipAuth) {
        console.warn('🔐 Token expirado, fazendo logout...');
        const { logout } = useAuthStore.getState();
        await logout();
        throw new Error('Token expirado. Faça login novamente.');
      }

      if (!response.ok) {
        const errorMessage = typeof responseData === 'object' && responseData.message 
          ? responseData.message 
          : typeof responseData === 'string' 
            ? responseData
            : `HTTP ${response.status}: ${response.statusText}`;
            
        throw new Error(errorMessage);
      }

      return responseData;
      
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error in ${method} ${url}:`, error.message);
      
      // Se offline e não é uma requisição crítica, adicionar à fila
      if (!this.isOnline && method !== 'GET' && !skipAuth) {
        await this.addPendingRequest({
          method,
          url: endpoint,
          data,
          type: this.getRequestType(endpoint),
        });
        
        throw new Error('Você está offline. A requisição será enviada quando a conexão for restaurada.');
      }
      
      // Tratamento específico de erros
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('Erro de conexão. Verifique se o backend está rodando na porta 3000.');
      }
      
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('Timeout na requisição. Tente novamente.');
      }

      if (error.message.includes('JSON.parse')) {
        throw new Error('Resposta inválida do servidor. Verifique a configuração do backend.');
      }
      
      // Tentar novamente se ainda há tentativas disponíveis
      if (retries > 0 && this.isOnline) {
        console.log(`🔄 Tentando novamente... (${retries} tentativas restantes)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.request(method, endpoint, data, { ...options, retries: retries - 1 });
      }
      
      throw error;
    }
  }

  // Determinar tipo da requisição para offline
  private getRequestType(endpoint: string): 'transaction' | 'budget' | 'goal' | 'other' {
    if (endpoint.includes('/transactions')) return 'transaction';
    if (endpoint.includes('/budgets')) return 'budget';
    if (endpoint.includes('/goals')) return 'goal';
    return 'other';
  }

  // Adicionar requisição pendente
  private async addPendingRequest(request: Omit<PendingRequest, 'id' | 'timestamp'>) {
    const pendingRequest: PendingRequest = {
      ...request,
      id: `pending_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
    };

    this.pendingRequests.push(pendingRequest);
    
    try {
      await AsyncStorage.setItem(
        'pendingRequests', 
        JSON.stringify(this.pendingRequests)
      );
      
      // Notificar store offline
      const { addPendingRequest } = useOfflineStore.getState();
      await addPendingRequest(request);
      
      console.log(`📋 Requisição adicionada à fila offline: ${request.method} ${request.url}`);
    } catch (error) {
      console.error('❌ Erro ao salvar requisição pendente:', error);
    }
  }

  // Sincronizar requisições pendentes
  private async syncPendingRequests() {
    console.log('🔄 Sincronizando requisições pendentes...');
    
    try {
      const stored = await AsyncStorage.getItem('pendingRequests');
      const pendingRequests: PendingRequest[] = stored ? JSON.parse(stored) : [];
      
      if (pendingRequests.length === 0) {
        console.log('✅ Nenhuma requisição pendente para sincronizar');
        return;
      }

      console.log(`📋 Encontradas ${pendingRequests.length} requisições pendentes`);
      
      for (const request of pendingRequests) {
        try {
          console.log(`🔄 Sincronizando: ${request.method} ${request.url}`);
          await this.request(request.method as any, request.url, request.data);
          
          // Remove da lista após sucesso
          this.pendingRequests = this.pendingRequests.filter(r => r.id !== request.id);
          
        } catch (error) {
          console.error(`❌ Erro ao sincronizar ${request.method} ${request.url}:`, error);
        }
      }

      // Atualizar AsyncStorage
      await AsyncStorage.setItem('pendingRequests', JSON.stringify(this.pendingRequests));
      
      // Limpar store offline
      const { clearPendingRequests } = useOfflineStore.getState();
      await clearPendingRequests();
      
      console.log('✅ Sincronização de requisições pendentes concluída');
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    }
  }

  // Métodos de conveniência
  async get<T = any>(endpoint: string, options?: any): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T = any>(endpoint: string, data?: any, options?: any): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T = any>(endpoint: string, data?: any, options?: any): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async delete<T = any>(endpoint: string, options?: any): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // Verificar status da conexão
  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  // Teste de conectividade com o backend
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔍 Testando conexão com backend...');
      
      const healthUrl = this.baseURL.replace('/api', '/api/health');
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend conectado:', data);
        return { 
          success: true, 
          message: 'Backend conectado e funcionando', 
          data 
        };
      } else {
        console.log('⚠️ Backend respondeu com erro:', response.status);
        return { 
          success: false, 
          message: `Backend respondeu com status ${response.status}` 
        };
      }
    } catch (error: any) {
      console.error('❌ Erro ao testar conexão:', error);
      
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return { 
          success: false, 
          message: 'Timeout - Backend não responde (verifique se está rodando)' 
        };
      }
      
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        return { 
          success: false, 
          message: 'Erro de rede - Backend provavelmente não está rodando na porta 3000' 
        };
      }
      
      return { 
        success: false, 
        message: `Erro de conexão: ${error.message}` 
      };
    }
  }

  // Método para requisições offline-first
  async offlineFirst<T = any>(
    key: string,
    requestFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<T> {
    try {
      // Tentar buscar dados cached primeiro
      const cachedData = await AsyncStorage.getItem(`cache_${key}`);
      
      if (!this.isOnline && cachedData) {
        console.log(`📱 Usando dados offline para: ${key}`);
        return JSON.parse(cachedData);
      }

      // Se online, fazer request e cachear
      if (this.isOnline) {
        try {
          const data = await requestFn();
          await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(data));
          return data;
        } catch (error) {
          console.warn(`⚠️ Falha na requisição online para ${key}, tentando cache...`);
          if (cachedData) {
            return JSON.parse(cachedData);
          }
          throw error;
        }
      }

      // Se offline e tem fallback
      if (fallbackFn) {
        return await fallbackFn();
      }

      // Se offline e tem cache
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      throw new Error('Sem conexão e sem dados em cache');
    } catch (error) {
      // Em caso de erro, tentar cache como último recurso
      const cachedData = await AsyncStorage.getItem(`cache_${key}`);
      if (cachedData) {
        console.log(`📱 Usando cache como último recurso para: ${key}`);
        return JSON.parse(cachedData);
      }
      throw error;
    }
  }

  // Limpar cache
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🧹 Cache limpo: ${cacheKeys.length} itens removidos`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }

  // Obter informações de debug
  getDebugInfo() {
    return {
      baseURL: this.baseURL,
      isOnline: this.isOnline,
      pendingRequestsCount: this.pendingRequests.length,
      pendingRequests: this.pendingRequests.map(r => ({
        id: r.id,
        method: r.method,
        url: r.url,
        type: r.type,
        timestamp: r.timestamp
      }))
    };
  }
}

// Instância singleton do cliente
export const apiClient = new ApiClient();
export default apiClient;

// Tipos para melhor TypeScript
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
  message?: string;
}