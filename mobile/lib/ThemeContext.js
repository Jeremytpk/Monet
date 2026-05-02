import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@monet_theme';

// Brand: money (growth, value) + peace (calm, trust) — teal-green
const darkColors = {
  background: '#0D0D0D',
  card: '#1A1A1A',
  border: '#2A2A2A',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  muted: '#6B7280',
  accent: '#c89705ff',      // teal — money & peace
  accentText: '#FFFFFF',
};

const lightColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#64748B',
  muted: '#94A3B8',
  accent: '#c89705ff',     // same teal
  accentText: '#FFFFFF',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setThemeState(saved);
      setReady(true);
    });
  }, []);

  const setTheme = (value) => {
    const next = value === 'light' ? 'light' : 'dark';
    setThemeState(next);
    AsyncStorage.setItem(THEME_KEY, next);
  };

  const isDark = theme === 'dark';
  const colors = { ...(isDark ? darkColors : lightColors), isDark };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, colors, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
