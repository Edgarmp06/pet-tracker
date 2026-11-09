import { INotificationService } from '../../domain/ports/INotificationService';

export class ScheduleMedicationReminderUseCase {
  constructor(private notificationService: INotificationService) {}

  async execute(
    eventId: string,
    petName: string,
    medicineName: string,
    nextDoseAt: Date,
  ): Promise<void> {
    await this.notificationService.scheduleOneTimeReminder(
      `medication-${eventId}`,
      nextDoseAt,
      '💊 Hora de la próxima dosis',
      `Toca administrar a ${petName}: ${medicineName}`,
    );
  }
}
