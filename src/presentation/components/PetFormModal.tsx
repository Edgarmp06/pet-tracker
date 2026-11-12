import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PetGender, PetSpecies } from '../../domain/entities/Pet';
import { ThemeColors, useTheme } from '../context/ThemeContext';

export interface PetFormValues {
  name: string;
  breed?: string;
  age?: number;
  avatarUri?: string;
  species?: PetSpecies;
  gender?: PetGender;
  goesOnWalks?: boolean;
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

const SPECIES_OPTIONS: {
  key: PetSpecies;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { key: 'dog', label: 'Perro', icon: 'dog' },
  { key: 'cat', label: 'Gato', icon: 'cat' },
  { key: 'other', label: 'Otro', icon: 'paw' },
];

const GENDER_OPTIONS: {
  key: PetGender;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { key: 'male', label: 'Macho', icon: 'gender-male' },
  { key: 'female', label: 'Hembra', icon: 'gender-female' },
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
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [species, setSpecies] = useState<PetSpecies | null>(null);
  const [gender, setGender] = useState<PetGender | null>(null);
  const [goesOnWalks, setGoesOnWalks] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const values = initialValues || EMPTY_VALUES;
    setName(values.name || '');
    setBreed(values.breed || '');
    setAge(values.age ? String(values.age) : '');
    setAvatarUri(values.avatarUri || null);
    setSpecies(values.species || null);
    setGender(values.gender || null);
    setGoesOnWalks(values.goesOnWalks ?? true);
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
      goesOnWalks: species === 'cat' ? goesOnWalks : true,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 32 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleRow}>
              <Ionicons name="paw" size={18} color={colors.primary} />
              <Text style={styles.title}>{title}</Text>
            </View>

            <TouchableOpacity
              style={styles.avatarPicker}
              onPress={handlePickAvatar}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
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
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={24}
                      color={isSelected ? colors.primary : colors.textMuted}
                      style={styles.optionIcon}
                    />
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
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={24}
                      color={isSelected ? colors.primary : colors.textMuted}
                      style={styles.optionIcon}
                    />
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

            {species === 'cat' && (
              <>
                <Text style={styles.sectionLabel}>¿Sueles sacarlo a pasear?</Text>
                <View style={styles.cardRow}>
                  {[
                    { value: true, label: 'Sí' },
                    { value: false, label: 'No' },
                  ].map((option) => {
                    const isSelected = goesOnWalks === option.value;
                    return (
                      <TouchableOpacity
                        key={String(option.value)}
                        style={[
                          styles.optionCard,
                          isSelected && styles.optionCardSelected,
                        ]}
                        onPress={() => setGoesOnWalks(option.value)}
                      >
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
                {!goesOnWalks && (
                  <Text style={styles.walkHint}>
                    No aparecerá en la pestaña de Paseo. Podrás registrar sus
                    deposiciones en casa, comida y medicina desde su perfil.
                  </Text>
                )}
              </>
            )}

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
      </KeyboardAvoidingView>
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
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
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
    optionIcon: { marginBottom: 4 },
    optionLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    optionLabelSelected: { color: colors.primary },
    walkHint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -10,
      marginBottom: 18,
    },
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
