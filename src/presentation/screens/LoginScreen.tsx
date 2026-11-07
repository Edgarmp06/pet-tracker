import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MockAuthAdapter } from '../../infrastructure/adapters/MockAuthAdapter';
import { User } from '../../domain/entities/User';

const authService = new MockAuthAdapter();

interface Props {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Email no válido', 'Por favor, introduce un correo electrónico correcto.');
      return;
    }

    const user = await authService.login(email);
    onLoginSuccess(user);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🐾 PetTracker</Text>
      <Text style={styles.subtitle}>Inicia sesión para gestionar tus mascotas</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
        <Text style={styles.loginBtnText}>Entrar / Registrarse</Text>
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
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});