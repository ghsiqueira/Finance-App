// src/components/budget/BudgetCard.tsx - Versão Corrigida

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
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

  // Calcular propriedades se não existirem
  const spentPercentage = budget.spentPercentage ?? (budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0);
  const remaining = budget.remaining ?? (budget.amount - budget.spent);
  const daysRemaining = budget.daysRemaining ?? differenceInDays(new Date(budget.endDate), new Date());
  const dailyBudget = budget.dailyBudget ?? (remaining / Math.max(daysRemaining, 1));

  // Calcular status se não existir
  const getStatus = (): 'safe' | 'warning' | 'critical' | 'exceeded' => {
    if (budget.status) return budget.status;
    
    if (spentPercentage >= 100) return 'exceeded';
    if (spentPercentage >= 80) return 'critical';
    if (spentPercentage >= 60) return 'warning';
    return 'safe';
  };

  const status = getStatus();

  const getStatusConfig = (status: 'safe' | 'warning' | 'critical' | 'exceeded') => {
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

  const statusConfig = getStatusConfig(status);

  const getProgressBarColor = () => {
    if (spentPercentage >= 100) return themeConfig.colors.error;
    if (spentPercentage >= 80) return themeConfig.colors.warning;
    return themeConfig.colors.success;
  };

  const formatPeriod = (period: string) => {
    const periodMap = {
      weekly: 'Semanal',
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      yearly: 'Anual',
    };
    return periodMap[period as keyof typeof periodMap] || period;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: themeConfig.colors.card,
          borderColor: themeConfig.colors.border,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: themeConfig.colors.text }]}>
            {budget.name}
          </Text>
          <Text style={[styles.period, { color: themeConfig.colors.textSecondary }]}>
            {formatPeriod(budget.period)}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <Ionicons 
            name={statusConfig.icon} 
            size={14} 
            color={statusConfig.color} 
          />
        </View>
      </View>

      {/* Valores */}
      <View style={styles.valuesContainer}>
        <View style={styles.valueItem}>
          <Text style={[styles.valueLabel, { color: themeConfig.colors.textSecondary }]}>
            Gasto
          </Text>
          <Text style={[styles.valueAmount, { color: themeConfig.colors.text }]}>
            {formatCurrency(budget.spent)}
          </Text>
        </View>
        
        <View style={styles.valueItem}>
          <Text style={[styles.valueLabel, { color: themeConfig.colors.textSecondary }]}>
            Orçamento
          </Text>
          <Text style={[styles.valueAmount, { color: themeConfig.colors.text }]}>
            {formatCurrency(budget.amount)}
          </Text>
        </View>
        
        <View style={styles.valueItem}>
          <Text style={[styles.valueLabel, { color: themeConfig.colors.textSecondary }]}>
            Restante
          </Text>
          <Text style={[
            styles.valueAmount, 
            { color: remaining >= 0 ? themeConfig.colors.success : themeConfig.colors.error }
          ]}>
            {formatCurrency(remaining)}
          </Text>
        </View>
      </View>

      {/* Barra de Progresso */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: themeConfig.colors.surface }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(spentPercentage, 100)}%`,
                backgroundColor: getProgressBarColor(),
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: themeConfig.colors.textSecondary }]}>
          {spentPercentage.toFixed(1)}%
        </Text>
      </View>

      {/* Informações Adicionais */}
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons 
            name="calendar-outline" 
            size={14} 
            color={themeConfig.colors.textSecondary} 
          />
          <Text style={[styles.infoText, { color: themeConfig.colors.textSecondary }]}>
            {daysRemaining > 0 
              ? `${daysRemaining} dias restantes`
              : 'Período finalizado'
            }
          </Text>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons 
            name="trending-down" 
            size={14} 
            color={themeConfig.colors.textSecondary} 
          />
          <Text style={[styles.infoText, { color: themeConfig.colors.textSecondary }]}>
            {formatCurrency(dailyBudget)}/dia
          </Text>
        </View>
      </View>

      {/* Status Message */}
      <View style={[styles.statusContainer, { backgroundColor: statusConfig.bgColor }]}>
        <Text style={[styles.statusMessage, { color: statusConfig.color }]}>
          {statusConfig.message}
        </Text>
      </View>

      {/* Actions */}
      {showActions && (onEdit || onDelete) && (
        <View style={styles.actionsContainer}>
          {onEdit && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.primary + '20' }]}
              onPress={onEdit}
            >
              <Ionicons name="pencil" size={16} color={themeConfig.colors.primary} />
              <Text style={[styles.actionText, { color: themeConfig.colors.primary }]}>
                Editar
              </Text>
            </TouchableOpacity>
          )}
          
          {onDelete && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.error + '20' }]}
              onPress={onDelete}
            >
              <Ionicons name="trash" size={16} color={themeConfig.colors.error} />
              <Text style={[styles.actionText, { color: themeConfig.colors.error }]}>
                Excluir
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  period: {
    fontSize: 12,
  },
  statusBadge: {
    padding: 6,
    borderRadius: 12,
  },
  valuesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  valueItem: {
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  valueAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});