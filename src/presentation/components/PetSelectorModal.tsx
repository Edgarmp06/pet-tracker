import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pet } from '../../domain/entities/Pet';
import { ThemeColors, useTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  title: string;
  pets: Pet[];
  /** Selección múltiple (checkboxes + botón confirmar) o única (al pulsar confirma al instante). */
  multiSelect: boolean;
  initialSelectedIds?: string[];
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (selectedPets: Pet[]) => void;
}

export const PetSelectorModal: React.FC<Props> = ({
  visible,
  title,
  pets,
  multiSelect,
  initialSelectedIds,
  confirmLabel = 'Confirmar',
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setSelectedIds(initialSelectedIds || (pets[0] ? [pets[0].id] : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleTogglePet = (pet: Pet) => {
    if (!multiSelect) {
      onConfirm([pet]);
      return;
    }

    setSelectedIds((prev) =>
      prev.includes(pet.id)
        ? prev.filter((id) => id !== pet.id)
        : [...prev, pet.id],
    );
  };

  const handleConfirm = () => {
    const selectedPets = pets.filter((pet) => selectedIds.includes(pet.id));
    onConfirm(selectedPets);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>

          {pets.map((pet) => {
            const isSelected = selectedIds.includes(pet.id);
            return (
              <TouchableOpacity
                key={pet.id}
                style={[styles.petRow, isSelected && styles.petRowSelected]}
                onPress={() => handleTogglePet(pet)}
              >
                <Text style={styles.petEmoji}>🐶</Text>
                <Text
                  style={[
                    styles.petName,
                    isSelected && styles.petNameSelected,
                  ]}
                >
                  {pet.name}
                </Text>
                {multiSelect && (
                  <Text style={styles.checkbox}>
                    {isSelected ? '✅' : '⬜️'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            {multiSelect && (
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  selectedIds.length === 0 && styles.confirmBtnDisabled,
                ]}
                onPress={handleConfirm}
                disabled={selectedIds.length === 0}
              >
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </TouchableOpacity>
            )}
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
    petRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    petRowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    petEmoji: { fontSize: 20, marginRight: 10 },
    petName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    petNameSelected: { color: colors.primary },
    checkbox: { fontSize: 16 },
    buttons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
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
    confirmBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    confirmBtnDisabled: { opacity: 0.6 },
    confirmText: { color: colors.white, fontWeight: 'bold' },
  });
