import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { DataTable, Card, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';

interface Recommendation {
  company: string;
  stock_data: {
    recent_growth: number;
    historical_growth: number;
    volatility: number;
  };
  sentiment: {
    score: number;
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  };
}

export default function Recommendations() {
  const { data } = useLocalSearchParams();
  const result = data ? JSON.parse(typeof data === 'string' ? data : data[0]) : { recommendations: [] };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Card.Content>
          {result.recommendations.length > 0 ? (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Company</DataTable.Title>
                <DataTable.Title numeric>Growth (%)</DataTable.Title>
                <DataTable.Title numeric>Sentiment</DataTable.Title>
                <DataTable.Title numeric>Volatility</DataTable.Title>
              </DataTable.Header>

              {result.recommendations.map((rec: Recommendation, index: number) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell>{rec.company}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    {rec.stock_data.recent_growth.toFixed(1)}%
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {rec.sentiment.score.toFixed(2)}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {rec.stock_data.volatility.toFixed(2)}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          ) : (
            <Text style={styles.noData}>No recommendations found</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  noData: {
    textAlign: 'center',
    padding: 16,
    fontSize: 16,
    color: '#666',
  },
});