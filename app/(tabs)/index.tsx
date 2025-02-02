import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { router, useRouter } from "expo-router";
import { theme } from "../../components/theme";
import { Dropdown } from "react-native-element-dropdown";
import StockChart from "../../components/StockChart";
import axios from "axios";
import { APIContext } from '../_layout';
import { getStockRecommendation } from '../services/stockService';


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
        companies.split(",").map(c => c.trim().toUpperCase()),
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
      <Text style={styles.headerText}>Stocks</Text>

      <Text style={styles.labelText}>Ticker name</Text>
      <TextInput
        value={companies}
        onChangeText={setCompanies}
        mode="outlined"
        style={styles.input}
        placeholder="NVDA"
        placeholderTextColor="#999999"
        outlineColor={theme.colors.border}
        activeOutlineColor={theme.colors.primary}
      />

      <Text style={styles.labelText}>Investing Horizon</Text>
      <Dropdown
        style={[styles.pickerContainer, { height: 50, padding: 10 }]}
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

      <Text style={styles.labelText}>Graph</Text>
      {stockData.length > 0 ? (
        <StockChart
          data={stockData}
          type={chartType}
          onSelect={(item) => console.log("Selected:", item)}
        />
      ) : (
        <Text style={styles.noDataText}>
          Enter a ticker symbol to view the chart.
        </Text>
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
        Submit
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4DEAD",
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
  headerText: {
    fontSize: 40,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 16,
    marginTop: 66,
    textAlign: "center",
  },
  labelText: {
    fontSize: 20,
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
    textAlign: "center",
    marginTop: 20,
    marginLeft: 20,
    color: "#666",
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