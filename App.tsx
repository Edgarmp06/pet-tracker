import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { WalkScreen } from './src/presentation/screens/WalkScreen';
import { ProfileScreen } from './src/presentation/screens/ProfileScreen';
import { LoginScreen } from './src/presentation/screens/LoginScreen';
import { DependencyProvider, authService } from './src/presentation/context/DependencyContext';
import { ActivePetProvider } from './src/presentation/context/ActivePetContext';
import { ThemeProvider, useTheme } from './src/presentation/context/ThemeContext';
import { User } from './src/domain/entities/User';

const Tab = createBottomTabNavigator();

interface MainNavigatorProps {
  onLogout: () => void;
}

const MainNavigator: React.FC<MainNavigatorProps> = ({ onLogout }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Profile"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 8,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'footsteps';

            if (route.name === 'Walk') {
              iconName = 'footsteps';
            } else if (route.name === 'Profile') {
              iconName = 'paw';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Profile" options={{ tabBarLabel: 'Perfil' }}>
          {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
        <Tab.Screen
          name="Walk"
          component={WalkScreen}
          options={{ tabBarLabel: 'Paseo' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    authService
      .getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
      })
      .catch((error) => {
        console.error('No se pudo recuperar la sesión al iniciar:', error);
        setCurrentUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {loading ? (
        <View
          style={[styles.loadingContainer, { backgroundColor: colors.background }]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <DependencyProvider>
          {!currentUser ? (
            <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />
          ) : (
            <ActivePetProvider>
              <MainNavigator onLogout={() => setCurrentUser(null)} />
            </ActivePetProvider>
          )}
        </DependencyProvider>
      )}
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
