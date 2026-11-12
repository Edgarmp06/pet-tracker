import { describe, it, expect } from '@jest/globals';
import { GetPetWeightHistoryUseCase } from '../../src/application/use-cases/GetPetWeightHistoryUseCase';
import { IWeightRepository } from '../../src/domain/ports/IWeightRepository';
import { WeightEntry } from '../../src/domain/entities/WeightEntry';

class InMemoryWeightRepository implements IWeightRepository {
  constructor(public entries: WeightEntry[]) {}

  async save(entry: WeightEntry): Promise<void> {
    this.entries.push(entry);
  }

  async findByPetId(petId: string): Promise<WeightEntry[]> {
    return this.entries.filter((e) => e.petId === petId);
  }
}

describe('GetPetWeightHistoryUseCase', () => {
  it('devuelve el historial ordenado de más antiguo a más reciente', async () => {
    const repository = new InMemoryWeightRepository([
      new WeightEntry({
        id: 'w2',
        petId: 'pet-1',
        weightKg: 13,
        timestamp: new Date('2026-02-01'),
      }),
      new WeightEntry({
        id: 'w1',
        petId: 'pet-1',
        weightKg: 12,
        timestamp: new Date('2026-01-01'),
      }),
      new WeightEntry({
        id: 'w3',
        petId: 'pet-2',
        weightKg: 5,
        timestamp: new Date('2026-01-15'),
      }),
    ]);
    const useCase = new GetPetWeightHistoryUseCase(repository);

    const result = await useCase.execute('pet-1');

    expect(result.map((e) => e.id)).toEqual(['w1', 'w2']);
  });
});
