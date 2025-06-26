// src/components/common/Header.tsx - Versão corrigida

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

interface HeaderProps {
  title: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightComponent?: React.ReactNode;
  showBackButton?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

export default function Header({
  title,
  leftIcon = 'arrow-back',
  onLeftPress,
  rightIcon,
  onRightPress,
  rightComponent,
  showBackButton = true,
  backgroundColor,
  textColor,
}: HeaderProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: backgroundColor || themeConfig.colors.card,
        borderBottomColor: themeConfig.colors.border,
      }
    ]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor || themeConfig.colors.card}
      />
      
      {/* Left Side */}
      <View style={styles.leftContainer}>
        {showBackButton && onLeftPress && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onLeftPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={leftIcon}
              size={24}
              color={textColor || themeConfig.colors.text}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text
          style={[
            styles.title,
            { color: textColor || themeConfig.colors.text }
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* Right Side */}
      <View style={styles.rightContainer}>
        {rightComponent ? (
          rightComponent
        ) : rightIcon && onRightPress ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRightPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={rightIcon}
              size={24}
              color={textColor || themeConfig.colors.text}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  rightContainer: {
    width: 80,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});