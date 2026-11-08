import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryMuted: string;
  danger: string;
  dangerMuted: string;
  overlay: string;
  white: string;
}

const LIGHT_COLORS: ThemeColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  surfaceAlt: '#f9f9f9',
  text: '#222222',
  textMuted: '#666666',
  border: '#e2e8f0',
  primary: '#4CAF50',
  primaryMuted: '#e8f5e9',
  danger: '#F44336',
  dangerMuted: '#fff5f5',
  overlay: 'rgba(0,0,0,0.5)',
  white: '#ffffff',
};

const DARK_COLORS: ThemeColors = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceAlt: '#2a2a2a',
  text: '#f0f0f0',
  textMuted: '#aaaaaa',
  border: '#3a3a3a',
  primary: '#66BB6A',
  primaryMuted: '#1b3a1d',
  danger: '#EF5350',
  dangerMuted: '#3a2020',
  overlay: 'rgba(0,0,0,0.7)',
  white: '#ffffff',
};

const THEME_PREFERENCE_KEY = '@pet_tracker_theme_preference';

interface ThemeContextType {
  preference: ThemePreference;
  theme: ResolvedTheme;
  colors: ThemeColors;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((value) => {
        if (value === 'light' || value === 'dark' || value === 'system') {
          setPreferenceState(value);
        }
      })
      .catch((error) =>
        console.error('No se pudo leer la preferencia de tema:', error),
      );
  }, []);

  const setPreference = async (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, next);
    } catch (error) {
      console.error('No se pudo guardar la preferencia de tema:', error);
    }
  };

  const theme: ResolvedTheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Desde que Android exige edge-to-edge (y expo-navigation-bar lo refleja
    // quitando el control manual de color de fondo), solo podemos pedir el
    // estilo de la barra ("dark" = fondo oscuro + iconos claros), no un color
    // exacto; el sistema compone la barra transparente sobre nuestro fondo.
    NavigationBar.setStyle(theme === 'dark' ? 'dark' : 'light');
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ preference, theme, colors, isDark: theme === 'dark', setPreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
};
