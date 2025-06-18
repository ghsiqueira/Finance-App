import React from 'react';

export const debugApiCalls = {
  log: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(`[API DEBUG] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    if (__DEV__) {
      console.error(`[API ERROR] ${message}`, error);
    }
  },
  request: (method: string, url: string, data?: any) => {
    if (__DEV__) {
      console.log(`[API REQUEST] ${method} ${url}`, data);
    }
  },
  response: (status: number, url: string, data?: any) => {
    if (__DEV__) {
      console.log(`[API RESPONSE] ${status} ${url}`, data);
    }
  }
};

export const testBackendConnection = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();
    
    debugApiCalls.response(response.status, '/api/health', data);
    
    if (response.ok) {
      return {
        success: true,
        message: 'Conexão com backend estabelecida',
        details: data
      };
    } else {
      return {
        success: false,
        message: 'Backend respondeu com erro',
        details: data
      };
    }
  } catch (error) {
    debugApiCalls.error('Erro ao conectar com backend', error);
    return {
      success: false,
      message: 'Não foi possível conectar com o backend',
      details: error
    };
  }
};

export const improvedApiClient = {
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<T> {
    const fullUrl = `http://localhost:3000${url}`;
    
    debugApiCalls.request(method, fullUrl, data);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const token = await import('@react-native-async-storage/async-storage')
        .then(({ default: AsyncStorage }) => AsyncStorage.getItem('token'))
        .catch(() => null);

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const config: RequestInit = {
        method,
        headers,
      };

      if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(fullUrl, config);
      const responseData = await response.json();
      
      debugApiCalls.response(response.status, fullUrl, responseData);

      if (!response.ok) {
        throw new Error(responseData.message || `HTTP ${response.status}`);
      }

      return responseData;
    } catch (error) {
      debugApiCalls.error(`Request failed: ${method} ${fullUrl}`, error);
      throw error;
    }
  }
};

export const useDebugInfo = () => {
  const [debugInfo, setDebugInfo] = React.useState({
    backendStatus: 'checking',
    lastError: null as any,
    apiCalls: [] as any[]
  });

  const checkBackend = async () => {
    const result = await testBackendConnection();
    setDebugInfo(prev => ({
      ...prev,
      backendStatus: result.success ? 'connected' : 'error',
      lastError: result.success ? null : result
    }));
  };

  React.useEffect(() => {
    checkBackend();
  }, []);

  return {
    debugInfo,
    checkBackend,
    clearErrors: () => setDebugInfo(prev => ({ ...prev, lastError: null }))
  };
};