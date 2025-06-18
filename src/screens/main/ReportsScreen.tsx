import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
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

export default function ReportsScreen({ navigation }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const periods = [
    { key: 'week', label: 'Semana', icon: 'calendar-outline' },
    { key: 'month', label: 'Mês', icon: 'calendar-outline' },
    { key: 'quarter', label: 'Trimestre', icon: 'calendar-outline' },
    { key: 'year', label: 'Ano', icon: 'calendar-outline' },
  ];

  // Calcular datas baseado no período selecionado
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'quarter':
        startDate = subMonths(startOfMonth(now), 3);
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default: // month
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const { startDate, endDate } = getDateRange();

  // Buscar estatísticas
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['transaction-stats', startDate, endDate],
    queryFn: () => transactionService.getStats(startDate, endDate),
  });

  // Buscar estatísticas por categoria
  const { data: categoryStatsResponse, isLoading: categoryLoading } = useQuery({
    queryKey: ['category-stats', startDate, endDate],
    queryFn: () => categoryService.getCategoryStats(startDate, endDate),
  });

  const stats = statsResponse?.data;
  const categoryStats = categoryStatsResponse?.data;

  const isLoading = statsLoading || categoryLoading;

  // Preparar dados para gráficos
  const prepareLineChartData = () => {
    if (!stats) return { labels: [], datasets: [] };

    // Dados simulados para o gráfico de linha (evolução mensal)
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const incomeData = [3000, 3200, 2800, 3500, 3100, 3300];
    const expenseData = [2500, 2800, 2600, 2900, 2700, 2400];

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
      .filter(stat => stat.category.type === 'expense')
      .slice(0, 6)
      .map(stat => ({
        name: stat.category.name,
        amount: stat.total,
        color: stat.category.color,
      }));
  };

  const prepareBarChartData = () => {
    if (!categoryStats?.stats) return { labels: [], datasets: [] };

    const topCategories = categoryStats.stats.slice(0, 5);
    
    return {
      labels: topCategories.map(stat => stat.category.name.substring(0, 8)),
      datasets: [
        {
          data: topCategories.map(stat => stat.total),
        },
      ],
    };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
        <Header title="Relatórios" showBackButton onBackPress={() => navigation.goBack()} />
        <Loading message="Carregando relatórios..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeConfig.colors.background }]}>
      <Header title="Relatórios" showBackButton onBackPress={() => navigation.goBack()} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Seletor de Período */}
        <Card style={styles.periodCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Período do Relatório
          </Text>
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.key && styles.periodButtonActive,
                  selectedPeriod === period.key && {
                    backgroundColor: themeConfig.colors.primary + '20',
                    borderColor: themeConfig.colors.primary,
                  }
                ]}
                onPress={() => setSelectedPeriod(period.key as PeriodType)}
              >
                <Ionicons
                  name={period.icon as any}
                  size={16}
                  color={selectedPeriod === period.key ? themeConfig.colors.primary : themeConfig.colors.textSecondary}
                />
                <Text style={[
                  styles.periodButtonText,
                  {
                    color: selectedPeriod === period.key ? themeConfig.colors.primary : themeConfig.colors.textSecondary
                  }
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Resumo Financeiro */}
        <Card style={styles.summaryCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Resumo Financeiro
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: themeConfig.colors.success + '20' }]}>
                <Ionicons name="trending-up" size={24} color={themeConfig.colors.success} />
              </View>
              <Text style={[styles.summaryLabel, { color: themeConfig.colors.textSecondary }]}>
                Receitas
              </Text>
              <Text style={[styles.summaryValue, { color: themeConfig.colors.success }]}>
                {formatCurrency(stats?.summary.income || 0)}
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
                {formatCurrency(stats?.summary.expense || 0)}
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
                { color: (stats?.summary.balance || 0) >= 0 ? themeConfig.colors.success : themeConfig.colors.error }
              ]}>
                {formatCurrency(stats?.summary.balance || 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Gráfico de Evolução */}
        <Card style={styles.chartCard}>
          <LineChart
            data={prepareLineChartData()}
            title="Evolução de Receitas e Gastos"
            height={200}
            formatYLabel={(value) => `R$ ${value}`}
          />
        </Card>

        {/* Gastos por Categoria - Gráfico de Pizza */}
        {preparePieChartData().length > 0 && (
          <Card style={styles.chartCard}>
            <PieChart
              data={preparePieChartData()}
              title="Gastos por Categoria"
              height={200}
            />
          </Card>
        )}

        {/* Top Categorias - Gráfico de Barras */}
        {prepareBarChartData().labels.length > 0 && (
          <Card style={styles.chartCard}>
            <BarChart
              data={prepareBarChartData()}
              title="Top 5 Categorias"
              height={200}
              showValues
              formatYLabel={(value) => `R$ ${value}`}
            />
          </Card>
        )}

        {/* Estatísticas Detalhadas */}
        <Card style={styles.statsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Estatísticas Detalhadas
          </Text>
          
          <View style={styles.statsList}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                Total de Transações
              </Text>
              <Text style={[styles.statValue, { color: themeConfig.colors.text }]}>
                {stats?.summary.totalTransactions || 0}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                Média de Gastos por Dia
              </Text>
              <Text style={[styles.statValue, { color: themeConfig.colors.text }]}>
                {formatCurrency((stats?.summary.expense || 0) / 30)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                Maior Gasto
              </Text>
              <Text style={[styles.statValue, { color: themeConfig.colors.error }]}>
                {formatCurrency(Math.max(...(categoryStats?.stats.map(s => s.total) || [0])))}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeConfig.colors.textSecondary }]}>
                Categoria Mais Usada
              </Text>
              <Text style={[styles.statValue, { color: themeConfig.colors.text }]}>
                {categoryStats?.stats[0]?.category.name || 'N/A'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Ações */}
        <Card style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: themeConfig.colors.text }]}>
            Ações
          </Text>
          
          <View style={styles.actionsList}>
            <Button
              title="Exportar Relatório"
              variant="outline"
              leftIcon={<Ionicons name="download-outline" size={20} color={themeConfig.colors.primary} />}
              onPress={() => {
                // TODO: Implementar exportação
                alert('Exportação será implementada em breve');
              }}
              fullWidth
              style={styles.actionButton}
            />

            <Button
              title="Compartilhar"
              variant="outline"
              leftIcon={<Ionicons name="share-outline" size={20} color={themeConfig.colors.primary} />}
              onPress={() => {
                // TODO: Implementar compartilhamento
                alert('Compartilhamento será implementado em breve');
              }}
              fullWidth
              style={styles.actionButton}
            />
          </View>
        </Card>
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
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  periodCard: {
    marginBottom: 16,
    marginTop: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
    minWidth: '22%',
    justifyContent: 'center',
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
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  chartCard: {
    marginBottom: 16,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsList: {
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsCard: {
    marginBottom: 24,
  },
  actionsList: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 0,
  },
});