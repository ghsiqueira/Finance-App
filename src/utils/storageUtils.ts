import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  USER_DATA: 'user_data',
  AUTH_TOKEN: 'auth_token',
  THEME_PREFERENCE: 'theme_preference',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  OFFLINE_TRANSACTIONS: 'offline_transactions',
  CACHE_PREFIX: 'cache_',
} as const;

export const storage = {
  // Salvar dados
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  },

  // Buscar dados
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  },

  // Remover item
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  },

  // Limpar tudo
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  // Buscar múltiplos itens
  async multiGet(keys: string[]): Promise<Record<string, any>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, any> = {};
      
      pairs.forEach(([key, value]) => {
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error getting multiple items:', error);
      return {};
    }
  },

  // Salvar múltiplos itens
  async multiSet(keyValuePairs: Array<[string, any]>): Promise<void> {
    try {
      const serializedPairs = keyValuePairs.map(([key, value]) => [
        key,
        JSON.stringify(value)
      ]);
      await AsyncStorage.multiSet(serializedPairs as [string, string][]);
    } catch (error) {
      console.error('Error setting multiple items:', error);
      throw error;
    }
  },

  // Obter todas as chaves
  async getAllKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },

  // Limpar cache com prefixo
  async clearCache(): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      const cacheKeys = Array.from(keys).filter(key => key.startsWith(StorageKeys.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },

  // Verificar se uma chave existe
  async hasItem(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      console.error(`Error checking if ${key} exists:`, error);
      return false;
    }
  },
};