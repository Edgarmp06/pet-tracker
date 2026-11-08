import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStoragePetEventRepository } from '../../src/infrastructure/adapters/AsyncStoragePetEventRepository';
import { PetEvent } from '../../src/domain/entities/PetEvent';

describe('AsyncStoragePetEventRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('no debe perder los eventos de otras mascotas al guardar uno nuevo', async () => {
    const repository = new AsyncStoragePetEventRepository();

    await repository.save(
      new PetEvent({ id: 'e1', petId: 'pet-A', type: 'feeding', timestamp: new Date() }),
    );
    await repository.save(
      new PetEvent({ id: 'e2', petId: 'pet-B', type: 'medication', timestamp: new Date() }),
    );
    await repository.save(
      new PetEvent({ id: 'e3', petId: 'pet-A', type: 'medication', timestamp: new Date() }),
    );

    const petAEvents = await repository.findByPetId('pet-A');
    const petBEvents = await repository.findByPetId('pet-B');

    expect(petAEvents.map((e) => e.id)).toEqual(['e1', 'e3']);
    expect(petBEvents.map((e) => e.id)).toEqual(['e2']);
  });

  it('conserva el tipo y las notas al recuperar un evento', async () => {
    const repository = new AsyncStoragePetEventRepository();

    await repository.save(
      new PetEvent({
        id: 'e1',
        petId: 'pet-A',
        type: 'medication',
        timestamp: new Date('2026-01-01T10:00:00Z'),
        notes: 'Antiparasitario 10mg',
      }),
    );

    const [event] = await repository.findByPetId('pet-A');

    expect(event.type).toBe('medication');
    expect(event.notes).toBe('Antiparasitario 10mg');
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});
