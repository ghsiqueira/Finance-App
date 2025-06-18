// src/config/api.js
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    // Desenvolvimento
    if (Platform.OS === 'android') {
      // Android Emulator usa 10.0.2.2 para acessar localhost da máquina host
      return 'http://10.0.2.2:3000/api';
    } else if (Platform.OS === 'ios') {
      // iOS Simulator pode usar localhost
      return 'http://localhost:3000/api';
    }
  }
  
  // Produção - usar variável de ambiente ou URL padrão
  return process.env.API_BASE_URL || 'https://sua-api-producao.com/api';
};

export const API_BASE_URL = getApiUrl();

// Para debug
console.log(`🔗 API configurada para: ${API_BASE_URL} (Platform: ${Platform.OS})`);

export default {
  API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};