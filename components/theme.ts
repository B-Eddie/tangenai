import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  // ... existing font config ...
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#FF6B35',
    secondary: '#FF9F1C',
    tertiary: '#FFB347',
    background: '#FFF8F0',
    surface: '#FFFFFF',
    error: '#FF3B30',
    text: '#2D3436',
    onSurface: '#2D3436',
    disabled: '#A0A0A0',
    placeholder: '#A0A0A0',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#FF6B35',
    border: '#E0E0E0',
    card: '#FFFFFF',
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
};

// ... rest of the theme file ... 