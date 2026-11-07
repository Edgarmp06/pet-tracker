import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncedDroppingRepository } from '../../src/infrastructure/sync/SyncedDroppingRepository';
import { SyncQueue } from '../../src/infrastructure/sync/SyncQueue';
import { IDroppingRepository } from '../../src/domain/ports/IDroppingRepository';
import { Dropping } from '../../src/domain/entities/Dropping';

class InMemoryDroppingRepository implements IDroppingRepository {
  public droppings: Dropping[] = [];

  async findByPetId(petId: string): Promise<Dropping[]> {
    return this.droppings.filter((d) => d.petId === petId);
  }

  async save(dropping: Dropping): Promise<void> {
    this.droppings.push(dropping);
  }
}

class FailingDroppingRepository implements IDroppingRepository {
  async findByPetId(): Promise<Dropping[]> {
    return [];
  }

  async save(): Promise<void> {
    throw new Error('sin conexión');
  }
}

const sampleDropping = () =>
  new Dropping({ id: 'drop-1', petId: 'pet-1', timestamp: new Date(), consistency: 'soft' });

describe('SyncedDroppingRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('guarda primero en local aunque el remoto falle', async () => {
    const local = new InMemoryDroppingRepository();
    const remote = new FailingDroppingRepository();
    const queue = new SyncQueue();
    const repository = new SyncedDroppingRepository(local, remote, queue);

    await repository.save(sampleDropping());

    const found = await repository.findByPetId('pet-1');
    expect(found).toHaveLength(1);
    expect(found[0].consistency).toBe('soft');
  });

  it('encola la operación cuando el push en segundo plano falla', async () => {
    const local = new InMemoryDroppingRepository();
    const remote = new FailingDroppingRepository();
    const queue = new SyncQueue();
    const repository = new SyncedDroppingRepository(local, remote, queue);

    await repository.save(sampleDropping());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const pending = await queue.list();
    expect(pending).toHaveLength(1);
    expect(pending[0].entity).toBe('dropping');
    expect(pending[0].entityId).toBe('drop-1');
  });

  it('retira la operación de la cola cuando el push en segundo plano tiene éxito', async () => {
    const local = new InMemoryDroppingRepository();
    const remote = new InMemoryDroppingRepository();
    const queue = new SyncQueue();
    const repository = new SyncedDroppingRepository(local, remote, queue);

    await repository.save(sampleDropping());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(await queue.list()).toHaveLength(0);
    expect(remote.droppings).toHaveLength(1);
  });
});
