import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Text, Card, Button, ProgressBar } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../components/theme";
import { getStockRecommendation } from "./services/stockService";
import AnimatedBackground from "../components/AnimatedBackground";

interface Recommendation {
  symbol: string;
  score: number;
  details?: {
    sentiment?: {
      score: number;
    };
    company?: string;
    stock_data?: {
      historical_growth?: number;
      volatility?: number;
    };
  };
}

const getSentimentColor = (score: number) => {
  if (score > 0.6) return "#4CAF50";
  if (score > 0.4) return "#FFC107";
  return "#F44336";
};

const getSentimentEmoji = (score: number) => {
  if (score >= 0.7) return "🟢";
  if (score >= 0.5) return "🟡";
  return "🔴";
};

const ExploreRecommendations = () => {
  const { data } = useLocalSearchParams();
  const [sortBy, setSortBy] = useState<"symbol" | "score" | "sentiment">(
    "score"
  );

  const rawData = Array.isArray(data) ? data[0] : data;
  const recommendations: Recommendation[] = rawData
    ? JSON.parse(rawData).recommendations
    : [];

  const sortedRecommendations = [...recommendations].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "sentiment")
      return (
        (b.details?.sentiment?.score || 0) - (a.details?.sentiment?.score || 0)
      );
    return a.symbol.localeCompare(b.symbol);
  });

  const handleStockPress = async (stock: Recommendation) => {
    router.push({
      pathname: "/recommendations",
      params: {
        data: JSON.stringify({
          status: "success",
          recommendations: [
            {
              ...stock,
              components: {
                recent_performance: stock.score,
                historical_growth:
                  stock.details?.stock_data?.historical_growth || 0,
                sentiment_score: (stock.details?.sentiment?.score || 0) * 100,
                risk_factor: stock.details?.stock_data?.volatility || 0,
              },
            },
          ],
          metadata: {
            timestamp: new Date().toISOString(),
            horizon: "short-term",
          },
        }),
      },
    });
  };

  if (!recommendations.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No analysis data available</Text>
        <Button
          mode="contained"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          Back to Search
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <AnimatedBackground
          particleColor="#ff7a00"
          opacityLight={0.15}
          opacityDark={0.25}
        />
        <Text style={styles.headerText}>Stock Analysis</Text>

        <View style={styles.sortContainer}>
          <Button
            mode={sortBy === "score" ? "contained" : "outlined"}
            onPress={() => setSortBy("score")}
            style={styles.sortButton}
            labelStyle={styles.sortLabel}
          >
            Overall Score
          </Button>
          <Button
            mode={sortBy === "sentiment" ? "contained" : "outlined"}
            onPress={() => setSortBy("sentiment")}
            style={styles.sortButton}
            labelStyle={styles.sortLabel}
          >
            Sentiment
          </Button>
        </View>

        <View style={{ width: "100%", maxWidth: 900, minWidth: 300 }}>
          {sortedRecommendations.map((item, index) => {
            const sentimentScore = item.details?.sentiment?.score || 0;
            const ticker = item?.details?.company || 0;
            const color = getSentimentColor(sentimentScore);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleStockPress(item)}
                activeOpacity={0.9}
              >
                <Card style={styles.card}>
                  <Card.Content>
                    <View style={styles.headerRow}>
                      <Text style={styles.symbol}>{ticker}</Text>
                      <Text style={[styles.sentimentScore, { color }]}>
                        {getSentimentEmoji(sentimentScore)}{" "}
                        {(sentimentScore * 100).toFixed(1)}%
                      </Text>
                    </View>

                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Overall Score:</Text>
                      <Text style={styles.scoreValue}>
                        {item.score.toFixed(2)}
                      </Text>
                    </View>

                    <ProgressBar
                      progress={sentimentScore}
                      color={color}
                      style={styles.progressBar}
                    />
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          mode="contained"
          onPress={() => router.back()}
          style={styles.backButton}
          labelStyle={styles.buttonLabel}
        >
          Back to Search
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    alignItems: "center",
  },
  headerText: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.primary,
    textAlign: "center",
    marginVertical: 20,
  },
  sortContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    width: "100%",
    maxWidth: 900,
    minWidth: 300,
  },
  sortButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  sortLabel: {
    fontSize: 12,
  },
  card: {
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 4,
    width: "100%",
    maxWidth: 900,
    minWidth: 300,
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  symbol: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  sentimentScore: {
    fontSize: 18,
    fontWeight: "500",
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 16,
    color: "#666",
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  progressBar: {
    height: 25,
    borderRadius: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  backButton: {
    marginVertical: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    width: "100%",
    maxWidth: 900,
    minWidth: 300,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ExploreRecommendations;
