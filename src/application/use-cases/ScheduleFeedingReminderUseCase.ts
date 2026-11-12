import { INotificationService } from '../../domain/ports/INotificationService';

export class ScheduleFeedingReminderUseCase {
  constructor(private notificationService: INotificationService) {}

  async execute(
    eventId: string,
    petName: string,
    nextFeedingAt: Date,
  ): Promise<void> {
    await this.notificationService.scheduleOneTimeReminder(
      `feeding-${eventId}`,
      nextFeedingAt,
      '🍖 Hora de la próxima comida',
      `Toca dar de comer a ${petName}`,
    );
  }
}
