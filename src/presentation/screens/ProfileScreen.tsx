import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDependencies } from '../context/DependencyContext';
import { useActivePet } from '../context/ActivePetContext';
import { Dropping, PoopConsistency } from '../../domain/entities/Dropping';
import { Pet } from '../../domain/entities/Pet';
import { ClinicalMetricsChart } from '../components/ClinicalMetricsChart';
import { ClinicalMetrics } from '../../application/use-cases/GetClinicalMetricsUseCase';
import { EmptyPetsState } from '../components/EmptyPetsState';
import { PetFormModal, PetFormValues } from '../components/PetFormModal';
import {
  DroppingFormModal,
  DroppingFormValues,
} from '../components/DroppingFormModal';
import { PetEventFormModal } from '../components/PetEventFormModal';
import { PetEventType } from '../../domain/entities/PetEvent';
import { SettingsScreen } from './SettingsScreen';
import { ThemeColors, useTheme } from '../context/ThemeContext';

type MetricsRangeDays = 7 | 30;

interface Props {
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<Props> = ({ onLogout }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    droppingRepository,
    recordDroppingUseCase,
    checkIntestinalHealthAlertUseCase,
    gpsService,
    savePetUseCase,
    authService,
    imagePickerAdapter,
    getClinicalMetricsUseCase,
    recordPetEventUseCase,
  } = useDependencies();
  const {
    pets,
    activePet: selectedPet,
    isLoading: isLoadingPets,
    isWalkInProgress,
    selectPet,
    refreshPets,
  } = useActivePet();

  const [history, setHistory] = useState<Dropping[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [clinicalMetrics, setClinicalMetrics] = useState<ClinicalMetrics | null>(
    null,
  );
  const [metricsRangeDays, setMetricsRangeDays] =
    useState<MetricsRangeDays>(30);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  const [isAddPetModalVisible, setIsAddPetModalVisible] = useState(false);
  const [isSavingNewPet, setIsSavingNewPet] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isDroppingModalVisible, setIsDroppingModalVisible] = useState(false);
  const [isSavingDropping, setIsSavingDropping] = useState(false);
  const [petEventModalType, setPetEventModalType] =
    useState<PetEventType | null>(null);
  const [isSavingPetEvent, setIsSavingPetEvent] = useState(false);

