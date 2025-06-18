import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
}

export default function Header({
  title,
  showBackButton = false,
  onBackPress,
  rightElement,
  subtitle,
  backgroundColor,
  textColor,
}: HeaderProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const headerStyle = {
    backgroundColor: backgroundColor || themeConfig.colors.card,
    borderBottomColor: themeConfig.colors.border,
  };

  const titleColor = textColor || themeConfig.colors.text;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, headerStyle]}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={headerStyle.backgroundColor}
      />
      <View style={styles.header}>
        <View style={styles.leftSection}>
          {showBackButton && (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={titleColor} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.centerSection}>
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: themeConfig.colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          {rightElement}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    width: 40,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  rightSection: {
    width: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
});
