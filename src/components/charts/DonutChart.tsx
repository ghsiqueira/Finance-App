import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useThemeStore } from '../../store/themeStore';
import { getTheme } from '../../styles/theme';

const { width } = Dimensions.get('window');

interface DonutChartData {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  title?: string;
  centerText?: string;
  centerSubtext?: string;
  height?: number;
}

export default function DonutChart({
  data,
  title,
  centerText,
  centerSubtext,
  height = 220,
}: DonutChartProps) {
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

  const chartData = data.map((item) => ({
    name: item.name,
    population: item.value,
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
      
      <View style={styles.chartContainer}>
        <PieChart
          data={chartData}
          width={width - 32}
          height={height}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 0]}
          absolute={false}
          hasLegend={false}
        />
        
        {(centerText || centerSubtext) && (
          <View style={styles.centerTextContainer}>
            {centerText && (
              <Text style={[styles.centerText, { color: themeConfig.colors.text }]}>
                {centerText}
              </Text>
            )}
            {centerSubtext && (
              <Text style={[styles.centerSubtext, { color: themeConfig.colors.textSecondary }]}>
                {centerSubtext}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.legendContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: themeConfig.colors.textSecondary }]}>
              {item.name}
            </Text>
            <Text style={[styles.legendValue, { color: themeConfig.colors.text }]}>
              {item.value}%
            </Text>
          </View>
        ))}
      </View>
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
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  centerTextContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -25 }],
    alignItems: 'center',
  },
  centerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  centerSubtext: {
    fontSize: 12,
    marginTop: 4,
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
    marginTop: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
