import { describe, it, expect } from '@jest/globals';
import { GetActiveWalkUseCase } from '../../src/application/use-cases/GetActiveWalkUseCase';
import { IWalkRepository } from '../../src/domain/ports/IWalkRepository';
import { Walk } from '../../src/domain/entities/Walk';

class InMemoryWalkRepository implements IWalkRepository {
  public walks: Walk[] = [];

  async save(walk: Walk): Promise<void> {
    const index = this.walks.findIndex((w) => w.id === walk.id);
    if (index >= 0) {
      this.walks[index] = walk;
    } else {
      this.walks.push(walk);
    }
  }

  async findById(id: string): Promise<Walk | null> {
    return this.walks.find((w) => w.id === id) || null;
  }

  async findActiveByPetId(petId: string): Promise<Walk | null> {
    return this.walks.find((w) => w.petId === petId && !w.endTime) || null;
  }
}

describe('GetActiveWalkUseCase', () => {
  it('devuelve el paseo huérfano (sin endTime) de una mascota', async () => {
    const repository = new InMemoryWalkRepository();
    const orphan = new Walk({
      id: 'walk-orphan',
      petId: 'pet-1',
      startTime: new Date(),
      route: [],
    });
    await repository.save(orphan);

    const useCase = new GetActiveWalkUseCase(repository);
    const result = await useCase.execute('pet-1');

    expect(result?.id).toBe('walk-orphan');
  });

  it('devuelve null si no hay ningún paseo activo', async () => {
    const repository = new InMemoryWalkRepository();
    const useCase = new GetActiveWalkUseCase(repository);

    const result = await useCase.execute('pet-sin-paseos');

    expect(result).toBeNull();
  });

  it('devuelve null si el único paseo de la mascota ya finalizó', async () => {
    const repository = new InMemoryWalkRepository();
    const finished = new Walk({
      id: 'walk-finished',
      petId: 'pet-1',
      startTime: new Date(),
      route: [],
    });
    finished.endWalk();
    await repository.save(finished);

    const useCase = new GetActiveWalkUseCase(repository);
    const result = await useCase.execute('pet-1');

    expect(result).toBeNull();
  });
});
