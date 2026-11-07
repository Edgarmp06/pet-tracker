import { INotificationService } from '../../domain/ports/INotificationService';
import { WALK_REMINDER_ID } from './ScheduleWalkReminderUseCase';

export class CancelWalkReminderUseCase {
  constructor(private notificationService: INotificationService) {}

  async execute(): Promise<void> {
    await this.notificationService.cancelReminder(WALK_REMINDER_ID);
  }
}
