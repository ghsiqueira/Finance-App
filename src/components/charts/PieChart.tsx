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
  legendFontColor?: string;
  legendFontSize?: number;
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

  const chartConfig = {
    backgroundColor: themeConfig.colors.background,
    backgroundGradientFrom: themeConfig.colors.card,
    backgroundGradientTo: themeConfig.colors.card,
    color: (opacity = 1) => themeConfig.colors.primary + Math.round(opacity * 255).toString(16),
  };

  const formattedData = data.map((item, index) => ({
    ...item,
    legendFontColor: item.legendFontColor || themeConfig.colors.text,
    legendFontSize: item.legendFontSize || 12,
  }));

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: themeConfig.colors.text }]}>
          {title}
        </Text>
      )}
      <RNPieChart
        data={formattedData}
        width={width - 32}
        height={height}
        chartConfig={chartConfig}
        accessor="amount"
        backgroundColor="transparent"
        paddingLeft="15"
        center={[10, 0]}
        absolute={false}
      />
      {showLegend && (
        <View style={styles.legend}>
          {formattedData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: themeConfig.colors.text }]}>
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
  legend: {
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
