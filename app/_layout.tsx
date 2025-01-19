import { Stack } from 'expo-router';
import { PaperProvider, DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4CAF50',
    accent: '#45a049',
  },
};

export default function Layout() {
  return (
    <PaperProvider theme={theme}>
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Tangen AI',
            headerStyle: {
              backgroundColor: theme.colors.primary,
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="recommend" 
          options={{ 
            title: 'Stock Recommendations',
            headerStyle: {
              backgroundColor: theme.colors.primary,
            },
            headerTintColor: '#fff',
          }}
        />
      </Stack>
    </PaperProvider>
  );
}
