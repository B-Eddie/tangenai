import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { router } from "expo-router";
import { theme } from "../components/theme";
import { Dropdown } from "react-native-element-dropdown";
import StockChart from "../components/StockChart";
import axios from "axios";

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

export default function Home() {
  const [companies, setCompanies] = useState<string>("");
  const [investingHorizon, setInvestingHorizon] =
    useState<string>("short-term");
  const [loading, setLoading] = useState<boolean>(false);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [chartType, setChartType] = useState<"line" | "candlestick">("line");

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
    setLoading(true);
    try {
      const options = {
        method: "GET",
        url: `https://yahoo-finance15.p.rapidapi.com/api/yahoo/hi/history/${ticker}/1d`,
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "yahoo-finance15.p.rapidapi.com",
        },
      };

      const response = await axios.request(options);
      const items = response.data.items;

      if (items) {
        const formattedData = Object.entries(items).map(
          ([timestamp, item]: [string, any]) => ({
            date: item.date,
            value: parseFloat(item.close), // Add value for LineChart
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            label: `$${item.close}`, // Add label for data points
            dataPointText: item.close.toFixed(2), // Add text for data points
          })
        );

        const sortedData = formattedData.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Take last 30 days of data
        const recentData = sortedData.slice(-30);
        setStockData(recentData);
      } else {
        setStockData([]);
      }
    } catch (error) {
      console.error(
        "Error:",
        error instanceof Error ? error.message : "Unknown error"
      );
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async () => {
    if (!companies.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "https://tangen-api.onrender.com/recommend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companies: companies.split(",").map((company) => company.trim()),
            investing_horizon: investingHorizon,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      router.push({
        pathname: "/recommendations",
        params: { data: JSON.stringify(data) },
      });
    } catch (error) {
      console.error(
        "Error:",
        error instanceof Error ? error.message : "Unknown error"
      );
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
        placeholder="NVDA, TLSA, GOOGL"
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
});
