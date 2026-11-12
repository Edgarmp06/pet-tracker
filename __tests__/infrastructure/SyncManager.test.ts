import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncManager } from '../../src/infrastructure/sync/SyncManager';
import { SyncQueue } from '../../src/infrastructure/sync/SyncQueue';
import { IPetRepository } from '../../src/domain/ports/IPetRepository';
import { IDroppingRepository } from '../../src/domain/ports/IDroppingRepository';
import { IWalkRepository } from '../../src/domain/ports/IWalkRepository';
import { Pet } from '../../src/domain/entities/Pet';
import { Dropping } from '../../src/domain/entities/Dropping';
import { Walk } from '../../src/domain/entities/Walk';

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

  async delete(petId: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('sin conexión');
    }
    this.pets = this.pets.filter((p) => p.id !== petId);
  }
}

class InMemoryDroppingRepository implements IDroppingRepository {
  public droppings: Dropping[] = [];
  public shouldFail = false;

  async findByPetId(petId: string): Promise<Dropping[]> {
    return this.droppings.filter((d) => d.petId === petId);
  }

  async save(dropping: Dropping): Promise<void> {
    if (this.shouldFail) {
      throw new Error('sin conexión');
    }
    this.droppings.push(dropping);
  }
}

class InMemoryWalkRepository implements IWalkRepository {
  public walks: Walk[] = [];
  public shouldFail = false;

  async save(walk: Walk): Promise<void> {
    if (this.shouldFail) {
      throw new Error('sin conexión');
    }
    this.walks.push(walk);
  }

  async findById(id: string): Promise<Walk | null> {
    return this.walks.find((w) => w.id === id) || null;
  }

  async findActiveByPetId(petId: string): Promise<Walk | null> {
    return this.walks.find((w) => w.petIds.includes(petId) && !w.endTime) || null;
  }

  async findCompletedByPetId(petId: string): Promise<Walk[]> {
    return this.walks.filter((w) => w.petIds.includes(petId) && !!w.endTime);
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

  it('procesa y retira las operaciones de borrado de mascotas pendientes', async () => {
    const queue = new SyncQueue();
    const remotePetRepository = new InMemoryPetRepository();
    remotePetRepository.pets.push(new Pet({ id: 'pet-1', userId: 'user-1', name: 'Max' }));

    await queue.enqueue({
      entity: 'pet',
      entityId: 'pet-1',
      type: 'delete',
      payload: { id: 'pet-1' },
    });

    const manager = new SyncManager(queue, { pet: remotePetRepository });
    await manager.syncNow();

    expect(remotePetRepository.pets).toHaveLength(0);
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

  it('no toca operaciones si no se inyectó el repositorio remoto de esa entidad', async () => {
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

  it('procesa y retira las operaciones de deposiciones pendientes', async () => {
    const queue = new SyncQueue();
    const remoteDroppingRepository = new InMemoryDroppingRepository();

    await queue.enqueue({
      entity: 'dropping',
      entityId: 'drop-1',
      type: 'upsert',
      payload: { id: 'drop-1', petId: 'pet-1', timestamp: new Date().toISOString() },
    });

    const manager = new SyncManager(queue, { dropping: remoteDroppingRepository });
    await manager.syncNow();

    expect(remoteDroppingRepository.droppings).toHaveLength(1);
    expect(await queue.list()).toHaveLength(0);
  });

  it('deja la deposición en cola si el remoto sigue fallando', async () => {
    const queue = new SyncQueue();
    const remoteDroppingRepository = new InMemoryDroppingRepository();
    remoteDroppingRepository.shouldFail = true;

    await queue.enqueue({
      entity: 'dropping',
      entityId: 'drop-1',
      type: 'upsert',
      payload: { id: 'drop-1', petId: 'pet-1', timestamp: new Date().toISOString() },
    });

    const manager = new SyncManager(queue, { dropping: remoteDroppingRepository });
    await manager.syncNow();

    expect(await queue.list()).toHaveLength(1);
  });

  it('procesa y retira las operaciones de paseos pendientes', async () => {
    const queue = new SyncQueue();
    const remoteWalkRepository = new InMemoryWalkRepository();

    await queue.enqueue({
      entity: 'walk',
      entityId: 'walk-1',
      type: 'upsert',
      payload: {
        id: 'walk-1',
        petIds: ['pet-1'],
        startTime: new Date().toISOString(),
        route: [],
        distanceMeters: 0,
      },
    });

    const manager = new SyncManager(queue, { walk: remoteWalkRepository });
    await manager.syncNow();

    expect(remoteWalkRepository.walks).toHaveLength(1);
    expect(await queue.list()).toHaveLength(0);
  });

  it('deja el paseo en cola si el remoto sigue fallando', async () => {
    const queue = new SyncQueue();
    const remoteWalkRepository = new InMemoryWalkRepository();
    remoteWalkRepository.shouldFail = true;

    await queue.enqueue({
      entity: 'walk',
      entityId: 'walk-1',
      type: 'upsert',
      payload: {
        id: 'walk-1',
        petIds: ['pet-1'],
        startTime: new Date().toISOString(),
        route: [],
        distanceMeters: 0,
      },
    });

    const manager = new SyncManager(queue, { walk: remoteWalkRepository });
    await manager.syncNow();

    expect(await queue.list()).toHaveLength(1);
  });

  it('procesa cada entidad con su repositorio remoto correspondiente en una sola pasada', async () => {
    const queue = new SyncQueue();
    const remotePetRepository = new InMemoryPetRepository();
    const remoteDroppingRepository = new InMemoryDroppingRepository();
    const remoteWalkRepository = new InMemoryWalkRepository();

    await queue.enqueue({
      entity: 'pet',
      entityId: 'pet-1',
      type: 'upsert',
      payload: { id: 'pet-1', userId: 'user-1', name: 'Max' },
    });
    await queue.enqueue({
      entity: 'dropping',
      entityId: 'drop-1',
      type: 'upsert',
      payload: { id: 'drop-1', petId: 'pet-1', timestamp: new Date().toISOString() },
    });
    await queue.enqueue({
      entity: 'walk',
      entityId: 'walk-1',
      type: 'upsert',
      payload: {
        id: 'walk-1',
        petIds: ['pet-1'],
        startTime: new Date().toISOString(),
        route: [],
        distanceMeters: 0,
      },
    });

    const manager = new SyncManager(queue, {
      pet: remotePetRepository,
      dropping: remoteDroppingRepository,
      walk: remoteWalkRepository,
    });
    await manager.syncNow();

    expect(remotePetRepository.pets).toHaveLength(1);
    expect(remoteDroppingRepository.droppings).toHaveLength(1);
    expect(remoteWalkRepository.walks).toHaveLength(1);
    expect(await queue.list()).toHaveLength(0);
  });
});
