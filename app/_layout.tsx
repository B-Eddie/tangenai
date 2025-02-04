import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { createContext } from 'react';
import { theme } from "../components/theme";

export const API_URL = "https://moc.hackclub.app/recommend";
// export const API_URL = "http://127.0.0.1:32771/recommend";
// export const API_URL = "tangen-api.onrender.com/recommend";
export const APIContext = createContext(API_URL);

export default function Layout() {
  return (
    <PaperProvider theme={theme}>
      <APIContext.Provider value={API_URL}>
        <Stack>
          <Stack.Screen 
            name="(tabs)" 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="recommendations" 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="explore_recommendations" 
            options={{ headerShown: false }}
          />
        </Stack>
      </APIContext.Provider>
    </PaperProvider>
  );
}