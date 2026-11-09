import { describe, it, expect, jest } from '@jest/globals';
import { CheckIntestinalHealthAlertUseCase } from '../../src/application/use-cases/CheckIntestinalHealthAlertUseCase';
import { IDroppingRepository } from '../../src/domain/ports/IDroppingRepository';
import { INotificationService } from '../../src/domain/ports/INotificationService';
import { Dropping, PoopConsistency } from '../../src/domain/entities/Dropping';

class InMemoryDroppingRepository implements IDroppingRepository {
  constructor(public droppings: Dropping[]) {}

  async findByPetId(petId: string): Promise<Dropping[]> {
    return this.droppings.filter((d) => d.petId === petId);
  }

  async save(dropping: Dropping): Promise<void> {
    this.droppings.push(dropping);
  }
}

class FakeNotificationService implements INotificationService {
  public sent: { title: string; body: string }[] = [];

  async requestPermissions(): Promise<boolean> {
    return true;
  }

  async sendImmediateNotification(title: string, body: string): Promise<void> {
    this.sent.push({ title, body });
  }

  async scheduleDailyReminder(): Promise<void> {}
  async scheduleOneTimeReminder(): Promise<void> {}
  async cancelReminder(): Promise<void> {}
}

const droppingAt = (minutesAgo: number, consistency: PoopConsistency): Dropping =>
  new Dropping({
    id: `d-${minutesAgo}`,
    petId: 'pet-1',
    timestamp: new Date(Date.now() - minutesAgo * 60_000),
    consistency,
  });

describe('CheckIntestinalHealthAlertUseCase', () => {
  it('no avisa si solo hay una deposición de diarrea reciente', async () => {
    const repository = new InMemoryDroppingRepository([
      droppingAt(5, 'diarrhea'),
      droppingAt(120, 'normal'),
    ]);
    const notifications = new FakeNotificationService();
    const useCase = new CheckIntestinalHealthAlertUseCase(repository, notifications);

    const alerted = await useCase.execute('pet-1', 'Max');

    expect(alerted).toBe(false);
    expect(notifications.sent).toHaveLength(0);
  });

  it('avisa si las 2 últimas deposiciones son de diarrea', async () => {
    const repository = new InMemoryDroppingRepository([
      droppingAt(10, 'diarrhea'),
      droppingAt(5, 'diarrhea'),
      droppingAt(200, 'normal'),
    ]);
    const notifications = new FakeNotificationService();
    const useCase = new CheckIntestinalHealthAlertUseCase(repository, notifications);

    const alerted = await useCase.execute('pet-1', 'Max');

    expect(alerted).toBe(true);
    expect(notifications.sent).toHaveLength(1);
    expect(notifications.sent[0].body).toContain('Max');
  });

  it('no avisa si la racha de diarrea se interrumpe por una deposición normal más reciente', async () => {
    const repository = new InMemoryDroppingRepository([
      droppingAt(1, 'normal'),
      droppingAt(5, 'diarrhea'),
      droppingAt(10, 'diarrhea'),
    ]);
    const notifications = new FakeNotificationService();
    const useCase = new CheckIntestinalHealthAlertUseCase(repository, notifications);

    const alerted = await useCase.execute('pet-1', 'Max');

    expect(alerted).toBe(false);
    expect(notifications.sent).toHaveLength(0);
  });

  it('ignora las deposiciones de otras mascotas al contar la racha', async () => {
    const repository = new InMemoryDroppingRepository([
      new Dropping({
        id: 'other-1',
        petId: 'pet-2',
        timestamp: new Date(),
        consistency: 'diarrhea',
      }),
      new Dropping({
        id: 'other-2',
        petId: 'pet-2',
        timestamp: new Date(),
        consistency: 'diarrhea',
      }),
    ]);
    const notifications = new FakeNotificationService();
    const useCase = new CheckIntestinalHealthAlertUseCase(repository, notifications);

    const alerted = await useCase.execute('pet-1', 'Max');

    expect(alerted).toBe(false);
  });
});
