import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../../infrastructure/i18n';
import { MapViewComponent } from '../components/MapViewComponent';
import { ColorGradientPicker } from '../components/ColorGradientPicker';
import { Location } from '../../domain/value-objects/Location';
import { useDependencies } from '../context/DependencyContext';
import { useActivePet } from '../context/ActivePetContext';
import { PoopConsistency } from '../../domain/entities/Dropping';

export const WalkScreen = () => {
  const insets = useSafeAreaInsets();
  const { recordDroppingUseCase, gpsService } = useDependencies();
  const { activePet, isLoading: isLoadingPet, ensureActivePet } =
    useActivePet();
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

  const handleStartWalk = async () => {
    try {
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
    } catch (error) {
      console.error('Error al iniciar el paseo:', error);
      Alert.alert(
        'No se pudo iniciar el paseo',
        'Ocurrió un problema al acceder al GPS. Inténtalo de nuevo.',
      );
    }
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
    try {
      const locToUse =
        currentLocation || (await gpsService.getCurrentLocation());

      // La mascota activa es la misma que se gestiona en el Perfil
      const pet = await ensureActivePet();

      await recordDroppingUseCase.execute({
        petId: pet.id,
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
              ? `Paseando con ${activePet.name}`
              : 'Sin mascota activa'}
        </Text>
      </View>

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
