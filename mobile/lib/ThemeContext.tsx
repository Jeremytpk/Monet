import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, radii, spacing, typography, type ThemeColors } from './theme/tokens';

const THEME_KEY = '@monet_theme';

export type ThemeName = 'light' | 'dark';

type ThemeContextValue = {
  /** The theme in effect: the user's saved choice, or the device setting. */
  theme: ThemeName;
  setTheme: (value: ThemeName) => void;
  isDark: boolean;
  colors: ThemeColors & { isDark: boolean };
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [saved, setSaved] = useState<ThemeName | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((value) => {
        if (value === 'light' || value === 'dark') setSaved(value);
      })
      .finally(() => setReady(true));
  }, []);

  const setTheme = (value: ThemeName) => {
    const next: ThemeName = value === 'light' ? 'light' : 'dark';
    setSaved(next);
    AsyncStorage.setItem(THEME_KEY, next);
  };

  const theme: ThemeName = saved ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const isDark = theme === 'dark';
  const colors = { ...(isDark ? darkColors : lightColors), isDark };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, colors, spacing, radii, typography, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
