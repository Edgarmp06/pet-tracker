import {
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  setNotificationHandler,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';
import {
  DailyReminderTime,
  INotificationService,
} from '../../domain/ports/INotificationService';

// Sin esto, las notificaciones locales no se muestran mientras la app está
// en primer plano (p.ej. la alerta clínica inmediata mientras se registra
// una deposición en WalkScreen).
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class ExpoNotificationAdapter implements INotificationService {
  async requestPermissions(): Promise<boolean> {
    const existing = await getPermissionsAsync();
    if (existing.granted) return true;

    const requested = await requestPermissionsAsync();
    return requested.granted;
  }

  async sendImmediateNotification(title: string, body: string): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    await scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // null = entregar inmediatamente
    });
  }

  async scheduleDailyReminder(
    identifier: string,
    time: DailyReminderTime,
    title: string,
    body: string,
  ): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // Evita duplicados: si ya existía un recordatorio con este id, se
    // cancela antes de programar el nuevo.
    await this.cancelReminder(identifier);

    await scheduleNotificationAsync({
      identifier,
      content: { title, body },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
    });
  }

  async cancelReminder(identifier: string): Promise<void> {
    try {
      await cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      // Cancelar un recordatorio que no existe no debería romper el flujo
      // (p.ej. reprogramar uno que nunca se llegó a crear).
      console.warn(`No se pudo cancelar el recordatorio ${identifier}:`, error);
    }
  }
}
