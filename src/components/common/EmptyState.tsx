// src/components/common/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  buttonTitle?: string;
  onButtonPress?: () => void;
  buttonVariant?: 'primary' | 'secondary' | 'outline';
}

export default function EmptyState({
  icon = 'document-outline',
  title,
  description,
  buttonTitle,
  onButtonPress,
  buttonVariant = 'primary',
}: EmptyStateProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: themeConfig.colors.surface }]}>
        <Ionicons name={icon as any} size={48} color={themeConfig.colors.textLight} />
      </View>
      
      <Text style={[styles.title, { color: themeConfig.colors.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.description, { color: themeConfig.colors.textSecondary }]}>
        {description}
      </Text>
      
      {buttonTitle && onButtonPress && (
        <Button
          title={buttonTitle}
          variant={buttonVariant}
          onPress={onButtonPress}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    minWidth: 150,
  },
  
  // Reports Screen Styles
  content: {
    flex: 1,
    padding: 16,
  },
  periodCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  periodButtonActive: {
    borderWidth: 2,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartCard: {
    marginBottom: 16,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsList: {
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsCard: {
    marginBottom: 32,
  },
  actionsList: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});