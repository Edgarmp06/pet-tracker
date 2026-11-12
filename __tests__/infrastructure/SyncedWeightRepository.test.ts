import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncedWeightRepository } from '../../src/infrastructure/sync/SyncedWeightRepository';
import { SyncQueue } from '../../src/infrastructure/sync/SyncQueue';
import { IWeightRepository } from '../../src/domain/ports/IWeightRepository';
import { WeightEntry } from '../../src/domain/entities/WeightEntry';

class InMemoryWeightRepository implements IWeightRepository {
  public entries: WeightEntry[] = [];

  async findByPetId(petId: string): Promise<WeightEntry[]> {
    return this.entries.filter((e) => e.petId === petId);
  }

  async save(entry: WeightEntry): Promise<void> {
    this.entries.push(entry);
  }
}

class FailingWeightRepository implements IWeightRepository {
  async findByPetId(): Promise<WeightEntry[]> {
    return [];
  }

  async save(): Promise<void> {
    throw new Error('sin conexión');
  }
}

const sampleEntry = () =>
  new WeightEntry({ id: 'weight-1', petId: 'pet-1', weightKg: 12, timestamp: new Date() });

describe('SyncedWeightRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('guarda primero en local aunque el remoto falle', async () => {
    const local = new InMemoryWeightRepository();
    const remote = new FailingWeightRepository();
    const queue = new SyncQueue();
    const repository = new SyncedWeightRepository(local, remote, queue);

    await repository.save(sampleEntry());

    const found = await repository.findByPetId('pet-1');
    expect(found).toHaveLength(1);
    expect(found[0].weightKg).toBe(12);
  });

  it('encola la operación cuando el push en segundo plano falla', async () => {
    const local = new InMemoryWeightRepository();
    const remote = new FailingWeightRepository();
    const queue = new SyncQueue();
    const repository = new SyncedWeightRepository(local, remote, queue);

    await repository.save(sampleEntry());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const pending = await queue.list();
    expect(pending).toHaveLength(1);
    expect(pending[0].entity).toBe('weight');
    expect(pending[0].entityId).toBe('weight-1');
  });

  it('retira la operación de la cola cuando el push en segundo plano tiene éxito', async () => {
    const local = new InMemoryWeightRepository();
    const remote = new InMemoryWeightRepository();
    const queue = new SyncQueue();
    const repository = new SyncedWeightRepository(local, remote, queue);

    await repository.save(sampleEntry());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(await queue.list()).toHaveLength(0);
    expect(remote.entries).toHaveLength(1);
  });
});
