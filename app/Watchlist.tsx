import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { TextInput, Text, Card, ActivityIndicator } from "react-native-paper";
import axios from "axios";
import { RAPIDAPI_KEY } from "@env";
import { theme } from "../components/theme";

interface StockInfo {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function Watchlist() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStockInfo = async (ticker: string): Promise<StockInfo | null> => {
    try {
      const response = await axios.get(
        `https://yahoo-finance15.p.rapidapi.com/api/yahoo/qu/quote/${ticker}`,
        {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
        }
      );

      if (!response.data || !response.data[0]) {
        throw new Error(`No data returned for ${ticker}`);
      }
      const data = response.data[0];
      return {
        symbol: data.symbol,
        companyName: data.shortName || data.longName,
        price: data.regularMarketPrice,
        change: data.regularMarketChange,
        changePercent: data.regularMarketChangePercent,
      };
    } catch (error) {
      console.error(`Error fetching ${ticker}:`, error);
      return null;
    }
  };

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const watchlistSymbols = ["AAPL", "GOOGL", "MSFT", "AMZN"];
      const stocksData = await Promise.all(
        watchlistSymbols.map(fetchStockInfo)
      );
      setStocks(
        stocksData.filter((stock): stock is StockInfo => stock !== null)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stocks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadWatchlist().finally(() => setRefreshing(false));
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <TextInput
        placeholder="Search watchlist..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
        mode="outlined"
      />

      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        stocks
          .filter(
            (stock) =>
              stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
              stock.companyName
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
          )
          .map((stock) => (
            <Card key={stock.symbol} style={styles.stockCard}>
              <Card.Content>
                <View style={styles.stockHeader}>
                  <Text style={styles.symbol}>{stock.symbol}</Text>
                  <Text style={styles.price}>${stock.price.toFixed(2)}</Text>
                </View>
                <Text style={styles.companyName}>{stock.companyName}</Text>
                <Text
                  style={[
                    styles.change,
                    { color: stock.change >= 0 ? "green" : "red" },
                  ]}
                >
                  {stock.change > 0 ? "+" : ""}
                  {stock.change.toFixed(2)}({stock.changePercent.toFixed(2)}%)
                </Text>
              </Card.Content>
            </Card>
          ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  searchInput: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  stockCard: {
    marginBottom: 8,
  },
  stockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  symbol: {
    fontSize: 18,
    fontWeight: "bold",
  },
  companyName: {
    color: "#666",
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "500",
  },
  change: {
    fontSize: 14,
  },
  loader: {
    marginTop: 20,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
});
