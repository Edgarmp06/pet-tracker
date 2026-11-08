import { describe, it, expect } from '@jest/globals';
import {
  RecordPetEventUseCase,
  GetPetEventsUseCase,
} from '../../src/application/use-cases/PetEventUseCases';
import { IPetEventRepository } from '../../src/domain/ports/IPetEventRepository';
import { PetEvent } from '../../src/domain/entities/PetEvent';

class InMemoryPetEventRepository implements IPetEventRepository {
  public events: PetEvent[] = [];

  async findByPetId(petId: string): Promise<PetEvent[]> {
    return this.events.filter((e) => e.petId === petId);
  }

  async save(event: PetEvent): Promise<void> {
    this.events.push(event);
  }
}

describe('RecordPetEventUseCase', () => {
  it('crea y guarda un evento de alimentación', async () => {
    const repository = new InMemoryPetEventRepository();
    const useCase = new RecordPetEventUseCase(repository);

    const event = await useCase.execute({ petId: 'pet-1', type: 'feeding' });

    expect(event.type).toBe('feeding');
    expect(event.petId).toBe('pet-1');
    expect(repository.events).toHaveLength(1);
  });

  it('crea y guarda un evento de medicación con notas', async () => {
    const repository = new InMemoryPetEventRepository();
    const useCase = new RecordPetEventUseCase(repository);

    const event = await useCase.execute({
      petId: 'pet-1',
      type: 'medication',
      notes: 'Antiparasitario 10mg',
    });

    expect(event.type).toBe('medication');
    expect(event.notes).toBe('Antiparasitario 10mg');
  });
});

describe('GetPetEventsUseCase', () => {
  it('devuelve solo los eventos de la mascota indicada', async () => {
    const repository = new InMemoryPetEventRepository();
    repository.events.push(
      new PetEvent({
        id: 'e1',
        petId: 'pet-1',
        type: 'feeding',
        timestamp: new Date(),
      }),
      new PetEvent({
        id: 'e2',
        petId: 'pet-2',
        type: 'medication',
        timestamp: new Date(),
      }),
    );
    const useCase = new GetPetEventsUseCase(repository);

    const events = await useCase.execute('pet-1');

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('e1');
  });
});
