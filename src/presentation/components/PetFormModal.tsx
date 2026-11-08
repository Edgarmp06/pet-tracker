import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PetGender, PetSpecies } from '../../domain/entities/Pet';
import { ThemeColors, useTheme } from '../context/ThemeContext';

export interface PetFormValues {
  name: string;
  breed?: string;
  age?: number;
  avatarUri?: string;
  species?: PetSpecies;
  gender?: PetGender;
}

interface Props {
  visible: boolean;
  title: string;
  submitLabel: string;
  initialValues?: PetFormValues;
  isSubmitting: boolean;
  onClose: () => void;
  onPickAvatar: () => Promise<string | null>;
  onSubmit: (values: PetFormValues) => void;
}

const SPECIES_OPTIONS: { key: PetSpecies; label: string; emoji: string }[] = [
  { key: 'dog', label: 'Perro', emoji: '🐶' },
  { key: 'cat', label: 'Gato', emoji: '🐱' },
  { key: 'other', label: 'Otro', emoji: '🐾' },
];

const GENDER_OPTIONS: { key: PetGender; label: string; emoji: string }[] = [
  { key: 'male', label: 'Macho', emoji: '♂️' },
  { key: 'female', label: 'Hembra', emoji: '♀️' },
];

const EMPTY_VALUES: PetFormValues = { name: '' };

export const PetFormModal: React.FC<Props> = ({
  visible,
  title,
  submitLabel,
  initialValues,
  isSubmitting,
  onClose,
  onPickAvatar,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [species, setSpecies] = useState<PetSpecies | null>(null);
  const [gender, setGender] = useState<PetGender | null>(null);

  useEffect(() => {
    if (!visible) return;
    const values = initialValues || EMPTY_VALUES;
    setName(values.name || '');
    setBreed(values.breed || '');
    setAge(values.age ? String(values.age) : '');
    setAvatarUri(values.avatarUri || null);
    setSpecies(values.species || null);
    setGender(values.gender || null);
  }, [visible, initialValues]);

  const handlePickAvatar = async () => {
    const uri = await onPickAvatar();
    if (uri) setAvatarUri(uri);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      breed: breed.trim() || undefined,
      age: age ? parseInt(age, 10) : undefined,
      avatarUri: avatarUri || undefined,
      species: species || undefined,
      gender: gender || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{title}</Text>

            <TouchableOpacity
              style={styles.avatarPicker}
              onPress={handlePickAvatar}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarPickerText}>📷</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Toca para elegir una foto</Text>

            <Text style={styles.sectionLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Luna"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.sectionLabel}>Especie</Text>
            <View style={styles.cardRow}>
              {SPECIES_OPTIONS.map((option) => {
                const isSelected = species === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setSpecies(option.key)}
                  >
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Género</Text>
            <View style={styles.cardRow}>
              {GENDER_OPTIONS.map((option) => {
                const isSelected = gender === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setGender(option.key)}
                  >
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <Text style={styles.sectionLabel}>Raza</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Labrador"
                  placeholderTextColor={colors.textMuted}
                  value={breed}
                  onChangeText={setBreed}
                />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.sectionLabel}>Edad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Años"
                  placeholderTextColor={colors.textMuted}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.saveText}>
                  {isSubmitting ? 'Guardando...' : submitLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '88%',
    },
    scrollContent: { padding: 24, paddingBottom: 32 },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
    },
    avatarPicker: {
      alignSelf: 'center',
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    avatarImage: { width: 88, height: 88, borderRadius: 44 },
    avatarPickerText: { fontSize: 28 },
    avatarHint: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 22,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: 18,
      color: colors.text,
    },
    cardRow: {
      flexDirection: 'row',
      marginBottom: 18,
    },
    optionCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      marginRight: 10,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    optionCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    optionEmoji: { fontSize: 24, marginBottom: 4 },
    optionLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    optionLabelSelected: { color: colors.primary },
    inlineRow: { flexDirection: 'row' },
    inlineField: { flex: 1, marginRight: 12 },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    cancelBtn: {
      flex: 1,
      marginRight: 10,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    cancelText: { color: colors.textMuted, fontWeight: 'bold' },
    saveBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveText: { color: colors.white, fontWeight: 'bold' },
  });
