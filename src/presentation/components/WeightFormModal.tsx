import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemeColors, useTheme } from '../context/ThemeContext';

export interface WeightFormValues {
  weightKg: number;
  notes?: string;
}

interface Props {
  visible: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: WeightFormValues) => void;
}

export const WeightFormModal: React.FC<Props> = ({
  visible,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [weightText, setWeightText] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!visible) return;
    setWeightText('');
    setNotes('');
  }, [visible]);

  const weightKg = Number(weightText.replace(',', '.'));
  const isValid = weightText.trim().length > 0 && Number.isFinite(weightKg) && weightKg > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({ weightKg, notes: notes.trim() || undefined });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>⚖️ Registrar Peso</Text>

            <Text style={styles.label}>Peso (kg)</Text>
            <TextInput
              style={styles.weightInput}
              placeholder="Ej. 12.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={weightText}
              onChangeText={setWeightText}
              autoFocus
            />

            <Text style={styles.label}>Notas (opcional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Ej. Después de comer"
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (isSubmitting || !isValid) && styles.saveBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || !isValid}
              >
                <Text style={styles.saveText}>
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    content: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      elevation: 5,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
      textAlign: 'center',
      color: colors.text,
    },
    label: {
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 8,
      color: colors.textMuted,
    },
    weightInput: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
    },
    notesInput: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    buttons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 25,
    },
    cancelBtn: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surfaceAlt,
      flex: 1,
      marginRight: 10,
      alignItems: 'center',
    },
    cancelText: { color: colors.textMuted, fontWeight: 'bold' },
    saveBtn: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      flex: 1,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveText: { color: colors.white, fontWeight: 'bold' },
  });
