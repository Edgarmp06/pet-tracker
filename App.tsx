import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
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
import { DependencyProvider } from './src/presentation/context/DependencyContext';
import { MockAuthAdapter } from './src/infrastructure/adapters/MockAuthAdapter';
import { User } from './src/domain/entities/User';

const Tab = createBottomTabNavigator();
const authService = new MockAuthAdapter();

interface MainNavigatorProps {
  onLogout: () => void;
}

const MainNavigator: React.FC<MainNavigatorProps> = ({ onLogout }) => {
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: '#888888',
          tabBarStyle: {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 8,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e2e8f0',
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
        <Tab.Screen
          name="Walk"
          component={WalkScreen}
          options={{ tabBarLabel: 'Paseo' }}
        />
        <Tab.Screen name="Profile" options={{ tabBarLabel: 'Perfil' }}>
          {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <DependencyProvider>
        {!currentUser ? (
          <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />
        ) : (
          <MainNavigator onLogout={() => setCurrentUser(null)} />
        )}
      </DependencyProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
