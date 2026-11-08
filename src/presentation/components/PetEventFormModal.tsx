import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemeColors, useTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  title: string;
  notesPlaceholder: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (notes?: string) => void;
}

export const PetEventFormModal: React.FC<Props> = ({
  visible,
  title,
  notesPlaceholder,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!visible) return;
    setNotes('');
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            style={styles.input}
            placeholder={notesPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
              onPress={() => onSubmit(notes.trim() || undefined)}
              disabled={isSubmitting}
            >
              <Text style={styles.saveText}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
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
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
      color: colors.text,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      minHeight: 70,
      textAlignVertical: 'top',
      color: colors.text,
    },
    buttons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 18,
    },
    cancelBtn: {
      flex: 1,
      marginRight: 10,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    cancelText: { color: colors.textMuted, fontWeight: 'bold' },
    saveBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveText: { color: colors.white, fontWeight: 'bold' },
  });
