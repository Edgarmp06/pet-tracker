import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { User } from '../../domain/entities/User';
import { useDependencies } from '../context/DependencyContext';

interface Props {
  onLoginSuccess: (user: User) => void;
}

type Mode = 'login' | 'register';

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const { authService } = useDependencies();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Email no válido', 'Por favor, introduce un correo electrónico correcto.');
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        'Contraseña demasiado corta',
        'La contraseña debe tener al menos 6 caracteres.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const user =
        mode === 'login'
          ? await authService.login(email.trim(), password)
          : await authService.register(email.trim(), password);
      onLoginSuccess(user);
    } catch (error) {
      console.error('Fallo de autenticación:', error);
      Alert.alert(
        mode === 'login' ? 'No se pudo iniciar sesión' : 'No se pudo crear la cuenta',
        error instanceof Error
          ? error.message
          : 'Ocurrió un problema. Inténtalo de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🐾 PetTracker</Text>
      <Text style={styles.subtitle}>
        {mode === 'login'
          ? 'Inicia sesión para gestionar tus mascotas'
          : 'Crea una cuenta para empezar'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña (mín. 6 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.loginBtn, isSubmitting && styles.loginBtnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.loginBtnText}>
          {isSubmitting
            ? 'Un momento...'
            : mode === 'login'
              ? 'Entrar'
              : 'Crear cuenta'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchModeBtn}
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        <Text style={styles.switchModeText}>
          {mode === 'login'
            ? '¿No tienes cuenta? Crea una'
            : '¿Ya tienes cuenta? Inicia sesión'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
    fontSize: 16,
  },
  loginBtn: {
    width: '100%',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchModeBtn: {
    marginTop: 18,
  },
  switchModeText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
});
