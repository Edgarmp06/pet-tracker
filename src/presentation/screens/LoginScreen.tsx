import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../domain/entities/User';
import { useDependencies } from '../context/DependencyContext';
import { ThemeColors, useTheme } from '../context/ThemeContext';

interface Props {
  onLoginSuccess: (user: User) => void;
}

type Mode = 'login' | 'register';

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const { authService, requestPasswordResetUseCase } = useDependencies();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

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

  const handleForgotPassword = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert(
        'Email no válido',
        'Introduce tu correo electrónico en el campo de arriba y pulsa de nuevo.',
      );
      return;
    }

    setIsSendingReset(true);
    try {
      await requestPasswordResetUseCase.execute(email.trim());
      Alert.alert(
        'Revisa tu correo',
        'Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.',
      );
    } catch (error) {
      console.error('Error al solicitar el restablecimiento:', error);
      Alert.alert(
        'No se pudo enviar el correo',
        error instanceof Error
          ? error.message
          : 'Ocurrió un problema. Inténtalo de nuevo.',
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResetLocalStorage = () => {
    Alert.alert(
      'Reiniciar almacenamiento local',
      'Esto borrará todos los datos guardados en este dispositivo (sesión, mascotas, historial, preferencias). Útil para limpiar sesiones de prueba antiguas. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert(
                'Almacenamiento reiniciado',
                'Los datos locales se han borrado correctamente.',
              );
            } catch (error) {
              console.error('No se pudo reiniciar el almacenamiento local:', error);
              Alert.alert(
                'No se pudo reiniciar',
                'Ocurrió un problema al borrar los datos locales. Inténtalo de nuevo.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/icon.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
      <Text style={styles.appName}>PetTracker</Text>
      <Text style={styles.subtitle}>
        {mode === 'login'
          ? 'Inicia sesión para gestionar tus mascotas'
          : 'Crea una cuenta para empezar'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña (mín. 6 caracteres)"
        placeholderTextColor={colors.textMuted}
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

      {mode === 'login' && (
        <TouchableOpacity
          style={styles.forgotPasswordBtn}
          onPress={handleForgotPassword}
          disabled={isSendingReset}
        >
          <Text style={styles.forgotPasswordText}>
            {isSendingReset
              ? 'Enviando...'
              : '¿Has olvidado tu contraseña?'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.resetStorageBtn}
        onPress={handleResetLocalStorage}
      >
        <Text style={styles.resetStorageText}>
          🔄 Reiniciar almacenamiento local
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },
    logoImage: {
      width: 88,
      height: 88,
      borderRadius: 20,
      marginBottom: 12,
    },
    appName: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 30,
      textAlign: 'center',
    },
    input: {
      width: '100%',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
      fontSize: 16,
      color: colors.text,
    },
    loginBtn: {
      width: '100%',
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      elevation: 2,
    },
    loginBtnDisabled: {
      opacity: 0.6,
    },
    loginBtnText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: 'bold',
    },
    switchModeBtn: {
      marginTop: 18,
    },
    switchModeText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    forgotPasswordBtn: {
      marginTop: 14,
    },
    forgotPasswordText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    resetStorageBtn: {
      marginTop: 28,
    },
    resetStorageText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
  });
