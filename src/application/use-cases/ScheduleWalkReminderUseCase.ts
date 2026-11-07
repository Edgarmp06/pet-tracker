import {
  DailyReminderTime,
  INotificationService,
} from '../../domain/ports/INotificationService';

export const WALK_REMINDER_ID = 'daily-walk-reminder';

export class ScheduleWalkReminderUseCase {
  constructor(private notificationService: INotificationService) {}

  async execute(time: DailyReminderTime): Promise<void> {
    await this.notificationService.scheduleDailyReminder(
      WALK_REMINDER_ID,
      time,
      '🐾 ¡Hora del paseo!',
      'Es la hora habitual de paseo. No olvides registrar las deposiciones.',
    );
  }
}
