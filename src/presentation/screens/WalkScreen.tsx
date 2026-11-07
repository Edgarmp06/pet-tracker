import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../infrastructure/i18n';
import { ExpoGpsAdapter } from '../../infrastructure/adapters/ExpoGpsAdapter';
import { MapViewComponent } from '../components/MapViewComponent';
import { ColorGradientPicker } from '../components/ColorGradientPicker';
import { Location } from '../../domain/value-objects/Location';
import { useDependencies } from '../context/DependencyContext';
import { PoopConsistency } from '../../domain/entities/Dropping';
import { MockAuthAdapter } from '../../infrastructure/adapters/MockAuthAdapter';

const gpsService = new ExpoGpsAdapter();
const authService = new MockAuthAdapter();
const ACTIVE_PET_KEY = '@pet_tracker_active_pet_id';

export const WalkScreen = () => {
  const insets = useSafeAreaInsets();
  const { recordDroppingUseCase, getPetsUseCase, savePetUseCase } =
    useDependencies();
  const [isWalking, setIsWalking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [route, setRoute] = useState<Location[]>([]);
  const [poopLocations, setPoopLocations] = useState<Location[]>([]);

  // Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedConsistency, setSelectedConsistency] =
    useState<PoopConsistency>('normal');
  const [selectedColorHex, setSelectedColorHex] = useState<string>('#6D4C41');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isWalking) {
      interval = setInterval(async () => {
        const loc = await gpsService.getCurrentLocation();
        if (loc) {
          setCurrentLocation(loc);
          setRoute((prev) => [...prev, loc]);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isWalking]);

  const handleStartWalk = async () => {
    const hasPermission = await gpsService.requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permiso denegado', 'Se requiere acceso al GPS.');
      return;
    }
    const initialLoc = await gpsService.getCurrentLocation();
    if (initialLoc) {
      setCurrentLocation(initialLoc);
      setRoute([initialLoc]);
    }
    setPoopLocations([]);
    setIsWalking(true);
  };

  const handleEndWalk = () => {
    setIsWalking(false);
    Alert.alert(
      'Paseo Guardado',
      `Paseo finalizado con ${poopLocations.length} deposición(es) registrada(s).`,
    );
  };

  const handleOpenPoopModal = () => {
    setIsModalVisible(true);
  };

  const handleSavePoop = async () => {
    setIsModalVisible(false);

    const locToUse = currentLocation || (await gpsService.getCurrentLocation());

    // Obtener la mascota activa elegida por el usuario
    let activePetId = await AsyncStorage.getItem(ACTIVE_PET_KEY);

    if (!activePetId) {
      // Si no hay id activa guardada, obtenemos la primera existente del usuario autenticado
      const user = await authService.getCurrentUser();
      if (!user) {
        Alert.alert('Sesión no iniciada', 'Debes iniciar sesión para registrar una deposición.');
        return;
      }

      const pets = await getPetsUseCase.execute(user.id);
      if (pets.length > 0) {
        activePetId = pets[0].id;
      } else {
        const defaultPet = await savePetUseCase.execute({
          userId: user.id,
          name: 'Max',
        });
        activePetId = defaultPet.id;
      }
      await AsyncStorage.setItem(ACTIVE_PET_KEY, activePetId);
    }

    await recordDroppingUseCase.execute({
      petId: activePetId,
      latitude: locToUse?.latitude,
      longitude: locToUse?.longitude,
      consistency: selectedConsistency,
      color: selectedColorHex,
    });

    if (locToUse) {
      setPoopLocations((prev) => [...prev, locToUse]);
    }

    Alert.alert('¡Registrado!', `💩 Deposición guardada con éxito.`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.title}>{i18n.t('welcome')}</Text>

      <MapViewComponent
        currentLocation={currentLocation}
        route={route}
        poopLocations={poopLocations}
      />

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
