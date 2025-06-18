// src/components/common/Card.tsx
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'gradient';
  padding?: 'none' | 'small' | 'medium' | 'large';
  margin?: 'none' | 'small' | 'medium' | 'large';
  borderRadius?: 'small' | 'medium' | 'large' | 'full';
  gradient?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'medium',
  margin = 'none',
  borderRadius = 'medium',
  gradient,
  style,
  onPress,
  disabled = false,
  ...props
}: CardProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const getPaddingStyle = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return {};
      case 'small':
        return { padding: themeConfig.spacing.sm };
      case 'large':
        return { padding: themeConfig.spacing.xl };
      default: // medium
        return { padding: themeConfig.spacing.md };
    }
  };

  const getMarginStyle = (): ViewStyle => {
    switch (margin) {
      case 'none':
        return {};
      case 'small':
        return { margin: themeConfig.spacing.sm };
      case 'large':
        return { margin: themeConfig.spacing.xl };
      default: // medium
        return { margin: themeConfig.spacing.md };
    }
  };

  const getBorderRadiusStyle = (): ViewStyle => {
    switch (borderRadius) {
      case 'small':
        return { borderRadius: themeConfig.borderRadius.sm };
      case 'large':
        return { borderRadius: themeConfig.borderRadius.lg };
      case 'full':
        return { borderRadius: themeConfig.borderRadius.full };
      default: // medium
        return { borderRadius: themeConfig.borderRadius.md };
    }
  };

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...getPaddingStyle(),
      ...getMarginStyle(),
      ...getBorderRadiusStyle(),
    };

    if (disabled) {
      baseStyle.opacity = 0.6;
    }

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: themeConfig.colors.card,
          borderWidth: 1,
          borderColor: themeConfig.colors.border,
        };
      case 'elevated':
        return {
          ...baseStyle,
          backgroundColor: themeConfig.colors.card,
          ...themeConfig.shadows.md,
        };
      case 'gradient':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      default: // default
        return {
          ...baseStyle,
          backgroundColor: themeConfig.colors.card,
          ...themeConfig.shadows.sm,
        };
    }
  };

  const cardStyle = getCardStyle();

  if (variant === 'gradient' && gradient) {
    const Component = onPress ? TouchableOpacity : View;
    
    return (
      <Component
        {...(onPress ? { onPress, disabled, ...props } : {})}
        style={[{ borderRadius: cardStyle.borderRadius }, style]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[cardStyle, { backgroundColor: 'transparent' }]}
        >
          {children}
        </LinearGradient>
      </Component>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[cardStyle, style]}
        activeOpacity={0.8}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}