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
import { format, subMonths, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LineChart from '../../components/charts/LineChart';
import PieChart from '../../components/charts/PieChart';
import BarChart from '../../components/charts/BarChart';
import Loading from '../../components/common/Loading';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';
import { transactionService } from '../../services/api/transactions';
import { categoryService } from '../../services/api/categories';
import { formatCurrency } from '../../utils/formatters';
import type { MainStackScreenProps } from '../../navigation/types';

const { width } = Dimensions.get('window');

type Props = MainStackScreenProps<'Reports'>;

type PeriodType = 'week' | 'month' | 'quarter' | 'year';

// Tipos para os dados de estatísticas
type MonthlyEvolutionItem = {
  year: number;
  month: number;
  income: number;
  expense: number;
};

type TransactionStatsSummary = {
  income: number;
  expense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  totalTransactions: number;
  averageTransaction?: number;
  highestExpense?: number;
  highestIncome?: number;
};

type TransactionStats = {
  summary: TransactionStatsSummary;
  monthlyEvolution?: MonthlyEvolutionItem[];
};

type CategoryStat = {
  category: {
    name: string;
    color: string;
    type: string;
  };
  total: number;
};

type CategoryStats = {
  stats: CategoryStat[];
};

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
        startDate = subMonths(now, 1);
        break;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch transaction statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['transaction-stats', selectedPeriod, startDate, endDate],
    // Corrigido: espera dois parâmetros string
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

  const prepareLineChartData = () => {
    if (!stats?.monthlyEvolution) {
      return { labels: [], datasets: [] };
    }

    const evolution = stats.monthlyEvolution.slice(-6); // Last 6 periods
    const labels = evolution.map((item: MonthlyEvolutionItem) =>
      format(new Date(item.year, item.month - 1), 'MMM', { locale: ptBR })
    );

    const incomeData = evolution.map((item: MonthlyEvolutionItem) => item.income);
    const expenseData = evolution.map((item: MonthlyEvolutionItem) => item.expense);

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
      .filter((stat: CategoryStat) => stat.category.type === 'expense')
      .slice(0, 6)
      .map((stat: CategoryStat) => ({
        name: stat.category.name,
        amount: stat.total,
        color: stat.category.color,
      }));
  };

  const prepareBarChartData = () => {
    if (!categoryStats?.stats) return { labels: [], datasets: [] };

    const topCategories = categoryStats.stats.slice(0, 5);

    return {
      labels: topCategories.map((stat: CategoryStat) => stat.category.name.substring(0, 8)),
      datasets: [
        {
          data: topCategories.map((stat: CategoryStat) => stat.total),
        },
      ],
    };
  };

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
• Ticket médio: ${formatCurrency(stats.summary?.averageTransaction || 0)}
• Maior gasto: ${formatCurrency(stats.summary?.highestExpense || 0)}
• Maior receita: ${formatCurrency(stats.summary?.highestIncome || 0)}

🏷️ TOP 3 CATEGORIAS:
${categoryStats?.stats?.slice(0, 3).map((stat: CategoryStat, index: number) =>
      `${index + 1}. ${stat.category.name}: ${formatCurrency(stat.total)}`
    ).join('\n') || 'Nenhuma categoria encontrada'}

Gerado pelo Finance App
    `.trim();

    try {
      await Share.share({
        message: reportText,
        title: `Relatório Financeiro - ${periodLabel}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const renderPeriodButton = (period: PeriodType, label: string) => (
    <TouchableOpacity
      key={period}
      style={[
        styles.periodButton,
        {
          backgroundColor: selectedPeriod === period
            ? themeConfig.colors.primary
            : themeConfig.colors.card,
          borderColor: selectedPeriod === period
            ? themeConfig.colors.primary
            : themeConfig.colors.border,
        }
      ]}
      onPress={() => setSelectedPeriod(period)}
    >
      <Text style={[
        styles.periodButtonText,
        {
          color: selectedPeriod === period
            ? '#ffffff'
            : themeConfig.colors.text
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSummaryCard = () => (
    <Card variant="elevated" style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
          Resumo Financeiro
        </Text>
        <Text style={[styles.periodText, { color: themeConfig.colors.textSecondary }]}>
          {format(startDate, 'dd/MM')} - {format(endDate, 'dd/MM/yyyy')}
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
          <View style={[styles.summaryIcon, {
            backgroundColor: (stats?.summary?.balance || 0) >= 0
              ? themeConfig.colors.primary + '20'
              : themeConfig.colors.error + '20'
          }]}>
            <Ionicons
              name={(stats?.summary?.balance || 0) >= 0 ? "trending-up" : "trending-down"}
              size={24}
              color={(stats?.summary?.balance || 0) >= 0 ? themeConfig.colors.primary : themeConfig.colors.error}
            />
          </View>
          <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
            Saldo
          </Text>
          <Text style={[
            styles.summaryValue,
            {
              color: (stats?.summary?.balance || 0) >= 0
                ? themeConfig.colors.primary
                : themeConfig.colors.error
            }
          ]}>
            {formatCurrency(stats?.summary?.balance || 0)}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderTransactionStats = () => (
    <Card variant="elevated" style={styles.statsCard}>
      <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
        Estatísticas de Transações
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
            Ticket Médio
          </Text>
          <Text style={[styles.statValue, { color: themeConfig.colors.text }]}>
            {formatCurrency(stats?.summary?.averageTransaction || 0)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
            Maior Receita
          </Text>
          <Text style={[styles.statValue, { color: themeConfig.colors.success }]}>
            {formatCurrency(stats?.summary?.highestIncome || 0)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
            Maior Gasto
          </Text>
          <Text style={[styles.statValue, { color: themeConfig.colors.error }]}>
            {formatCurrency(stats?.summary?.highestExpense || 0)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
            Economia Média Diária
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
        title="Relatórios"
        showBackButton
        onBackPress={() => navigation.goBack()}
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

        {/* Evolution Chart */}
        <Card variant="elevated" style={styles.chartCard}>
          <LineChart
            data={prepareLineChartData()}
            title="Evolução de Receitas e Gastos"
            height={200}
            formatYLabel={(value) => `R$ ${value}`}
          />
        </Card>

        {/* Category Spending - Pie Chart */}
        {preparePieChartData().length > 0 && (
          <Card variant="elevated" style={styles.chartCard}>
            <PieChart
              data={preparePieChartData()}
              title="Gastos por Categoria"
              height={200}
            />
          </Card>
        )}

        {/* Top Categories - Bar Chart */}
        {prepareBarChartData().labels.length > 0 && (
          <Card variant="elevated" style={styles.chartCard}>
            <BarChart
              data={prepareBarChartData()}
              title="Top 5 Categorias"
              height={200}
              showValues
              formatYLabel={(value) => `R$ ${value}`}
            />
          </Card>
        )}

        {/* Transaction Statistics */}
        {renderTransactionStats()}

        {/* Actions Card */}
        <Card variant="elevated" style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Ações Rápidas
          </Text>

          <View style={styles.actionsList}>
            <Button
              title="Compartilhar Relatório"
              onPress={handleShareReport}
              variant="outline"
              style={styles.actionButton}
              leftIcon={<Ionicons name="share-outline" size={16} color={themeConfig.colors.primary} />}
            />

            <Button
              title="Exportar Dados"
              onPress={() => {
                // TODO: Implement export functionality
                Alert.alert('Info', 'Funcionalidade de exportação será implementada em breve');
              }}
              variant="outline"
              style={styles.actionButton}
              leftIcon={<Ionicons name="download-outline" size={16} color={themeConfig.colors.primary} />}
            />

            <Button
              title="Ver Transações"
              onPress={() =>
                navigation.navigate({
                  name: 'MainTabs',
                  params: { screen: 'Transactions' },
                })
              }
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