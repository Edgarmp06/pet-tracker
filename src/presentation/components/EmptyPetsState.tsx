import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, useTheme } from '../context/ThemeContext';

interface Props {
  onAddPet: () => void;
}

export const EmptyPetsState: React.FC<Props> = ({ onAddPet }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.illustrationCircle}>
        <Ionicons name="paw" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>Añade a tu mascota para comenzar</Text>
      <Text style={styles.subtitle}>
        Registra a tu perro o gato para empezar a seguir sus paseos y su
        salud digestiva.
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={onAddPet}>
        <Ionicons name="add-circle-outline" size={18} color={colors.white} />
        <Text style={styles.primaryBtnText}>Añadir mi primera mascota</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    illustrationCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 18,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 14,
      elevation: 2,
    },
    primaryBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 15 },
  });
