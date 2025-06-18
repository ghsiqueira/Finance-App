// src/components/common/Button.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'error';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  gradient?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  gradient = false,
  style,
  textStyle,
  ...props
}: ButtonProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: themeConfig.borderRadius.md,
      ...getSizeStyle(),
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    if (disabled || loading) {
      baseStyle.opacity = 0.6;
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: themeConfig.colors.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: themeConfig.colors.secondary,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: themeConfig.colors.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: themeConfig.colors.success,
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: themeConfig.colors.error,
        };
      default:
        return baseStyle;
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: themeConfig.spacing.md,
          paddingVertical: themeConfig.spacing.sm,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingHorizontal: themeConfig.spacing.xl,
          paddingVertical: themeConfig.spacing.md,
          minHeight: 56,
        };
      default: // medium
        return {
          paddingHorizontal: themeConfig.spacing.lg,
          paddingVertical: themeConfig.spacing.md,
          minHeight: 48,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: themeConfig.typography.fontWeight.semibold,
      textAlign: 'center',
    };

    switch (size) {
      case 'small':
        baseTextStyle.fontSize = themeConfig.typography.fontSize.sm;
        break;
      case 'large':
        baseTextStyle.fontSize = themeConfig.typography.fontSize.lg;
        break;
      default:
        baseTextStyle.fontSize = themeConfig.typography.fontSize.md;
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'success':
      case 'error':
        baseTextStyle.color = '#ffffff';
        break;
      case 'outline':
        baseTextStyle.color = themeConfig.colors.primary;
        break;
      case 'ghost':
        baseTextStyle.color = themeConfig.colors.text;
        break;
    }

    return baseTextStyle;
  };

  const buttonStyle = getButtonStyle();
  const buttonTextStyle = getTextStyle();

  const content = (
    <>
      {loading && (
        <ActivityIndicator
          size="small"
          color={buttonTextStyle.color}
          style={{ marginRight: leftIcon || title ? themeConfig.spacing.sm : 0 }}
        />
      )}
      {leftIcon && !loading && (
        <React.Fragment>
          {leftIcon}
          {title ? <Text style={{ width: themeConfig.spacing.sm }} /> : null}
        </React.Fragment>
      )}
      {title ? (
        <Text style={[buttonTextStyle, textStyle]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      {rightIcon && !loading && (
        <React.Fragment>
          {title ? <Text style={{ width: themeConfig.spacing.sm }} /> : null}
          {rightIcon}
        </React.Fragment>
      )}
    </>
  );

  if (gradient && (variant === 'primary' || variant === 'secondary')) {
    const gradientColors: readonly [string, string, ...string[]] = variant === 'primary' 
      ? themeConfig.colors.primaryGradient 
      : [themeConfig.colors.secondary, themeConfig.colors.primary] as const;

    return (
      <TouchableOpacity
        {...props}
        disabled={disabled || loading}
        style={[{ borderRadius: buttonStyle.borderRadius }, style]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[buttonStyle, { backgroundColor: 'transparent' }]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled || loading}
      style={[buttonStyle, style]}
    >
      {content}
    </TouchableOpacity>
  );
}