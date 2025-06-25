import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart as RNBarChart } from 'react-native-chart-kit';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

const { width } = Dimensions.get('window');

interface BarChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
    }>;
  };
  title?: string;
  height?: number;
  showValues?: boolean;
  formatYLabel?: (value: string) => string;
}

export default function BarChart({
  data,
  title,
  height = 220,
  showValues = false,
  formatYLabel,
}: BarChartProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  if (!data.labels.length || !data.datasets.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: themeConfig.colors.textSecondary }]}>
          Nenhum dado para exibir
        </Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: themeConfig.colors.card,
    backgroundGradientFrom: themeConfig.colors.card,
    backgroundGradientTo: themeConfig.colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => themeConfig.colors.primary + Math.round(opacity * 255).toString(16),
    labelColor: (opacity = 1) => themeConfig.colors.text + Math.round(opacity * 255).toString(16),
    style: {
      borderRadius: 16,
    },
    formatYLabel: formatYLabel || ((value) => value),
  };

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: themeConfig.colors.text }]}>
          {title}
        </Text>
      )}
      
      <RNBarChart
        data={data}
        width={width - 32}
        height={height}
        chartConfig={chartConfig}
        style={styles.chart}
        verticalLabelRotation={30}
        showValuesOnTopOfBars={showValues}
        fromZero yAxisLabel={''} yAxisSuffix={''}      />
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
