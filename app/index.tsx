import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';

export default function Home() {
  const [companies, setCompanies] = useState('');
  const [minConfidence, setMinConfidence] = useState('');
  const [investingHorizon, setInvestingHorizon] = useState('short-term');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!companies.trim() || !minConfidence.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://tangen-api.onrender.com/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companies: companies.split(','),
          min_confidence: parseFloat(minConfidence),
          investing_horizon: investingHorizon,
        }),
      });

      const data = await response.json();
      router.push({
        pathname: '/recommendations',
        params: { data: JSON.stringify(data) },
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Companies (comma separated)"
            value={companies}
            onChangeText={setCompanies}
            mode="outlined"
            style={styles.input}
            placeholder="AAPL, GOOGL, MSFT"
          />

          <TextInput
            label="Minimum Confidence (%)"
            value={minConfidence}
            onChangeText={setMinConfidence}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            placeholder="70"
          />

          <Text style={styles.label}>Investing Horizon</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={investingHorizon}
              onValueChange={setInvestingHorizon}
              style={styles.picker}
            >
              <Picker.Item label="Short-term (30 days)" value="short-term" />
              <Picker.Item label="Long-term (5 years)" value="long-term" />
            </Picker>
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Get Recommendations
          </Button>
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
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
  },
});
