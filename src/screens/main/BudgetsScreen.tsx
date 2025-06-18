import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { budgetService } from '../../services/api/budgets';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { MainTabScreenProps, Budget } from '../../types';

const { width } = Dimensions.get('window');

type Props = MainTabScreenProps<'Budgets'>;

export default function BudgetsScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    data: budgetsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetService.getBudgets(),
    staleTime: 1000 * 60 * 2, 
  });

  const {
    data: summaryResponse,
  } = useQuery({
    queryKey: ['budgets', 'summary'],
    queryFn: () => budgetService.getBudgetSummary(),
    staleTime: 1000 * 60 * 2,
  });

  const budgets = budgetsResponse?.data?.budgets || [];
  const summary = summaryResponse?.data?.summary;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderProgressBar = (budget: Budget) => {
    const progressWidth = Math.min(budget.spentPercentage, 100);
    const isOverBudget = budget.spentPercentage > 100;
    
    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBackground, { backgroundColor: themeConfig.colors.surface }]}>
          <View 
            style={[
              styles.progressBar,
              {
                width: `${progressWidth}%`,
                backgroundColor: isOverBudget 
                  ? themeConfig.colors.error 
                  : budget.spentPercentage >= (budget.alertThreshold || 80)
                    ? themeConfig.colors.warning
                    : themeConfig.colors.success
              }
            ]}
          />
        </View>
        <Text style={[
          styles.progressText,
          { 
            color: isOverBudget 
              ? themeConfig.colors.error 
              : themeConfig.colors.textSecondary 
          }
        ]}>
          {budget.spentPercentage}%
        </Text>
      </View>
    );
  };

  const renderBudgetItem = ({ item }: { item: Budget }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('BudgetDetail', { budgetId: item._id })}
    >
      <Card variant="elevated" style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <View style={styles.budgetInfo}>
            <View style={styles.budgetTitleRow}>
              <View style={[
                styles.categoryColor,
                { backgroundColor: item.category?.color || item.color }
              ]} />
              <Text style={[styles.budgetName, { color: themeConfig.colors.text }]}>
                {item.name}
              </Text>
              {item.isExceeded && (
                <View style={[styles.alertBadge, { backgroundColor: themeConfig.colors.error }]}>
                  <Ionicons name="warning" size={12} color="#ffffff" />
                </View>
              )}
            </View>
            <Text style={[styles.budgetCategory, { color: themeConfig.colors.textSecondary }]}>
              {item.category?.name || 'Categoria não encontrada'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditBudget', { budgetId: item._id })}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={16} color={themeConfig.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.budgetAmounts}>
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
              Gasto
            </Text>
            <Text style={[styles.amountValue, { color: themeConfig.colors.error }]}>
              {formatCurrency(item.spent)}
            </Text>
          </View>
          
          <View style={styles.amountSeparator} />
          
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
              Limite
            </Text>
            <Text style={[styles.amountValue, { color: themeConfig.colors.text }]}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
          
          <View style={styles.amountSeparator} />
          
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
              Restante
            </Text>
            <Text style={[
              styles.amountValue, 
              { color: item.remaining > 0 ? themeConfig.colors.success : themeConfig.colors.error }
            ]}>
              {formatCurrency(item.remaining)}
            </Text>
          </View>
        </View>

        {renderProgressBar(item)}

        <View style={styles.budgetFooter}>
          <Text style={[styles.budgetPeriod, { color: themeConfig.colors.textLight }]}>
            {format(new Date(item.startDate), 'dd/MM', { locale: ptBR })} - {format(new Date(item.endDate), 'dd/MM/yyyy', { locale: ptBR })}
          </Text>
          
          <View style={styles.budgetStatus}>
            {item.isExceeded ? (
              <Text style={[styles.statusText, { color: themeConfig.colors.error }]}>
                Excedido
              </Text>
            ) : item.spentPercentage >= (item.alertThreshold || 80) ? (
              <Text style={[styles.statusText, { color: themeConfig.colors.warning }]}>
                Próximo do limite
              </Text>
            ) : (
              <Text style={[styles.statusText, { color: themeConfig.colors.success }]}>
                No controle
              </Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderSummaryCard = () => {
    if (!summary) return null;

    return (
      <Card variant="elevated" style={styles.summaryCard}>
        <Text style={[styles.summaryTitle, { color: themeConfig.colors.text }]}>
          Resumo dos Orçamentos
        </Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: themeConfig.colors.text }]}>
              {summary.activeBudgetsCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
              Ativos
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: themeConfig.colors.error }]}>
              {summary.budgetsExceeded}
            </Text>
            <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
              Excedidos
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: themeConfig.colors.warning }]}>
              {summary.budgetsNearLimit}
            </Text>
            <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
              Próx. Limite
            </Text>
          </View>
        </View>

        <View style={styles.summaryAmounts}>
          <View style={styles.summaryAmountItem}>
            <Text style={[styles.summaryAmountLabel, { color: themeConfig.colors.textSecondary }]}>
              Total Orçado
            </Text>
            <Text style={[styles.summaryAmountValue, { color: themeConfig.colors.text }]}>
              {formatCurrency(summary.totalBudget)}
            </Text>
          </View>
          
          <View style={styles.summaryAmountItem}>
            <Text style={[styles.summaryAmountLabel, { color: themeConfig.colors.textSecondary }]}>
              Total Gasto
            </Text>
            <Text style={[styles.summaryAmountValue, { color: themeConfig.colors.error }]}>
              {formatCurrency(summary.totalSpent)}
            </Text>
          </View>
        </View>

        <View style={styles.overallProgress}>
          <Text style={[styles.overallProgressLabel, { color: themeConfig.colors.textSecondary }]}>
            Uso Geral: {summary.overallPercentage}%
          </Text>
          <View style={[styles.progressBackground, { backgroundColor: themeConfig.colors.surface }]}>
            <View 
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(summary.overallPercentage, 100)}%`,
                  backgroundColor: summary.overallPercentage > 100 
                    ? themeConfig.colors.error 
                    : summary.overallPercentage >= 80
                      ? themeConfig.colors.warning
                      : themeConfig.colors.success
                }
              ]}
            />
          </View>
        </View>
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wallet-outline" size={64} color={themeConfig.colors.textLight} />
      <Text style={[styles.emptyStateTitle, { color: themeConfig.colors.textSecondary }]}>
        Nenhum orçamento criado
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: themeConfig.colors.textLight }]}>
        Crie orçamentos para controlar seus gastos por categoria
      </Text>
      <Button
        title="Criar Primeiro Orçamento"
        onPress={() => navigation.navigate('AddBudget')}
        style={styles.emptyStateButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <View style={[styles.header, { backgroundColor: themeConfig.colors.card, borderBottomColor: themeConfig.colors.border }]}>
        <Text style={[styles.title, { color: themeConfig.colors.text }]}>
          Orçamentos
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddBudget')}
          style={[styles.addButton, { backgroundColor: themeConfig.colors.primary }]}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(item) => item._id}
        renderItem={renderBudgetItem}
        ListHeaderComponent={renderSummaryCard}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={[
          styles.listContainer,
          budgets.length === 0 && styles.emptyListContainer
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  
  summaryCard: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryAmountItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryAmountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryAmountValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  overallProgress: {
    marginTop: 8,
  },
  overallProgressLabel: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },

  budgetCard: {
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  alertBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  budgetCategory: {
    fontSize: 12,
    marginLeft: 20,
  },
  editButton: {
    padding: 8,
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountSeparator: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetPeriod: {
    fontSize: 11,
  },
  budgetStatus: {},
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    minWidth: 180,
  },
});