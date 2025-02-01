import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, Button, ProgressBar } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { LineChart } from 'recharts';
import { theme } from '../components/theme';

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

interface Recommendation {
  company: string;
  stock_data: StockData;
  sentiment: SentimentData;
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
  const parsedData: ApiResponse = data ? JSON.parse(typeof data === 'string' ? data : data[0]) : null;

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatDecimal = (value: number) => value.toFixed(2);

  const getGrowthColor = (growth: number) => {
    if (growth > 5) return '#1B5E20';
    if (growth > 0) return '#4CAF50';
    if (growth > -5) return '#F44336';
    return '#B71C1C';
  };

  const getSentimentEmoji = (score: number) => {
    if (score >= 0.7) return '🟢';
    if (score >= 0.5) return '🟡';
    return '🔴';
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
            Investment Horizon: {parsedData.metadata.horizon === 'short-term' ? 'Short Term (30 days)' : 'Long Term (5 years)'}
          </Text>
          <Text style={styles.summaryText}>
            Analysis Date: {new Date(parsedData.metadata.timestamp).toLocaleString()}
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
              <Text style={styles.companyName}>{rec.company}</Text>
              <Text style={styles.sentimentScore}>
                {getSentimentEmoji(rec.sentiment.score)} {formatDecimal(rec.sentiment.score)}
              </Text>
            </View>

            {/* Growth Metrics */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Recent Growth</Text>
                <Text style={[
                  styles.metricValue,
                  { color: getGrowthColor(rec.stock_data.recent_growth) }
                ]}>
                  {formatPercentage(rec.stock_data.recent_growth)}
                </Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Historical Growth</Text>
                <Text style={[
                  styles.metricValue,
                  { color: getGrowthColor(rec.stock_data.historical_growth) }
                ]}>
                  {formatPercentage(rec.stock_data.historical_growth)}
                </Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Volatility</Text>
                <Text style={styles.metricValue}>
                  {formatDecimal(rec.stock_data.volatility)}
                </Text>
              </View>
            </View>

            {/* Sentiment Analysis */}
            <View style={styles.sentimentContainer}>
              <Text style={styles.sentimentTitle}>Market Sentiment</Text>
              
              <View style={styles.sentimentBar}>
                <Text style={styles.sentimentLabel}>Positive</Text>
                <ProgressBar 
                  progress={rec.sentiment.positive / rec.sentiment.total} 
                  color="#4CAF50"
                  style={styles.progressBar} 
                />
                <Text style={styles.sentimentValue}>
                  {formatPercentage((rec.sentiment.positive / rec.sentiment.total) * 100)}
                </Text>
              </View>

              <View style={styles.sentimentBar}>
                <Text style={styles.sentimentLabel}>Neutral</Text>
                <ProgressBar 
                  progress={rec.sentiment.neutral / rec.sentiment.total} 
                  color="#FFC107"
                  style={styles.progressBar} 
                />
                <Text style={styles.sentimentValue}>
                  {formatPercentage((rec.sentiment.neutral / rec.sentiment.total) * 100)}
                </Text>
              </View>

              <View style={styles.sentimentBar}>
                <Text style={styles.sentimentLabel}>Negative</Text>
                <ProgressBar 
                  progress={rec.sentiment.negative / rec.sentiment.total} 
                  color="#F44336"
                  style={styles.progressBar} 
                />
                <Text style={styles.sentimentValue}>
                  {formatPercentage((rec.sentiment.negative / rec.sentiment.total) * 100)}
                </Text>
              </View>
            </View>

            <Text style={styles.dataPoints}>
              Based on {rec.stock_data.data_points} data points
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
    backgroundColor: '#F4DEAD',
    padding: 16,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginVertical: 20,
  },
  summaryCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.primary,
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  recommendationCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  sentimentScore: {
    fontSize: 18,
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sentimentContainer: {
    marginTop: 16,
  },
  sentimentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.brownheader,
  },
  sentimentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sentimentLabel: {
    width: 70,
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  sentimentValue: {
    width: 50,
    fontSize: 14,
    textAlign: 'right',
    marginLeft: 8,
  },
  dataPoints: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  backButton: {
    marginVertical: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});