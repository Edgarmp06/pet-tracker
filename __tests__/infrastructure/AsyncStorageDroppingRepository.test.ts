import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageDroppingRepository } from '../../src/infrastructure/adapters/AsyncStorageDroppingRepository';
import { Dropping } from '../../src/domain/entities/Dropping';

describe('AsyncStorageDroppingRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('no debe perder el historial de otras mascotas al guardar una nueva deposición', async () => {
    const repository = new AsyncStorageDroppingRepository();

    await repository.save(
      new Dropping({
        id: 'd1',
        petId: 'pet-A',
        timestamp: new Date(),
      }),
    );
    await repository.save(
      new Dropping({
        id: 'd2',
        petId: 'pet-B',
        timestamp: new Date(),
      }),
    );
    await repository.save(
      new Dropping({
        id: 'd3',
        petId: 'pet-A',
        timestamp: new Date(),
      }),
    );

    const petADroppings = await repository.findByPetId('pet-A');
    const petBDroppings = await repository.findByPetId('pet-B');

    expect(petADroppings.map((d) => d.id)).toEqual(['d1', 'd3']);
    expect(petBDroppings.map((d) => d.id)).toEqual(['d2']);
  });
});
