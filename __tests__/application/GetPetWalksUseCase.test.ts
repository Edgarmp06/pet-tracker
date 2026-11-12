import { describe, it, expect } from '@jest/globals';
import { GetPetWalksUseCase } from '../../src/application/use-cases/GetPetWalksUseCase';
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
    return this.walks.find((w) => w.petIds.includes(petId) && !w.endTime) || null;
  }

  async findCompletedByPetId(petId: string): Promise<Walk[]> {
    return this.walks.filter((w) => w.petIds.includes(petId) && !!w.endTime);
  }
}

describe('GetPetWalksUseCase', () => {
  it('devuelve solo los paseos finalizados de la mascota, delegando en el repositorio', async () => {
    const repository = new InMemoryWalkRepository();
    const finished = new Walk({
      id: 'walk-finished',
      petIds: ['pet-1'],
      startTime: new Date(),
      route: [],
    });
    finished.endWalk();
    await repository.save(finished);
    await repository.save(
      new Walk({ id: 'walk-active', petIds: ['pet-1'], startTime: new Date(), route: [] }),
    );

    const useCase = new GetPetWalksUseCase(repository);
    const result = await useCase.execute('pet-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('walk-finished');
  });
});
