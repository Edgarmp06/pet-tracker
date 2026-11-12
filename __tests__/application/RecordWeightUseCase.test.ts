import { describe, it, expect } from '@jest/globals';
import { RecordWeightUseCase } from '../../src/application/use-cases/RecordWeightUseCase';
import { IWeightRepository } from '../../src/domain/ports/IWeightRepository';
import { WeightEntry } from '../../src/domain/entities/WeightEntry';

class InMemoryWeightRepository implements IWeightRepository {
  public entries: WeightEntry[] = [];

  async save(entry: WeightEntry): Promise<void> {
    this.entries.push(entry);
  }

  async findByPetId(petId: string): Promise<WeightEntry[]> {
    return this.entries.filter((e) => e.petId === petId);
  }
}

describe('RecordWeightUseCase', () => {
  it('debe registrar un peso correctamente', async () => {
    const repository = new InMemoryWeightRepository();
    const useCase = new RecordWeightUseCase(repository);

    const result = await useCase.execute({
      petId: 'pet-123',
      weightKg: 12.5,
      notes: 'Después de comer',
    });

    expect(result).toBeDefined();
    expect(repository.entries.length).toBe(1);
    expect(repository.entries[0].weightKg).toBe(12.5);
    expect(repository.entries[0].notes).toBe('Después de comer');
  });

  it('rechaza un peso no positivo', async () => {
    const repository = new InMemoryWeightRepository();
    const useCase = new RecordWeightUseCase(repository);

    await expect(
      useCase.execute({ petId: 'pet-123', weightKg: 0 }),
    ).rejects.toThrow('El peso debe ser un número mayor que 0.');
    await expect(
      useCase.execute({ petId: 'pet-123', weightKg: -3 }),
    ).rejects.toThrow('El peso debe ser un número mayor que 0.');
    expect(repository.entries).toHaveLength(0);
  });
});
