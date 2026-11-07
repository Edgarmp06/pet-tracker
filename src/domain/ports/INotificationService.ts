export interface DailyReminderTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface INotificationService {
  requestPermissions(): Promise<boolean>;

  /** Notificación local inmediata (p.ej. alerta clínica). */
  sendImmediateNotification(title: string, body: string): Promise<void>;

  /**
   * Programa un recordatorio diario que se repite a la misma hora.
   * `identifier` permite reprogramarlo (cancela cualquier recordatorio
   * previo con el mismo id) o cancelarlo más adelante sin duplicados.
   */
  scheduleDailyReminder(
    identifier: string,
    time: DailyReminderTime,
    title: string,
    body: string,
  ): Promise<void>;

  cancelReminder(identifier: string): Promise<void>;
}
