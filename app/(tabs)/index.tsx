import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { router, useRouter } from "expo-router";
import { theme } from "../../components/theme";
import { Dropdown } from "react-native-element-dropdown";
import StockChart from "../../components/StockChart";
import axios from "axios";
import { APIContext } from "../_layout";
import { getStockRecommendation } from "../services/stockService";
import AnimatedBackground from "../../components/AnimatedBackground";
import { LinearGradient } from "expo-linear-gradient";

interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface DropdownItem {
  label: string;
  value: string;
}

// const router = useRouter();
function Home() {
  const API_URL = useContext(APIContext);
  const [companies, setCompanies] = useState<string>("");
  const [investingHorizon, setInvestingHorizon] =
    useState<string>("short-term");
  const [loading, setLoading] = useState<boolean>(false);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [chartType, setChartType] = useState<"line" | "candlestick">("line");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (companies.trim()) {
        fetchStockData(companies.trim());
      } else {
        setStockData([]);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [companies]);

  const fetchStockData = async (ticker: string) => {
    const CORS_PROXY = "https://corsproxy.io/?";

    setLoading(true);
    try {
      const cleanTicker = ticker.trim().toUpperCase();
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?range=7d&interval=1d&includePrePost=false`;
      const fullUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

      const response = await axios.get(fullUrl);
      const result = response.data.chart.result[0];

      if (!result) throw new Error("No data available");

      const timestamps = result.timestamp || [];
      const quotes = result.indicators.quote[0] || {
        open: [],
        high: [],
        low: [],
        close: [],
      };

      const formattedData = timestamps.map((time: number, i: number) => ({
        date: new Date(time * 1000).toISOString(),
        open: quotes.open[i] || 0,
        high: quotes.high[i] || 0,
        low: quotes.low[i] || 0,
        close: quotes.close[i] || 0,
      }));

      setStockData(formattedData);
    } catch (error) {
      console.error("Error fetching stock data:", error);
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!companies.trim()) {
      setError("Please enter a company ticker");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const recommendationsData = await getStockRecommendation(
        companies.split(",").map((c) => c.trim().toUpperCase()),
        investingHorizon
      );

      router.push({
        pathname: "../recommendations",
        params: { data: JSON.stringify(recommendationsData) },
      });
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const dropdownData: DropdownItem[] = [
    { label: "Short-term (30 days)", value: "short-term" },
    { label: "Long-term (5 years)", value: "long-term" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.headerContainer, { alignSelf: "center" }]}>
        <Text style={styles.headerText}>Smart Stock Analysis</Text>
        <Text style={styles.smallHeaderText}>
          TangenAI analyzes market data to provide intelligent stock
          recommendations tailored to your investment goals.
        </Text>

        <View style={[styles.stockContainer, { alignSelf: "center" }]}>
          <LinearGradient
            colors={["#ff5a1f", "#d03801"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.stockHeader}
          >
            <Text style={{ color: "white", fontSize: 28, fontWeight: "bold" }}>
              Stock Analysis
            </Text>
            <Text style={{ color: "white", fontSize: 16 }}>
              Get insights and recommendations for your investments
            </Text>
          </LinearGradient>
          <Text style={styles.labelText}>Stock Ticker</Text>
          <TextInput
            value={companies}
            onChangeText={setCompanies}
            mode="outlined"
            style={styles.input}
            placeholder="Enter stock symbol (e.g., MSFT)"
            placeholderTextColor="#999999"
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="magnify" />}
          />

          <Text style={styles.labelText}>Investment Timeline</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                position: "absolute",
                left: 15,
                zIndex: 2,
                bottom: 15,
                height: 50,
                justifyContent: "center",
              }}
            >
              <TextInput.Icon icon="clock-outline" />
            </View>
            <Dropdown
              style={[
                styles.pickerContainer,
                { height: 50, padding: 20, flex: 1, paddingLeft: 53 },
              ]}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              data={dropdownData}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Choose your investment timeline..."
              value={investingHorizon}
              onChange={(item) => setInvestingHorizon(item.value)}
            />
          </View>
        </View>

        {stockData.length > 0 ? (
          <StockChart
            data={stockData}
            type={chartType}
            onSelect={(item) => console.log("Selected:", item)}
          />
        ) : (
          <View style={styles.graphContainer}>
            <Text>
              <TextInput.Icon
                icon="chart-line"
                size={40}
                color="#666"
                style={{ marginBottom: 100 }}
              />
            </Text>

            <Text style={styles.noDataText}>
              Enter a stock symbol above to view the price chart
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Get Recommendations
        </Button>
      </View>
      <AnimatedBackground
        particleColor="#ff7a00"
        opacityLight={0.15}
        opacityDark={0.25}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 26,
  },
  scrollContent: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 50,
    borderColor: theme.colors.border,
    height: 50,
  },
  headerContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  stockContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 1100,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingBottom: 32,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 15,
    elevation: 4, // For Android
    alignSelf: "center",
  },
  stockHeader: {
    marginHorizontal: -24, // Offset the parent's padding
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginTop: -24,
    padding: 24,
  },
  headerText: {
    fontSize: 50,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginTop: 20,
    textAlign: "center",
  },
  smallHeaderText: {
    fontSize: 16,
    color: theme.colors.brownheader,
    marginBottom: 40,
    marginTop: 20,
    textAlign: "center",
  },
  labelText: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.brownheader,
    marginBottom: 16,
    marginTop: 20,
    textAlign: "left",
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderColor: theme.colors.border,
  },
  dropdownPlaceholder: {
    color: "#666",
    paddingLeft: 5,
  },
  dropdownSelectedText: {
    color: "#000",
  },
  button: {
    marginTop: 50,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buttonLabel: {
    fontSize: 20,
    fontWeight: "bold",
  },
  noDataText: {
    color: "#666",
  },
  graphContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    paddingTop: 20,
    marginTop: 20,
    maxWidth: 900,
    height: 208,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 15,
  },
  errorContainer: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    fontSize: 14,
  },
});

export default Home;
