import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Card, TextInput, IconButton } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getHotStocks, getStockData } from "../components/stockService";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../components/theme";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

export default function Watchlist() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hotStocks, setHotStocks] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);

  useEffect(() => {
    loadWatchlist();
    fetchHotStocks();
  }, []);

  const loadWatchlist = async () => {
    try {
      const savedWatchlist = await AsyncStorage.getItem("watchlist");
      if (savedWatchlist) {
        const symbols = JSON.parse(savedWatchlist);
        const stockData = await Promise.all(
          symbols.map((symbol: string) => getStockData(symbol))
        );
        setWatchlist(stockData.filter((stock: Stock | null) => stock !== null));
      }
    } catch (error) {
      console.error("Error loading watchlist:", error);
    }
  };

  const fetchHotStocks = async () => {
    try {
      const stocks = await getHotStocks();
      setHotStocks(stocks);
    } catch (error) {
      console.error("Error fetching hot stocks:", error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadWatchlist(), fetchHotStocks()]).finally(() =>
      setRefreshing(false)
    );
  }, []);

  const toggleWatchlist = async (stock: Stock) => {
    let updatedWatchlist;
    if (watchlist.some((s) => s.symbol === stock.symbol)) {
      updatedWatchlist = watchlist.filter((s) => s.symbol !== stock.symbol);
    } else {
      updatedWatchlist = [...watchlist, stock];
    }
    setWatchlist(updatedWatchlist);
    await AsyncStorage.setItem(
      "watchlist",
      JSON.stringify(updatedWatchlist.map((s) => s.symbol))
    );
  };

  return (
    <LinearGradient colors={["#FAE7D2", "#FFF"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.headerText}>Watchlist</Text>
        <TextInput
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" color="#E67328" />}
        />

        <Text style={styles.sectionTitle}>Your watchlist</Text>
        {watchlist.length === 0 ? (
          <View style={styles.emptyWatchlist}>
            <Text style={styles.emptyText}>No Stocks in Your Watchlist</Text>
            <Text style={styles.emptySubText}>Add some above!</Text>
          </View>
        ) : (
          watchlist.map((stock) => (
            <Card key={stock.symbol} style={styles.stockCard}>
              <Card.Content>
                <View style={styles.stockRow}>
                  <IconButton
                    icon="minus-circle-outline"
                    color="red"
                    onPress={() => toggleWatchlist(stock)}
                  />
                  <View style={styles.stockInfo}>
                    <Text style={styles.stockName}>{stock.name}</Text>
                    <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                  </View>
                  <View style={styles.stockPriceContainer}>
                    <Text style={styles.stockPrice}>
                      $
                      {typeof stock.price === "number"
                        ? Number(stock.price).toFixed(2)
                        : "0.00"}
                    </Text>
                    <Text style={styles.stockChange}>
                      {stock.changePercent >= 0 ? "▲" : "▼"}
                      {typeof stock.changePercent === "number"
                        ? Math.abs(stock.changePercent).toFixed(2)
                        : "0.00"}
                      %
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        )}

        <Text style={styles.sectionTitle}>Hot stocks</Text>
        {hotStocks.map((stock) => (
          <Card key={stock.symbol} style={styles.stockCard}>
            <Card.Content>
              <View style={styles.stockRow}>
          <IconButton
            icon={
              watchlist.some((s) => s.symbol === stock.symbol)
                ? "check-circle-outline"
                : "plus-circle-outline"
            }
            color={
              watchlist.some((s) => s.symbol === stock.symbol)
                ? "green"
                : "#E67328"
            }
            onPress={() => toggleWatchlist(stock)}
          />
          <View style={styles.stockInfo}>
            <Text style={styles.stockName}>{stock.name}</Text>
            <Text style={styles.stockSymbol}>{stock.symbol}</Text>
          </View>
          <View style={styles.stockPriceContainer}>
            <Text style={styles.stockPrice}>
              $
              {typeof stock.price === "number"
                ? stock.price.toFixed(2)
                : "0.00"}
            </Text>
            <Text style={[
              styles.stockChange,
              { color: (stock.changePercent || 0) >= 0 ? "green" : "red" }
            ]}>
              {(stock.changePercent || 0) >= 0 ? "▲" : "▼"}{" "}
              {typeof stock.changePercent === "number"
                ? Math.abs(stock.changePercent).toFixed(2)
                : "0.00"}
              %
            </Text>
          </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  headerText: {
      fontSize: 40,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginBottom: 16,
      marginTop: 66,
      textAlign: "center",
    },
  searchInput: {
    marginVertical: 16,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    color: "#5C3A1E",
  },
  emptyWatchlist: {
    backgroundColor: "#FAE7D2",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  emptyText: { fontSize: 16, fontWeight: "bold", color: "#A97E50" },
  emptySubText: { fontSize: 14, color: "#C4A484" },
  stockCard: { marginBottom: 8, backgroundColor: "#FAF2E6", borderRadius: 10 },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockInfo: { flex: 1, marginLeft: 8 },
  stockName: { fontSize: 16, fontWeight: "bold" },
  stockSymbol: { fontSize: 14, color: "#A97E50" },
  stockPriceContainer: { alignItems: "flex-end" },
  stockPrice: { fontSize: 16, fontWeight: "bold" },
  stockChange: { fontSize: 14, color: "green" },
});
