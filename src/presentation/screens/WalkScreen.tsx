import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../../infrastructure/i18n';
import { MapViewComponent } from '../components/MapViewComponent';
import { ColorGradientPicker } from '../components/ColorGradientPicker';
import { HeatmapView } from '../components/HeatmapView';
import { Location } from '../../domain/value-objects/Location';
import { Walk } from '../../domain/entities/Walk';
import { DroppingHeatPoint } from '../../application/use-cases/GetPetDroppingLocationsUseCase';
import { useDependencies } from '../context/DependencyContext';
import { useActivePet } from '../context/ActivePetContext';
import { PoopConsistency } from '../../domain/entities/Dropping';

type HeatmapRangeDays = 7 | 30;

export const WalkScreen = () => {
  const insets = useSafeAreaInsets();
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

  // Evita repetir la comprobación de paseo huérfano para la misma mascota
  const checkedOrphanForPetIdRef = useRef<string | null>(null);

  // Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedConsistency, setSelectedConsistency] =
    useState<PoopConsistency>('normal');
  const [selectedColorHex, setSelectedColorHex] = useState<string>('#6D4C41');

  // Mapa de calor
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
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

    Alert.alert(
      'Paseo sin finalizar',
      `Se encontró un paseo de ${activePet?.name || 'tu mascota'} iniciado el ` +
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
    try {
      const pet = await ensureActivePet();

      const hasPermission = await gpsService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permiso denegado', 'Se requiere acceso al GPS.');
        return;
      }

      const walk = await startWalkUseCase.execute(pet.id);

      const initialLoc = await gpsService.getCurrentLocation();
      const initialRoute = initialLoc ? [initialLoc] : [];
      if (initialLoc) {
        setCurrentLocation(initialLoc);
      }
      setRoute(initialRoute);
      setPoopLocations([]);
      setActiveWalkId(walk.id);
      setWalkInProgress(true);
      setIsWalking(true);
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
    setIsModalVisible(true);
  };

  const loadHeatmap = async (days: HeatmapRangeDays) => {
    setIsLoadingHeatmap(true);
    try {
      const pet = await ensureActivePet();
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

  const handleOpenHeatmap = () => {
    setIsHeatmapVisible(true);
    loadHeatmap(heatmapRangeDays);
  };

  const handleChangeHeatmapRange = (days: HeatmapRangeDays) => {
    setHeatmapRangeDays(days);
    loadHeatmap(days);
  };

  const handleSavePoop = async () => {
    try {
      const locToUse =
        currentLocation || (await gpsService.getCurrentLocation());

      // La mascota activa es la misma que se gestiona en el Perfil
      const pet = await ensureActivePet();

      await recordDroppingUseCase.execute({
        petId: pet.id,
        walkId: activeWalkId || undefined,
        latitude: locToUse?.latitude,
        longitude: locToUse?.longitude,
        consistency: selectedConsistency,
        color: selectedColorHex,
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
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.title}>{i18n.t('welcome')}</Text>

      <View style={styles.activePetBanner}>
        {activePet?.avatarUri ? (
          <Image
            source={{ uri: activePet.avatarUri }}
            style={styles.activePetAvatar}
          />
        ) : (
          <Text style={styles.activePetEmoji}>🐶</Text>
        )}
        <Text style={styles.activePetText}>
          {isLoadingPet
            ? 'Cargando mascota activa...'
            : activePet
              ? `Paseando con ${activePet.name}${isWalking ? ' 🔒' : ''}`
              : 'Sin mascota activa'}
        </Text>
      </View>

      <MapViewComponent
        currentLocation={currentLocation}
        route={route}
        poopLocations={poopLocations}
      />

      <TouchableOpacity style={styles.heatmapBtn} onPress={handleOpenHeatmap}>
        <Text style={styles.heatmapBtnText}>🔥 Mapa de calor</Text>
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

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💩 Registrar Deposición</Text>

            <Text style={styles.label}>Consistencia / Estado:</Text>
            <View style={styles.optionsRow}>
              {[
                { key: 'hard', label: '🪨 Dura' },
                { key: 'normal', label: '👍 Normal' },
                { key: 'soft', label: '🍦 Blanda' },
                { key: 'diarrhea', label: '🌊 Diarrea' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.chip,
                    selectedConsistency === item.key && styles.chipSelected,
                  ]}
                  onPress={() =>
                    setSelectedConsistency(item.key as PoopConsistency)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedConsistency === item.key &&
                        styles.chipTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tono / Color Fecal:</Text>
            <ColorGradientPicker
              selectedHexColor={selectedColorHex}
              onColorChange={(hex) => setSelectedColorHex(hex)}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePoop}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isHeatmapVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHeatmapVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              🔥 Mapa de calor de deposiciones
            </Text>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#333',
  },
  activePetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 8,
    elevation: 2,
  },
  activePetAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  activePetEmoji: { fontSize: 18, marginRight: 8 },
  activePetText: { fontSize: 13, fontWeight: '600', color: '#333' },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 3,
  },
  startBtn: { backgroundColor: '#4CAF50', marginTop: 20 },
  endBtn: { backgroundColor: '#F44336', marginTop: 15 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  controls: { alignItems: 'center', width: '100%' },
  poopBtn: {
    backgroundColor: '#795548',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    elevation: 4,
    marginTop: 10,
  },
  poopText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  heatmapBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 4,
  },
  heatmapBtnText: { color: '#F44336', fontWeight: 'bold', fontSize: 13 },
  heatmapLoading: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapLoadingText: { marginTop: 8, fontSize: 13, color: '#666' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    color: '#555',
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
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipSelected: { backgroundColor: '#795548', borderColor: '#795548' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextSelected: { color: '#fff', fontWeight: 'bold' },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  cancelBtn: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eee',
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelText: { color: '#666', fontWeight: 'bold' },
  saveBtn: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    flex: 1,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: 'bold' },
});
