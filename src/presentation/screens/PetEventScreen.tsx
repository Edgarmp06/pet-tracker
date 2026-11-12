import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDependencies } from '../context/DependencyContext';
import { useActivePet } from '../context/ActivePetContext';
import { ThemeColors, useTheme } from '../context/ThemeContext';
import { ProfileStackParamList } from '../navigation/ProfileStackParamList';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PetEvent'>;

const MEDICATION_REMINDER_PICKS: { label: string; days: number; hours: number }[] = [
  { label: '12 h', days: 0, hours: 12 },
  { label: '24 h', days: 1, hours: 0 },
  { label: '3 días', days: 3, hours: 0 },
  { label: '7 días', days: 7, hours: 0 },
];

const FEEDING_REMINDER_PICKS: { label: string; days: number; hours: number }[] = [
  { label: '4 h', days: 0, hours: 4 },
  { label: '6 h', days: 0, hours: 6 },
  { label: '8 h', days: 0, hours: 8 },
  { label: '12 h', days: 0, hours: 12 },
];

const FOOD_UNITS = ['g', 'kg', 'lata', 'ración', 'taza'];
const DEFAULT_FOOD_UNIT = FOOD_UNITS[0];

interface SectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
  iconColor: string;
}

const Section: React.FC<SectionProps> = ({
  icon,
  title,
  children,
  styles,
  iconColor,
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeaderRow}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <Text style={styles.cardHeaderText}>{title}</Text>
    </View>
    {children}
  </View>
);

export const PetEventScreen: React.FC<Props> = ({ route, navigation }) => {
  const { type } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const {
    recordPetEventUseCase,
    scheduleMedicationReminderUseCase,
    scheduleFeedingReminderUseCase,
  } = useDependencies();
  const { activePet } = useActivePet();

  const [notes, setNotes] = useState('');
  const [foodQuantity, setFoodQuantity] = useState('');
  const [foodUnit, setFoodUnit] = useState(DEFAULT_FOOD_UNIT);
  const [medicineName, setMedicineName] = useState('');
  const [dose, setDose] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState('0');
  const [reminderHours, setReminderHours] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMedication = type === 'medication';
  const title = isMedication ? 'Registrar Medicina' : 'Registrar Comida';
  const headerIcon = isMedication ? 'medkit-outline' : 'restaurant-outline';
  const notesPlaceholder = isMedication
    ? 'Notas (opcional)'
    : 'Notas sobre la comida (opcional)';
  const reminderPicks = isMedication
    ? MEDICATION_REMINDER_PICKS
    : FEEDING_REMINDER_PICKS;
  const reminderSectionTitle = isMedication
    ? 'Recordar la próxima dosis'
    : 'Recordar la próxima comida';

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

  const foodAmount = foodQuantity.trim()
    ? `${foodQuantity.trim()} ${foodUnit}`
    : undefined;

  const handleSubmit = async () => {
    if (!activePet) return;

    setIsSubmitting(true);
    try {
      const nextDoseAt = reminderInMs
        ? new Date(Date.now() + reminderInMs)
        : undefined;

      const event = await recordPetEventUseCase.execute({
        petId: activePet.id,
        type,
        notes: notes.trim() || undefined,
        foodAmount: !isMedication ? foodAmount : undefined,
        medicineName: isMedication ? medicineName.trim() || undefined : undefined,
        dose: isMedication ? dose.trim() || undefined : undefined,
        nextDoseAt,
      });

      if (nextDoseAt && isMedication && medicineName.trim()) {
        await scheduleMedicationReminderUseCase.execute(
          event.id,
          activePet.name,
          medicineName.trim(),
          nextDoseAt,
        );
      } else if (nextDoseAt && !isMedication) {
        await scheduleFeedingReminderUseCase.execute(
          event.id,
          activePet.name,
          nextDoseAt,
        );
      }

      const typeLabel = isMedication ? 'Medicamento' : 'Alimentación';
      const reminderLabel = isMedication ? 'próxima dosis' : 'próxima comida';
      Alert.alert(
        '¡Registrado!',
        nextDoseAt
          ? `${typeLabel} guardado con éxito. Te avisaremos para la ${reminderLabel}.`
          : `${typeLabel} guardado con éxito.`,
      );
      navigation.goBack();
    } catch (error) {
      console.error('Error al registrar el evento:', error);
      Alert.alert(
        'No se pudo registrar',
        'Ocurrió un problema al guardar el evento. Inténtalo de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name={headerIcon} size={17} color={colors.text} />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {isMedication ? (
          <Section icon="medkit-outline" title="Medicamento" styles={styles} iconColor={colors.primary}>
            <Text style={styles.label}>Nombre</Text>
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
          </Section>
        ) : (
          <Section icon="restaurant-outline" title="Cantidad" styles={styles} iconColor={colors.primary}>
            <View style={styles.quantityRow}>
              <TextInput
                style={[styles.input, styles.quantityInput]}
                placeholder="Ej. 200"
                placeholderTextColor={colors.textMuted}
                value={foodQuantity}
                onChangeText={setFoodQuantity}
                keyboardType="numeric"
              />
              <Text style={styles.quantityUnitPreview}>{foodUnit}</Text>
            </View>
            <View style={styles.chipsRow}>
              {FOOD_UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.chip, foodUnit === unit && styles.chipSelected]}
                  onPress={() => setFoodUnit(unit)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      foodUnit === unit && styles.chipTextSelected,
                    ]}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>
        )}

        <Section icon="alarm-outline" title={reminderSectionTitle} styles={styles} iconColor={colors.primary}>
          <View style={styles.reminderHeaderRow}>
            <Text style={styles.reminderHeaderLabel}>Activar recordatorio</Text>
            <Switch value={reminderEnabled} onValueChange={setReminderEnabled} />
          </View>

          {reminderEnabled && (
            <>
              <View style={styles.chipsRow}>
                {reminderPicks.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.chip,
                      reminderDays === String(option.days) &&
                        reminderHours === String(option.hours) &&
                        styles.chipSelected,
                    ]}
                    onPress={() => applyQuickPick(option.days, option.hours)}
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
        </Section>

        <Section icon="document-text-outline" title="Notas" styles={styles} iconColor={colors.primary}>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder={notesPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Section>

        <TouchableOpacity
          style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.saveText}>
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: colors.text },
    scrollContent: { padding: 20, paddingBottom: 40 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    cardHeaderText: { fontSize: 13, fontWeight: 'bold', color: colors.text },
    label: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 10,
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
    inputWithMarginTop: { marginTop: 10 },
    quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    quantityInput: { flex: 1 },
    quantityUnitPreview: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      minWidth: 40,
    },
    notesInput: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    reminderHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    reminderHeaderLabel: { fontSize: 13, color: colors.text, fontWeight: '600' },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
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
    saveBtn: {
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      marginTop: 4,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  });
