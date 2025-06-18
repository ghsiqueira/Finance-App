// src/services/api/client.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../../store/authStore';
import { useOfflineStore } from '../../store/offlineStore';

// Configuração base da API
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;
  private isOnline: boolean = true;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupNetworkListener();
  }

  private setupInterceptors() {
    // Request interceptor - adiciona token de autenticação
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Erro ao obter token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - trata erros globais
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        // Token expirado ou inválido
        if (error.response?.status === 401) {
          const { logout } = useAuthStore.getState();
          await logout();
        }

        // Erro de conexão - armazenar para sync offline
        if (!this.isOnline && error.code === 'NETWORK_ERROR' && error.config) {
          const { addPendingRequest } = useOfflineStore.getState();
          await addPendingRequest({
            method: error.config.method || 'GET',
            url: error.config.url || '',
            data: error.config.data,
            type: 'other',
          });
        }

        return Promise.reject(error);
      }
    );
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Se voltou online, sincronizar dados pendentes
      if (!wasOnline && this.isOnline) {
        this.syncPendingRequests();
      }
    });
  }

  private async syncPendingRequests() {
    try {
      const { getPendingRequests, clearPendingRequests } = useOfflineStore.getState();
      const pendingRequests = await getPendingRequests();

      for (const request of pendingRequests) {
        try {
          await this.client.request(request);
        } catch (error) {
          console.error('Erro ao sincronizar request:', error);
        }
      }

      await clearPendingRequests();
    } catch (error) {
      console.error('Erro na sincronização:', error);
    }
  }

  // Métodos HTTP
  async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // Verificar status da conexão
  getConnectionStatus(): boolean {
    return this.isOnline;
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
        return JSON.parse(cachedData);
      }

      // Se online, fazer request e cachear
      if (this.isOnline) {
        const data = await requestFn();
        await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(data));
        return data;
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
        return JSON.parse(cachedData);
      }
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;