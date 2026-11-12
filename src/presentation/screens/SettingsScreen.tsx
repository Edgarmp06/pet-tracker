import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDependencies } from '../context/DependencyContext';
import { useActivePet } from '../context/ActivePetContext';
import {
  ThemeColors,
  ThemePreference,
  useTheme,
} from '../context/ThemeContext';
import { Pet } from '../../domain/entities/Pet';
import { User } from '../../domain/entities/User';
import { PetFormModal, PetFormValues } from '../components/PetFormModal';
import { DailyReminderTime } from '../../domain/ports/INotificationService';

const WALK_REMINDER_ENABLED_KEY = '@pet_tracker_walk_reminder_enabled';
const WALK_REMINDER_TIME_KEY = '@pet_tracker_walk_reminder_time';
const DEFAULT_REMINDER_TIME: DailyReminderTime = { hour: 20, minute: 0 };
const MINUTE_STEP = 1;

const SectionTitle: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  children: string;
}> = ({ icon, children }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 8 }}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.textMuted }}>
        {children}
      </Text>
    </View>
  );
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<Props> = ({
  visible,
  onClose,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, preference: themePreference, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    authService,
    imagePickerAdapter,
    scheduleWalkReminderUseCase,
    cancelWalkReminderUseCase,
    updateUserProfileUseCase,
    deleteAccountUseCase,
    updatePetUseCase,
    deletePetUseCase,
  } = useDependencies();
  const { pets, refreshPets } = useActivePet();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isWalkReminderEnabled, setIsWalkReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<DailyReminderTime>(
    DEFAULT_REMINDER_TIME,
  );

  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [petPendingDelete, setPetPendingDelete] = useState<Pet | null>(null);
  const [isDeletingPet, setIsDeletingPet] = useState(false);

  useEffect(() => {
    if (!visible) return;

    authService
      .getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
        setProfileName(user?.name || '');
      })
      .catch((error) =>
        console.error('No se pudo cargar el perfil del usuario:', error),
      );

    AsyncStorage.getItem(WALK_REMINDER_ENABLED_KEY)
      .then((value) => setIsWalkReminderEnabled(value === 'true'))
      .catch((error) =>
        console.error('No se pudo leer la preferencia de recordatorio:', error),
      );

    AsyncStorage.getItem(WALK_REMINDER_TIME_KEY)
      .then((json) => {
        if (!json) return;
        const parsed = JSON.parse(json);
        if (
          typeof parsed?.hour === 'number' &&
          typeof parsed?.minute === 'number'
        ) {
          setReminderTime(parsed);
        }
      })
      .catch((error) =>
        console.error('No se pudo leer la hora del recordatorio:', error),
      );
  }, [visible, authService]);

  const persistReminderTime = async (time: DailyReminderTime) => {
    try {
      await AsyncStorage.setItem(WALK_REMINDER_TIME_KEY, JSON.stringify(time));
    } catch (error) {
      console.error('No se pudo guardar la hora del recordatorio:', error);
    }
  };

  const handleToggleWalkReminder = async (enabled: boolean) => {
    try {
      if (enabled) {
        await scheduleWalkReminderUseCase.execute(reminderTime);
      } else {
        await cancelWalkReminderUseCase.execute();
      }
      await AsyncStorage.setItem(WALK_REMINDER_ENABLED_KEY, String(enabled));
      setIsWalkReminderEnabled(enabled);
    } catch (error) {
      console.error('Error al cambiar el recordatorio de paseo:', error);
      Alert.alert(
        'No se pudo actualizar el recordatorio',
        'Comprueba que la app tenga permiso para enviar notificaciones e inténtalo de nuevo.',
      );
    }
  };

  const handleChangeReminderTime = async (next: DailyReminderTime) => {
    setReminderTime(next);
    await persistReminderTime(next);

    // Si el recordatorio ya está activo, lo reprogramamos de inmediato con
    // la nueva hora en vez de esperar a que el usuario lo desactive/active.
    if (isWalkReminderEnabled) {
      try {
        await scheduleWalkReminderUseCase.execute(next);
      } catch (error) {
        console.error('Error al reprogramar el recordatorio:', error);
        Alert.alert(
          'No se pudo reprogramar el recordatorio',
          'Comprueba los permisos de notificaciones e inténtalo de nuevo.',
        );
      }
    }
  };

  const adjustHour = (delta: number) => {
    const hour = (reminderTime.hour + delta + 24) % 24;
    handleChangeReminderTime({ ...reminderTime, hour });
  };

  const adjustMinute = (delta: number) => {
    const minute = (reminderTime.minute + delta + 60) % 60;
    handleChangeReminderTime({ ...reminderTime, minute });
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      Alert.alert('Nombre obligatorio', 'Introduce un nombre para tu perfil.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await updateUserProfileUseCase.execute(
        profileName.trim(),
      );
      setCurrentUser(updated);
      Alert.alert('Perfil actualizado', 'Tus datos se han guardado.');
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      Alert.alert(
        'No se pudo actualizar el perfil',
        error instanceof Error
          ? error.message
          : 'Ocurrió un problema. Inténtalo de nuevo.',
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
            onLogout();
          } catch (error) {
            console.error('Error al cerrar sesión:', error);
            Alert.alert(
              'No se pudo cerrar sesión',
              'Ocurrió un problema. Inténtalo de nuevo.',
            );
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es permanente. Se cerrará tu sesión en este dispositivo. ¿Seguro que quieres continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar cuenta',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountUseCase.execute();
              Alert.alert('Cuenta eliminada', 'Tu cuenta se ha eliminado.');
              onLogout();
            } catch (error) {
              // Con Supabase, deleteAccount cierra la sesión local y lanza un
              // mensaje informativo (el cliente no puede borrar la cuenta
              // del todo sin la service_role key del backend).
              Alert.alert(
                'Sesión cerrada',
                error instanceof Error
                  ? error.message
                  : 'Ocurrió un problema al eliminar la cuenta.',
              );
              onLogout();
            }
          },
        },
      ],
    );
  };

  const handlePickPetAvatar = async (): Promise<string | null> => {
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

  const handleSaveEditedPet = async (values: PetFormValues) => {
    if (!editingPet) return;

    setIsSavingPet(true);
    try {
      await updatePetUseCase.execute({
        id: editingPet.id,
        userId: editingPet.userId,
        ...values,
      });
      await refreshPets();
      setEditingPet(null);
    } catch (error) {
      console.error('Error al actualizar la mascota:', error);
      Alert.alert(
        'No se pudo guardar',
        'Ocurrió un problema al actualizar la mascota. Inténtalo de nuevo.',
      );
    } finally {
      setIsSavingPet(false);
    }
  };

  const handleConfirmDeletePet = async () => {
    if (!petPendingDelete) return;

    setIsDeletingPet(true);
    try {
      await deletePetUseCase.execute(petPendingDelete.id);
      await refreshPets();
      setPetPendingDelete(null);
    } catch (error) {
      console.error('Error al eliminar la mascota:', error);
      Alert.alert(
        'No se pudo eliminar',
        'Ocurrió un problema al eliminar la mascota. Inténtalo de nuevo.',
      );
    } finally {
      setIsDeletingPet(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
            <Text style={styles.headerTitle}>Ajustes</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner de próxima fase */}
          <View style={styles.comingSoonBanner}>
            <Text style={styles.comingSoonText}>
              Próximamente: Nuevas funciones y versión Pro en desarrollo 🚀
            </Text>
          </View>

          {/* Notificaciones y Recordatorios */}
          <SectionTitle icon="notifications-outline">Notificaciones y Recordatorios</SectionTitle>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Recordatorio diario de paseo</Text>
              <Switch
                value={isWalkReminderEnabled}
                onValueChange={handleToggleWalkReminder}
              />
            </View>

            <View style={styles.timePickerRow}>
              <View style={styles.timeStepper}>
                <TouchableOpacity
                  style={styles.timeStepBtn}
                  onPress={() => adjustHour(-1)}
                >
                  <Text style={styles.timeStepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>
                  {String(reminderTime.hour).padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  style={styles.timeStepBtn}
                  onPress={() => adjustHour(1)}
                >
                  <Text style={styles.timeStepBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              <View style={styles.timeStepper}>
                <TouchableOpacity
                  style={styles.timeStepBtn}
                  onPress={() => adjustMinute(-MINUTE_STEP)}
                >
                  <Text style={styles.timeStepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>
                  {String(reminderTime.minute).padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  style={styles.timeStepBtn}
                  onPress={() => adjustMinute(MINUTE_STEP)}
                >
                  <Text style={styles.timeStepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.hintText}>
              {isWalkReminderEnabled
                ? 'El recordatorio se reprograma al cambiar la hora.'
                : 'Activa el recordatorio para empezar a recibirlo a esta hora.'}
            </Text>
          </View>

          {/* Perfil de Usuario */}
          <SectionTitle icon="person-outline">Perfil de Usuario</SectionTitle>
          <View style={styles.card}>
            <Text style={styles.rowLabel}>{currentUser?.email}</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textMuted}
              value={profileName}
              onChangeText={setProfileName}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, isSavingProfile && styles.btnDisabled]}
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
            >
              <Text style={styles.primaryBtnText}>
                {isSavingProfile ? 'Guardando...' : 'Guardar perfil'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Gestión de Mascotas */}
          <SectionTitle icon="paw-outline">Gestión de Mascotas</SectionTitle>
          <View style={styles.card}>
            {pets.length === 0 ? (
              <Text style={styles.emptyText}>Todavía no tienes mascotas.</Text>
            ) : (
              pets.map((pet, index) => (
                <View
                  key={pet.id}
                  style={[
                    styles.petRow,
                    index < pets.length - 1 && styles.petRowDivider,
                  ]}
                >
                  <Text style={styles.petRowName}>{pet.name}</Text>
                  <View style={styles.petRowActions}>
                    <TouchableOpacity
                      style={styles.petActionBtn}
                      onPress={() => setEditingPet(pet)}
                    >
                      <Text style={styles.petActionText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.petActionBtn}
                      onPress={() => setPetPendingDelete(pet)}
                    >
                      <Text style={styles.petActionTextDanger}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Accesibilidad */}
          <SectionTitle icon="accessibility-outline">Accesibilidad</SectionTitle>
          <View style={styles.card}>
            <Text style={styles.rowLabel}>Tema</Text>
            <View style={styles.themeRow}>
              {(
                [
                  { key: 'light', label: 'Claro', icon: 'sunny-outline' },
                  { key: 'dark', label: 'Oscuro', icon: 'moon-outline' },
                  { key: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
                ] as {
                  key: ThemePreference;
                  label: string;
                  icon: keyof typeof Ionicons.glyphMap;
                }[]
              ).map((option) => {
                const isSelected = themePreference === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.themeChip, isSelected && styles.themeChipSelected]}
                    onPress={() => setPreference(option.key)}
                  >
                    <Ionicons
                      name={option.icon}
                      size={13}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.themeChipText,
                        isSelected && styles.themeChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hintText}>
              El tema cambia al instante en toda la app. "Sistema" sigue el
              modo claro/oscuro de tu dispositivo.
            </Text>
          </View>

          {/* Cuenta y Sesión */}
          <SectionTitle icon="lock-closed-outline">Cuenta y Sesión</SectionTitle>
          <View style={styles.card}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color={colors.danger} />
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, styles.dangerCard]}>
            <Text style={styles.dangerTitle}>Zona de peligro</Text>
            <Text style={styles.dangerDescription}>
              Eliminar tu cuenta es permanente y no se puede deshacer.
            </Text>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.dangerBtnText}>Eliminar cuenta</Text>
            </TouchableOpacity>
          </View>

          {/* Créditos */}
          <TouchableOpacity
            style={styles.creditsRow}
            onPress={() => Linking.openURL('https://mmdevs.es')}
          >
            <Text style={styles.creditsText}>
              Hecho con ❤️ por{' '}
              <Text style={styles.creditsLink}>MMDevs — mmdevs.es</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Modal de edición de mascota */}
      <PetFormModal
        visible={!!editingPet}
        title={`Editar a ${editingPet?.name || ''}`}
        submitLabel="Guardar cambios"
        isSubmitting={isSavingPet}
        initialValues={
          editingPet
            ? {
                name: editingPet.name,
                breed: editingPet.breed,
                age: editingPet.age,
                avatarUri: editingPet.avatarUri,
                species: editingPet.species,
                gender: editingPet.gender,
                goesOnWalks: editingPet.goesOnWalks,
              }
            : undefined
        }
        onClose={() => setEditingPet(null)}
        onPickAvatar={handlePickPetAvatar}
        onSubmit={handleSaveEditedPet}
      />

      {/* Confirmación de borrado de mascota */}
      <Modal visible={!!petPendingDelete} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              ¿Dar de baja a {petPendingDelete?.name}?
            </Text>
            <Text style={styles.confirmDescription}>
              Su historial de paseos y deposiciones se conservará, pero ya no
              aparecerá en tu lista de mascotas.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setPetPendingDelete(null)}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmDeleteBtn,
                  isDeletingPet && styles.btnDisabled,
                ]}
                onPress={handleConfirmDeletePet}
                disabled={isDeletingPet}
              >
                <Text style={styles.confirmDeleteText}>
                  {isDeletingPet ? 'Eliminando...' : 'Sí, dar de baja'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    closeBtn: { padding: 6 },
    closeBtnText: { color: colors.primary, fontWeight: 'bold', fontSize: 14 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 'bold',
      color: colors.textMuted,
      marginTop: 18,
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      elevation: 1,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rowLabel: { fontSize: 13, color: colors.text, fontWeight: '600', flex: 1, marginRight: 10 },
    timePickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },
    timeStepper: { flexDirection: 'row', alignItems: 'center' },
    timeStepBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeStepBtnText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
    timeValue: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginHorizontal: 10,
      minWidth: 36,
      textAlign: 'center',
    },
    timeSeparator: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginHorizontal: 6,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      marginTop: 10,
      marginBottom: 12,
      color: colors.text,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    primaryBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 13 },
    btnDisabled: { opacity: 0.6 },
    emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 8 },
    petRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    petRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
    petRowName: { fontSize: 14, fontWeight: '600', color: colors.text },
    petRowActions: { flexDirection: 'row' },
    petActionBtn: { marginLeft: 16 },
    petActionText: { color: '#1976D2', fontWeight: '600', fontSize: 13 },
    petActionTextDanger: { color: colors.danger, fontWeight: '600', fontSize: 13 },
    themeRow: { flexDirection: 'row', marginTop: 8, marginBottom: 10 },
    themeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    themeChipSelected: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    themeChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    themeChipTextSelected: { color: colors.primary },
    hintText: { fontSize: 11, color: colors.textMuted, lineHeight: 16, marginTop: 10 },
    logoutBtn: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
    },
    logoutText: { color: colors.danger, fontWeight: 'bold', fontSize: 14 },
    dangerCard: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerMuted,
    },
    dangerTitle: { fontSize: 13, fontWeight: 'bold', color: colors.danger, marginBottom: 4 },
    dangerDescription: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
    dangerBtn: {
      borderWidth: 1,
      borderColor: colors.danger,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
    },
    dangerBtnText: { color: colors.danger, fontWeight: 'bold', fontSize: 13 },
    comingSoonBanner: {
      backgroundColor: colors.primaryMuted,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
    },
    comingSoonText: {
      color: colors.primary,
      fontWeight: 'bold',
      fontSize: 13,
      textAlign: 'center',
    },
    creditsRow: {
      marginTop: 24,
      paddingVertical: 10,
      alignItems: 'center',
    },
    creditsText: { fontSize: 12, color: colors.textMuted },
    creditsLink: {
      color: colors.primary,
      fontWeight: 'bold',
      textDecorationLine: 'underline',
    },
    confirmOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: 24,
    },
    confirmCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20 },
    confirmTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
    confirmDescription: { fontSize: 13, color: colors.textMuted, marginBottom: 18, lineHeight: 18 },
    confirmButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    confirmCancelBtn: {
      flex: 1,
      marginRight: 10,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    confirmCancelText: { color: colors.textMuted, fontWeight: 'bold' },
    confirmDeleteBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.danger,
      alignItems: 'center',
    },
    confirmDeleteText: { color: colors.white, fontWeight: 'bold' },
  });
