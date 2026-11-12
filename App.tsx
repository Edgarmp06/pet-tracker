import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { WalkScreen } from './src/presentation/screens/WalkScreen';
import { ProfileScreen } from './src/presentation/screens/ProfileScreen';
import { PetEventScreen } from './src/presentation/screens/PetEventScreen';
import { LoginScreen } from './src/presentation/screens/LoginScreen';
import { ProfileStackParamList } from './src/presentation/navigation/ProfileStackParamList';
import { DependencyProvider, authService } from './src/presentation/context/DependencyContext';
import { ActivePetProvider } from './src/presentation/context/ActivePetContext';
import { ThemeProvider, useTheme } from './src/presentation/context/ThemeContext';
import { User } from './src/domain/entities/User';

const Tab = createBottomTabNavigator();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

interface MainNavigatorProps {
  onLogout: () => void;
}

// Pila anidada dentro de la pestaña Perfil: permite abrir el registro de
// comida/medicina como una pantalla propia (con su propio header y botón de
// volver) en vez de un modal, sin tocar la navegación por pestañas de abajo.
const ProfileStackNavigator: React.FC<{ onLogout: () => void }> = ({
  onLogout,
}) => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileHome">
      {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
    </ProfileStack.Screen>
    <ProfileStack.Screen name="PetEvent" component={PetEventScreen} />
  </ProfileStack.Navigator>
);

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
          {() => <ProfileStackNavigator onLogout={onLogout} />}
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
