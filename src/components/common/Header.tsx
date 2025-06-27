// src/components/common/Header.tsx - Versão corrigida com props necessárias

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  onBackPress?: () => void;
  showBackButton?: boolean;
  backgroundColor?: string;
  titleColor?: string;
  style?: any;
}

export default function Header({
  title,
  subtitle,
  leftElement,
  rightElement,
  onBackPress,
  showBackButton = true,
  backgroundColor,
  titleColor,
  style,
}: HeaderProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const headerBackgroundColor = backgroundColor || themeConfig.colors.background;
  const headerTitleColor = titleColor || themeConfig.colors.text;

  return (
    <>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={headerBackgroundColor}
      />
      <SafeAreaView 
        style={[
          styles.container, 
          { backgroundColor: headerBackgroundColor },
          style
        ]}
        edges={['top']}
      >
        <View style={styles.header}>
          {/* Left Side */}
          <View style={styles.leftContainer}>
            {leftElement ? (
              leftElement
            ) : showBackButton && onBackPress ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBackPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="arrow-back" 
                  size={24} 
                  color={headerTitleColor} 
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>

          {/* Center */}
          <View style={styles.centerContainer}>
            <Text 
              style={[
                styles.title, 
                { color: headerTitleColor }
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text 
                style={[
                  styles.subtitle, 
                  { color: themeConfig.colors.textSecondary }
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>

          {/* Right Side */}
          <View style={styles.rightContainer}>
            {rightElement || <View style={styles.placeholder} />}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftContainer: {
    minWidth: 40,
    alignItems: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  rightContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 4,
  },
  placeholder: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },
});