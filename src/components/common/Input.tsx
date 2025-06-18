import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
}

const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  isPassword = false,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  variant = 'outlined',
  size = 'medium',
  ...props
}, ref) => {
  const [isSecureTextEntry, setIsSecureTextEntry] = useState(isPassword);
  const [isFocused, setIsFocused] = useState(false);
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          height: 40,
          fontSize: themeConfig.typography.fontSize.sm,
          paddingHorizontal: themeConfig.spacing.md,
        };
      case 'large':
        return {
          height: 56,
          fontSize: themeConfig.typography.fontSize.lg,
          paddingHorizontal: themeConfig.spacing.lg,
        };
      default:
        return {
          height: 48,
          fontSize: themeConfig.typography.fontSize.md,
          paddingHorizontal: themeConfig.spacing.md,
        };
    }
  };

  const getInputContainerStyle = (): ViewStyle => {
    const sizeStyle = getSizeStyle();
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: themeConfig.borderRadius.md,
      height: sizeStyle.height,
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: error 
            ? themeConfig.colors.error 
            : isFocused 
              ? themeConfig.colors.primary 
              : themeConfig.colors.border,
          backgroundColor: themeConfig.colors.background,
        };
      case 'filled':
        return {
          ...baseStyle,
          backgroundColor: themeConfig.colors.surface,
          borderWidth: 0,
        };
      default:
        return {
          ...baseStyle,
          borderBottomWidth: 1,
          borderBottomColor: error 
            ? themeConfig.colors.error 
            : isFocused 
              ? themeConfig.colors.primary 
              : themeConfig.colors.border,
          borderRadius: 0,
          backgroundColor: 'transparent',
        };
    }
  };

  const getInputStyle = (): TextStyle => {
    const sizeStyle = getSizeStyle();
    return {
      flex: 1,
      color: themeConfig.colors.text,
      fontSize: sizeStyle.fontSize,
      paddingHorizontal: leftIcon ? themeConfig.spacing.sm : sizeStyle.paddingHorizontal,
    };
  };

  const toggleSecureEntry = () => {
    setIsSecureTextEntry(!isSecureTextEntry);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[
          styles.label,
          {
            color: error ? themeConfig.colors.error : themeConfig.colors.text,
            fontSize: themeConfig.typography.fontSize.sm,
            fontWeight: themeConfig.typography.fontWeight.medium,
            marginBottom: themeConfig.spacing.xs,
          },
          labelStyle
        ]}>
          {label}
        </Text>
      )}
      
      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <View style={[styles.iconContainer, { marginLeft: themeConfig.spacing.md }]}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          ref={ref}
          style={[getInputStyle(), inputStyle]}
          secureTextEntry={isSecureTextEntry}
          placeholderTextColor={themeConfig.colors.textLight}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {isPassword && (
          <TouchableOpacity
            onPress={toggleSecureEntry}
            style={[styles.iconContainer, { marginRight: themeConfig.spacing.md }]}
          >
            <Ionicons
              name={isSecureTextEntry ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={themeConfig.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !isPassword && (
          <View style={[styles.iconContainer, { marginRight: themeConfig.spacing.md }]}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {error && (
        <Text style={[
          styles.error,
          {
            color: themeConfig.colors.error,
            fontSize: themeConfig.typography.fontSize.xs,
            marginTop: themeConfig.spacing.xs,
          },
          errorStyle
        ]}>
          {error}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    marginBottom: 4,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    marginTop: 4,
  },
});

Input.displayName = 'Input';

export default Input;