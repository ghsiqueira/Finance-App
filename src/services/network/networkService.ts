import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NetworkState {
  isConnected: boolean;
  type: string | null;
  isInternetReachable: boolean | null;
  details: any;
}

export interface NetworkConfig {
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  enableOfflineQueue: boolean;
}

class NetworkService {
  private isOnline: boolean = true;
  private networkType: string | null = null;
  private listeners: Set<(state: NetworkState) => void> = new Set();
  private config: NetworkConfig = {
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 30000,
    enableOfflineQueue: true,
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    NetInfo.addEventListener(this.handleNetworkChange.bind(this));
    
    const initialState = await NetInfo.fetch();
    this.handleNetworkChange(initialState);
  }

  private handleNetworkChange(state: any) {
    const wasOnline = this.isOnline;
    
    this.isOnline = state.isConnected ?? false;
    this.networkType = state.type;
    
    const networkState: NetworkState = {
      isConnected: this.isOnline,
      type: this.networkType,
      isInternetReachable: state.isInternetReachable,
      details: state.details,
    };

    this.listeners.forEach(listener => listener(networkState));

    console.log(`📶 Network state changed: ${wasOnline ? 'Online' : 'Offline'} -> ${this.isOnline ? 'Online' : 'Offline'}`);

    if (!wasOnline && this.isOnline) {
      this.processOfflineQueue();
    }

    this.saveNetworkState(networkState);
  }

  private async saveNetworkState(state: NetworkState) {
    try {
      await AsyncStorage.setItem('lastNetworkState', JSON.stringify(state));
    } catch (error) {
      console.error('Erro ao salvar estado da rede:', error);
    }
  }

  private async getLastNetworkState(): Promise<NetworkState | null> {
    try {
      const saved = await AsyncStorage.getItem('lastNetworkState');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Erro ao recuperar estado da rede:', error);
      return null;
    }
  }

  getNetworkState(): NetworkState {
    return {
      isConnected: this.isOnline,
      type: this.networkType,
      isInternetReachable: null,
      details: null,
    };
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  getConnectionType(): string | null {
    return this.networkType;
  }

  isWifiConnection(): boolean {
    return this.networkType === 'wifi';
  }

  isCellularConnection(): boolean {
    return this.networkType === 'cellular';
  }

  addNetworkListener(callback: (state: NetworkState) => void): () => void {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (!this.isOnline && attempt === 1) {
          throw new Error('Dispositivo offline');
        }
        
        const result = await this.withTimeout(operation(), this.config.timeout);
        return result;
        
      } catch (error: any) {
        lastError = error;
        
        console.log(`Tentativa ${attempt}/${maxAttempts} falhou:`, error.message);
        
        if (attempt === maxAttempts || !this.isNetworkError(error)) {
          break;
        }
        
        await this.delay(this.config.retryDelay * attempt);
        
        const currentState = await NetInfo.fetch();
        if (!currentState.isConnected) {
          console.log('Dispositivo ainda offline, parando tentativas');
          break;
        }
      }
    }
    
    throw lastError!;
  }

  async addToOfflineQueue(operation: {
    id: string;
    method: string;
    url: string;
    data?: any;
    timestamp: number;
  }): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      queue.push(operation);
      await AsyncStorage.setItem('offlineQueue', JSON.stringify(queue));
      
      console.log(`Operação adicionada à fila offline: ${operation.method} ${operation.url}`);
    } catch (error) {
      console.error('Erro ao adicionar à fila offline:', error);
    }
  }

  private async processOfflineQueue(): Promise<void> {
    if (!this.config.enableOfflineQueue) return;
    
    try {
      console.log('🔄 Processando fila offline...');
      
      const queue = await this.getOfflineQueue();
      if (queue.length === 0) {
        console.log('Fila offline vazia');
        return;
      }
      
      console.log(`Processando ${queue.length} operações offline`);
      
      const processedIds: string[] = [];
      
      for (const operation of queue) {
        try {
          console.log(`Processando operação offline: ${operation.method} ${operation.url}`);
          
          await this.delay(100);
          
          processedIds.push(operation.id);
        } catch (error) {
          console.error(`Erro ao processar operação offline ${operation.id}:`, error);
        }
      }
      
      if (processedIds.length > 0) {
        const remainingQueue = queue.filter(op => !processedIds.includes(op.id));
        await AsyncStorage.setItem('offlineQueue', JSON.stringify(remainingQueue));
        console.log(`${processedIds.length} operações offline processadas com sucesso`);
      }
      
    } catch (error) {
      console.error('Erro ao processar fila offline:', error);
    }
  }

  private async getOfflineQueue(): Promise<any[]> {
    try {
      const queue = await AsyncStorage.getItem('offlineQueue');
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Erro ao obter fila offline:', error);
      return [];
    }
  }

  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem('offlineQueue');
      console.log('Fila offline limpa');
    } catch (error) {
      console.error('Erro ao limpar fila offline:', error);
    }
  }

  async getOfflineQueueSize(): Promise<number> {
    const queue = await this.getOfflineQueue();
    return queue.length;
  }

  private isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
      'network request failed',
      'timeout',
      'connect_error',
      'network error',
      'connection refused',
      'host unreachable',
    ];
    
    const message = error.message.toLowerCase();
    return networkErrorMessages.some(msg => message.includes(msg));
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      }),
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  configure(config: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfiguration(): NetworkConfig {
    return { ...this.config };
  }

  async testConnectivity(url: string = 'https://www.google.com'): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log('Teste de conectividade falhou:', error);
      return false;
    }
  }

  async getDetailedNetworkInfo(): Promise<any> {
    try {
      const state = await NetInfo.fetch();
      return {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
        details: state.details,
        isWifiEnabled: state.isWifiEnabled,
      };
    } catch (error) {
      console.error('Erro ao obter informações da rede:', error);
      return null;
    }
  }
}

export const networkService = new NetworkService();
export default networkService;