import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#FF4500",
    brownheader: "#885C0B",
    background: "#fcfaf8",
    border: "#D9B458",
  },
};

export type AppTheme = typeof theme;

export default theme;