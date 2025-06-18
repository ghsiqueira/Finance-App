import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';

import AppNavigator from './src/navigation/AppNavigator';
import { useThemeStore } from './src/store/themeStore';
import { useAuthStore } from './src/store/authStore';
import { useOfflineStore } from './src/store/offlineStore';

// Criar cliente do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 10, // 10 minutos
    },
  },
});

export default function App() {
  const { theme, loadTheme } = useThemeStore();
  const { loadAuthData } = useAuthStore();
  const { initializeOfflineData } = useOfflineStore();

  useEffect(() => {
    // Inicializar dados salvos
    const initializeApp = async () => {
      try {
        await Promise.all([
          loadTheme(),
          loadAuthData(),
          initializeOfflineData(),
        ]);
      } catch (error) {
        console.error('Erro ao inicializar app:', error);
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

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}