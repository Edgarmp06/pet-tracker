import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDependencies } from '../context/DependencyContext';
import { Dropping, PoopConsistency } from '../../domain/entities/Dropping';
import { Pet } from '../../domain/entities/Pet';
import { MockAuthAdapter } from '../../infrastructure/adapters/MockAuthAdapter';

const authService = new MockAuthAdapter();
const ACTIVE_PET_KEY = '@pet_tracker_active_pet_id';

interface Props {
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<Props> = ({ onLogout }) => {
  const insets = useSafeAreaInsets();
  const { droppingRepository, getPetsUseCase, savePetUseCase } =
    useDependencies();

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [history, setHistory] = useState<Dropping[]>([]);

  // Estado del modal para crear mascota
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [newPetAge, setNewPetAge] = useState('');
  const [newPetAvatar, setNewPetAvatar] = useState<string | null>(null);

  const loadData = async () => {
    const user = await authService.getCurrentUser();
    if (!user) return;

    let userPets = await getPetsUseCase.execute(user.id);

    // Si el usuario no tiene ninguna mascota guardada, creamos una por defecto (Max)
    if (userPets.length === 0) {
      const defaultPet = await savePetUseCase.execute({
        userId: user.id,
        name: 'Max',
        breed: 'Perro',
        age: 3,
      });
      userPets = [defaultPet];
    }

    setPets(userPets);

    // Cargar la última mascota activa guardada en almacenamiento local
    const savedActiveId = await AsyncStorage.getItem(ACTIVE_PET_KEY);
    const active = userPets.find((p) => p.id === savedActiveId) || userPets[0];
    setSelectedPet(active);

    if (active) {
      const droppings = await droppingRepository.findByPetId(active.id);
      setHistory(droppings.reverse());
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, []),
  );

  const handleSelectPet = async (pet: Pet) => {
    setSelectedPet(pet);
    await AsyncStorage.setItem(ACTIVE_PET_KEY, pet.id);
    const droppings = await droppingRepository.findByPetId(pet.id);
    setHistory(droppings.reverse());
  };

  const handlePickModalAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso denegado',
        'Necesitamos permiso para acceder a tus fotos.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setNewPetAvatar(result.assets[0].uri);
    }
  };

  const handleCreatePet = async () => {
    if (!newPetName.trim()) {
      Alert.alert(
        'Campo obligatorio',
        'Por favor, introduce el nombre de la mascota.',
      );
      return;
    }

    const user = await authService.getCurrentUser();
    if (!user) return;

    const newPet = await savePetUseCase.execute({
      userId: user.id,
      name: newPetName.trim(),
      breed: newPetBreed.trim() || undefined,
      age: newPetAge ? parseInt(newPetAge, 10) : undefined,
      avatarUri: newPetAvatar || undefined,
    });

    setIsModalVisible(false);
    setNewPetName('');
    setNewPetBreed('');
    setNewPetAge('');
    setNewPetAvatar(null);

    await loadData();
    handleSelectPet(newPet);
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          if (onLogout) onLogout();
        },
      },
    ]);
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

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Selector de Mascotas (Carrusel horizontal) */}
      <Text style={styles.sectionHeader}>🐾 Mis Mascotas</Text>
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
              style={[styles.petChip, isSelected && styles.petChipSelected]}
              onPress={() => handleSelectPet(pet)}
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
                style={[styles.chipName, isSelected && styles.chipNameSelected]}
              >
                {pet.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.addPetBtn}
          onPress={() => setIsModalVisible(true)}
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
              {selectedPet.age ? `${selectedPet.age} años` : 'Edad no descrita'}
            </Text>
          </View>
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

      {/* Historial Clínico de la Mascota Seleccionada */}
      <Text style={styles.historyTitle}>
        📋 Historial Clínico de {selectedPet?.name || ''} ({history.length})
      </Text>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        style={styles.list}
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
                    Estado: {formatConsistency(item.consistency)} | Color:{' '}
                    {colorLabel}
                  </Text>
                  <View
                    style={[styles.colorBox, { backgroundColor: colorHex }]}
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

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Modal para Crear Nueva Mascota */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🐶 Nueva Mascota</Text>

            <TouchableOpacity
              style={styles.avatarPickerBtn}
              onPress={handlePickModalAvatar}
            >
              {newPetAvatar ? (
                <Image
                  source={{ uri: newPetAvatar }}
                  style={styles.modalAvatarImage}
                />
              ) : (
                <Text style={styles.avatarPickerText}>📷 Subir Foto</Text>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Nombre (ej. Luna)"
              value={newPetName}
              onChangeText={setNewPetName}
            />
            <TextInput
              style={styles.input}
              placeholder="Raza (ej. Labrador)"
              value={newPetBreed}
              onChangeText={setNewPetBreed}
            />
            <TextInput
              style={styles.input}
              placeholder="Edad en años (ej. 2)"
              value={newPetAge}
              onChangeText={setNewPetAge}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreatePet}
              >
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
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 20 },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  petList: { maxHeight: 60, marginBottom: 15 },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  petChipSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  chipAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  chipEmoji: { fontSize: 16, marginRight: 6 },
  chipName: { fontSize: 14, color: '#333', fontWeight: '500' },
  chipNameSelected: { color: '#fff', fontWeight: 'bold' },
  addPetBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  addPetText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 13 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  avatarWrapper: { marginRight: 15 },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarEmoji: { fontSize: 40 },
  profileInfo: { justifyContent: 'center' },
  petName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  petSubText: { fontSize: 14, color: '#666' },
  statsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 4,
  },
  statsTotal: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBadge: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 4,
  },
  statBadgeEmoji: { fontSize: 20 },
  statBadgeCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  statBadgeLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  shareReportBtn: {
    backgroundColor: '#1976D2',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  shareReportText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  historyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 10,
  },
  list: { width: '100%', flex: 1 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemContent: { flex: 1, paddingRight: 10 },
  itemDate: { fontSize: 14, fontWeight: '600', color: '#333' },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  detailsText: { fontSize: 13, color: '#555', fontWeight: '500' },
  colorBox: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  coordsText: { fontSize: 11, color: '#888', marginTop: 4 },
  poopBadge: { fontSize: 22, marginLeft: 4 },
  logoutBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F44336',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  logoutText: { color: '#F44336', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  avatarPickerBtn: {
    alignSelf: 'center',
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPickerText: { fontSize: 12, color: '#666', textAlign: 'center' },
  modalAvatarImage: { width: 70, height: 70, borderRadius: 35 },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
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
