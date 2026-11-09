import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Pet } from '../../domain/entities/Pet';
import { PetEvent } from '../../domain/entities/PetEvent';
import { Dropping } from '../../domain/entities/Dropping';
import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { GetPetEventsUseCase } from '../../application/use-cases/PetEventUseCases';
import { ThemeColors, useTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  pet: Pet;
  getPetEventsUseCase: GetPetEventsUseCase;
  droppingRepository: IDroppingRepository;
  onClose: () => void;
}

type HistoryEntry = {
  id: string;
  timestamp: Date;
  icon: string;
  title: string;
  subtitle?: string;
};

const CONSISTENCY_LABEL: Record<string, string> = {
  hard: 'Dura',
  normal: 'Normal',
  soft: 'Blanda',
  diarrhea: 'Diarrea',
};

const formatDateTime = (date: Date): string =>
  date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const toHistoryEntries = (
  events: PetEvent[],
  droppings: Dropping[],
): HistoryEntry[] => {
  const fromEvents: HistoryEntry[] = events.map((event) => {
    if (event.type === 'medication') {
      const parts = [event.medicineName, event.dose].filter(Boolean);
      return {
        id: event.id,
        timestamp: event.timestamp,
        icon: '💊',
        title: event.medicineName || 'Medicina',
        subtitle: [parts.slice(1).join(' · '), event.notes]
          .filter(Boolean)
          .join(' — ') || undefined,
      };
    }
    return {
      id: event.id,
      timestamp: event.timestamp,
      icon: '🍖',
      title: event.foodAmount || 'Comida',
      subtitle: event.notes,
    };
  });

  const fromDroppings: HistoryEntry[] = droppings.map((dropping) => ({
    id: dropping.id,
    timestamp: dropping.timestamp,
    icon: '💩',
    title: `Deposición — ${CONSISTENCY_LABEL[dropping.consistency || 'normal']}`,
    subtitle: dropping.notes,
  }));

  return [...fromEvents, ...fromDroppings].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
};

export const PetHistoryModal: React.FC<Props> = ({
  visible,
  pet,
  getPetEventsUseCase,
  droppingRepository,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      getPetEventsUseCase.execute(pet.id),
      droppingRepository.findByPetId(pet.id),
    ])
      .then(([events, droppings]) => {
        if (cancelled) return;
        setEntries(toHistoryEntries(events, droppings));
      })
      .catch((error) => {
        console.error('No se pudo cargar el historial de la mascota:', error);
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, pet.id, getPetEventsUseCase, droppingRepository]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            {pet.avatarUri ? (
              <Image source={{ uri: pet.avatarUri }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarEmoji}>🐶</Text>
            )}
            <View style={styles.headerText}>
              <Text style={styles.title}>Historial de {pet.name}</Text>
              <Text style={styles.subtitle}>
                Comida, medicinas y deposiciones
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Todavía no hay nada registrado para {pet.name}.
              </Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => (
                <View style={styles.entryRow}>
                  <Text style={styles.entryIcon}>{item.icon}</Text>
                  <View style={styles.entryBody}>
                    <Text style={styles.entryTitle}>{item.title}</Text>
                    {item.subtitle ? (
                      <Text style={styles.entrySubtitle}>{item.subtitle}</Text>
                    ) : null}
                    <Text style={styles.entryDate}>
                      {formatDateTime(item.timestamp)}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
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
      maxHeight: '80%',
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
    avatarEmoji: { fontSize: 36, marginRight: 12 },
    headerText: { flex: 1 },
    title: { fontSize: 17, fontWeight: 'bold', color: colors.text },
    subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    list: { maxHeight: 420 },
    entryRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    entryIcon: { fontSize: 20, marginRight: 10 },
    entryBody: { flex: 1 },
    entryTitle: { fontSize: 14, fontWeight: 'bold', color: colors.text },
    entrySubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    entryDate: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    emptyState: {
      paddingVertical: 30,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    closeBtn: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    closeText: { color: colors.textMuted, fontWeight: 'bold' },
  });
