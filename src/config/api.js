import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api';
    } else if (Platform.OS === 'ios') {
      return 'http://localhost:3000/api';
    }
  }
  
  return process.env.API_BASE_URL || 'https://sua-api-producao.com/api';
};

export const API_BASE_URL = getApiUrl();

console.log(`🔗 API configurada para: ${API_BASE_URL} (Platform: ${Platform.OS})`);

export default {
  API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};