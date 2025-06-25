// src/screens/main/DashboardScreen.tsx - Versão melhorada com botão de relatórios

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { userService } from '../../services/api/user';
import { formatCurrency } from '../../utils/formatters';
import type { MainTabScreenProps, DashboardData } from '../../types';

const { width } = Dimensions.get('window');

type Props = MainTabScreenProps<'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const {
    data: dashboardData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => userService.getDashboard(),
    staleTime: 1000 * 60 * 5, 
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const data = dashboardData?.data as DashboardData | undefined;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const renderBalanceCard = () => (
    <Card
      variant="gradient"
      gradient={themeConfig.colors.primaryGradient}
      style={styles.balanceCard}
    >
      <View style={styles.balanceHeader}>
        <Text style={styles.greetingText}>
          {getGreeting()}, {user?.name?.split(' ')[0]}!
        </Text>
        <Text style={styles.periodText}>
          {data?.startDate && format(new Date(data.startDate), 'MMMM yyyy', { locale: ptBR })}
        </Text>
      </View>

      <View style={styles.balanceContent}>
        <Text style={styles.balanceLabel}>Saldo Atual</Text>
        <Text style={styles.balanceValue}>
          {formatCurrency(data?.financialStats?.balance || 0)}
        </Text>
      </View>

      <View style={styles.balanceStats}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="trending-up" size={16} color="#ffffff" />
          </View>
          <Text style={styles.statLabel}>Receitas</Text>
          <Text style={styles.statValue}>
            {formatCurrency(data?.financialStats?.income || 0)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="trending-down" size={16} color="#ffffff" />
          </View>
          <Text style={styles.statLabel}>Gastos</Text>
          <Text style={styles.statValue}>
            {formatCurrency(data?.financialStats?.expense || 0)}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderQuickActions = () => (
    <Card style={styles.quickActionsCard}>
      <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
        Ações Rápidas
      </Text>
      
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: themeConfig.colors.success + '15' }]}
          onPress={() => navigation.navigate('AddTransaction', { type: 'income' })}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: themeConfig.colors.success }]}>
            <Ionicons name="add" size={20} color="#ffffff" />
          </View>
          <Text style={[styles.quickActionText, { color: themeConfig.colors.success }]}>
            Receita
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: themeConfig.colors.error + '15' }]}
          onPress={() => navigation.navigate('AddTransaction', { type: 'expense' })}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: themeConfig.colors.error }]}>
            <Ionicons name="remove" size={20} color="#ffffff" />
          </View>
          <Text style={[styles.quickActionText, { color: themeConfig.colors.error }]}>
            Gasto
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: themeConfig.colors.primary + '15' }]}
          onPress={() => navigation.navigate('AddBudget')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: themeConfig.colors.primary }]}>
            <Ionicons name="wallet" size={20} color="#ffffff" />
          </View>
          <Text style={[styles.quickActionText, { color: themeConfig.colors.primary }]}>
            Orçamento
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: themeConfig.colors.warning + '15' }]}
          onPress={() => navigation.navigate('AddGoal')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: themeConfig.colors.warning }]}>
            <Ionicons name="flag" size={20} color="#ffffff" />
          </View>
          <Text style={[styles.quickActionText, { color: themeConfig.colors.warning }]}>
            Meta
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  // 🔥 NOVO: Card de Overview Financeiro com botão de relatórios
  const renderFinancialOverview = () => (
    <Card style={styles.overviewCard}>
      <View style={styles.overviewHeader}>
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
          Overview Financeiro
        </Text>
        <TouchableOpacity 
          style={styles.reportsButton}
          onPress={() => navigation.navigate('Reports')}
        >
          <Ionicons name="analytics" size={16} color={themeConfig.colors.primary} />
          <Text style={[styles.reportsButtonText, { color: themeConfig.colors.primary }]}>
            Ver Relatórios
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.overviewStats}>
        <View style={styles.overviewStatItem}>
          <View style={[styles.overviewStatIcon, { backgroundColor: themeConfig.colors.info + '20' }]}>
            <Ionicons name="receipt" size={20} color={themeConfig.colors.info} />
          </View>
          <View style={styles.overviewStatContent}>
            <Text style={[styles.overviewStatLabel, { color: themeConfig.colors.textSecondary }]}>
              Transações
            </Text>
            <Text style={[styles.overviewStatValue, { color: themeConfig.colors.text }]}>
              {data?.financialStats?.totalTransactions || 0}
            </Text>
          </View>
        </View>

        <View style={styles.overviewStatItem}>
          <View style={[styles.overviewStatIcon, { backgroundColor: themeConfig.colors.warning + '20' }]}>
            <Ionicons name="wallet" size={20} color={themeConfig.colors.warning} />
          </View>
          <View style={styles.overviewStatContent}>
            <Text style={[styles.overviewStatLabel, { color: themeConfig.colors.textSecondary }]}>
              Orçamentos
            </Text>
            <Text style={[styles.overviewStatValue, { color: themeConfig.colors.text }]}>
              {data?.activeBudgets?.length || 0}
            </Text>
          </View>
        </View>

        <View style={styles.overviewStatItem}>
          <View style={[styles.overviewStatIcon, { backgroundColor: themeConfig.colors.success + '20' }]}>
            <Ionicons name="flag" size={20} color={themeConfig.colors.success} />
          </View>
          <View style={styles.overviewStatContent}>
            <Text style={[styles.overviewStatLabel, { color: themeConfig.colors.textSecondary }]}>
              Metas
            </Text>
            <Text style={[styles.overviewStatValue, { color: themeConfig.colors.text }]}>
              {data?.activeGoals?.length || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Mini gráfico ou preview */}
      <View style={styles.overviewPreview}>
        <Text style={[styles.overviewPreviewTitle, { color: themeConfig.colors.textSecondary }]}>
          💡 Último mês: {data?.financialStats?.balance && data.financialStats.balance >= 0 ? 'Positivo' : 'Atenção necessária'}
        </Text>
      </View>
    </Card>
  );

  const renderRecentTransactions = () => (
    <Card style={styles.recentTransactionsCard}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
          Transações Recentes
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('MainTabs', { screen: 'Transactions' })}
        >
          <Text style={[styles.seeAllText, { color: themeConfig.colors.primary }]}>
            Ver todas
          </Text>
        </TouchableOpacity>
      </View>

      {data?.recentTransactions && data.recentTransactions.length > 0 ? (
        <View style={styles.transactionsList}>
          {data.recentTransactions.slice(0, 3).map((transaction, index) => (
            <TouchableOpacity
              key={transaction._id}
              style={styles.transactionItem}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction._id })}
            >
              <View style={[
                styles.transactionIcon,
                { backgroundColor: transaction.type === 'income' ? themeConfig.colors.success + '15' : themeConfig.colors.error + '15' }
              ]}>
                <Ionicons
                  name={transaction.type === 'income' ? 'trending-up' : 'trending-down'}
                  size={20}
                  color={transaction.type === 'income' ? themeConfig.colors.success : themeConfig.colors.error}
                />
              </View>
              
              <View style={styles.transactionContent}>
                <Text style={[styles.transactionDescription, { color: themeConfig.colors.text }]}>
                  {transaction.description}
                </Text>
                <Text style={[styles.transactionCategory, { color: themeConfig.colors.textSecondary }]}>
                  {transaction.category?.name || 'Sem categoria'}
                </Text>
              </View>

              <View style={styles.transactionAmount}>
                <Text style={[
                  styles.transactionValue,
                  { color: transaction.type === 'income' ? themeConfig.colors.success : themeConfig.colors.error }
                ]}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
                <Text style={[styles.transactionDate, { color: themeConfig.colors.textSecondary }]}>
                  {format(new Date(transaction.date), 'dd/MM', { locale: ptBR })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={themeConfig.colors.textLight} />
          <Text style={[styles.emptyStateText, { color: themeConfig.colors.textSecondary }]}>
            Nenhuma transação encontrada
          </Text>
          <Text style={[styles.emptyStateSubtext, { color: themeConfig.colors.textLight }]}>
            Adicione sua primeira transação
          </Text>
        </View>
      )}
    </Card>
  );

  const renderAlerts = () => {
    if (!data?.alerts || data.alerts.length === 0) return null;

    return (
      <Card style={styles.alertsCard}>
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
          ⚠️ Alertas
        </Text>
        {data.alerts.slice(0, 2).map((alert, index) => (
          <View
            key={index}
            style={[
              styles.alertItem,
              {
                backgroundColor: alert.severity === 'high'
                  ? themeConfig.colors.error + '15'
                  : themeConfig.colors.warning + '15'
              }
            ]}
          >
            <Ionicons
              name="warning"
              size={20}
              color={alert.severity === 'high' ? themeConfig.colors.error : themeConfig.colors.warning}
            />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: themeConfig.colors.text }]}>
                {alert.title}
              </Text>
              <Text style={[styles.alertMessage, { color: themeConfig.colors.textSecondary }]}>
                {alert.message}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderBalanceCard()}
        {renderQuickActions()}
        {renderFinancialOverview()}
        {renderAlerts()}
        {renderRecentTransactions()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  
  balanceCard: {
    marginBottom: 16,
    minHeight: 180,
  },
  balanceHeader: {
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  periodText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'capitalize',
  },
  balanceContent: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  balanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  quickActionsCard: {
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  quickAction: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 🔥 NOVOS ESTILOS: Overview Card
  overviewCard: {
    marginBottom: 16,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    gap: 6,
  },
  reportsButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  overviewStats: {
    gap: 12,
  },
  overviewStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewStatContent: {
    flex: 1,
  },
  overviewStatLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  overviewStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  overviewPreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  overviewPreviewTitle: {
    fontSize: 14,
    textAlign: 'center',
  },

  recentTransactionsCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionsList: {
    marginTop: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },

  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },

  alertsCard: {
    marginBottom: 16,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
  },
});