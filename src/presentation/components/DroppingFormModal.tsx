import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ColorGradientPicker } from './ColorGradientPicker';
import { PoopConsistency } from '../../domain/entities/Dropping';
import { ThemeColors, useTheme } from '../context/ThemeContext';

export interface DroppingFormValues {
  consistency: PoopConsistency;
  colorHex: string;
}

interface Props {
  visible: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: DroppingFormValues) => void;
}

const CONSISTENCY_OPTIONS: { key: PoopConsistency; label: string }[] = [
  { key: 'hard', label: '🪨 Dura' },
  { key: 'normal', label: '👍 Normal' },
  { key: 'soft', label: '🍦 Blanda' },
  { key: 'diarrhea', label: '🌊 Diarrea' },
];

const DEFAULT_COLOR_HEX = '#6D4C41';

export const DroppingFormModal: React.FC<Props> = ({
  visible,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [consistency, setConsistency] = useState<PoopConsistency>('normal');
  const [colorHex, setColorHex] = useState<string>(DEFAULT_COLOR_HEX);

  useEffect(() => {
    if (!visible) return;
    setConsistency('normal');
    setColorHex(DEFAULT_COLOR_HEX);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>💩 Registrar Deposición</Text>

          <Text style={styles.label}>Consistencia / Estado:</Text>
          <View style={styles.optionsRow}>
            {CONSISTENCY_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.chip,
                  consistency === item.key && styles.chipSelected,
                ]}
                onPress={() => setConsistency(item.key)}
              >
                <Text
                  style={[
                    styles.chipText,
                    consistency === item.key && styles.chipTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Tono / Color Fecal:</Text>
          <ColorGradientPicker
            selectedHexColor={colorHex}
            onColorChange={setColorHex}
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
              onPress={() => onSubmit({ consistency, colorHex })}
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
    optionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipSelected: { backgroundColor: '#795548', borderColor: '#795548' },
    chipText: { fontSize: 13, color: colors.text },
    chipTextSelected: { color: colors.white, fontWeight: 'bold' },
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
