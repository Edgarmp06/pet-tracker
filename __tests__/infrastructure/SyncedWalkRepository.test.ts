import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncedWalkRepository } from '../../src/infrastructure/sync/SyncedWalkRepository';
import { SyncQueue } from '../../src/infrastructure/sync/SyncQueue';
import { IWalkRepository } from '../../src/domain/ports/IWalkRepository';
import { Walk } from '../../src/domain/entities/Walk';

class InMemoryWalkRepository implements IWalkRepository {
  public walks: Walk[] = [];

  async save(walk: Walk): Promise<void> {
    const index = this.walks.findIndex((w) => w.id === walk.id);
    if (index >= 0) {
      this.walks[index] = walk;
    } else {
      this.walks.push(walk);
    }
  }

  async findById(id: string): Promise<Walk | null> {
    return this.walks.find((w) => w.id === id) || null;
  }

  async findActiveByPetId(petId: string): Promise<Walk | null> {
    return this.walks.find((w) => w.petIds.includes(petId) && !w.endTime) || null;
  }
}

class FailingWalkRepository implements IWalkRepository {
  async save(): Promise<void> {
    throw new Error('sin conexión');
  }
  async findById(): Promise<Walk | null> {
    return null;
  }
  async findActiveByPetId(): Promise<Walk | null> {
    return null;
  }
}

const sampleWalk = () =>
  new Walk({ id: 'walk-1', petIds: ['pet-1'], startTime: new Date(), route: [] });

describe('SyncedWalkRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('guarda y lee primero en local aunque el remoto falle', async () => {
    const local = new InMemoryWalkRepository();
    const remote = new FailingWalkRepository();
    const queue = new SyncQueue();
    const repository = new SyncedWalkRepository(local, remote, queue);

    await repository.save(sampleWalk());

    const active = await repository.findActiveByPetId('pet-1');
    expect(active?.id).toBe('walk-1');
  });

  it('encola la operación cuando el push en segundo plano falla', async () => {
    const local = new InMemoryWalkRepository();
    const remote = new FailingWalkRepository();
    const queue = new SyncQueue();
    const repository = new SyncedWalkRepository(local, remote, queue);

    await repository.save(sampleWalk());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const pending = await queue.list();
    expect(pending).toHaveLength(1);
    expect(pending[0].entity).toBe('walk');
    expect(pending[0].entityId).toBe('walk-1');
  });

  it('retira la operación de la cola cuando el push en segundo plano tiene éxito', async () => {
    const local = new InMemoryWalkRepository();
    const remote = new InMemoryWalkRepository();
    const queue = new SyncQueue();
    const repository = new SyncedWalkRepository(local, remote, queue);

    await repository.save(sampleWalk());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(await queue.list()).toHaveLength(0);
    expect(remote.walks).toHaveLength(1);
  });
});
