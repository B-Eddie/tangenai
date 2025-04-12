// components/StockChart.tsx
import { View, StyleSheet, Text, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useMemo } from "react";
import { theme } from "./theme";

interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface StockChartProps {
  data: StockData[];
  type: "line" | "candlestick";
}

const StockChart: React.FC<StockChartProps> = ({ data = [], type }) => {
  const { width: screenWidth } = useWindowDimensions();

  const chartData = useMemo(
    () => ({
      labels: data.map((item) =>
        new Date(item.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      ),
      datasets: [
        {
          data: data.map((item) =>
            type === "candlestick"
              ? [item.open, item.high, item.low, item.close]
              : item.close
          ),
          color: (opacity = 1) => `rgba(255, 69, 0, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    }),
    [data, type]
  );

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <View style={styles.chartWrapper}>
        <Text>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartWrapper}>
      <LineChart
        data={chartData}
        width={screenWidth}
        height={220}
        yAxisLabel="$"
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: "transparent",
          backgroundGradientFrom: "transparent",
          backgroundGradientTo: "transparent",
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(237, 161, 130, ${opacity})`,
          labelColor: (opacity = 0.5) => `rgba(228, 93, 40, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "0", // Hide dots
          },
          propsForLabels: {
            fontFamily:
              'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontSize: 12,
          },
        }}
        bezier
        style={styles.chart}
        verticalLabelRotation={-45}
        xLabelsOffset={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartWrapper: {
    marginVertical: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default StockChart;
