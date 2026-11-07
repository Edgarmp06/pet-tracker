import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncedPetRepository } from '../../src/infrastructure/sync/SyncedPetRepository';
import { SyncQueue } from '../../src/infrastructure/sync/SyncQueue';
import { IPetRepository } from '../../src/domain/ports/IPetRepository';
import { Pet } from '../../src/domain/entities/Pet';

class InMemoryPetRepository implements IPetRepository {
  public pets: Pet[] = [];

  async findByUserId(userId: string): Promise<Pet[]> {
    return this.pets.filter((p) => p.userId === userId);
  }

  async save(pet: Pet): Promise<void> {
    const index = this.pets.findIndex((p) => p.id === pet.id);
    if (index >= 0) {
      this.pets[index] = pet;
    } else {
      this.pets.push(pet);
    }
  }
}

class FailingPetRepository implements IPetRepository {
  async findByUserId(): Promise<Pet[]> {
    return [];
  }

  async save(): Promise<void> {
    throw new Error('sin conexión');
  }
}

const samplePet = () =>
  new Pet({ id: 'pet-1', userId: 'user-1', name: 'Max', breed: 'Perro', age: 3 });

describe('SyncedPetRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('guarda primero en local (local-first) aunque el remoto falle', async () => {
    const local = new InMemoryPetRepository();
    const remote = new FailingPetRepository();
    const queue = new SyncQueue();
    const repository = new SyncedPetRepository(local, remote, queue);

    await repository.save(samplePet());

    const found = await repository.findByUserId('user-1');
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Max');
  });

  it('encola la operación cuando el push en segundo plano falla, y no la retira', async () => {
    const local = new InMemoryPetRepository();
    const remote = new FailingPetRepository();
    const queue = new SyncQueue();
    const repository = new SyncedPetRepository(local, remote, queue);

    await repository.save(samplePet());
    // el intento remoto es fire-and-forget; dejamos que el microtask falle
    await new Promise((resolve) => setTimeout(resolve, 0));

    const pending = await queue.list();
    expect(pending).toHaveLength(1);
    expect(pending[0].entityId).toBe('pet-1');
  });

  it('retira la operación de la cola cuando el push en segundo plano tiene éxito', async () => {
    const local = new InMemoryPetRepository();
    const remote = new InMemoryPetRepository();
    const queue = new SyncQueue();
    const repository = new SyncedPetRepository(local, remote, queue);

    await repository.save(samplePet());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(await queue.list()).toHaveLength(0);
    expect(remote.pets).toHaveLength(1);
  });
});
