import { describe, it, expect } from '@jest/globals';
import { RecordDroppingUseCase } from '../../src/application/use-cases/RecordDroppingUseCase';
import { IDroppingRepository } from '../../src/domain/ports/IDroppingRepository';
import { Dropping } from '../../src/domain/entities/Dropping';

class InMemoryDroppingRepository implements IDroppingRepository {
  public droppings: Dropping[] = [];

  async save(dropping: Dropping): Promise<void> {
    this.droppings.push(dropping);
  }

  async findByPetId(petId: string): Promise<Dropping[]> {
    return this.droppings.filter((d) => d.petId === petId);
  }
}

describe('RecordDroppingUseCase', () => {
  it('debe registrar una caca correctamente', async () => {
    const repository = new InMemoryDroppingRepository();
    const useCase = new RecordDroppingUseCase(repository);

    const result = await useCase.execute({
      petId: 'pet-123',
      latitude: 39.4699,
      longitude: -0.3763,
      notes: 'Consistencia normal',
    });

    expect(result).toBeDefined();
    expect(repository.droppings.length).toBe(1);
    expect(repository.droppings[0].notes).toBe('Consistencia normal');
  });
});
