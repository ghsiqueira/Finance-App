import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { budgetService } from '../../services/api/budgets';
import { formatCurrency } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';
import type { Transaction } from '../../types';

type Props = MainStackScreenProps<'BudgetDetail'>;

export default function BudgetDetailScreen({ navigation, route }: Props) {
  const { budgetId } = route.params;
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch budget details
  const { data: budgetData, isLoading, error } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: () => budgetService.getBudget(budgetId),
  });

  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: () => budgetService.deleteBudget(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert(
        'Sucesso!',
        'Orçamento excluído com sucesso.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao excluir orçamento. Tente novamente.'
      );
    },
  });

  // Toggle budget status mutation
  const toggleBudgetMutation = useMutation({
    mutationFn: () => budgetService.toggleBudget(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (error: any) => {
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao alterar status do orçamento.'
      );
    },
  });

  const handleEdit = () => {
    navigation.navigate('EditBudget', { budgetId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);
            deleteBudgetMutation.mutate();
          },
        },
      ]
    );
  };

  const handleToggleStatus = () => {
    const budget = budgetData?.data?.budget;
    if (!budget) return;

    const action = budget.isActive ? 'pausar' : 'reativar';
    Alert.alert(
      `Confirmar ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      `Tem certeza que deseja ${action} este orçamento?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: () => toggleBudgetMutation.mutate(),
        },
      ]
    );
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (isToday(date)) {
      return 'Hoje';
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBudgetStatus = (budget: any) => {
    if (!budget.isActive) {
      return {
        label: 'Pausado',
        color: themeConfig.colors.textSecondary,
        icon: 'pause-circle',
      };
    }

    const daysRemaining = getDaysRemaining(budget.endDate);
    
    if (daysRemaining < 0) {
      return {
        label: 'Expirado',
        color: themeConfig.colors.error,
        icon: 'time',
      };
    }

    if (budget.isExceeded) {
      return {
        label: 'Excedido',
        color: themeConfig.colors.error,
        icon: 'warning',
      };
    }

    if (budget.spentPercentage >= (budget.alertThreshold || 80)) {
      return {
        label: 'Próximo do Limite',
        color: themeConfig.colors.warning,
        icon: 'alert',
      };
    }

    return {
      label: 'Ativo',
      color: themeConfig.colors.success,
      icon: 'checkmark-circle',
    };
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => navigation.navigate('TransactionDetail', { transactionId: item._id })}
    >
      <View style={styles.transactionIcon}>
        <Ionicons 
          name="trending-down" 
          size={20} 
          color={themeConfig.colors.error} 
        />
      </View>
      
      <View style={styles.transactionInfo}>
        <Text style={[styles.transactionDescription, { color: themeConfig.colors.text }]}>
          {item.description}
        </Text>
        <Text style={[styles.transactionDate, { color: themeConfig.colors.textSecondary }]}>
          {getDateLabel(item.date)}
        </Text>
      </View>
      
      <Text style={[styles.transactionAmount, { color: themeConfig.colors.error }]}>
        -{formatCurrency(item.amount)}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return <Loading />;
  }

  if (error || !budgetData?.data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Orçamento" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={themeConfig.colors.error} />
          <Text style={[styles.errorTitle, { color: themeConfig.colors.error }]}>
            Orçamento não encontrado
          </Text>
          <Text style={[styles.errorMessage, { color: themeConfig.colors.textSecondary }]}>
            O orçamento que você está procurando não existe ou foi removido.
          </Text>
          <Button
            title="Voltar"
            onPress={() => navigation.goBack()}
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const budget = budgetData.data.budget;
  const transactions = budgetData.data.transactions || [];
  const dailySpending = budgetData.data.dailySpending || {};
  const budgetStatus = getBudgetStatus(budget);
  const daysRemaining = getDaysRemaining(budget.endDate);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header 
        title={budget.name} 
        showBackButton 
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Info Card */}
        <Card variant="elevated" style={styles.mainCard}>
          <View style={styles.mainHeader}>
            <View style={styles.budgetInfo}>
              <View style={styles.budgetTitleRow}>
                <View style={[styles.categoryColor, { backgroundColor: budget.category?.color || budget.color }]} />
                <Text style={[styles.budgetName, { color: themeConfig.colors.text }]}>
                  {budget.name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: budgetStatus.color + '20' }]}>
                  <Ionicons name={budgetStatus.icon as any} size={16} color={budgetStatus.color} />
                  <Text style={[styles.statusText, { color: budgetStatus.color }]}>
                    {budgetStatus.label}
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.categoryName, { color: themeConfig.colors.textSecondary }]}>
                {budget.category?.name || 'Categoria não encontrada'}
              </Text>
            </View>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: themeConfig.colors.textSecondary }]}>
                Progresso do Orçamento
              </Text>
              <Text style={[styles.progressPercentage, { 
                color: budget.isExceeded ? themeConfig.colors.error : themeConfig.colors.primary 
              }]}>
                {budget.spentPercentage.toFixed(1)}%
              </Text>
            </View>
            
            <View style={[styles.progressBar, { backgroundColor: themeConfig.colors.border }]}>
              <View style={[
                styles.progressFill,
                {
                  width: `${Math.min(budget.spentPercentage, 100)}%`,
                  backgroundColor: budget.isExceeded 
                    ? themeConfig.colors.error 
                    : budget.spentPercentage >= (budget.alertThreshold || 80)
                      ? themeConfig.colors.warning
                      : themeConfig.colors.success
                }
              ]} />
            </View>

            <View style={styles.amountsRow}>
              <View style={styles.amountItem}>
                <Text style={[styles.amountLabel, { color: themeConfig.colors.textSecondary }]}>
                  Gasto
                </Text>
                <Text style={[styles.amountValue, { color: themeConfig.colors.error }]}>
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
          </View>
        </Card>

        {/* Period Info Card */}
        <Card variant="elevated" style={styles.periodCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Período do Orçamento
          </Text>
          
          <View style={styles.periodInfo}>
            <View style={styles.periodItem}>
              <Ionicons name="play" size={20} color={themeConfig.colors.success} />
              <View style={styles.periodContent}>
                <Text style={[styles.periodLabel, { color: themeConfig.colors.textSecondary }]}>
                  Data de Início
                </Text>
                <Text style={[styles.periodValue, { color: themeConfig.colors.text }]}>
                  {format(new Date(budget.startDate), 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
              </View>
            </View>

            <View style={styles.periodItem}>
              <Ionicons name="stop" size={20} color={themeConfig.colors.error} />
              <View style={styles.periodContent}>
                <Text style={[styles.periodLabel, { color: themeConfig.colors.textSecondary }]}>
                  Data de Fim
                </Text>
                <Text style={[styles.periodValue, { color: themeConfig.colors.text }]}>
                  {format(new Date(budget.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
              </View>
            </View>

            <View style={styles.periodItem}>
              <Ionicons 
                name="calendar" 
                size={20} 
                color={daysRemaining > 0 ? themeConfig.colors.primary : themeConfig.colors.error} 
              />
              <View style={styles.periodContent}>
                <Text style={[styles.periodLabel, { color: themeConfig.colors.textSecondary }]}>
                  {daysRemaining > 0 ? 'Dias Restantes' : 'Dias em Atraso'}
                </Text>
                <Text style={[
                  styles.periodValue, 
                  { color: daysRemaining > 0 ? themeConfig.colors.primary : themeConfig.colors.error }
                ]}>
                  {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Settings Card */}
        <Card variant="elevated" style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Configurações
          </Text>
          
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="alarm" size={20} color={themeConfig.colors.warning} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: themeConfig.colors.text }]}>
                  Alerta de Limite
                </Text>
                <Text style={[styles.settingValue, { color: themeConfig.colors.textSecondary }]}>
                  {budget.alertThreshold || 80}% do orçamento
                </Text>
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="repeat" size={20} color={themeConfig.colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: themeConfig.colors.text }]}>
                  Período
                </Text>
                <Text style={[styles.settingValue, { color: themeConfig.colors.textSecondary }]}>
                  {budget.period === 'monthly' ? 'Mensal' : 
                   budget.period === 'weekly' ? 'Semanal' : 
                   budget.period === 'quarterly' ? 'Trimestral' : 'Anual'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <Card variant="elevated" style={styles.transactionsCard}>
            <View style={styles.transactionsHeader}>
              <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
                Transações Recentes
              </Text>
              <Text style={[styles.transactionsCount, { color: themeConfig.colors.textSecondary }]}>
                {transactions.length} {transactions.length === 1 ? 'transação' : 'transações'}
              </Text>
            </View>
            
            <FlatList
              data={transactions.slice(0, 10)} // Show only last 10
              keyExtractor={(item) => item._id}
              renderItem={renderTransactionItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.transactionSeparator} />}
            />
            
            {transactions.length > 10 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Transactions' })}
                
              >
                <Text style={[styles.viewAllText, { color: themeConfig.colors.primary }]}>
                  Ver todas as transações
                </Text>
                <Ionicons name="chevron-forward" size={16} color={themeConfig.colors.primary} />
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Notes Card */}
        {budget.notes && (
          <Card variant="elevated" style={styles.notesCard}>
            <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
              Observações
            </Text>
            <Text style={[styles.notesText, { color: themeConfig.colors.textSecondary }]}>
              {budget.notes}
            </Text>
          </Card>
        )}

        {/* Actions Card */}
        <Card variant="elevated" style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Ações
          </Text>
          
          <View style={styles.actionsList}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.primary + '15' }]}
              onPress={handleEdit}
            >
              <Ionicons name="pencil" size={20} color={themeConfig.colors.primary} />
              <Text style={[styles.actionButtonText, { color: themeConfig.colors.primary }]}>
                Editar Orçamento
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { 
                backgroundColor: budget.isActive 
                  ? themeConfig.colors.warning + '15' 
                  : themeConfig.colors.success + '15' 
              }]}
              onPress={handleToggleStatus}
              disabled={toggleBudgetMutation.isPending}
            >
              <Ionicons 
                name={budget.isActive ? "pause" : "play"} 
                size={20} 
                color={budget.isActive ? themeConfig.colors.warning : themeConfig.colors.success} 
              />
              <Text style={[
                styles.actionButtonText, 
                { color: budget.isActive ? themeConfig.colors.warning : themeConfig.colors.success }
              ]}>
                {budget.isActive ? 'Pausar Orçamento' : 'Reativar Orçamento'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeConfig.colors.error + '15' }]}
              onPress={handleDelete}
              disabled={isDeleting || deleteBudgetMutation.isPending}
            >
              <Ionicons name="trash" size={20} color={themeConfig.colors.error} />
              <Text style={[styles.actionButtonText, { color: themeConfig.colors.error }]}>
                {isDeleting || deleteBudgetMutation.isPending ? 'Excluindo...' : 'Excluir Orçamento'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorButton: {
    minWidth: 120,
  },
  mainCard: {
    marginBottom: 16,
  },
  mainHeader: {
    marginBottom: 20,
  },
  budgetInfo: {
    marginBottom: 16,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  budgetName: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
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
    fontSize: 12,
    fontWeight: '500',
  },
  categoryName: {
    fontSize: 14,
    marginLeft: 28,
  },
  progressSection: {
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountItem: {
    alignItems: 'center',
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  periodCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  periodInfo: {
    gap: 16,
  },
  periodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodContent: {
    flex: 1,
  },
  periodLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  periodValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsCard: {
    marginBottom: 16,
  },
  settingsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
  },
  transactionsCard: {
    marginBottom: 16,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsCount: {
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef444420',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginLeft: 52,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesCard: {
    marginBottom: 16,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsCard: {
    marginBottom: 16,
  },
  actionsList: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 24,
  },
});