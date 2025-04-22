import React from "react";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Text, Card, Button, ProgressBar } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../components/theme";
import AnimatedBackground from "../components/AnimatedBackground";

interface ComponentScores {
  historical_growth?: number;
  recent_performance?: number;
  risk_factor?: number;
  sentiment_score?: number;
}

interface StockData {
  recent_growth?: number;
  historical_growth?: number;
  volatility?: number;
  data_points?: number;
}

interface SentimentData {
  score?: number;
  positive?: number;
  negative?: number;
  neutral?: number;
  total?: number;
}

interface Details {
  components?: ComponentScores;
  sentiment?: SentimentData;
  stock_data?: StockData;
  sentiment_rationale?: string;
}

interface Recommendation {
  company?: string;
  details?: Details;
  score?: number;
}

interface ApiResponse {
  status?: string;
  recommendations?: Recommendation[];
  metadata?: {
    timestamp?: string;
    horizon?: string;
  };
}

const { width } = Dimensions.get("window");

// Safe parsing helpers
const safeParseFloat = (value?: number) => value?.toFixed(1) ?? "0.0";
const safePercentage = (value?: number) => `${safeParseFloat(value)}%`;

export default function Recommendations() {
  const { data } = useLocalSearchParams();
  const [parsedData, setParsedData] = React.useState<ApiResponse | null>(null);
  console.log(data);
  React.useEffect(() => {
    try {
      const rawData = Array.isArray(data) ? data[0] : data;
      if (typeof rawData === "string") {
        const parsed = JSON.parse(rawData);
        setParsedData(parsed);
      }
    } catch (error) {
      console.error("Data parsing error:", error);
    }
  }, [data]);

  const getGrowthColor = (growth?: number) => {
    const value = growth ?? 0;
    if (value > 5) return "#1B5E20";
    if (value > 0) return "#4CAF50";
    if (value > -5) return "#F44336";
    return "#B71C1C";
  };

  const getSentimentEmoji = (score?: number) => {
    const value = score ?? 0;
    if (value >= 0.7) return "🟢";
    if (value >= 0.5) return "🟡";
    return "🔴";
  };

  if (!parsedData?.recommendations?.length) {
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
      <Text style={styles.headerText}>Market Analysis</Text>
      <View style={{ alignSelf: "center" }}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>Analysis Overview</Text>
            <Text style={styles.summaryText}>
              Investment Horizon:{" "}
              {parsedData.metadata?.horizon === "short-term"
                ? "Short Term (30 days)"
                : "Long Term (5 years)"}
            </Text>
            <Text style={styles.summaryText}>
              Analysis Date:{" "}
              {parsedData.metadata?.timestamp
                ? new Date(parsedData.metadata.timestamp).toLocaleString()
                : "N/A"}
            </Text>
            <Text style={styles.summaryText}>
              Companies Analyzed: {parsedData.recommendations.length}
            </Text>
          </Card.Content>
        </Card>

        {parsedData.recommendations.map((rec, index) => {
          const components = rec.details?.components ?? {};
          const sentiment = rec.details?.sentiment ?? {};
          const stockData = rec.details?.stock_data ?? {};
          const totalSentiment = sentiment.total ?? 1; // Prevent division by zero

          return (
            <Card key={index} style={styles.recommendationCard}>
              <Card.Content>
                <View style={styles.headerRow}>
                  <Text style={styles.companyName}>
                    {rec.company?.toUpperCase() ?? "Unknown Company"}
                  </Text>
                  <Text style={styles.sentimentScore}>
                    Sentiment Score: {getSentimentEmoji(sentiment.score)}{" "}
                    {safePercentage((sentiment.score ?? 0) * 100)}
                  </Text>
                </View>

                <View style={styles.metricsContainer}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Recent Growth</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: getGrowthColor(stockData.recent_growth) },
                      ]}
                    >
                      {safePercentage(stockData.recent_growth)}
                    </Text>
                  </View>

                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Historical Growth</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: getGrowthColor(stockData.historical_growth) },
                      ]}
                    >
                      {safePercentage(stockData.historical_growth)}
                    </Text>
                  </View>

                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Volatility</Text>
                    <Text style={styles.metricValue}>
                      {safeParseFloat(stockData.volatility)}
                    </Text>
                  </View>
                </View>

                {/* Component Scores */}
                <View style={styles.componentScores}>
                  <Text style={styles.componentTitle}>Performance Metrics</Text>
                  {[
                    {
                      label: "Recent Performance",
                      value: components.recent_performance,
                      color: theme.colors.primary,
                      ideal: "high", // Higher is better
                    },
                    {
                      label: "Risk Factor",
                      value: components.risk_factor,
                      color: "#FF9800",
                      ideal: "low",
                    },
                  ].map((metric, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.progressContainer,
                        { marginTop: width < 600 ? 0 : 10 },
                      ]}
                    >
                      <View style={styles.textContainer}>
                        <Text style={styles.componentLabel}>
                          {metric.label}
                        </Text>
                        <Text style={styles.componentValue}>
                          {safePercentage(metric.value)}
                        </Text>
                      </View>
                      <ProgressBar
                        progress={(metric.value ?? 0) / 100}
                        color={metric.color}
                        style={[styles.progressBar, { width: "100%" }]}
                      />
                      <Text style={styles.idealLabel}>
                        {metric.ideal === "high"
                          ? "Higher is better"
                          : "Lower is better"}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Sentiment Analysis */}
                <View style={styles.sentimentContainer}>
                  <Text style={styles.sentimentTitle}>Market Sentiment</Text>
                  {[
                    {
                      label: "Positive",
                      value: sentiment.positive,
                      color: "#4CAF50",
                    },
                    {
                      label: "Neutral",
                      value: sentiment.neutral,
                      color: "#FFC107",
                    },
                    {
                      label: "Negative",
                      value: sentiment.negative,
                      color: "#F44336",
                    },
                  ].map((sentimentItem, idx) => (
                    <View
                      key={idx}
                      style={[styles.sentimentBar, styles.progressContainer]}
                    >
                      <View style={styles.textContainer}>
                        <Text style={styles.sentimentLabel}>
                          {sentimentItem.label}
                        </Text>
                        <Text style={styles.sentimentValue}>
                          {safePercentage(
                            ((sentimentItem.value ?? 0) / totalSentiment) * 100
                          )}
                        </Text>
                      </View>
                      <ProgressBar
                        progress={(sentimentItem.value ?? 0) / totalSentiment}
                        color={sentimentItem.color}
                        style={[styles.progressBar, { width: "100%" }]}
                      />
                    </View>
                  ))}
                  {rec.details?.sentiment_rationale && (
                    <View style={styles.rationaleContainer}>
                      <Text style={styles.rationaleTitle}>
                        Sentiment Analysis
                      </Text>
                      <Text style={styles.rationaleText}>
                        {rec.details.sentiment_rationale}
                      </Text>
                    </View>
                  )}
                </View>

                {/* <Text style={styles.dataPoints}>
                Based on {stockData.data_points ?? 0} data points
              </Text> */}

                <Text style={styles.overallScore}>
                  Overall Score: {safeParseFloat(rec.score)}
                </Text>
              </Card.Content>
              <AnimatedBackground
                particleColor="#ff7a00"
                opacityLight={0.15}
                opacityDark={0.25}
              />
            </Card>
          );
        })}

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  headerText: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.primary,
    textAlign: "center",
    marginVertical: 20,
  },
  summaryCard: {
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    maxWidth: 1100,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: theme.colors.primary,
  },
  summaryText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  recommendationCard: {
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 4,
    borderRadius: 8,
    maxWidth: 1100,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  sentimentScore: {
    fontSize: 18,
    fontWeight: "500",
  },
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  componentScores: {
    marginTop: 16,
    marginBottom: 16,
  },
  componentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: theme.colors.primary,
  },
  componentLabel: {
    width: 140,
    fontSize: 14,
    color: "#666",
  },
  componentValue: {
    width: 50,
    fontSize: 14,
    textAlign: "left",
    marginLeft: 5,
  },
  sentimentContainer: {
    marginTop: 16,
  },
  sentimentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: theme.colors.brownheader,
  },
  sentimentBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sentimentLabel: {
    width: 70,
    fontSize: 14,
    color: "#666",
  },
  textContainer: {
    flexDirection: "row",
    marginBottom: 7,
    marginTop: 10,
  },
  progressContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%",
    overflow: "visible",
    marginBottom: 30,
  },
  progressBar: {
    height: 25,
    alignSelf: "stretch",
    borderRadius: 4,
  },
  sentimentValue: {
    width: 50,
    fontSize: 14,
    textAlign: "left",
    marginLeft: 5,
  },
  dataPoints: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 16,
    textAlign: "center",
  },
  overallScore: {
    fontSize: 26,
    fontWeight: "bold",
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: 12,
    paddingBottom: 12,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  backButton: {
    marginVertical: 20,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    maxWidth: 1100,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  idealLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: width < 600 ? 4 : -20,
    fontStyle: "italic",
    textAlign: "right",
  },
  rationaleContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  rationaleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  rationaleText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
});
