import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { TextInput, Button, Text, Icon } from "react-native-paper";
import axios from "axios";
import { theme } from "../../components/theme";
import StockChart from "../../components/StockChart";
import Slider from "@react-native-community/slider";
import { Dropdown } from "react-native-element-dropdown";
import { APIContext } from "../_layout";
import { getStockRecommendation } from "../services/stockService";
import Constants from "expo-constants";
import { router, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBackground from "../../components/AnimatedBackground";

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

interface DropdownItem {
  label: string;
  value: string;
}

export default function ExploreStocks() {
  const API_URL = useContext(APIContext);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maxRecommendations, setMaxRecommendations] = useState("5");
  const [investingHorizon, setInvestingHorizon] =
    useState<string>("short-term");
  const [selectedSector, setSelectedSector] = useState<string>("All");
  const [riskLevel, setRiskLevel] = useState<number>(0);
  const [minCost, setMinCost] = useState<string>("");
  const [maxCost, setMaxCost] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(0);

  const sectors = [
    "All",
    "Technology",
    "Healthcare",
    "Financial Services",
    "Consumer Cyclical",
    "Consumer Defensive",
    "Energy",
    "Industrials",
    "Basic Materials",
    "Communication Services",
    "Real Estate",
    "Utilities",
    "Conglomerates",
  ];

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
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
          "X-RapidAPI-Key":
            Constants.expoConfig?.extra?.NEXT_PUBLIC_RAPIDAPI_KEY ||
            process.env.NEXT_PUBLIC_RAPIDAPI_KEY ||
            "",
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

  const dropdownData: DropdownItem[] = [
    { label: "Short-term (30 days)", value: "short-term" },
    { label: "Long-term (5 years)", value: "long-term" },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const horizon = investingHorizon || "long-term";
      const maxRec = parseInt(maxRecommendations) || 10;
      const maxResults = Math.max(maxRec * 3, 50);

      const apiKey =
        Constants.expoConfig?.extra?.FMP_API || process.env.FMP_API;
      if (!apiKey) {
        throw new Error(
          "API configuration error - please check your API settings"
        );
      }

      let response;
      let retryCount = 0;
      const MAX_RETRIES = 2;

      while (retryCount <= MAX_RETRIES) {
        try {
          response = await axios.get(
            "https://financialmodelingprep.com/api/v3/stock-screener",
            {
              params: {
                exchange: "nasdaq,nyse",
                sector: selectedSector === "All" ? null : selectedSector,
                priceMoreThan: minCost || null,
                priceLowerThan: maxCost || null,
                apikey: apiKey,
                limit: maxResults,
              },
              timeout: 15000,
            }
          );

          if (response.data && Array.isArray(response.data)) {
            break;
          }
        } catch (err) {
          console.warn(`API attempt ${retryCount + 1} failed:`, err);
          if (retryCount === MAX_RETRIES) throw err;
        }
        retryCount++;
      }

      if (!response || !response.data || !Array.isArray(response.data)) {
        throw new Error(
          "Could not retrieve stock data. Please try again later."
        );
      }

      console.log(`Retrieved ${response.data.length} stocks from screener API`);

      let filteredStocks = response.data
        .filter((stock) => {
          try {
            if (!stock || !stock.symbol) return false;

            const price = parseFloat(stock?.price || 0);
            const sectorMatch =
              selectedSector === "All" ||
              stock.sector === selectedSector ||
              (stock.industry || "")
                .toLowerCase()
                .includes(selectedSector.toLowerCase());

            const priceMatch =
              (!minCost || price >= parseFloat(minCost)) &&
              (!maxCost || price <= parseFloat(maxCost));

            return sectorMatch && priceMatch && stock.symbol;
          } catch (e) {
            console.warn("Invalid stock entry:", stock);
            return false;
          }
        })
        .map((stock) => stock.symbol)
        .filter(Boolean);

      if (filteredStocks.length < maxRec) {
        console.warn(
          "Not enough stocks found with current filters, relaxing criteria"
        );

        filteredStocks = response.data
          .filter((stock) => stock && stock.symbol)
          .map((stock) => stock.symbol)
          .slice(0, maxResults);
      }

      if (filteredStocks.length === 0) {
        throw new Error(
          "No stocks match your criteria. Try expanding your filters or select 'All' for sector."
        );
      }

      console.log(
        `Using ${filteredStocks.length} filtered stocks for recommendation`
      );

      const BATCH_SIZE = 15;
      let allRecommendations = [];

      for (
        let i = 0;
        i < filteredStocks.length && allRecommendations.length < maxRec;
        i += BATCH_SIZE
      ) {
        const batchSymbols = filteredStocks.slice(i, i + BATCH_SIZE);
        console.log(
          `Processing batch ${i / BATCH_SIZE + 1} with ${
            batchSymbols.length
          } symbols`
        );

        try {
          const batchResponse = await getStockRecommendation(
            batchSymbols,
            horizon
          );

          if (batchResponse?.recommendations?.length > 0) {
            allRecommendations = [
              ...allRecommendations,
              ...batchResponse.recommendations,
            ];

            if (allRecommendations.length >= maxRec) {
              break;
            }
          }
        } catch (batchError) {
          console.warn(`Error in batch ${i / BATCH_SIZE + 1}:`, batchError);
        }
      }

      if (allRecommendations.length === 0) {
        throw new Error(
          "Could not generate recommendations. Please try different filters."
        );
      }

      const processedRecommendations = allRecommendations
        .filter((rec) => {
          try {
            const sentimentScore = rec.details?.sentiment?.score || 0;
            return sentimentScore * 100 >= (confidence || 0);
          } catch (e) {
            return false;
          }
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, maxRec);

      if (processedRecommendations.length === 0) {
        const fallbackRecommendations = allRecommendations
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, maxRec);

        if (fallbackRecommendations.length > 0) {
          console.log(
            "Using fallback recommendations without confidence filter"
          );
          router.push({
            pathname: "/explore_recommendations",
            params: {
              data: JSON.stringify({
                recommendations: fallbackRecommendations,
                filters: {
                  sector: selectedSector,
                  minCost: minCost || "0",
                  maxCost: maxCost || "Any",
                  confidence: "0",
                  horizon,
                },
              }),
            },
          });
          return;
        }

        throw new Error(
          "No recommendations meet your criteria. Try lowering the confidence threshold."
        );
      }

      console.log(
        `Found ${processedRecommendations.length} recommendations that match criteria`
      );
      router.push({
        pathname: "/explore_recommendations",
        params: {
          data: JSON.stringify({
            recommendations: processedRecommendations,
            filters: {
              sector: selectedSector,
              minCost: minCost || "0",
              maxCost: maxCost || "Any",
              confidence: confidence.toString(),
              horizon,
            },
          }),
        },
      });
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate recommendations. Please check your inputs and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.headerText}>Explore Investment Opportunities</Text>
      <Text style={styles.smallHeaderText}>
        Discover stocks that match your investment criteria and preferences.
      </Text>

      <View style={[styles.stockContainer, { alignSelf: "center" }]}>
        <LinearGradient
          colors={["#ff5a1f", "#d03801"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.stockHeader}
        >
          <Text style={{ color: "white", fontSize: 28, fontWeight: "bold" }}>
            Stock Explorer
          </Text>
          <Text style={{ color: "white", fontSize: 16 }}>
            Customize your search parameters to find the perfect investment
            match
          </Text>
        </LinearGradient>
        <Text style={styles.labelText}>Select Sector</Text>
        <Dropdown
          style={[styles.pickerContainer, { backgroundColor: "#f5f7fa" }]}
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
          maximumTrackTintColor="#e0e0e0"
          minimumTrackTintColor={theme.colors.primary}
          thumbTintColor={"#ffffff"}
          thumbStyle={{
            borderWidth: 2,
            borderColor: theme.colors.primary,
          }}
        />
        <Text style={styles.labelText}>Price Range</Text>
        <View style={styles.priceRangeContainer}>
          <TextInput
            placeholder="$ Min Price"
            placeholderTextColor="#AAAAAA"
            value={minCost.replace(/\B(?=(\d{3})+(?!\d))/g, ",") || ""}
            onChangeText={(text) => {
              const numericValue = text.replace(/[^0-9]/g, "");
              setMinCost(numericValue);
            }}
            style={styles.priceInput}
            mode="outlined"
            keyboardType="numeric"
            maxLength={10}
            right={<TextInput.Affix text="USD" />}
          />
          <View style={{ width: 16 }} />
          <TextInput
            placeholder="$ Max Price"
            placeholderTextColor="#AAAAAA"
            value={maxCost.replace(/\B(?=(\d{3})+(?!\d))/g, ",") || ""}
            onChangeText={(text) => {
              const numericValue = text.replace(/[^0-9]/g, "");
              setMaxCost(numericValue);
            }}
            style={styles.priceInput}
            mode="outlined"
            keyboardType="numeric"
            maxLength={10}
            right={<TextInput.Affix text="USD" />}
          />
        </View>

        <Text style={styles.labelText}>Minimum Score: {confidence}%</Text>
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={confidence}
          onValueChange={setConfidence}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor="#e0e0e0"
          minimumTrackTintColor={theme.colors.primary}
          thumbTintColor={"#ffffff"}
          thumbStyle={{
            borderWidth: 2,
            borderColor: theme.colors.primary,
          }}
        />

        <Text style={styles.labelText}>Max Recommendations</Text>
        <TextInput
          value={maxRecommendations}
          onChangeText={setMaxRecommendations}
          style={styles.searchInput}
          mode="outlined"
          keyboardType="numeric"
          maxLength={2}
        />

        <Text style={styles.labelText}>Investing Horizon</Text>
        <Dropdown
          style={[
            styles.pickerContainer,
            { height: 50, padding: 10, backgroundColor: "#f5f7fa" },
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
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={[styles.button, { alignSelf: "center" }]}
        labelStyle={styles.buttonLabel}
      >
        Find Recommendations
      </Button>
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
    paddingHorizontal: 26,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  headerText: {
    fontSize: 40,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 16,
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
    elevation: 4,
    alignSelf: "center",
  },
  stockHeader: {
    marginHorizontal: -24,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginTop: -24,
    padding: 24,
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
    fontSize: 16,
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
  priceRangeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  priceInput: {
    flex: 1,
    height: 50,
  },
  button: {
    marginTop: 50,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    maxWidth: 900,
    width: "100%",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonLabel: {
    fontSize: 20,
    fontWeight: "bold",
  },
  dropdownPlaceholder: {
    color: "#666",
    paddingLeft: 5,
  },
  dropdownSelectedText: {
    color: "#000",
  },
});
