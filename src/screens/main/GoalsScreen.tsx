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
import { goalService } from '../../services/api/goals';
import { formatCurrency } from '../../utils/formatters';
import type { MainTabScreenProps, Goal } from '../../types';

const { width } = Dimensions.get('window');

type Props = MainTabScreenProps<'Goals'>;

type FilterType = 'all' | 'active' | 'completed';

export default function GoalsScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('active');
  
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    data: goalsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['goals', filterType],
    queryFn: () => goalService.getGoals({ 
      status: filterType === 'all' ? undefined : filterType,
      includeCompleted: filterType === 'completed' || filterType === 'all'
    }),
    staleTime: 1000 * 60 * 2, 
  });

  const {
    data: summaryResponse,
  } = useQuery({
    queryKey: ['goals', 'summary'],
    queryFn: () => goalService.getGoalSummary(),
    staleTime: 1000 * 60 * 2,
  });

  const goals = goalsResponse?.data?.goals || [];
  const summary = summaryResponse?.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderFilterButton = (type: FilterType, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterType === type && { backgroundColor: themeConfig.colors.primary + '15' },
        { borderColor: filterType === type ? themeConfig.colors.primary : themeConfig.colors.border }
      ]}
      onPress={() => setFilterType(type)}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={filterType === type ? themeConfig.colors.primary : themeConfig.colors.textSecondary} 
      />
      <Text style={[
        styles.filterButtonText,
        { color: filterType === type ? themeConfig.colors.primary : themeConfig.colors.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderProgressBar = (goal: Goal) => {
    const progressWidth = Math.min(goal.progressPercentage, 100);
    
    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBackground, { backgroundColor: themeConfig.colors.surface }]}>
          <View 
            style={[
              styles.progressBar,
              {
                width: `${progressWidth}%`,
                backgroundColor: goal.isCompleted 
                  ? themeConfig.colors.success 
                  : goal.progressPercentage >= 75
                    ? themeConfig.colors.warning
                    : themeConfig.colors.primary
              }
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: themeConfig.colors.textSecondary }]}>
          {goal.progressPercentage}%
        </Text>
      </View>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return themeConfig.colors.error;
      case 'medium': return themeConfig.colors.warning;
      case 'low': return themeConfig.colors.success;
      default: return themeConfig.colors.textSecondary;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority;
    }
  };

  const getStatusColor = (goal: Goal) => {
    if (goal.isCompleted) return themeConfig.colors.success;
    if (goal.daysRemaining <= 7) return themeConfig.colors.error;
    if (goal.daysRemaining <= 30) return themeConfig.colors.warning;
    return themeConfig.colors.primary;
  };

  const renderGoalItem = ({ item }: { item: Goal }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('GoalDetail', { goalId: item._id })}
    >
      <Card variant="elevated" style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={styles.goalInfo}>
            <View style={styles.goalTitleRow}>
              <Text style={[styles.goalTitle, { color: themeConfig.colors.text }]}>
                {item.title}
              </Text>
              {item.isCompleted && (
                <View style={[styles.completedBadge, { backgroundColor: themeConfig.colors.success }]}>
                  <Ionicons name="checkmark" size={12} color="#ffffff" />
                </View>
              )}
            </View>
            
            <View style={styles.goalMeta}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '15' }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                  {getPriorityLabel(item.priority)}
                </Text>
              </View>
              
              {item.category && (
                <Text style={[styles.goalCategory, { color: themeConfig.colors.textSecondary }]}>
                  • {item.category.name}
                </Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('EditGoal', { goalId: item._id })}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={16} color={themeConfig.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {item.description && (
          <Text style={[styles.goalDescription, { color: themeConfig.colors.textSecondary }]}>
            {item.description}
          </Text>
        )}

        <View style={styles.goalAmounts}>
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
              Atual
            </Text>
            <Text style={[styles.amountValue, { color: themeConfig.colors.success }]}>
              {formatCurrency(item.currentAmount)}
            </Text>
          </View>
          
          <View style={styles.amountSeparator} />
          
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
              Meta
            </Text>
            <Text style={[styles.amountValue, { color: themeConfig.colors.text }]}>
              {formatCurrency(item.targetAmount)}
            </Text>
          </View>
          
          <View style={styles.amountSeparator} />
          
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
              Faltam
            </Text>
            <Text style={[styles.amountValue, { color: themeConfig.colors.primary }]}>
              {formatCurrency(item.remainingAmount)}
            </Text>
          </View>
        </View>

        {renderProgressBar(item)}

        <View style={styles.goalFooter}>
          <View style={styles.goalDeadline}>
            <Ionicons 
              name="calendar-outline" 
              size={14} 
              color={getStatusColor(item)} 
            />
            <Text style={[styles.deadlineText, { color: getStatusColor(item) }]}>
              {item.isCompleted 
                ? `Concluída em ${format(new Date(item.completedAt!), 'dd/MM/yyyy', { locale: ptBR })}`
                : item.daysRemaining > 0 
                  ? `${item.daysRemaining} dias restantes`
                  : 'Prazo vencido'
              }
            </Text>
          </View>
          
          {!item.isCompleted && (
            <Text style={[styles.recommendationText, { color: themeConfig.colors.textLight }]}>
              {formatCurrency(item.monthlySavingsNeeded)}/mês
            </Text>
          )}
        </View>

        {!item.isCompleted && (
          <View style={styles.goalActions}>
            <Button
              title="Contribuir"
              size="small"
              onPress={() => {
              }}
              style={styles.contributeButton}
            />
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  const renderSummaryCard = () => {
    if (!summary) return null;

    return (
      <Card variant="elevated" style={styles.summaryCard}>
        <Text style={[styles.summaryTitle, { color: themeConfig.colors.text }]}>
          Resumo das Metas
        </Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: themeConfig.colors.text }]}>
              {summary.summary?.total || 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
              Total
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: themeConfig.colors.primary }]}>
              {summary.summary?.active || 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
              Ativas
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: themeConfig.colors.success }]}>
              {summary.summary?.completed || 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
              Concluídas
            </Text>
          </View>
        </View>

        <View style={styles.summaryAmounts}>
          <View style={styles.summaryAmountItem}>
            <Text style={[styles.summaryAmountLabel, { color: themeConfig.colors.textSecondary }]}>
              Total Poupado
            </Text>
            <Text style={[styles.summaryAmountValue, { color: themeConfig.colors.success }]}>
              {formatCurrency(summary.summary?.totalCurrentAmount || 0)}
            </Text>
          </View>
          
          <View style={styles.summaryAmountItem}>
            <Text style={[styles.summaryAmountLabel, { color: themeConfig.colors.textSecondary }]}>
              Meta Total
            </Text>
            <Text style={[styles.summaryAmountValue, { color: themeConfig.colors.text }]}>
              {formatCurrency(summary.summary?.totalTargetAmount || 0)}
            </Text>
          </View>
        </View>

        {(summary.summary?.totalTargetAmount || 0) > 0 && (
          <View style={styles.overallProgress}>
            <Text style={[styles.overallProgressLabel, { color: themeConfig.colors.textSecondary }]}>
              Progresso Geral: {summary.summary?.totalProgress || 0}%
            </Text>
            <View style={[styles.progressBackground, { backgroundColor: themeConfig.colors.surface }]}>
              <View 
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(summary.summary?.totalProgress || 0, 100)}%`,
                    backgroundColor: themeConfig.colors.primary
                  }
                ]}
              />
            </View>
          </View>
        )}
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="flag-outline" size={64} color={themeConfig.colors.textLight} />
      <Text style={[styles.emptyStateTitle, { color: themeConfig.colors.textSecondary }]}>
        {filterType === 'completed' 
          ? 'Nenhuma meta concluída'
          : 'Nenhuma meta criada'
        }
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: themeConfig.colors.textLight }]}>
        {filterType === 'completed'
          ? 'Complete suas primeiras metas para vê-las aqui'
          : 'Defina metas financeiras para alcançar seus objetivos'
        }
      </Text>
      {filterType !== 'completed' && (
        <Button
          title="Criar Primeira Meta"
          onPress={() => navigation.navigate('AddGoal')}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <View style={[styles.header, { backgroundColor: themeConfig.colors.card, borderBottomColor: themeConfig.colors.border }]}>
        <Text style={[styles.title, { color: themeConfig.colors.text }]}>
          Metas
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddGoal')}
          style={[styles.addButton, { backgroundColor: themeConfig.colors.primary }]}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        {renderFilterButton('active', 'Ativas', 'flag-outline')}
        {renderFilterButton('completed', 'Concluídas', 'checkmark-circle-outline')}
        {renderFilterButton('all', 'Todas', 'list-outline')}
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item) => item._id}
        renderItem={renderGoalItem}
        ListHeaderComponent={renderSummaryCard}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={[
          styles.listContainer,
          goals.length === 0 && styles.emptyListContainer
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
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
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

  goalCard: {
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  completedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  goalCategory: {
    fontSize: 12,
  },
  editButton: {
    padding: 8,
  },
  goalDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 16,
  },
  goalAmounts: {
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
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recommendationText: {
    fontSize: 11,
  },
  goalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  contributeButton: {
    minWidth: 100,
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
    minWidth: 160,
  },
});