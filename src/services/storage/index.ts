import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStorage } from './auth';
import { offlineStorage } from './offline';
import { transactionStorage } from './transactions';

export interface StorageService {
  setItem<T>(key: string, value: T): Promise<void>;
  getItem<T>(key: string): Promise<T | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  
  multiGet(keys: string[]): Promise<Record<string, any>>;
  multiSet(keyValuePairs: Array<[string, any]>): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  
  clearCache(): Promise<void>;
  getCacheSize(): Promise<number>;
  
  hasItem(key: string): Promise<boolean>;
  getStorageInfo(): Promise<StorageInfo>;
}

export interface StorageInfo {
  totalKeys: number;
  usedSpace: number; 
  authData: boolean;
  offlineData: boolean;
  cacheData: boolean;
  lastCleanup: string | null;
}

class StorageManager implements StorageService {
  private readonly CACHE_PREFIX = 'cache_';
  private readonly CLEANUP_KEY = 'last_cleanup';
  private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; 

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Erro ao salvar ${key}:`, error);
      throw error;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;

      const parsed = JSON.parse(value);
      
      if (parsed.timestamp && key.startsWith(this.CACHE_PREFIX)) {
        const age = Date.now() - parsed.timestamp;
        if (age > this.MAX_CACHE_AGE) {
          await this.removeItem(key);
          return null;
        }
      }

      return parsed.data || parsed; 
    } catch (error) {
      console.error(`Erro ao recuperar ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Erro ao remover ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      console.log('🧹 Storage completamente limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar storage:', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('❌ Erro ao obter todas as chaves:', error);
      return [];
    }
  }

  async multiGet(keys: string[]): Promise<Record<string, any>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, any> = {};
      
      pairs.forEach(([key, value]) => {
        if (value) {
          try {
            const parsed = JSON.parse(value);
            result[key] = parsed.data || parsed;
          } catch {
            result[key] = value;
          }
        }
      });
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao obter múltiplos itens:', error);
      return {};
    }
  }

  async multiSet(keyValuePairs: Array<[string, any]>): Promise<void> {
    try {
      const serializedPairs = keyValuePairs.map(([key, value]) => [
        key,
        JSON.stringify({
          data: value,
          timestamp: Date.now(),
        })
      ]);
      await AsyncStorage.multiSet(serializedPairs as [string, string][]);
    } catch (error) {
      console.error('❌ Erro ao salvar múltiplos itens:', error);
      throw error;
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('❌ Erro ao remover múltiplos itens:', error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      const cacheKeys = Array.from(keys).filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await this.multiRemove(cacheKeys);
        console.log(`🧹 Cache limpo: ${cacheKeys.length} itens removidos`);
      }
      
      await this.setItem(this.CLEANUP_KEY, new Date().toISOString());
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const keys = await this.getAllKeys();
      return Array.from(keys).filter(key => key.startsWith(this.CACHE_PREFIX)).length;
    } catch (error) {
      return 0;
    }
  }

  async hasItem(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      return false;
    }
  }

  async getStorageInfo(): Promise<StorageInfo> {
    try {
      const keys = await this.getAllKeys();
      const keysArray = Array.from(keys);
      
      let estimatedSize = 0;
      const sampleKeys = keysArray.slice(0, 10); 
      
      for (const key of sampleKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          estimatedSize += value.length;
        }
      }
      
      const averageSize = estimatedSize / sampleKeys.length;
      const totalEstimatedSize = Math.round(averageSize * keysArray.length);

      return {
        totalKeys: keysArray.length,
        usedSpace: totalEstimatedSize,
        authData: keysArray.some(key => key.includes('auth')),
        offlineData: keysArray.some(key => key.includes('offline')),
        cacheData: keysArray.some(key => key.startsWith(this.CACHE_PREFIX)),
        lastCleanup: await this.getItem(this.CLEANUP_KEY),
      };
    } catch (error) {
      return {
        totalKeys: 0,
        usedSpace: 0,
        authData: false,
        offlineData: false,
        cacheData: false,
        lastCleanup: null,
      };
    }
  }

  async setCacheItem<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const cacheData = {
        data: value,
        timestamp: Date.now(),
        ttl: ttl || this.MAX_CACHE_AGE,
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error(`Erro ao salvar cache ${key}:`, error);
    }
  }

  async getCacheItem<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const value = await AsyncStorage.getItem(cacheKey);
      
      if (!value) return null;

      const cached = JSON.parse(value);
      const age = Date.now() - cached.timestamp;
      
      if (age > (cached.ttl || this.MAX_CACHE_AGE)) {
        await this.removeItem(cacheKey);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.error(`Erro ao recuperar cache ${key}:`, error);
      return null;
    }
  }

  async performMaintenanceCleanup(): Promise<void> {
    try {
      console.log('🧹 Iniciando limpeza de manutenção...');
      
      const keys = await this.getAllKeys();
      const now = Date.now();
      let removedCount = 0;

      for (const key of keys) {
        try {
          if (key.startsWith(this.CACHE_PREFIX)) {
            const value = await AsyncStorage.getItem(key);
            if (value) {
              const cached = JSON.parse(value);
              const age = now - (cached.timestamp || 0);
              
              if (age > this.MAX_CACHE_AGE) {
                await this.removeItem(key);
                removedCount++;
              }
            }
          }
        } catch (error) {
          console.error(`Erro ao processar chave ${key}:`, error);
        }
      }

      await this.setItem(this.CLEANUP_KEY, new Date().toISOString());
      console.log(`✅ Limpeza concluída: ${removedCount} itens removidos`);
    } catch (error) {
      console.error('❌ Erro na limpeza de manutenção:', error);
    }
  }

  async createBackup(): Promise<Record<string, any>> {
    try {
      const keys = await this.getAllKeys();
      const backup: Record<string, any> = {};
      
      const keysToBackup = Array.from(keys).filter(key => 
        !key.startsWith(this.CACHE_PREFIX)
      );

      const data = await this.multiGet(keysToBackup);
      
      return {
        timestamp: Date.now(),
        version: '1.0',
        data,
      };
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);
      throw error;
    }
  }

  async restoreFromBackup(backup: Record<string, any>): Promise<void> {
    try {
      if (!backup.data) {
        throw new Error('Backup inválido');
      }

      const pairs = Object.entries(backup.data);
      await this.multiSet(pairs);
      
      console.log(`✅ Restore concluído: ${pairs.length} itens restaurados`);
    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      throw error;
    }
  }
}

export const storageManager = new StorageManager();

export {
  authStorage,
  offlineStorage,
  transactionStorage,
  storageManager as storage,
};

const initializeStorageMaintenance = () => {
  setInterval(() => {
    storageManager.performMaintenanceCleanup();
  }, 24 * 60 * 60 * 1000);

  setTimeout(() => {
    storageManager.performMaintenanceCleanup();
  }, 60 * 1000);
};

if (!__DEV__) {
  initializeStorageMaintenance();
}

export default storageManager;