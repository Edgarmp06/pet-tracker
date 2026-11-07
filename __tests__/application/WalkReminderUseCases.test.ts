import { describe, it, expect } from '@jest/globals';
import {
  ScheduleWalkReminderUseCase,
  WALK_REMINDER_ID,
} from '../../src/application/use-cases/ScheduleWalkReminderUseCase';
import { CancelWalkReminderUseCase } from '../../src/application/use-cases/CancelWalkReminderUseCase';
import {
  DailyReminderTime,
  INotificationService,
} from '../../src/domain/ports/INotificationService';

class FakeNotificationService implements INotificationService {
  public scheduled: {
    identifier: string;
    time: DailyReminderTime;
    title: string;
    body: string;
  }[] = [];
  public cancelled: string[] = [];

  async requestPermissions(): Promise<boolean> {
    return true;
  }

  async sendImmediateNotification(): Promise<void> {}

  async scheduleDailyReminder(
    identifier: string,
    time: DailyReminderTime,
    title: string,
    body: string,
  ): Promise<void> {
    this.scheduled.push({ identifier, time, title, body });
  }

  async cancelReminder(identifier: string): Promise<void> {
    this.cancelled.push(identifier);
  }
}

describe('ScheduleWalkReminderUseCase', () => {
  it('programa el recordatorio diario con el id estable de paseo', async () => {
    const notifications = new FakeNotificationService();
    const useCase = new ScheduleWalkReminderUseCase(notifications);

    await useCase.execute({ hour: 20, minute: 0 });

    expect(notifications.scheduled).toHaveLength(1);
    expect(notifications.scheduled[0].identifier).toBe(WALK_REMINDER_ID);
    expect(notifications.scheduled[0].time).toEqual({ hour: 20, minute: 0 });
  });
});

describe('CancelWalkReminderUseCase', () => {
  it('cancela el recordatorio usando el mismo id con el que se programó', async () => {
    const notifications = new FakeNotificationService();
    const useCase = new CancelWalkReminderUseCase(notifications);

    await useCase.execute();

    expect(notifications.cancelled).toEqual([WALK_REMINDER_ID]);
  });
});
