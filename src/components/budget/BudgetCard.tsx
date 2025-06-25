// src/components/budget/BudgetCard.tsx - Card para exibir orçamento

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { formatCurrency } from '../../utils/formatters';
import type { Budget } from '../../types';

interface BudgetCardProps {
  budget: Budget;
  onPress?: () => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function BudgetCard({ 
  budget, 
  onPress, 
  showActions = false,
  onEdit,
  onDelete 
}: BudgetCardProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const getStatusConfig = (status: Budget['status']) => {
    switch (status) {
      case 'safe':
        return {
          color: themeConfig.colors.success,
          icon: 'checkmark-circle' as const,
          message: 'Dentro do orçamento',
          bgColor: themeConfig.colors.success + '15',
        };
      case 'warning':
        return {
          color: themeConfig.colors.warning,
          icon: 'warning' as const,
          message: 'Atenção necessária',
          bgColor: themeConfig.colors.warning + '15',
        };
      case 'critical':
        return {
          color: themeConfig.colors.error,
          icon: 'alert-circle' as const,
          message: 'Situação crítica',
          bgColor: themeConfig.colors.error + '15',
        };
      case 'exceeded':
        return {
          color: themeConfig.colors.error,
          icon: 'close-circle' as const,
          message: 'Orçamento estourado',
          bgColor: themeConfig.colors.error + '20',
        };
      default:
        return {
          color: themeConfig.colors.textSecondary,
          icon: 'help-circle' as const,
          message: 'Status desconhecido',
          bgColor: themeConfig.colors.textSecondary + '15',
        };
    }
  };

  const statusConfig = getStatusConfig(budget.status);

  const getProgressBarColor = () => {
    if (budget.spentPercentage >= 100) return themeConfig.colors.error;
    if (budget.spentPercentage >= budget.alertThreshold) return themeConfig.colors.warning;
    return themeConfig.colors.success;
  };

  const renderProgressBar = () => {
    const progressWidth = Math.min(budget.spentPercentage, 100);
    
    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: themeConfig.colors.border }]}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${progressWidth}%`,
                backgroundColor: getProgressBarColor(),
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: themeConfig.colors.textSecondary }]}>
          {budget.spentPercentage.toFixed(1)}%
        </Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: themeConfig.colors.card,
          borderColor: statusConfig.color,
          borderLeftWidth: 4,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryIcon, { backgroundColor: budget.category?.color + '20' }]}>
            <Text style={styles.categoryEmoji}>{budget.category?.icon || '💰'}</Text>
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={[styles.budgetName, { color: themeConfig.colors.text }]}>
              {budget.name}
            </Text>
            <Text style={[styles.categoryName, { color: themeConfig.colors.textSecondary }]}>
              {budget.category?.name || 'Categoria'}
            </Text>
          </View>
        </View>

        {showActions && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <Ionicons name="pencil" size={16} color={themeConfig.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <Ionicons name="trash" size={16} color={themeConfig.colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Progress */}
      {renderProgressBar()}

      {/* Amounts */}
      <View style={styles.amountsContainer}>
        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
            Gasto
          </Text>
          <Text style={[styles.amountValue, { color: getProgressBarColor() }]}>
            {formatCurrency(budget.spent)}
          </Text>
        </View>

        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
            Orçamento
          </Text>
          <Text style={[styles.amountValue, { color: themeConfig.colors.text }]}>
            {formatCurrency(budget.amount)}
          </Text>
        </View>

        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
            {budget.remaining >= 0 ? 'Restante' : 'Excesso'}
          </Text>
          <Text style={[
            styles.amountValue, 
            { color: budget.remaining >= 0 ? themeConfig.colors.success : themeConfig.colors.error }
          ]}>
            {formatCurrency(Math.abs(budget.remaining))}
          </Text>
        </View>
      </View>

      {/* Status and Info */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.message}
          </Text>
        </View>

        <Text style={[styles.daysRemaining, { color: themeConfig.colors.textSecondary }]}>
          {budget.daysRemaining} dias restantes
        </Text>
      </View>

      {/* Daily Budget Suggestion */}
      {budget.daysRemaining > 0 && budget.remaining > 0 && (
        <View style={[styles.suggestionContainer, { backgroundColor: themeConfig.colors.info + '10' }]}>
          <Ionicons name="bulb" size={14} color={themeConfig.colors.info} />
          <Text style={[styles.suggestionText, { color: themeConfig.colors.info }]}>
            Pode gastar até {formatCurrency(budget.dailyBudget)} por dia
          </Text>
        </View>
      )}

      {/* Period */}
      <View style={styles.periodContainer}>
        <Text style={[styles.periodText, { color: themeConfig.colors.textLight }]}>
          {format(new Date(budget.startDate), 'dd/MM', { locale: ptBR })} - {format(new Date(budget.endDate), 'dd/MM/yyyy', { locale: ptBR })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  titleContainer: {
    flex: 1,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  amountsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountItem: {
    alignItems: 'center',
    flex: 1,
  },
  amountLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  daysRemaining: {
    fontSize: 11,
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  periodContainer: {
    alignItems: 'center',
  },
  periodText: {
    fontSize: 10,
  },
});