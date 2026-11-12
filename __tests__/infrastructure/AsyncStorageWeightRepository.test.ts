import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageWeightRepository } from '../../src/infrastructure/adapters/AsyncStorageWeightRepository';
import { WeightEntry } from '../../src/domain/entities/WeightEntry';

describe('AsyncStorageWeightRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('no debe perder el historial de otras mascotas al guardar un peso nuevo', async () => {
    const repository = new AsyncStorageWeightRepository();

    await repository.save(
      new WeightEntry({ id: 'w1', petId: 'pet-A', weightKg: 10, timestamp: new Date() }),
    );
    await repository.save(
      new WeightEntry({ id: 'w2', petId: 'pet-B', weightKg: 4, timestamp: new Date() }),
    );
    await repository.save(
      new WeightEntry({ id: 'w3', petId: 'pet-A', weightKg: 10.5, timestamp: new Date() }),
    );

    const petAWeights = await repository.findByPetId('pet-A');
    const petBWeights = await repository.findByPetId('pet-B');

    expect(petAWeights.map((w) => w.id)).toEqual(['w1', 'w3']);
    expect(petBWeights.map((w) => w.id)).toEqual(['w2']);
  });
});
