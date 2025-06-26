import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { getTheme } from '../styles/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, isInitialized, initialize } = useAuthStore();
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  // Inicializar o AuthStore quando o app carrega
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Mostrar loading enquanto não está inicializado ou está carregando
  if (!isInitialized || isLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: themeConfig.colors.background
      }}>
        <ActivityIndicator size="large" color={themeConfig.colors.primary} />
      </View>
    );
  }

  console.log('🧭 AppNavigator render:', { isAuthenticated, isLoading, isInitialized });

  return (
    <NavigationContainer theme={themeConfig}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}