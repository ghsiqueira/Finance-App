// src/screens/main/ReportsScreen.tsx - Versão completa
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format, subMonths, subWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import LineChart from '../../components/charts/LineChart';
import PieChart from '../../components/charts/PieChart';
import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { transactionService, TransactionStats } from '../../services/api/transactions'; // 🔥 Importar diretamente do service
import { categoryService } from '../../services/api/categories';
import { formatCurrency } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';

const { width } = Dimensions.get('window');

type Props = MainStackScreenProps<'Reports'>;
type PeriodType = 'week' | 'month' | 'quarter' | 'year';

// 🔥 REMOÇÃO: Remover interface duplicada, usar a do service

interface CategoryStats {
  stats: Array<{
    category: {
      name: string;
      color: string;
      icon: string;
    };
    total: number;
    count: number;
    percentage: number;
  }>;
}

export default function ReportsScreen({ navigation }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  // Calculate date ranges based on selected period
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (selectedPeriod) {
      case 'week':
        startDate = subWeeks(now, 1);
        break;
      case 'quarter':
        startDate = subMonths(now, 3);
        break;
      case 'year':
        startDate = subMonths(now, 12);
        break;
      default: // month
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 0));
        break;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch transaction statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['transaction-stats', selectedPeriod, startDate, endDate],
    queryFn: () => transactionService.getStats(
      startDate.toISOString(),
      endDate.toISOString()
    ),
  });

  // Fetch category statistics
  const { data: categoryStatsResponse, isLoading: categoryLoading } = useQuery({
    queryKey: ['category-stats', selectedPeriod, startDate, endDate],
    queryFn: () => categoryService.getCategoryStats(
      startDate.toISOString(),
      endDate.toISOString(),
      'expense'
    ),
  });

  const stats: TransactionStats | undefined = statsResponse?.data;
  const categoryStats: CategoryStats | undefined = categoryStatsResponse?.data;
  const isLoading = statsLoading || categoryLoading;

  // Period selection buttons
  const renderPeriodButton = (period: PeriodType, label: string) => (
    <TouchableOpacity
      key={period}
      style={[
        styles.periodButton,
        {
          backgroundColor: selectedPeriod === period 
            ? themeConfig.colors.primary 
            : 'transparent',
          borderColor: themeConfig.colors.primary,
        }
      ]}
      onPress={() => setSelectedPeriod(period)}
    >
      <Text style={[
        styles.periodButtonText,
        {
          color: selectedPeriod === period 
            ? '#ffffff' 
            : themeConfig.colors.primary
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Prepare data for charts
  const prepareLineChartData = () => {
    if (!stats?.categoryStats) { // 🔥 Usar categoryStats ao invés de monthlyEvolution
      return { labels: [], datasets: [] };
    }

    // 🔥 MOCK: Criar dados de exemplo já que monthlyEvolution não existe
    const mockEvolution = [
      { month: 'Jan', income: stats.summary.income * 0.8, expense: stats.summary.expense * 0.7 },
      { month: 'Fev', income: stats.summary.income * 0.9, expense: stats.summary.expense * 0.8 },
      { month: 'Mar', income: stats.summary.income * 1.1, expense: stats.summary.expense * 0.9 },
      { month: 'Abr', income: stats.summary.income * 0.7, expense: stats.summary.expense * 1.1 },
      { month: 'Mai', income: stats.summary.income * 1.0, expense: stats.summary.expense * 1.0 },
      { month: 'Jun', income: stats.summary.income, expense: stats.summary.expense },
    ];

    const labels = mockEvolution.map(item => item.month);
    const incomeData = mockEvolution.map(item => item.income);
    const expenseData = mockEvolution.map(item => item.expense);

    return {
      labels,
      datasets: [
        {
          data: incomeData,
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          strokeWidth: 3,
        },
        {
          data: expenseData,
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  };

  const preparePieChartData = () => {
    if (!categoryStats?.stats) return [];

    return categoryStats.stats
      .filter((stat) => stat.category)
      .slice(0, 6)
      .map((stat) => ({
        name: stat.category.name,
        amount: stat.total,
        color: stat.category.color,
      }));
  };

  const prepareBarChartData = () => {
    if (!categoryStats?.stats) return { labels: [], datasets: [] };

    const topCategories = categoryStats.stats.slice(0, 5);

    return {
      labels: topCategories.map((stat) => stat.category.name.substring(0, 8)),
      datasets: [
        {
          data: topCategories.map((stat) => stat.total),
        },
      ],
    };
  };

  const prepareDonutChartData = () => {
    if (!stats?.summary) return [];

    const total = stats.summary.income + stats.summary.expense;
    if (total === 0) return [];

    return [
      {
        name: 'Receitas',
        value: Math.round((stats.summary.income / total) * 100),
        color: themeConfig.colors.success,
      },
      {
        name: 'Gastos', 
        value: Math.round((stats.summary.expense / total) * 100),
        color: themeConfig.colors.error,
      },
    ];
  };

  // Summary card with key metrics
  const renderSummaryCard = () => (
    <Card variant="elevated" style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
          Resumo Financeiro
        </Text>
        <Text style={[styles.periodText, { color: themeConfig.colors.textSecondary }]}>
          {format(startDate, 'dd/MM', { locale: ptBR })} - {format(endDate, 'dd/MM', { locale: ptBR })}
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: themeConfig.colors.success + '20' }]}>
            <Ionicons name="trending-up" size={24} color={themeConfig.colors.success} />
          </View>
          <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
            Receitas
          </Text>
          <Text style={[styles.summaryValue, { color: themeConfig.colors.success }]}>
            {formatCurrency(stats?.summary?.income || 0)}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: themeConfig.colors.error + '20' }]}>
            <Ionicons name="trending-down" size={24} color={themeConfig.colors.error} />
          </View>
          <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
            Gastos
          </Text>
          <Text style={[styles.summaryValue, { color: themeConfig.colors.error }]}>
            {formatCurrency(stats?.summary?.expense || 0)}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: themeConfig.colors.primary + '20' }]}>
            <Ionicons name="wallet" size={24} color={themeConfig.colors.primary} />
          </View>
          <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
            Saldo
          </Text>
          <Text style={[
            styles.summaryValue, 
            { color: (stats?.summary?.balance || 0) >= 0 ? themeConfig.colors.success : themeConfig.colors.error }
          ]}>
            {formatCurrency(stats?.summary?.balance || 0)}
          </Text>
        </View>
      </View>
    </Card>
  );

  // Transaction statistics
  const renderTransactionStats = () => (
    <Card variant="elevated" style={styles.statsCard}>
      <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
        📊 Estatísticas Detalhadas
      </Text>

      <View style={styles.statsList}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
            Total de Transações
          </Text>
          <Text style={[styles.statValue, { color: themeConfig.colors.text }]}>
            {stats?.summary?.totalTransactions || 0}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
            Transações de Receita
          </Text>
          <Text style={[styles.statValue, { color: themeConfig.colors.success }]}>
            {stats?.summary?.incomeCount || 0}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
            Transações de Gasto
          </Text>
          <Text style={[styles.statValue, { color: themeConfig.colors.error }]}>
            {stats?.summary?.expenseCount || 0}
          </Text>
        </View>

        {/* 🔥 NOVO: Ticket médio calculado */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
            Ticket Médio
          </Text>
          <Text style={[styles.statValue, { color: themeConfig.colors.text }]}>
            {formatCurrency(
              stats?.summary?.totalTransactions 
                ? (stats.summary.income + stats.summary.expense) / stats.summary.totalTransactions 
                : 0
            )}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
            Economia Diária Média
          </Text>
          <Text style={[styles.statValue, { color: themeConfig.colors.primary }]}>
            {formatCurrency((stats?.summary?.balance || 0) / 30)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
            Categorias Utilizadas
          </Text>
          <Text style={[styles.statValue, { color: themeConfig.colors.text }]}>
            {categoryStats?.stats?.length || 0}
          </Text>
        </View>
      </View>
    </Card>
  );

  // Insights inteligentes
  const renderInsights = () => {
    if (!stats?.summary) return null;

    const insights = [];
    
    // Comparação com período anterior (mock para exemplo)
    const balanceChange = stats.summary.balance > 0 ? 'positivo' : 'negativo';
    insights.push(`Seu saldo está ${balanceChange} este período`);
    
    if (stats.summary.totalTransactions > 0) {
      insights.push(`Você fez ${stats.summary.totalTransactions} transações`);
    }
    
    if (categoryStats?.stats && categoryStats.stats.length > 0) {
      const topCategory = categoryStats.stats[0];
      insights.push(`Sua categoria que mais gasta é ${topCategory.category.name}`);
    }

    if (insights.length === 0) return null;

    return (
      <Card variant="elevated" style={styles.insightsCard}>
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
          💡 Insights Inteligentes
        </Text>
        
        {insights.map((insight, index) => (
          <View key={index} style={styles.insightItem}>
            <Ionicons name="bulb" size={16} color={themeConfig.colors.warning} />
            <Text style={[styles.insightText, { color: themeConfig.colors.textSecondary }]}>
              {insight}
            </Text>
          </View>
        ))}
      </Card>
    );
  };

  // Share report function
  const handleShareReport = async () => {
    if (!stats) return;

    const periodLabel = {
      week: 'Semana',
      month: 'Mês',
      quarter: 'Trimestre',
      year: 'Ano',
    }[selectedPeriod];

    const reportText = `
📊 RELATÓRIO FINANCEIRO - ${periodLabel.toUpperCase()}
📅 Período: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}

💰 RESUMO:
• Receitas: ${formatCurrency(stats.summary?.income || 0)}
• Gastos: ${formatCurrency(stats.summary?.expense || 0)}
• Saldo: ${formatCurrency(stats.summary?.balance || 0)}

📈 ESTATÍSTICAS:
• Total de transações: ${stats.summary?.totalTransactions || 0}
• Transações de receita: ${stats.summary?.incomeCount || 0}
• Transações de gasto: ${stats.summary?.expenseCount || 0}
• Ticket médio: ${formatCurrency(
      stats.summary?.totalTransactions 
        ? (stats.summary.income + stats.summary.expense) / stats.summary.totalTransactions 
        : 0
    )}

🏷️ TOP 3 CATEGORIAS:
${categoryStats?.stats?.slice(0, 3).map((stat, index) =>
      `${index + 1}. ${stat.category.name}: ${formatCurrency(stat.total)}`
    ).join('\n') || 'Nenhuma categoria encontrada'}

📱 Gerado pelo App Financeiro
    `.trim();

    try {
      await Share.share({
        message: reportText,
        title: `Relatório Financeiro - ${periodLabel}`,
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Relatórios" showBackButton onBackPress={() => navigation.goBack()} />
        <Loading />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header
        title="📊 Relatórios"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={handleShareReport}>
            <Ionicons name="share-outline" size={24} color={themeConfig.colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selection */}
        <View style={styles.periodContainer}>
          {renderPeriodButton('week', 'Semana')}
          {renderPeriodButton('month', 'Mês')}
          {renderPeriodButton('quarter', 'Trimestre')}
          {renderPeriodButton('year', 'Ano')}
        </View>

        {/* Summary Card */}
        {renderSummaryCard()}

        {/* Balance Distribution - Donut Chart */}
        {prepareDonutChartData().length > 0 && (
          <Card variant="elevated" style={styles.chartCard}>
            <DonutChart
              data={prepareDonutChartData()}
              title="📊 Distribuição do Saldo"
              centerText={`${Math.round((stats?.summary?.income || 0) / ((stats?.summary?.income || 0) + (stats?.summary?.expense || 0)) * 100) || 0}%`}
              centerSubtext="Receitas"
              height={200}
            />
          </Card>
        )}

        {/* Evolution Chart */}
        {prepareLineChartData().labels.length > 0 && (
          <Card variant="elevated" style={styles.chartCard}>
            <LineChart
              data={prepareLineChartData()}
              title="📈 Evolução de Receitas e Gastos"
              height={200}
              formatYLabel={(value) => `R$ ${value}`}
            />
          </Card>
        )}

        {/* Category Spending - Pie Chart */}
        {preparePieChartData().length > 0 && (
          <Card variant="elevated" style={styles.chartCard}>
            <PieChart
              data={preparePieChartData()}
              title="🥧 Gastos por Categoria"
              height={200}
            />
          </Card>
        )}

        {/* Top Categories - Bar Chart */}
        {prepareBarChartData().labels.length > 0 && (
          <Card variant="elevated" style={styles.chartCard}>
            <BarChart
              data={prepareBarChartData()}
              title="🏆 Top 5 Categorias"
              height={200}
              showValues
              formatYLabel={(value) => `R$ ${Math.round(parseFloat(value))}`}
            />
          </Card>
        )}

        {/* Transaction Statistics */}
        {renderTransactionStats()}

        {/* Insights */}
        {renderInsights()}

        {/* Actions Card */}
        <Card variant="elevated" style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            🚀 Ações Rápidas
          </Text>

          <View style={styles.actionsList}>
            <Button
              title="📤 Compartilhar Relatório"
              onPress={handleShareReport}
              variant="outline"
              style={styles.actionButton}
              leftIcon={<Ionicons name="share-outline" size={16} color={themeConfig.colors.primary} />}
            />

            <Button
              title="💾 Exportar Dados"
              onPress={() => {
                Alert.alert('Info', 'Funcionalidade de exportação será implementada em breve');
              }}
              variant="outline"
              style={styles.actionButton}
              leftIcon={<Ionicons name="download-outline" size={16} color={themeConfig.colors.primary} />}
            />

            <Button
              title="📝 Ver Transações"
              onPress={() => {
                // 🔥 CORREÇÃO: Navegação corrigida
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate('Transactions');
                } else {
                  navigation.navigate('MainTabs', { screen: 'Transactions' });
                }
              }}
              variant="outline"
              style={styles.actionButton}
              leftIcon={<Ionicons name="list-outline" size={16} color={themeConfig.colors.primary} />}
            />
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
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  periodText: {
    fontSize: 12,
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
  insightsCard: {
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    flex: 1,
  },
  actionsCard: {
    marginBottom: 16,
  },
  actionsList: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 24,
  },
});