  const loadHistory = async (petId: string) => {
    setIsLoadingHistory(true);
    try {
      const droppings = await droppingRepository.findByPetId(petId);
      setHistory(droppings.reverse());
    } catch (error) {
      console.error('Error al cargar el historial clínico:', error);
      Alert.alert(
        'No se pudo cargar el historial',
        'Ocurrió un problema al leer la información guardada. Inténtalo de nuevo.',
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadMetrics = async (petId: string, days: MetricsRangeDays) => {
    setIsLoadingMetrics(true);
    try {
      const metrics = await getClinicalMetricsUseCase.execute(petId, days);
      setClinicalMetrics(metrics);
    } catch (error) {
      console.error('Error al cargar las métricas clínicas:', error);
      setClinicalMetrics(null);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (selectedPet) {
        loadHistory(selectedPet.id);
        loadMetrics(selectedPet.id, metricsRangeDays);
      } else {
        setHistory([]);
        setIsLoadingHistory(false);
        setClinicalMetrics(null);
        setIsLoadingMetrics(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPet?.id]),
  );

  const handleChangeMetricsRange = (days: MetricsRangeDays) => {
    setMetricsRangeDays(days);
    if (selectedPet) {
      loadMetrics(selectedPet.id, days);
    }
  };

  const handleSelectPet = async (pet: Pet) => {
    if (isWalkInProgress) {
      Alert.alert(
        'Paseo en curso',
        'Termina el paseo actual antes de cambiar de mascota activa.',
      );
      return;
    }

    try {
      await selectPet(pet);
      await loadHistory(pet.id);
    } catch (error) {
      console.error('Error al cambiar de mascota activa:', error);
      Alert.alert(
        'No se pudo cambiar de mascota',
        error instanceof Error
          ? error.message
          : 'Ocurrió un problema al guardar la mascota activa. Inténtalo de nuevo.',
      );
    }
  };

  const handlePickNewPetAvatar = async (): Promise<string | null> => {
    try {
      const uri = await imagePickerAdapter.pickImageFromGallery();
      if (!uri) {
        Alert.alert(
          'Permiso denegado',
          'Necesitamos permiso para acceder a tus fotos.',
        );
      }
      return uri;
    } catch (error) {
      console.error('Error al seleccionar la foto:', error);
      Alert.alert(
        'No se pudo seleccionar la foto',
        'Ocurrió un problema al abrir la galería. Inténtalo de nuevo.',
      );
      return null;
    }
  };

  const handleCreatePet = async (values: PetFormValues) => {
    setIsSavingNewPet(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        Alert.alert(
          'Sesión no iniciada',
          'Debes iniciar sesión para crear una mascota.',
        );
        return;
      }

      const newPet = await savePetUseCase.execute({
        userId: user.id,
        ...values,
      });

      setIsAddPetModalVisible(false);
      await refreshPets();

      if (isWalkInProgress) {
        Alert.alert(
          'Mascota creada',
          `${newPet.name} se activará automáticamente cuando termines el paseo en curso.`,
        );
      } else {
        await handleSelectPet(newPet);
      }
    } catch (error) {
      console.error('Error al crear la mascota:', error);
      Alert.alert(
        'No se pudo crear la mascota',
        'Ocurrió un problema al guardar la mascota. Inténtalo de nuevo.',
      );
    } finally {
      setIsSavingNewPet(false);
    }
  };

  const handleSaveDropping = async (values: DroppingFormValues) => {
    if (!selectedPet) return;

    setIsSavingDropping(true);
    try {
      // Registro "en casa", sin paseo asociado: la ubicación es un extra de
      // mejor esfuerzo y nunca debe bloquear ni impedir el guardado.
      const location = await gpsService
        .getCurrentLocation()
        .catch(() => null);

      await recordDroppingUseCase.execute({
        petId: selectedPet.id,
        latitude: location?.latitude,
        longitude: location?.longitude,
        consistency: values.consistency,
        color: values.colorHex,
      });

      setIsDroppingModalVisible(false);
      // El historial y las gráficas clínicas (tendencia semanal y
      // consistencia acumulada) leen de la misma fuente de deposiciones que
      // las registradas durante un paseo; refrescamos ambas para que la
      // deposición "en casa" se vea al instante, sin esperar a reabrir la
      // pantalla.
      await Promise.all([
        loadHistory(selectedPet.id),
        loadMetrics(selectedPet.id, metricsRangeDays),
      ]);
      Alert.alert('¡Registrado!', '💩 Deposición guardada con éxito.');

      checkIntestinalHealthAlertUseCase
        .execute(selectedPet.id, selectedPet.name)
        .catch((error) =>
          console.warn(
            'No se pudo comprobar la alerta de salud intestinal:',
            error,
          ),
        );
    } catch (error) {
      console.error('Error al registrar la deposición:', error);
      Alert.alert(
        'No se pudo registrar',
        'Ocurrió un problema al guardar la deposición. Inténtalo de nuevo.',
      );
    } finally {
      setIsSavingDropping(false);
    }
  };

  const handleSavePetEvent = async (notes?: string) => {
    if (!selectedPet || !petEventModalType) return;

    setIsSavingPetEvent(true);
    try {
      await recordPetEventUseCase.execute({
        petId: selectedPet.id,
        type: petEventModalType,
        notes,
      });

      const typeLabel =
        petEventModalType === 'feeding' ? 'Alimentación' : 'Medicamento';
      setPetEventModalType(null);
      Alert.alert('¡Registrado!', `${typeLabel} guardado con éxito.`);
    } catch (error) {
      console.error('Error al registrar el evento:', error);
      Alert.alert(
        'No se pudo registrar',
        'Ocurrió un problema al guardar el evento. Inténtalo de nuevo.',
      );
    } finally {
      setIsSavingPetEvent(false);
    }
  };

  const formatConsistency = (c?: string) => {
    switch (c) {
      case 'hard':
        return '🪨 Dura';
      case 'soft':
        return '🍦 Blanda';
      case 'diarrhea':
        return '🌊 Diarrea';
      default:
        return '👍 Normal';
    }
  };

  const hexToRgb = (hex: string) => {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex
        .split('')
        .map((char) => char + char)
        .join('');
    }
    const bigint = parseInt(cleanHex, 16);
    if (isNaN(bigint)) return { r: 109, g: 76, b: 65 };
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };

  const COLOR_MAP = [
    { name: 'Marrón', hex: '#6D4C41' },
    { name: 'Marrón claro', hex: '#A1887F' },
    { name: 'Marrón verdoso', hex: '#8D7736' },
    { name: 'Verde amarillento', hex: '#93A535' },
    { name: 'Amarillento', hex: '#FBC02D' },
    { name: 'Verdoso', hex: '#388E3C' },
    { name: 'Verde oscuro', hex: '#1B5E20' },
    { name: 'Oscuro / Negro', hex: '#212121' },
  ];

  const getColorLabel = (colorValue?: string) => {
    if (!colorValue) return 'Marrón';
    const targetRgb = hexToRgb(colorValue);
    let closestName = 'Marrón';
    let minDistance = Infinity;

    for (const ref of COLOR_MAP) {
      const refRgb = hexToRgb(ref.hex);
      const distance = Math.sqrt(
        Math.pow(targetRgb.r - refRgb.r, 2) +
          Math.pow(targetRgb.g - refRgb.g, 2) +
          Math.pow(targetRgb.b - refRgb.b, 2),
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestName = ref.name;
      }
    }
    return closestName;
  };

  const weeklyStats = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const counts: Record<PoopConsistency, number> = {
      normal: 0,
      soft: 0,
      hard: 0,
      diarrhea: 0,
    };
    let total = 0;

    for (const dropping of history) {
      if (new Date(dropping.timestamp).getTime() >= sevenDaysAgo) {
        total += 1;
        counts[dropping.consistency || 'normal'] += 1;
      }
    }

    return { total, counts };
  }, [history]);

