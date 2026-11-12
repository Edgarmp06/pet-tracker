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
import { ColorGradientPicker } from './ColorGradientPicker';
import { PoopConsistency } from '../../domain/entities/Dropping';
import { ThemeColors, useTheme } from '../context/ThemeContext';

export interface DroppingFormValues {
  consistency: PoopConsistency;
  colorHex: string;
  placeLabel?: string;
}

interface Props {
  visible: boolean;
  isSubmitting?: boolean;
  /** Muestra el selector de "¿Dónde?" — solo tiene sentido fuera de un paseo activo. */
  showPlaceField?: boolean;
  onClose: () => void;
  onSubmit: (values: DroppingFormValues) => void;
}

const CONSISTENCY_OPTIONS: { key: PoopConsistency; label: string }[] = [
  { key: 'hard', label: '🪨 Dura' },
  { key: 'normal', label: '👍 Normal' },
  { key: 'soft', label: '🍦 Blanda' },
  { key: 'diarrhea', label: '🌊 Diarrea' },
];

const PLACE_OPTIONS = ['En casa', 'Terraza', 'Patio / Jardín'];
const OTHER_PLACE = 'Otro sitio';

const DEFAULT_COLOR_HEX = '#6D4C41';

export const DroppingFormModal: React.FC<Props> = ({
  visible,
  isSubmitting,
  showPlaceField,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [consistency, setConsistency] = useState<PoopConsistency>('normal');
  const [colorHex, setColorHex] = useState<string>(DEFAULT_COLOR_HEX);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [customPlace, setCustomPlace] = useState('');

  useEffect(() => {
    if (!visible) return;
    setConsistency('normal');
    setColorHex(DEFAULT_COLOR_HEX);
    setSelectedPlace(null);
    setCustomPlace('');
  }, [visible]);

  const placeLabel =
    selectedPlace === OTHER_PLACE
      ? customPlace.trim() || undefined
      : selectedPlace || undefined;

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

          {showPlaceField && (
            <>
              <Text style={styles.label}>¿Dónde?</Text>
              <View style={styles.optionsRow}>
                {[...PLACE_OPTIONS, OTHER_PLACE].map((place) => (
                  <TouchableOpacity
                    key={place}
                    style={[
                      styles.chip,
                      selectedPlace === place && styles.chipSelected,
                    ]}
                    onPress={() => setSelectedPlace(place)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedPlace === place && styles.chipTextSelected,
                      ]}
                    >
                      {place}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedPlace === OTHER_PLACE && (
                <TextInput
                  style={styles.placeInput}
                  placeholder="Ej. Habitación de Juan"
                  placeholderTextColor={colors.textMuted}
                  value={customPlace}
                  onChangeText={setCustomPlace}
                />
              )}
            </>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
              onPress={() => onSubmit({ consistency, colorHex, placeLabel })}
              disabled={isSubmitting}
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
    placeInput: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      marginTop: 8,
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
