import { useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import { LineChart } from "react-native-gifted-charts";

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
  onSelect: (item: StockData) => void;
}

const StockChart: React.FC<StockChartProps> = ({
  data = [],
  type,
  onSelect,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<StockData | null>(null);

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <View style={styles.chartWrapper}>
        <Text>No data available</Text>
      </View>
    );
  }

  const chartData = data.map((item) => ({
    value: item.close,
    date: item.date,
    dataPointText: item.close.toFixed(2),
  }));

  return (
    <View style={styles.chartWrapper}>
      <LineChart
        data={chartData}
        height={200}
        width={200}
        spacing={1.9}
        initialSpacing={10}
        color="#FF4500"
        thickness={2}
        startFillColor="#FF450020"
        endFillColor="#FF450000"
        startOpacity={0.9}
        endOpacity={0.2}
        backgroundColor="transparent"
        rulesType="solid"
        rulesColor="#eda182"
        yAxisColor="#eda182"
        xAxisColor="#eda182"
        hideDataPoints
        curved
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartWrapper: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  noDataText: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
    fontSize: 16,
  },
  labelText: {
    color: "#666",
    fontSize: 10,
    transform: [{ rotate: "-45deg" }],
    width: 50,
    marginLeft: -25,
  },
  tooltipContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  tooltipDate: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
    color: "#333",
  },
  tooltipPrice: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  yAxisText: {
    color: "#666",
    fontSize: 12,
  },
  xAxisText: {
    color: "#666",
    fontSize: 10,
  },
});

export default StockChart;
