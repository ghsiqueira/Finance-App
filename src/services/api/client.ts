import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useOfflineStore } from '../../store/offlineStore';

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
      const token = await AsyncStorage.getItem('token');
      
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
      const headers = skipAuth ? {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'FinanceApp/1.0',
      } : await this.getAuthHeaders();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const config: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      
      console.log(`📥 [${requestId}] Response ${response.status}:`, 
        __DEV__ ? responseData : { status: response.status });

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
      
      if (!this.isOnline && method !== 'GET' && !skipAuth) {
        await this.addPendingRequest({
          method,
          url: endpoint,
          data,
          type: this.getRequestType(endpoint),
        });
        
        throw new Error('Você está offline. A requisição será enviada quando a conexão for restaurada.');
      }
      
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('Erro de conexão. Verifique se o backend está rodando na porta 3000.');
      }
      
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('Timeout na requisição. Tente novamente.');
      }

      if (error.message.includes('JSON.parse')) {
        throw new Error('Resposta inválida do servidor. Verifique a configuração do backend.');
      }
      
      if (retries > 0 && this.isOnline) {
        console.log(`🔄 Tentando novamente... (${retries} tentativas restantes)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.request(method, endpoint, data, { ...options, retries: retries - 1 });
      }
      
      throw error;
    }
  }

  private getRequestType(endpoint: string): 'transaction' | 'budget' | 'goal' | 'other' {
    if (endpoint.includes('/transactions')) return 'transaction';
    if (endpoint.includes('/budgets')) return 'budget';
    if (endpoint.includes('/goals')) return 'goal';
    return 'other';
  }

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
      
      const { addPendingRequest } = useOfflineStore.getState();
      await addPendingRequest(request);
      
      console.log(`📋 Requisição adicionada à fila offline: ${request.method} ${request.url}`);
    } catch (error) {
      console.error('❌ Erro ao salvar requisição pendente:', error);
    }
  }

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
          
          this.pendingRequests = this.pendingRequests.filter(r => r.id !== request.id);
          
        } catch (error) {
          console.error(`❌ Erro ao sincronizar ${request.method} ${request.url}:`, error);
        }
      }

      await AsyncStorage.setItem('pendingRequests', JSON.stringify(this.pendingRequests));
      
      const { clearPendingRequests } = useOfflineStore.getState();
      await clearPendingRequests();
      
      console.log('✅ Sincronização de requisições pendentes concluída');
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    }
  }

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

  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    const urlsToTest = [
      'http://10.0.2.2:3000/api/health',
      'http://localhost:3000/api/health',
      'http://127.0.0.1:3000/api/health',
    ];

    console.log('🔍 Testando conexão com backend...');
    
    for (const testUrl of urlsToTest) {
      try {
        console.log(`🔍 Testando: ${testUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'FinanceApp/1.0',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Backend conectado via: ${testUrl}`, data);
          
          const baseUrl = testUrl.replace('/health', '');
          if (baseUrl !== this.baseURL) {
            this.baseURL = baseUrl;
            console.log(`🔄 URL base atualizada para: ${this.baseURL}`);
          }
          
          return { 
            success: true, 
            message: `Backend conectado via ${testUrl}`, 
            data 
          };
        } else {
          console.log(`⚠️ ${testUrl} respondeu com status ${response.status}`);
        }
      } catch (error: any) {
        console.error(`❌ Erro ao testar ${testUrl}:`, error.message);
        
        if (error.name === 'AbortError') {
          console.log(`⏱️ Timeout em ${testUrl}`);
        }
      }
    }
    
    return { 
      success: false, 
      message: 'Não foi possível conectar ao backend. Verifique se está rodando na porta 3000.' 
    };
  }

  async offlineFirst<T = any>(
    key: string,
    requestFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<T> {
    try {
      const cachedData = await AsyncStorage.getItem(`cache_${key}`);
      
      if (!this.isOnline && cachedData) {
        console.log(`📱 Usando dados offline para: ${key}`);
        return JSON.parse(cachedData);
      }

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

      if (fallbackFn) {
        return await fallbackFn();
      }

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      throw new Error('Sem conexão e sem dados em cache');
    } catch (error) {
      const cachedData = await AsyncStorage.getItem(`cache_${key}`);
      if (cachedData) {
        console.log(`📱 Usando cache como último recurso para: ${key}`);
        return JSON.parse(cachedData);
      }
      throw error;
    }
  }

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

  getDebugInfo() {
    return {
      baseURL: this.baseURL,
      isOnline: this.isOnline,
      platform: Platform.OS,
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

export const apiClient = new ApiClient();
export default apiClient;

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