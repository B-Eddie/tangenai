import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { DataTable, Card, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';

interface Recommendation {
  company: string;
  confidence: number;
  total_articles: number;
}

export default function Recommendations() {
  const { data } = useLocalSearchParams();
  const recommendations: Recommendation[] = data ? JSON.parse(data as string) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Card.Content>
          {recommendations.length > 0 ? (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Company</DataTable.Title>
                <DataTable.Title numeric>Confidence (%)</DataTable.Title>
                <DataTable.Title numeric>Articles</DataTable.Title>
              </DataTable.Header>

              {recommendations.map((rec, index) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell>{rec.company}</DataTable.Cell>
                  <DataTable.Cell numeric>{rec.confidence}</DataTable.Cell>
                  <DataTable.Cell numeric>{rec.total_articles}</DataTable.Cell>
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