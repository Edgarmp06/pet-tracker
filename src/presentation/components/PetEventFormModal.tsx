import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PetEventType } from '../../domain/entities/PetEvent';
import { ThemeColors, useTheme } from '../context/ThemeContext';

export interface PetEventFormValues {
  notes?: string;
  foodAmount?: string;
  medicineName?: string;
  dose?: string;
  /** Milisegundos desde ahora hasta la próxima dosis, si se pidió recordatorio. */
  reminderInMs?: number;
}

interface Props {
  visible: boolean;
  type: PetEventType | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: PetEventFormValues) => void;
}

const QUICK_PICKS: { label: string; days: number; hours: number }[] = [
  { label: '12 h', days: 0, hours: 12 },
  { label: '24 h', days: 1, hours: 0 },
  { label: '3 días', days: 3, hours: 0 },
  { label: '7 días', days: 7, hours: 0 },
];

export const PetEventFormModal: React.FC<Props> = ({
  visible,
  type,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [notes, setNotes] = useState('');
  const [foodAmount, setFoodAmount] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [dose, setDose] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState('0');
  const [reminderHours, setReminderHours] = useState('0');

  useEffect(() => {
    if (!visible) return;
    setNotes('');
    setFoodAmount('');
    setMedicineName('');
    setDose('');
    setReminderEnabled(false);
    setReminderDays('0');
    setReminderHours('0');
  }, [visible]);

  const applyQuickPick = (days: number, hours: number) => {
    setReminderEnabled(true);
    setReminderDays(String(days));
    setReminderHours(String(hours));
  };

  const reminderInMs = (() => {
    if (!reminderEnabled) return undefined;
    const days = Math.max(0, parseInt(reminderDays, 10) || 0);
    const hours = Math.max(0, parseInt(reminderHours, 10) || 0);
    const totalMs = (days * 24 + hours) * 60 * 60 * 1000;
    return totalMs > 0 ? totalMs : undefined;
  })();

  const isMedication = type === 'medication';
  const title = isMedication ? '💊 Registrar Medicina' : '🍖 Registrar Comida';
  const notesPlaceholder = isMedication
    ? 'Notas (opcional)'
    : 'Notas sobre la comida (opcional)';

  const handleSubmit = () => {
    onSubmit({
      notes: notes.trim() || undefined,
      foodAmount: !isMedication ? foodAmount.trim() || undefined : undefined,
      medicineName: isMedication ? medicineName.trim() || undefined : undefined,
      dose: isMedication ? dose.trim() || undefined : undefined,
      reminderInMs: isMedication ? reminderInMs : undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>

          {isMedication ? (
            <>
              <Text style={styles.label}>Nombre del medicamento</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Antiparasitario"
                placeholderTextColor={colors.textMuted}
                value={medicineName}
                onChangeText={setMedicineName}
              />

              <Text style={styles.label}>Dosis</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 1 comprimido"
                placeholderTextColor={colors.textMuted}
                value={dose}
                onChangeText={setDose}
              />

              <View style={styles.reminderHeaderRow}>
                <Text style={styles.label}>Recordar la próxima dosis</Text>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                />
              </View>

              {reminderEnabled && (
                <>
                  <View style={styles.chipsRow}>
                    {QUICK_PICKS.map((option) => (
                      <TouchableOpacity
                        key={option.label}
                        style={[
                          styles.chip,
                          reminderDays === String(option.days) &&
                            reminderHours === String(option.hours) &&
                            styles.chipSelected,
                        ]}
                        onPress={() =>
                          applyQuickPick(option.days, option.hours)
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            reminderDays === String(option.days) &&
                              reminderHours === String(option.hours) &&
                              styles.chipTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>O elige un tiempo exacto</Text>
                  <View style={styles.customTimeRow}>
                    <View style={styles.customTimeField}>
                      <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={reminderDays}
                        onChangeText={setReminderDays}
                      />
                      <Text style={styles.customTimeLabel}>días</Text>
                    </View>
                    <View style={styles.customTimeField}>
                      <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={reminderHours}
                        onChangeText={setReminderHours}
                      />
                      <Text style={styles.customTimeLabel}>horas</Text>
                    </View>
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              <Text style={styles.label}>Cantidad / tipo de alimento</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 200g de pienso"
                placeholderTextColor={colors.textMuted}
                value={foodAmount}
                onChangeText={setFoodAmount}
              />
            </>
          )}

          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
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
              onPress={handleSubmit}
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
    label: {
      fontSize: 13,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 6,
      color: colors.textMuted,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
    },
    notesInput: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    reminderHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    customTimeRow: {
      flexDirection: 'row',
      gap: 12,
    },
    customTimeField: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    customTimeLabel: {
      fontSize: 11,
      color: colors.textMuted,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: { fontSize: 12, color: colors.text },
    chipTextSelected: { color: colors.white, fontWeight: 'bold' },
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
