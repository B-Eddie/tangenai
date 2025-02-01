import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Card, Button, ProgressBar } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../components/theme";

interface ComponentScores {
  historical_growth: number;
  recent_performance: number;
  risk_factor: number;
  sentiment_score: number;
}

interface StockData {
  recent_growth: number;
  historical_growth: number;
  volatility: number;
  data_points: number;
}

interface SentimentData {
  score: number;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

interface Details {
  components: ComponentScores;
  sentiment: SentimentData;
  stock_data: StockData;
}

interface Recommendation {
  company: string;
  details: Details;
  score: number;
}

interface ApiResponse {
  status: string;
  recommendations: Recommendation[];
  metadata: {
    timestamp: string;
    horizon: string;
  };
}

export default function Recommendations() {
  const { data } = useLocalSearchParams();
  const parsedData: ApiResponse = data
    ? JSON.parse(typeof data === "string" ? data : data[0])
    : null;

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatDecimal = (value: number) => value.toFixed(2);

  const getGrowthColor = (growth: number) => {
    if (growth > 5) return "#1B5E20";
    if (growth > 0) return "#4CAF50";
    if (growth > -5) return "#F44336";
    return "#B71C1C";
  };

  const getSentimentEmoji = (score: number) => {
    if (score >= 0.7) return "🟢";
    if (score >= 0.5) return "🟡";
    return "🔴";
  };

  if (!parsedData || !parsedData.recommendations.length) {
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

      {/* Analysis Summary */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.summaryTitle}>Analysis Overview</Text>
          <Text style={styles.summaryText}>
            Investment Horizon:{" "}
            {parsedData.metadata.horizon === "short-term"
              ? "Short Term (30 days)"
              : "Long Term (5 years)"}
          </Text>
          <Text style={styles.summaryText}>
            Analysis Date:{" "}
            {new Date(parsedData.metadata.timestamp).toLocaleString()}
          </Text>
          <Text style={styles.summaryText}>
            Companies Analyzed: {parsedData.recommendations.length}
          </Text>
        </Card.Content>
      </Card>

      {/* Recommendations */}
      {parsedData.recommendations.map((rec: Recommendation, index: number) => (
        <Card key={index} style={styles.recommendationCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text style={styles.companyName}>{rec.company.toUpperCase()}</Text>
              <Text style={styles.sentimentScore}>
                Sentiment Score:&emsp;
                {getSentimentEmoji(rec.details.sentiment.score)}{" "}
                {formatDecimal(rec.details.sentiment.score)}
              </Text>
            </View>

            {/* Growth Metrics */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Recent Growth</Text>
                <Text
                  style={[
                    styles.metricValue,
                    { color: getGrowthColor(rec.details.stock_data.recent_growth) },
                  ]}
                >
                  {formatPercentage(rec.details.stock_data.recent_growth)}
                </Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Historical Growth</Text>
                <Text
                  style={[
                    styles.metricValue,
                    { color: getGrowthColor(rec.details.stock_data.historical_growth) },
                  ]}
                >
                  {formatPercentage(rec.details.stock_data.historical_growth)}
                </Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Volatility</Text>
                <Text style={styles.metricValue}>
                  {formatDecimal(rec.details.stock_data.volatility)}
                </Text>
              </View>
            </View>

            {/* Component Scores */}
            <View style={styles.componentScores}>
              <Text style={styles.componentTitle}>Performance Metrics</Text>
              <View style={[styles.progressContainer]}>
                <View style={styles.textContainer}>
                  <Text style={styles.componentLabel}>Recent Performance</Text>
                  <Text style={styles.componentValue}>
                    {formatPercentage(rec.details.components.recent_performance)}
                  </Text>
                </View>
                <ProgressBar
                  progress={rec.details.components.recent_performance / 100}
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
              </View>
              <View style={[styles.progressContainer]}>
                <View style={styles.textContainer}>
                  <Text style={styles.componentLabel}>Risk Factor</Text>
                  <Text style={styles.componentValue}>
                    {formatPercentage(rec.details.components.risk_factor)}
                  </Text>
                </View>
                <ProgressBar
                  progress={rec.details.components.risk_factor / 100}
                  color="#FF9800"
                  style={styles.progressBar}
                />
              </View>
            </View>

            {/* Sentiment Analysis */}
            <View style={styles.sentimentContainer}>
              <Text style={styles.sentimentTitle}>Market Sentiment</Text>

              <View style={[styles.sentimentBar, styles.progressContainer]}>
                <View style={styles.textContainer}>
                  <Text style={styles.sentimentLabel}>Positive</Text>
                  <Text style={styles.sentimentValue}>
                    {formatPercentage(
                      (rec.details.sentiment.positive / rec.details.sentiment.total) * 100
                    )}
                  </Text>
                </View>
                <ProgressBar
                  progress={rec.details.sentiment.positive / rec.details.sentiment.total}
                  color="#4CAF50"
                  style={styles.progressBar}
                />
              </View>

              <View style={[styles.sentimentBar, styles.progressContainer]}>
                <View style={styles.textContainer}>
                  <Text style={styles.sentimentLabel}>Neutral</Text>
                  <Text style={styles.sentimentValue}>
                    {formatPercentage(
                      (rec.details.sentiment.neutral / rec.details.sentiment.total) * 100
                    )}
                  </Text>
                </View>
                <ProgressBar
                  progress={rec.details.sentiment.neutral / rec.details.sentiment.total}
                  color="#FFC107"
                  style={styles.progressBar}
                />
              </View>

              <View style={[styles.sentimentBar, styles.progressContainer]}>
                <View style={styles.textContainer}>
                  <Text style={styles.sentimentLabel}>Negative</Text>
                  <Text style={styles.sentimentValue}>
                    {formatPercentage(
                      (rec.details.sentiment.negative / rec.details.sentiment.total) * 100
                    )}
                  </Text>
                </View>
                <ProgressBar
                  progress={rec.details.sentiment.negative / rec.details.sentiment.total}
                  color="#F44336"
                  style={styles.progressBar}
                />
              </View>
            </View>

            <Text style={styles.dataPoints}>
              Based on {rec.details.stock_data.data_points} data points
            </Text>
            
            <Text style={styles.overallScore}>
              Overall Score: {formatDecimal(rec.score)}
            </Text>
          </Card.Content>
        </Card>
      ))}

      <Button
        mode="contained"
        onPress={() => router.back()}
        style={styles.backButton}
        labelStyle={styles.buttonLabel}
      >
        Back to Search
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4DEAD",
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
  progressContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%",
    overflow: "visible",
    marginBottom: 30,
  },
  textContainer: {
    flexDirection: "row",
    marginBottom: 7,
    marginTop: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    width: "100%",
    maxWidth: "100%",
    maxHeight: "70%",
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
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
});