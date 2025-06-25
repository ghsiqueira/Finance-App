import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart as RNPieChart } from 'react-native-chart-kit';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

const { width } = Dimensions.get('window');

interface PieChartData {
  name: string;
  amount: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title?: string;
  height?: number;
  showLegend?: boolean;
}

export default function PieChart({
  data,
  title,
  height = 220,
  showLegend = true,
}: PieChartProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: themeConfig.colors.textSecondary }]}>
          Nenhum dado para exibir
        </Text>
      </View>
    );
  }

  const chartData = data.map((item, index) => ({
    name: item.name,
    population: item.amount,
    color: item.color,
    legendFontColor: themeConfig.colors.text,
    legendFontSize: 12,
  }));

  const chartConfig = {
    backgroundColor: themeConfig.colors.card,
    backgroundGradientFrom: themeConfig.colors.card,
    backgroundGradientTo: themeConfig.colors.card,
    color: (opacity = 1) => themeConfig.colors.text + Math.round(opacity * 255).toString(16),
  };

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: themeConfig.colors.text }]}>
          {title}
        </Text>
      )}
      
      <RNPieChart
        data={chartData}
        width={width - 32}
        height={height}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        center={[10, 0]}
        absolute={false}
      />

      {showLegend && (
        <View style={styles.legendContainer}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: themeConfig.colors.textSecondary }]}>
                {item.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
});