  const CONSISTENCY_BADGES: {
    key: PoopConsistency;
    label: string;
    emoji: string;
  }[] = [
    { key: 'normal', label: 'Normal', emoji: '👍' },
    { key: 'soft', label: 'Blanda', emoji: '🍦' },
    { key: 'hard', label: 'Dura', emoji: '🪨' },
    { key: 'diarrhea', label: 'Diarrea', emoji: '🌊' },
  ];

  const handleShareVetReport = async () => {
    if (!selectedPet) return;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentHistory = history.filter(
      (d) => new Date(d.timestamp).getTime() >= thirtyDaysAgo,
    );

    const counts: Record<PoopConsistency, number> = {
      normal: 0,
      soft: 0,
      hard: 0,
      diarrhea: 0,
    };
    recentHistory.forEach((d) => {
      counts[d.consistency || 'normal'] += 1;
    });

    const anomalies = recentHistory.filter(
      (d) => d.consistency === 'diarrhea' || d.consistency === 'hard',
    );

    const lines = [
      `🐾 INFORME CLÍNICO - ${selectedPet.name}`,
      `${selectedPet.breed || 'Sin raza definida'} · ${
        selectedPet.age ? `${selectedPet.age} años` : 'Edad no descrita'
      }`,
      '',
      `Periodo: últimos 30 días`,
      `Total de deposiciones registradas: ${recentHistory.length}`,
      '',
      'Desglose por consistencia:',
      `  👍 Normal: ${counts.normal}`,
      `  🍦 Blanda: ${counts.soft}`,
      `  🪨 Dura: ${counts.hard}`,
      `  🌊 Diarrea: ${counts.diarrhea}`,
      '',
      `Registros anómalos (dura / diarrea): ${anomalies.length}`,
    ];

    if (anomalies.length > 0) {
      anomalies.forEach((d) => {
        lines.push(
          `  - ${new Date(d.timestamp).toLocaleDateString()} ${new Date(
            d.timestamp,
          ).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}: ${formatConsistency(d.consistency)} · Color: ${getColorLabel(
            d.color,
          )}`,
        );
      });
    }

    lines.push('', 'Generado con PetTracker 🐶');

    try {
      await Share.share({
        title: `Informe clínico de ${selectedPet.name}`,
        message: lines.join('\n'),
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el informe.');
    }
  };

  const showEmptyPetsState = !isLoadingPets && pets.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + 10 },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>🐾 PetTracker</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setIsSettingsVisible(true)}
        >
          <Text style={styles.settingsBtnText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {showEmptyPetsState ? (
        <EmptyPetsState onAddPet={() => setIsAddPetModalVisible(true)} />
      ) : (
        <>
          {/* Selector de Mascotas (Carrusel horizontal) */}
          <Text style={styles.sectionHeader}>
            Mis Mascotas
            {isWalkInProgress ? ' (bloqueado durante el paseo)' : ''}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.petList}
          >
            {pets.map((pet) => {
              const isSelected = selectedPet?.id === pet.id;
              return (
                <TouchableOpacity
                  key={pet.id}
                  style={[
                    styles.petChip,
                    isSelected && styles.petChipSelected,
                    isWalkInProgress && styles.petChipDisabled,
                  ]}
                  onPress={() => handleSelectPet(pet)}
                  disabled={isWalkInProgress}
                >
                  {pet.avatarUri ? (
                    <Image
                      source={{ uri: pet.avatarUri }}
                      style={styles.chipAvatar}
                    />
                  ) : (
                    <Text style={styles.chipEmoji}>🐶</Text>
                  )}
                  <Text
                    style={[
                      styles.chipName,
                      isSelected && styles.chipNameSelected,
                    ]}
                  >
                    {pet.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.addPetBtn}
              onPress={() => setIsAddPetModalVisible(true)}
            >
              <Text style={styles.addPetText}>+ Añadir</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Tarjeta de la Mascota Seleccionada */}
          {selectedPet && (
            <View style={styles.profileCard}>
              <View style={styles.avatarWrapper}>
                {selectedPet.avatarUri ? (
                  <Image
                    source={{ uri: selectedPet.avatarUri }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarEmoji}>🐶</Text>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.petName}>{selectedPet.name}</Text>
                <Text style={styles.petSubText}>
                  {selectedPet.breed || 'Sin raza definida'} ·{' '}
                  {selectedPet.age
                    ? `${selectedPet.age} años`
                    : 'Edad no descrita'}
                </Text>
              </View>
            </View>
          )}

          {/* Registro rápido de eventos "en casa", sin paseo activo */}
          {selectedPet && (
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => setIsDroppingModalVisible(true)}
              >
                <Text style={styles.quickActionBtnText}>💩 Caca</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => setPetEventModalType('feeding')}
              >
                <Text style={styles.quickActionBtnText}>🍖 Comida</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => setPetEventModalType('medication')}
              >
                <Text style={styles.quickActionBtnText}>💊 Medicina</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dashboard de Salud Semanal */}
          {selectedPet && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>
                📊 Resumen de los últimos 7 días
              </Text>
              <Text style={styles.statsTotal}>
                {weeklyStats.total} deposición(es) esta semana
              </Text>
              <View style={styles.statsRow}>
                {CONSISTENCY_BADGES.map((badge) => (
                  <View key={badge.key} style={styles.statBadge}>
                    <Text style={styles.statBadgeEmoji}>{badge.emoji}</Text>
                    <Text style={styles.statBadgeCount}>
                      {weeklyStats.counts[badge.key]}
                    </Text>
                    <Text style={styles.statBadgeLabel}>{badge.label}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.shareReportBtn}
                onPress={handleShareVetReport}
              >
                <Text style={styles.shareReportText}>
                  📤 Compartir Informe Veterinario
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Gráficas Clínicas Avanzadas */}
          {selectedPet && (
            <View style={styles.statsCard}>
              <View style={styles.metricsHeaderRow}>
                <Text style={styles.statsTitle}>📈 Gráficas Clínicas</Text>
                <View style={styles.rangeSelector}>
                  {([7, 30] as MetricsRangeDays[]).map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.rangeChip,
                        metricsRangeDays === days && styles.rangeChipSelected,
                      ]}
                      onPress={() => handleChangeMetricsRange(days)}
                    >
                      <Text
                        style={[
                          styles.rangeChipText,
                          metricsRangeDays === days &&
                            styles.rangeChipTextSelected,
                        ]}
                      >
                        {days}d
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {isLoadingMetrics ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                </View>
              ) : (
                <ClinicalMetricsChart metrics={clinicalMetrics} />
              )}
            </View>
          )}

          {/* Historial Clínico de la Mascota Seleccionada */}
          <Text style={styles.historyTitle}>
            📋 Historial Clínico de {selectedPet?.name || ''} ({history.length})
          </Text>

          {isLoadingPets || isLoadingHistory ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.emptyStateText}>Cargando historial...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🐾</Text>
              <Text style={styles.emptyStateText}>
                Aún no hay deposiciones registradas
                {selectedPet ? ` para ${selectedPet.name}` : ''}.
              </Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              style={styles.list}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const colorHex = item.color || '#6D4C41';
                const colorLabel = getColorLabel(item.color);

                return (
                  <View style={styles.historyItem}>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemDate}>
                        📅 {new Date(item.timestamp).toLocaleDateString()} -{' '}
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>

                      <View style={styles.detailsRow}>
                        <Text style={styles.detailsText}>
                          Estado: {formatConsistency(item.consistency)} |
                          Color: {colorLabel}
                        </Text>
                        <View
                          style={[
                            styles.colorBox,
                            { backgroundColor: colorHex },
                          ]}
                        />
                      </View>

                      <Text style={styles.coordsText}>
                        {item.location
                          ? `📍 GPS: ${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
                          : 'Sin ubicación GPS'}
                      </Text>
                    </View>
                    <Text style={styles.poopBadge}>💩</Text>
                  </View>
                );
              }}
            />
          )}
        </>
      )}

      {/* Modal para Crear Nueva Mascota */}
      <PetFormModal
        visible={isAddPetModalVisible}
        title="🐶 Nueva Mascota"
        submitLabel="Guardar"
        isSubmitting={isSavingNewPet}
        onClose={() => setIsAddPetModalVisible(false)}
        onPickAvatar={handlePickNewPetAvatar}
        onSubmit={handleCreatePet}
      />

      <DroppingFormModal
        visible={isDroppingModalVisible}
        isSubmitting={isSavingDropping}
        onClose={() => setIsDroppingModalVisible(false)}
        onSubmit={handleSaveDropping}
      />

      <PetEventFormModal
        visible={petEventModalType !== null}
        title={
          petEventModalType === 'feeding'
            ? '🍖 Registrar Alimentación'
            : '💊 Registrar Medicamento'
        }
        notesPlaceholder={
          petEventModalType === 'feeding'
            ? 'Notas (ej. ración, hora)'
            : 'Notas (ej. nombre del medicamento, dosis)'
        }
        isSubmitting={isSavingPetEvent}
        onClose={() => setPetEventModalType(null)}
        onSubmit={handleSavePetEvent}
      />

      <SettingsScreen
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        onLogout={() => {
          setIsSettingsVisible(false);
          onLogout?.();
        }}
      />
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    scrollContent: { flexGrow: 1, paddingBottom: 30 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    settingsBtn: {
      padding: 6,
    },
    settingsBtnText: { fontSize: 22 },
    sectionHeader: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.textMuted,
      marginBottom: 8,
    },
    petList: { maxHeight: 60, marginBottom: 15 },
    petChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    petChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    petChipDisabled: {
      opacity: 0.4,
    },
    chipAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
    chipEmoji: { fontSize: 16, marginRight: 6 },
    chipName: { fontSize: 14, color: colors.text, fontWeight: '500' },
    chipNameSelected: { color: colors.white, fontWeight: 'bold' },
    addPetBtn: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    addPetText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 15,
      elevation: 2,
    },
    avatarWrapper: { marginRight: 15 },
    avatarImage: { width: 56, height: 56, borderRadius: 28 },
    avatarEmoji: { fontSize: 40 },
    profileInfo: { flex: 1, justifyContent: 'center' },
    quickActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    quickActionBtn: {
      flex: 1,
      backgroundColor: '#795548',
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    quickActionBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 12 },
    petName: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    petSubText: { fontSize: 14, color: colors.textMuted },
    statsCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 15,
      elevation: 2,
    },
    statsTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    statsTotal: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statBadge: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingVertical: 10,
      marginHorizontal: 4,
    },
    statBadgeEmoji: { fontSize: 20 },
    statBadgeCount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 2,
    },
    statBadgeLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    metricsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    rangeSelector: { flexDirection: 'row' },
    rangeChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginLeft: 6,
    },
    rangeChipSelected: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
    rangeChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    rangeChipTextSelected: { color: colors.white },
    shareReportBtn: {
      backgroundColor: '#1976D2',
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 14,
    },
    shareReportText: { color: colors.white, fontWeight: 'bold', fontSize: 13 },
    historyTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    list: { width: '100%' },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyStateEmoji: { fontSize: 36, marginBottom: 8 },
    emptyStateText: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: 'center',
    },
    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: 14,
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemContent: { flex: 1, paddingRight: 10 },
    itemDate: { fontSize: 14, fontWeight: '600', color: colors.text },
    detailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 4,
    },
    detailsText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    colorBox: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginLeft: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    coordsText: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    poopBadge: { fontSize: 22, marginLeft: 4 },
  });
