import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

interface LoadingProps {
  size?: 'small' | 'large';
  message?: string;
  overlay?: boolean;
  style?: ViewStyle;
}

export default function Loading({ 
  size = 'large', 
  message, 
  overlay = false,
  style 
}: LoadingProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const containerStyle = overlay ? styles.overlay : styles.container;

  return (
    <View style={[
      containerStyle, 
      { backgroundColor: overlay ? 'rgba(0,0,0,0.5)' : themeConfig.colors.background },
      style
    ]}>
      <ActivityIndicator 
        size={size} 
        color={themeConfig.colors.primary} 
      />
      {message && (
        <Text style={[
          styles.message, 
          { 
            color: overlay ? '#ffffff' : themeConfig.colors.text,
            fontSize: size === 'small' ? 12 : 16 
          }
        ]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  message: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});