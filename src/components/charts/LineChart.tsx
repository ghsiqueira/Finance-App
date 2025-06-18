import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

const { width } = Dimensions.get('window');

interface LineChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
      color?: (opacity: number) => string;
      strokeWidth?: number;
    }>;
  };
  title?: string;
  height?: number;
  showLegend?: boolean;
  formatYLabel?: (value: string) => string;
}

export default function LineChart({
  data,
  title,
  height = 220,
  showLegend = false,
  formatYLabel,
}: LineChartProps) {
  const { theme } = useThemeStore();
  const themeConfig = getTheme(theme);

  const chartConfig = {
    backgroundColor: themeConfig.colors.background,
    backgroundGradientFrom: themeConfig.colors.card,
    backgroundGradientTo: themeConfig.colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
    labelColor: (opacity = 1) => themeConfig.colors.text + Math.round(opacity * 255).toString(16),
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: themeConfig.colors.primary,
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
      <RNLineChart
        data={data}
        width={width - 32}
        height={height}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero
      />
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
});
