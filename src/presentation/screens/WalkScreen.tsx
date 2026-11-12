import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../infrastructure/i18n';
import { MapViewComponent } from '../components/MapViewComponent';
import { HeatmapView } from '../components/HeatmapView';
import {
  DroppingFormModal,
  DroppingFormValues,
} from '../components/DroppingFormModal';
import { PetSelectorModal } from '../components/PetSelectorModal';
import { Location } from '../../domain/value-objects/Location';
import { Walk } from '../../domain/entities/Walk';
import { Pet } from '../../domain/entities/Pet';
import { DroppingHeatPoint } from '../../application/use-cases/GetPetDroppingLocationsUseCase';
import { useDependencies } from '../context/DependencyContext';
import { useActivePet } from '../context/ActivePetContext';
import { ThemeColors, useTheme } from '../context/ThemeContext';
type HeatmapRangeDays = 7 | 30;

export const WalkScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    recordDroppingUseCase,
    gpsService,
    startWalkUseCase,
    endWalkUseCase,
    getActiveWalkUseCase,
    checkIntestinalHealthAlertUseCase,
    getPetDroppingLocationsUseCase,
  } = useDependencies();
  const {
    pets,
    activePet,
    isLoading: isLoadingPet,
    ensureActivePet,
    setWalkInProgress,
  } = useActivePet();
  const [isWalking, setIsWalking] = useState(false);
  const [activeWalkId, setActiveWalkId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [route, setRoute] = useState<Location[]>([]);
  const [poopLocations, setPoopLocations] = useState<Location[]>([]);

  // Mascotas que participan en el paseo actual (una o varias, paseo conjunto)
  const [participatingPets, setParticipatingPets] = useState<Pet[]>([]);
  const [isPetSelectorVisible, setIsPetSelectorVisible] = useState(false);
  const [isWhoDidItVisible, setIsWhoDidItVisible] = useState(false);
  const [pendingEventPet, setPendingEventPet] = useState<Pet | null>(null);

  // Evita repetir la comprobación de paseo huérfano para la misma mascota
  const checkedOrphanForPetIdRef = useRef<string | null>(null);

  // Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSavingPoop, setIsSavingPoop] = useState(false);

  // Mapa de calor
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
  const [isHeatmapPetSelectorVisible, setIsHeatmapPetSelectorVisible] =
    useState(false);
  const [heatmapPet, setHeatmapPet] = useState<Pet | null>(null);
  const [heatmapRangeDays, setHeatmapRangeDays] = useState<HeatmapRangeDays>(30);
  const [heatmapPoints, setHeatmapPoints] = useState<DroppingHeatPoint[]>([]);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isWalking) {
      interval = setInterval(async () => {
        try {
          const loc = await gpsService.getCurrentLocation();
          if (loc) {
            setCurrentLocation(loc);
            setRoute((prev) => [...prev, loc]);
          }
        } catch (error) {
          console.error('Error al actualizar la ubicación GPS:', error);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isWalking, gpsService]);

  // Detecta un paseo que quedó "activo" en el almacenamiento porque la app
  // se cerró antes de llamar a handleEndWalk (p.ej. la mataron a mitad de
  // un paseo). Solo se comprueba una vez por mascota y nunca si ya estamos
  // paseando en esta misma sesión.
  useEffect(() => {
    if (isLoadingPet || !activePet || isWalking) return;
    if (checkedOrphanForPetIdRef.current === activePet.id) return;
    checkedOrphanForPetIdRef.current = activePet.id;

    (async () => {
      try {
        const orphanWalk = await getActiveWalkUseCase.execute(activePet.id);
        if (orphanWalk) {
          handleOrphanWalk(orphanWalk);
        }
      } catch (error) {
        console.error('Error al comprobar paseos sin finalizar:', error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePet?.id, isLoadingPet, isWalking]);

  const handleOrphanWalk = (walk: Walk) => {
    // Bloqueamos el cambio de mascota de inmediato, antes de que el usuario
    // decida qué hacer con el paseo huérfano.
    setActiveWalkId(walk.id);
    setWalkInProgress(true);

    const orphanPets = pets.filter((pet) => walk.petIds.includes(pet.id));
    setParticipatingPets(
      orphanPets.length > 0 ? orphanPets : activePet ? [activePet] : [],
    );

    const petNames =
      orphanPets.map((pet) => pet.name).join(' y ') ||
      activePet?.name ||
      'tu mascota';

    Alert.alert(
      'Paseo sin finalizar',
      `Se encontró un paseo de ${petNames} iniciado el ` +
        `${walk.startTime.toLocaleDateString()} a las ${walk.startTime.toLocaleTimeString(
          [],
          { hour: '2-digit', minute: '2-digit' },
        )} que no se cerró correctamente (la app se cerró a mitad del paseo). ` +
        '¿Qué quieres hacer?',
      [
        {
          text: 'Cerrar paseo',
          style: 'destructive',
          onPress: () => closeOrphanWalk(walk.id),
        },
        {
          text: 'Continuar paseo',
          onPress: () => resumeOrphanWalk(),
        },
      ],
      { cancelable: false },
    );
  };

  const resumeOrphanWalk = () => {
    // No se pudo recuperar la ruta GPS previa (nunca se persiste hasta el
    // final), así que continuamos registrando desde ahora mismo con el
    // mismo walkId; la duración total seguirá contándose desde el inicio
    // real del paseo.
    setCurrentLocation(null);
    setRoute([]);
    setPoopLocations([]);
    setIsWalking(true);
  };

  const closeOrphanWalk = async (walkId: string) => {
    try {
      const walk = await endWalkUseCase.execute({ walkId, route: [] });

      setActiveWalkId(null);
      setWalkInProgress(false);

      const durationMin = walk.durationMs
        ? Math.round(walk.durationMs / 60000)
        : 0;

      Alert.alert(
        'Paseo cerrado',
        `El paseo pendiente se cerró automáticamente (duración estimada: ${durationMin} min). ` +
          'No se pudo recuperar la ruta GPS de ese paseo.',
      );
    } catch (error) {
      console.error('Error al cerrar el paseo huérfano:', error);
      // No lo dejamos bloqueado sin salida: lo tratamos como un paseo en
      // curso para que el usuario pueda reintentar con el botón de
      // "Finalizar Paseo" habitual.
      resumeOrphanWalk();
      Alert.alert(
        'No se pudo cerrar el paseo',
        'Ocurrió un problema al cerrar el paseo pendiente. Puedes intentar finalizarlo con el botón de abajo.',
      );
    }
  };

  const handleStartWalk = async () => {
    if (pets.length === 0) {
      Alert.alert(
        'Sin mascotas',
        'Añade al menos una mascota desde tu perfil antes de iniciar un paseo.',
      );
      return;
    }

    // Los gatos marcados como "no sale de paseo" no participan en el flujo
    // de paseo: su comida, medicina y deposiciones en casa se registran
    // desde su perfil (pestaña Perfil), no desde aquí.
    const walkingPets = pets.filter((pet) => pet.goesOnWalks);

    if (walkingPets.length === 0) {
      Alert.alert(
        'Ninguna mascota sale de paseo',
        'Tus mascotas actuales están marcadas como que no salen de paseo. ' +
          'Puedes registrar su comida, medicina y deposiciones en casa desde su perfil.',
      );
      return;
    }

    if (walkingPets.length === 1) {
      await startWalkWithPets(walkingPets);
      return;
    }

    setIsPetSelectorVisible(true);
  };

  const startWalkWithPets = async (selectedPets: Pet[]) => {
    if (selectedPets.length === 0) return;

    try {
      const hasPermission = await gpsService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permiso denegado', 'Se requiere acceso al GPS.');
        return;
      }

      const walk = await startWalkUseCase.execute(
        selectedPets.map((pet) => pet.id),
      );

      // Marcamos el paseo como iniciado de inmediato: no esperamos a que
      // llegue el primer fix de GPS (puede tardar varios segundos en frío y
      // dejaría el botón "Iniciar Paseo" pareciendo congelado). La ubicación
      // inicial llega en segundo plano y actualiza el mapa cuando esté lista.
      setRoute([]);
      setCurrentLocation(null);
      setPoopLocations([]);
      setParticipatingPets(selectedPets);
      setActiveWalkId(walk.id);
      setWalkInProgress(true);
      setIsWalking(true);

      gpsService
        .getCurrentLocation()
        .then((initialLoc) => {
          if (!initialLoc) return;
          setCurrentLocation(initialLoc);
          setRoute((prev) => (prev.length === 0 ? [initialLoc] : prev));
        })
        .catch((error) =>
          console.error('Error al obtener la ubicación inicial:', error),
        );
    } catch (error) {
      console.error('Error al iniciar el paseo:', error);
      Alert.alert(
        'No se pudo iniciar el paseo',
        error instanceof Error
          ? error.message
          : 'Ocurrió un problema al acceder al GPS. Inténtalo de nuevo.',
      );
    }
  };

  const handleEndWalk = async () => {
    if (!activeWalkId) {
      setIsWalking(false);
      setWalkInProgress(false);
      return;
    }

    try {
      const walk = await endWalkUseCase.execute({
        walkId: activeWalkId,
        route,
      });

      setIsWalking(false);
      setWalkInProgress(false);
      setActiveWalkId(null);
      setParticipatingPets([]);

      const distanceKm = (walk.distanceMeters / 1000).toFixed(2);
      const durationMin = walk.durationMs
        ? Math.round(walk.durationMs / 60000)
        : 0;

      Alert.alert(
        'Paseo Guardado',
        `Paseo finalizado con ${poopLocations.length} deposición(es), ` +
          `${distanceKm} km recorridos en ${durationMin} min.`,
      );
    } catch (error) {
      console.error('Error al finalizar el paseo:', error);
      Alert.alert(
        'No se pudo guardar el paseo',
        'Ocurrió un problema al guardar el paseo. Puedes intentarlo de nuevo.',
      );
    }
  };

  const handleOpenPoopModal = () => {
    if (participatingPets.length > 1) {
      setIsWhoDidItVisible(true);
      return;
    }

    setPendingEventPet(participatingPets[0] || activePet || null);
    setIsModalVisible(true);
  };

  const handleWhoDidItConfirm = (selectedPets: Pet[]) => {
    setIsWhoDidItVisible(false);
    setPendingEventPet(selectedPets[0] || null);
    setIsModalVisible(true);
  };

  const loadHeatmap = async (pet: Pet, days: HeatmapRangeDays) => {
    setIsLoadingHeatmap(true);
    try {
      const points = await getPetDroppingLocationsUseCase.execute(pet.id, days);
      setHeatmapPoints(points);
    } catch (error) {
      console.error('Error al cargar el mapa de calor:', error);
      Alert.alert(
        'No se pudo cargar el mapa de calor',
        'Ocurrió un problema al leer las ubicaciones registradas. Inténtalo de nuevo.',
      );
    } finally {
      setIsLoadingHeatmap(false);
    }
  };

  const openHeatmapForPet = (pet: Pet) => {
    setHeatmapPet(pet);
    setIsHeatmapVisible(true);
    loadHeatmap(pet, heatmapRangeDays);
  };

  const handleOpenHeatmap = async () => {
    // Paseo conjunto con varias mascotas: no asumimos cuál, lo preguntamos
    // (igual que "¿Quién lo hizo?"), en vez de mostrar siempre los datos de
    // la mascota "activa" del perfil aunque no sea una de las que pasean.
    if (participatingPets.length > 1) {
      setIsHeatmapPetSelectorVisible(true);
      return;
    }

    try {
      const pet = participatingPets[0] || (await ensureActivePet());
      openHeatmapForPet(pet);
    } catch (error) {
      console.error('Error al determinar la mascota del mapa de calor:', error);
      Alert.alert(
        'No se pudo abrir el mapa de calor',
        'Ocurrió un problema al identificar la mascota. Inténtalo de nuevo.',
      );
    }
  };

  const handleHeatmapPetSelected = (selectedPets: Pet[]) => {
    setIsHeatmapPetSelectorVisible(false);
    const pet = selectedPets[0];
    if (pet) openHeatmapForPet(pet);
  };

  const handleChangeHeatmapRange = (days: HeatmapRangeDays) => {
    setHeatmapRangeDays(days);
    if (heatmapPet) loadHeatmap(heatmapPet, days);
  };

  const handleSavePoop = async (values: DroppingFormValues) => {
    setIsSavingPoop(true);
    try {
      const locToUse =
        currentLocation || (await gpsService.getCurrentLocation());

      // Durante un paseo conjunto, `pendingEventPet` es la mascota elegida
      // en el selector "¿Quién lo hizo?"; fuera de eso, cae de vuelta a la
      // mascota activa del Perfil.
      const pet = pendingEventPet || (await ensureActivePet());

      await recordDroppingUseCase.execute({
        petId: pet.id,
        walkId: activeWalkId || undefined,
        latitude: locToUse?.latitude,
        longitude: locToUse?.longitude,
        consistency: values.consistency,
        color: values.colorHex,
      });

      if (locToUse) {
        setPoopLocations((prev) => [...prev, locToUse]);
      }

      setIsModalVisible(false);
      Alert.alert('¡Registrado!', `💩 Deposición guardada con éxito.`);

      // Alerta clínica automática: no debe impedir que el registro se haya
      // guardado si falla (p.ej. sin permiso de notificaciones).
      checkIntestinalHealthAlertUseCase
        .execute(pet.id, pet.name)
        .catch((error) =>
          console.warn('No se pudo comprobar la alerta de salud intestinal:', error),
        );
    } catch (error) {
      console.error('Error al registrar la deposición:', error);
      Alert.alert(
        'No se pudo registrar',
        'Ocurrió un problema al guardar la deposición. Inténtalo de nuevo.',
      );
    } finally {
      setIsSavingPoop(false);
      setPendingEventPet(null);
    }
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 },
        ]}
      >
      <Text style={styles.title}>{i18n.t('welcome')}</Text>

      <View style={styles.activePetBanner}>
        {activePet?.avatarUri ? (
          <Image
            source={{ uri: activePet.avatarUri }}
            style={styles.activePetAvatar}
          />
        ) : (
          <Ionicons name="paw" size={18} color={colors.textMuted} />
        )}
        <Text style={styles.activePetText}>
          {isLoadingPet
            ? 'Cargando mascota activa...'
            : isWalking && participatingPets.length > 0
              ? `Paseando con ${participatingPets.map((pet) => pet.name).join(' y ')}`
              : activePet
                ? `Paseando con ${activePet.name}`
                : 'Sin mascota activa'}
        </Text>
        {isWalking && participatingPets.length > 0 && (
          <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
        )}
      </View>

      <MapViewComponent
        currentLocation={currentLocation}
        route={route}
        poopLocations={poopLocations}
      />

      <TouchableOpacity style={styles.heatmapBtn} onPress={handleOpenHeatmap}>
        <Ionicons name="flame-outline" size={14} color={colors.danger} />
        <Text style={styles.heatmapBtnText}>Mapa de calor</Text>
      </TouchableOpacity>

      {!isWalking ? (
        <TouchableOpacity
          style={[styles.button, styles.startBtn]}
          onPress={handleStartWalk}
        >
          <Text style={styles.buttonText}>{i18n.t('start_walk')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.poopBtn}
            onPress={handleOpenPoopModal}
          >
            <Text style={styles.poopText}>💩 {i18n.t('poop')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.endBtn]}
            onPress={handleEndWalk}
          >
            <Text style={styles.buttonText}>{i18n.t('end_walk')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <DroppingFormModal
        visible={isModalVisible}
        isSubmitting={isSavingPoop}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleSavePoop}
      />

      <PetSelectorModal
        visible={isPetSelectorVisible}
        title="¿Con qué mascotas vas a pasear?"
        pets={pets.filter((pet) => pet.goesOnWalks)}
        multiSelect
        initialSelectedIds={activePet ? [activePet.id] : []}
        confirmLabel="Empezar paseo"
        onClose={() => setIsPetSelectorVisible(false)}
        onConfirm={(selectedPets) => {
          setIsPetSelectorVisible(false);
          startWalkWithPets(selectedPets);
        }}
      />

      <PetSelectorModal
        visible={isWhoDidItVisible}
        title="¿Quién lo hizo?"
        pets={participatingPets}
        multiSelect={false}
        onClose={() => setIsWhoDidItVisible(false)}
        onConfirm={handleWhoDidItConfirm}
      />

      <PetSelectorModal
        visible={isHeatmapPetSelectorVisible}
        title="¿De qué mascota quieres ver el mapa de calor?"
        pets={participatingPets}
        multiSelect={false}
        confirmLabel="Ver mapa de calor"
        onClose={() => setIsHeatmapPetSelectorVisible(false)}
        onConfirm={handleHeatmapPetSelected}
      />

      <Modal
        visible={isHeatmapVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHeatmapVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="flame-outline" size={18} color={colors.text} />
              <Text style={styles.modalTitle}>
                Mapa de calor{heatmapPet ? ` — ${heatmapPet.name}` : ''}
              </Text>
            </View>

            <View style={styles.optionsRow}>
              {([7, 30] as HeatmapRangeDays[]).map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.chip,
                    heatmapRangeDays === days && styles.chipSelected,
                  ]}
                  onPress={() => handleChangeHeatmapRange(days)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      heatmapRangeDays === days && styles.chipTextSelected,
                    ]}
                  >
                    Últimos {days} días
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isLoadingHeatmap ? (
              <View style={styles.heatmapLoading}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.heatmapLoadingText}>Cargando...</Text>
              </View>
            ) : (
              <HeatmapView points={heatmapPoints} />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => setIsHeatmapVisible(false)}
              >
                <Text style={styles.saveText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingBottom: 20,
      alignItems: 'center',
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      marginVertical: 10,
      color: colors.text,
    },
    activePetBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      marginBottom: 8,
      elevation: 2,
    },
    activePetAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
    activePetText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 8,
      marginRight: 6,
      flexShrink: 1,
    },
    button: {
      paddingVertical: 14,
      paddingHorizontal: 30,
      borderRadius: 8,
      elevation: 3,
    },
    startBtn: { backgroundColor: colors.primary, marginTop: 20 },
    endBtn: { backgroundColor: colors.danger, marginTop: 15 },
    buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
    controls: { alignItems: 'center', width: '100%' },
    poopBtn: {
      backgroundColor: '#795548',
      paddingVertical: 16,
      paddingHorizontal: 40,
      borderRadius: 12,
      elevation: 4,
      marginTop: 10,
    },
    poopText: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
    heatmapBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.danger,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginBottom: 4,
    },
    heatmapBtnText: { color: colors.danger, fontWeight: 'bold', fontSize: 13 },
    heatmapLoading: {
      height: 320,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heatmapLoadingText: { marginTop: 8, fontSize: 13, color: colors.textMuted },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      elevation: 5,
    },
    modalTitleRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginBottom: 15,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
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
    modalButtons: {
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
    saveText: { color: colors.white, fontWeight: 'bold' },
  });
