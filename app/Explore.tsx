import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import axios from "axios";
import { theme } from "../components/theme";
import StockChart from "../components/StockChart";
import Slider from "@react-native-community/slider";
import { Dropdown } from "react-native-element-dropdown";

interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface StockInfo {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function ExploreStocks() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New state variables
  const [selectedSector, setSelectedSector] = useState<string>("All");
  const [riskLevel, setRiskLevel] = useState<number>(0);
  const [minCost, setMinCost] = useState<string>("");
  const [maxCost, setMaxCost] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(0);

  const sectors = [
    "All",
    "Technology",
    "Healthcare",
    "Financial",
    "Consumer",
    "Energy",
    "Industrial",
    "Materials",
    "Utilities",
    "Real Estate",
  ];

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchStockData(searchQuery.trim());
        fetchStockInfo(searchQuery.trim());
      } else {
        setStockData([]);
        setStockInfo(null);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const fetchStockInfo = async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const options = {
        method: "GET",
        url: `https://yahoo-finance15.p.rapidapi.com/api/yahoo/qu/quote/${ticker}`,
        headers: {
          "X-RapidAPI-Key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
          "X-RapidAPI-Host": "yahoo-finance15.p.rapidapi.com",
        },
      };

      const response = await axios.request(options);
      const data = response.data[0];

      if (data) {
        setStockInfo({
          symbol: data.symbol,
          companyName: data.shortName || data.longName,
          price: data.regularMarketPrice,
          change: data.regularMarketChange,
          changePercent: data.regularMarketChangePercent,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch stock info"
      );
      setStockInfo(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.headerText}>Explore</Text>

      <Text style={styles.labelText}>Select Sector</Text>
      <Dropdown
        style={styles.pickerContainer}
        data={sectors.map((sector) => ({ label: sector, value: sector }))}
        labelField="label"
        valueField="value"
        placeholder="Select sector"
        value={selectedSector}
        onChange={(item) => setSelectedSector(item.value)}
      />

      <Text style={styles.labelText}>Risk Level: {riskLevel}</Text>
      <Slider
        style={{ width: "100%", height: 40 }}
        minimumValue={0}
        maximumValue={5}
        step={1}
        value={riskLevel}
        onValueChange={setRiskLevel}
        minimumTrackTintColor={theme.colors.primary}
      />

      <Text style={styles.labelText}>Minimum Cost (CAD)</Text>
      <TextInput
        value={minCost.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        onChangeText={(text) => {
          const numericValue = text.replace(/[^0-9]/g, "");
          setMinCost(numericValue);
        }}
        style={[
          styles.searchInput,
          { flexDirection: "row", alignItems: "center" },
        ]}
        mode="outlined"
        keyboardType="numeric"
        maxLength={10}
        right={<TextInput.Affix text="CAD" />}
      />

      <Text style={styles.labelText}>Maximum Cost (CAD)</Text>
      <TextInput
        value={maxCost.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        onChangeText={(text) => {
          const numericValue = text.replace(/[^0-9]/g, "");
          setMaxCost(numericValue);
        }}
        style={[
          styles.searchInput,
          { flexDirection: "row", alignItems: "center" },
        ]}
        mode="outlined"
        keyboardType="numeric"
        maxLength={10}
        right={<TextInput.Affix text="CAD" />}
      />

      <Text style={styles.labelText}>Minimum Confidence: {confidence}%</Text>
      <Slider
        style={{ width: "100%", height: 40 }}
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={confidence}
        onValueChange={setConfidence}
        minimumTrackTintColor={theme.colors.primary}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <Text style={styles.labelText}>Loading...</Text>
      ) : stockInfo ? (
        <View style={styles.infoContainer}>
          <Text style={styles.symbol}>{stockInfo.symbol}</Text>
          <Text style={styles.companyName}>{stockInfo.companyName}</Text>
          <Text style={styles.price}>${stockInfo.price.toFixed(2)}</Text>
          <Text
            style={[
              styles.change,
              { color: stockInfo.change >= 0 ? "green" : "red" },
            ]}
          >
            {stockInfo.change > 0 ? "+" : ""}
            {stockInfo.change.toFixed(2)}({stockInfo.changePercent.toFixed(2)}%)
          </Text>
        </View>
      ) : null}

      {stockData.length > 0 && (
        <StockChart
          data={stockData}
          type="line"
          onSelect={(item) => console.log("Selected:", item)}
        />
      )}

      <Button
        mode="contained"
        // onPress={handleSubmit}
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
    paddingHorizontal: 26,
    backgroundColor: "#F4DEAD",
  },
  scrollContent: {
    padding: 16,
  },
  headerText: {
    fontSize: 40,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 16,
    marginTop: 66,
    textAlign: "center",
  },
  searchInput: {
    marginBottom: 16,
  },
  infoContainer: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    marginBottom: 16,
  },
  symbol: {
    fontSize: 24,
    fontWeight: "bold",
  },
  companyName: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: "500",
  },
  change: {
    fontSize: 16,
  },
  errorText: {
    color: "red",
    marginBottom: 16,
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
    height: 50,
    padding: 15,
    backgroundColor: "#fff",
    borderColor: theme.colors.border,
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
});
