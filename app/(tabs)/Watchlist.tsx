import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Card, TextInput, IconButton } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getHotStocks,
  getStockData,
  searchStocks,
} from "../../components/stockService";
import { theme } from "../../components/theme";
import debounce from "lodash/debounce";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBackground from "../../components/AnimatedBackground";

interface Stock {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
}

interface SearchResult {
  symbol: string;
  name: string;
  quoteType: string;
}

export default function Watchlist() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hotStocks, setHotStocks] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWatchlist();
    fetchHotStocks();
  }, []);

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const results = await searchStocks(query);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery]);

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
      const filteredStocks = stocks.filter(
        (stock) => !watchlist.some((w) => w.symbol === stock.symbol)
      );
      setHotStocks(filteredStocks);
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

  const addSearchResultToWatchlist = async (searchResult: SearchResult) => {
    try {
      if (watchlist.some((item) => item.symbol === searchResult.symbol)) {
        setError(`${searchResult.symbol} is already in your watchlist`);
        setTimeout(() => setError(null), 3000);
        return;
      }

      const stockData = await getStockData(searchResult.symbol);
      if (!stockData) {
        setError(`Could not fetch data for ${searchResult.symbol}`);
        setTimeout(() => setError(null), 3000);
        return;
      }

      const updatedWatchlist = [...watchlist, stockData];
      setWatchlist(updatedWatchlist);
      await AsyncStorage.setItem(
        "watchlist",
        JSON.stringify(updatedWatchlist.map((s) => s.symbol))
      );
      setSearchQuery("");
      setSearchResults([]);
      setIsSearching(false);
      await fetchHotStocks();
    } catch (error) {
      setError("Failed to add stock to watchlist");
      setTimeout(() => setError(null), 3000);
    }
  };

  const toggleWatchlist = async (stock: Stock) => {
    let updatedWatchlist;
    let updatedHotStocks;

    if (watchlist.some((s) => s.symbol === stock.symbol)) {
      updatedWatchlist = watchlist.filter((s) => s.symbol !== stock.symbol);
      updatedHotStocks = [...hotStocks, stock].sort(
        (a, b) =>
          Math.abs(b.changePercent || 0) - Math.abs(a.changePercent || 0)
      );
    } else {
      updatedWatchlist = [...watchlist, stock];
      updatedHotStocks = hotStocks.filter((s) => s.symbol !== stock.symbol);
    }

    setWatchlist(updatedWatchlist);
    setHotStocks(updatedHotStocks);

    await AsyncStorage.setItem(
      "watchlist",
      JSON.stringify(updatedWatchlist.map((s) => s.symbol))
    );
  };

  const generateUniqueId = (prefix: string, symbol: string, index: number) => {
    return `${prefix}-${symbol}-${index}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.headerText}>Watchlist</Text>
      <Text style={styles.smallHeaderText}>
        Track your favorite stocks and discover new investment opportunities.
      </Text>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={[styles.stockContainer, { alignSelf: "center" }]}>
        <LinearGradient
          colors={["#ff5a1f", "#d03801"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.stockHeader}
        >
          <Text style={{ color: "white", fontSize: 28, fontWeight: "bold" }}>
            Stock Watchlist
          </Text>
          <Text style={{ color: "white", fontSize: 16 }}>
            Keep track of your favorite stocks and discover new opportunities
          </Text>
        </LinearGradient>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search stocks..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setIsSearching(text.length > 0);
            }}
            style={styles.searchInput}
            mode="outlined"
            left={<TextInput.Icon icon="magnify" color="#E67328" />}
          />
          {isSearching && searchResults.length > 0 && (
            <ScrollView
              style={styles.searchResults}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={generateUniqueId("search", result.symbol, index)}
                  style={styles.searchResultItem}
                  onPress={() => addSearchResultToWatchlist(result)}
                >
                  <View style={styles.searchResultContent}>
                    <View>
                      <Text style={styles.searchResultSymbol}>
                        {result.symbol}
                      </Text>
                      <Text style={styles.searchResultName}>{result.name}</Text>
                    </View>
                    <IconButton
                      icon="plus-circle-outline"
                      color="#E67328"
                      size={20}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Watchlist</Text>
          {watchlist.length === 0 ? (
            <View style={styles.emptyWatchlist}>
              <Text style={styles.emptyText}>No Stocks in Your Watchlist</Text>
              <Text style={styles.emptySubText}>Add some above!</Text>
            </View>
          ) : (
            watchlist.map((stock, index) => (
              <Card
                key={generateUniqueId("watchlist", stock.symbol, index)}
                style={[
                  styles.stockCard,
                  (stock.changePercent || 0) >= 0
                    ? styles.stockCardUp
                    : styles.stockCardDown,
                ]}
              >
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
                          ? stock.price.toFixed(2)
                          : "0.00"}
                      </Text>
                      <Text
                        style={[
                          styles.stockChange,
                          {
                            color:
                              (stock.changePercent || 0) >= 0 ? "green" : "red",
                          },
                        ]}
                      >
                        {(stock.changePercent || 0) >= 0 ? "▲" : "▼"}
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
        </View>

        <View style={[styles.section, styles.hotStocksSection]}>
          <Text style={[styles.sectionTitle, styles.hotStocksTitle]}>
            Hot Stocks
          </Text>
          {hotStocks.map((stock, index) => (
            <Card
              key={generateUniqueId("hotstock", stock.symbol, index)}
              style={[
                styles.stockCard,
                (stock.changePercent || 0) >= 0
                  ? styles.stockCardUp
                  : styles.stockCardDown,
              ]}
            >
              <Card.Content>
                <View style={styles.stockRow}>
                  <IconButton
                    icon="plus-circle-outline"
                    color="#E67328"
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
                    <Text
                      style={[
                        styles.stockChange,
                        {
                          color:
                            (stock.changePercent || 0) >= 0 ? "green" : "red",
                        },
                      ]}
                    >
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
        </View>
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
  headerText: {
    fontSize: 40,
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
  searchContainer: {
    position: "relative",
    zIndex: 1,
  },
  searchInput: {
    // marginVertical: 16,
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  searchResults: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 200,
    zIndex: 2,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchResultSymbol: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  searchResultName: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 15,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hotStocksSection: {
    backgroundColor: "#FFF8F0",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#5C3A1E",
  },
  hotStocksTitle: {
    color: "#E67328",
  },
  emptyWatchlist: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 15,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 60,
    borderRadius: 10,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#A97E50",
  },
  emptySubText: {
    fontSize: 16,
    paddingTop: 10,
    color: "#C4A484",
  },
  stockCard: {
    marginBottom: 8,
    borderRadius: 10,
  },
  stockCardUp: {
    backgroundColor: "rgba(0, 255, 0, 0.05)",
  },
  stockCardDown: {
    backgroundColor: "rgba(255, 0, 0, 0.05)",
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockInfo: {
    flex: 1,
    marginLeft: 8,
  },
  stockName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  stockSymbol: {
    fontSize: 14,
    color: "#666",
  },
  stockPriceContainer: {
    alignItems: "flex-end",
  },
  stockPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  stockChange: {
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  stockContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 900,
    backgroundColor: "#fff",
    borderRadius: 10,
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
});
