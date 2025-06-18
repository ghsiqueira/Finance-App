import React from 'react';
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
  const { isAuthenticated, isLoading } = useAuthStore();
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  if (isLoading) {
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