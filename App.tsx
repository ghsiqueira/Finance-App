import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';

import AppNavigator from './src/navigation/AppNavigator';
import { useThemeStore } from './src/store/themeStore';
import { useAuthStore } from './src/store/authStore';
import { useOfflineStore } from './src/store/offlineStore';
import { authService } from './src/services/api/auth';
import { Alert } from 'react-native';

// Criar cliente do React Query com configurações melhoradas
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Não repetir em erros de autenticação
        if (error?.message?.includes('401') || error?.message?.includes('Token')) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 10, // 10 minutos
    },
  },
});

export default function App() {
  const { theme, loadTheme } = useThemeStore();
  const { loadAuthData } = useAuthStore();
  const { initializeOfflineData } = useOfflineStore();
  const [debugInfo, setDebugInfo] = useState<{
    backendConnected: boolean;
    initializationComplete: boolean;
    errors: string[];
  }>({
    backendConnected: false,
    initializationComplete: false,
    errors: []
  });

  useEffect(() => {
    // Inicializar dados salvos
    const initializeApp = async () => {
      const errors: string[] = [];
      
      try {
        console.log('🚀 Iniciando aplicação...');
        
        // Testar conexão com backend
        const connectionTest = await authService.testConnection();
        setDebugInfo(prev => ({ 
          ...prev, 
          backendConnected: connectionTest.success 
        }));
        
        if (!connectionTest.success) {
          errors.push(`Backend: ${connectionTest.message}`);
          console.warn('⚠️ Backend não conectado:', connectionTest.message);
        }

        // Carregar dados locais
        await Promise.all([
          loadTheme().catch(err => {
            errors.push(`Tema: ${err.message}`);
            console.warn('⚠️ Erro ao carregar tema:', err);
          }),
          loadAuthData().catch(err => {
            errors.push(`Auth: ${err.message}`);
            console.warn('⚠️ Erro ao carregar dados de auth:', err);
          }),
          initializeOfflineData().catch(err => {
            errors.push(`Offline: ${err.message}`);
            console.warn('⚠️ Erro ao inicializar dados offline:', err);
          }),
        ]);

        setDebugInfo(prev => ({ 
          ...prev, 
          initializationComplete: true,
          errors 
        }));

        console.log('✅ Aplicação inicializada');
        
        // Mostrar alerta se houver problemas críticos
        if (!connectionTest.success && __DEV__) {
          Alert.alert(
            '⚠️ Aviso de Desenvolvimento',
            `Backend não conectado: ${connectionTest.message}\n\nVerifique se o servidor está rodando na porta 3000.`,
            [{ text: 'OK' }]
          );
        }
        
      } catch (error: any) {
        console.error('❌ Erro ao inicializar app:', error);
        errors.push(`Geral: ${error.message}`);
        setDebugInfo(prev => ({ 
          ...prev, 
          initializationComplete: true,
          errors 
        }));
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    // Configurar barra de status baseada no tema
    SystemUI.setBackgroundColorAsync(
      theme === 'dark' ? '#000000' : '#ffffff'
    );
  }, [theme]);

  // Logs de debug no desenvolvimento
  if (__DEV__) {
    console.log('🔧 Debug Info:', debugInfo);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
