import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncManager } from '../../src/infrastructure/sync/SyncManager';
import { SyncQueue } from '../../src/infrastructure/sync/SyncQueue';
import { IPetRepository } from '../../src/domain/ports/IPetRepository';
import { Pet } from '../../src/domain/entities/Pet';

class InMemoryPetRepository implements IPetRepository {
  public pets: Pet[] = [];
  public shouldFail = false;

  async findByUserId(userId: string): Promise<Pet[]> {
    return this.pets.filter((p) => p.userId === userId);
  }

  async save(pet: Pet): Promise<void> {
    if (this.shouldFail) {
      throw new Error('sin conexión');
    }
    this.pets.push(pet);
  }
}

describe('SyncManager.syncNow', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('procesa y retira las operaciones de mascotas pendientes', async () => {
    const queue = new SyncQueue();
    const remotePetRepository = new InMemoryPetRepository();

    await queue.enqueue({
      entity: 'pet',
      entityId: 'pet-1',
      type: 'upsert',
      payload: { id: 'pet-1', userId: 'user-1', name: 'Max' },
    });

    const manager = new SyncManager(queue, { pet: remotePetRepository });
    await manager.syncNow();

    expect(remotePetRepository.pets).toHaveLength(1);
    expect(await queue.list()).toHaveLength(0);
  });

  it('deja la operación en cola si el remoto sigue fallando', async () => {
    const queue = new SyncQueue();
    const remotePetRepository = new InMemoryPetRepository();
    remotePetRepository.shouldFail = true;

    await queue.enqueue({
      entity: 'pet',
      entityId: 'pet-1',
      type: 'upsert',
      payload: { id: 'pet-1', userId: 'user-1', name: 'Max' },
    });

    const manager = new SyncManager(queue, { pet: remotePetRepository });
    await manager.syncNow();

    expect(await queue.list()).toHaveLength(1);
  });

  it('no toca operaciones de entidades que todavía no soporta (dropping/walk)', async () => {
    const queue = new SyncQueue();

    await queue.enqueue({
      entity: 'dropping',
      entityId: 'dropping-1',
      type: 'upsert',
      payload: {},
    });

    const manager = new SyncManager(queue, {});
    await manager.syncNow();

    // Debe seguir en cola: no se procesó ni se eliminó por error.
    expect(await queue.list()).toHaveLength(1);
  });
});
